import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { CATEGORIES, SEASONS, COLOUR_FAMILIES, colourFamily, daysSince, hexToHsl } from '@/lib/wardrobe';
import ClosetView from '@/components/ClosetView';
import { wearItemToday } from '@/app/actions/items';
import { creditFor } from '@/lib/catalogue';
import Icon from '@/components/Icon';

export const metadata = { title: 'Closet — Hanger' };

const SORTS = {
  worn: 'most worn first',
  least: 'least worn first',
  recent: 'newest first',
  hue: 'sorted by colour',
};

export default async function ClosetPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === 'archive' ? 'archive' : 'rail';
  const cat = CATEGORIES.includes(sp.cat) ? sp.cat : '';
  const colour = COLOUR_FAMILIES.includes(sp.colour) ? sp.colour : '';
  const season = SEASONS.includes(sp.season) ? sp.season : '';
  const sort = SORTS[sp.sort] ? sp.sort : 'worn';
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';

  const where = { userId: user.id };
  if (cat) where.category = cat;
  if (season) where.season = season;
  if (q) where.name = { contains: q };

  const [raw, total] = await Promise.all([
    prisma.item.findMany({ where, orderBy: [{ createdAt: 'desc' }], include: { _count: { select: { outfits: true } } } }),
    prisma.item.count({ where: { userId: user.id } }),
  ]);
  const now = Date.now();
  let items = raw
    .filter((i) => !colour || colourFamily(i.color) === colour)
    .map((i) => {
      const d = daysSince(i.lastWornAt, now);
      return {
        id: i.id, name: i.name, category: i.category, color: i.color, photo: i.photo, season: i.season, wearCount: i.wearCount,
        price: i.price, lastWornAt: i.lastWornAt ? i.lastWornAt.toISOString() : null, daysSince: d, looks: i._count.outfits,
        credit: creditFor(i.photo),
        forgotten: d == null ? now - i.createdAt.getTime() > 90 * 864e5 : d >= 90,
      };
    });
  if (sort === 'worn') items.sort((a, b) => b.wearCount - a.wearCount);
  if (sort === 'least') items.sort((a, b) => a.wearCount - b.wearCount);
  if (sort === 'hue') {
    const key = (c) => { const { h, s, l } = hexToHsl(c); return s < 0.2 ? 1000 + (1 - l) * 100 : h; };
    items.sort((a, b) => key(a.color) - key(b.color));
  }
  // forgotten pieces drift to the front of the rail
  if (view === 'rail' && sort === 'worn') items = [...items.filter((i) => i.forgotten), ...items.filter((i) => !i.forgotten)];

  const hidden = (name, value) => (value ? <input type="hidden" name={name} value={value} /> : null);

  return (
    <>
      <div className="row wrap" style={{ alignItems: 'flex-end', gap: 24 }}>
        <div>
          <div className="eyebrow">The archive · {total} pieces</div>
          <h1 className="display" style={{ marginTop: 10 }}>Closet</h1>
        </div>
        <div className="spacer" />
        <form className="search" role="search" action="/closet">
          <Icon name="search" size={18} />
          <label htmlFor="q" className="sr-only">Search your closet</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Search the archive…" />
          {hidden('view', view === 'archive' ? 'archive' : '')}
        </form>
        <Link href="/closet/new" className="btn btn-primary"><Icon name="plus" size={18} />Add a piece</Link>
      </div>

      <form className="sentence" action="/closet" aria-label="Filter the closet">
        {hidden('view', view === 'archive' ? 'archive' : '')}
        {hidden('q', q)}
        <span>Show me</span>
        <label className="sr-only" htmlFor="f-cat">Category</label>
        <select id="f-cat" name="cat" defaultValue={cat}>
          <option value="">everything</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.toLowerCase()}</option>)}
        </select>
        <span>in</span>
        <label className="sr-only" htmlFor="f-colour">Colour</label>
        <select id="f-colour" name="colour" defaultValue={colour}>
          <option value="">every colour</option>
          {COLOUR_FAMILIES.map((c) => <option key={c} value={c}>{c.toLowerCase()}</option>)}
        </select>
        <span>for</span>
        <label className="sr-only" htmlFor="f-season">Season</label>
        <select id="f-season" name="season" defaultValue={season}>
          <option value="">any season</option>
          {SEASONS.map((s) => <option key={s} value={s}>{s === 'All year' ? 'all year' : s.toLowerCase()}</option>)}
        </select>
        <span>,</span>
        <label className="sr-only" htmlFor="f-sort">Sort</label>
        <select id="f-sort" name="sort" defaultValue={sort}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span>.</span>
        <button className="btn btn-sm" style={{ marginLeft: 12 }}>Show</button>
        {(cat || colour || season || q || sort !== 'worn') && <Link className="btn btn-sm btn-ghost" href={view === 'archive' ? '/closet?view=archive' : '/closet'}>Clear</Link>}
      </form>

      <div className="row">
        <span className="eyebrow">{items.length} showing{items.some((i) => i.forgotten) ? ' · faded pieces haven’t been worn in 90 days' : ''}</span>
        <div className="spacer" />
        <Link className={view === 'rail' ? 'chip on' : 'chip'} href={`/closet?${new URLSearchParams({ ...(cat && { cat }), ...(colour && { colour }), ...(season && { season }), ...(q && { q }), sort }).toString()}`}>Rail</Link>
        <Link className={view === 'archive' ? 'chip on' : 'chip'} href={`/closet?${new URLSearchParams({ view: 'archive', ...(cat && { cat }), ...(colour && { colour }), ...(season && { season }), ...(q && { q }), sort }).toString()}`}>Archive</Link>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <span className="display-sm" style={{ color: 'var(--ink)' }}>{total === 0 ? 'An empty rail.' : 'Nothing matches.'}</span>
          <span>{total === 0 ? 'Add your first three pieces — a photo is optional.' : 'Try a wider sentence.'}</span>
          {total === 0 ? <Link href="/closet/new" className="btn btn-primary">Add a piece</Link> : <Link href="/closet" className="btn">Clear filters</Link>}
        </div>
      ) : (
        <ClosetView items={items} view={view} wearAction={wearItemToday} />
      )}
    </>
  );
}
