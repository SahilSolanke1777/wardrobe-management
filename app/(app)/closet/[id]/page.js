import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { tintOf, formatDate, daysSince, colourFamily } from '@/lib/wardrobe';
import { deleteItem, wearItemToday } from '@/app/actions/items';
import { Cutout } from '@/components/Garment';
import { creditFor } from '@/lib/catalogue';

export default async function ItemPage({ params, searchParams }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) notFound();
  const item = await prisma.item.findFirst({
    where: { id: itemId, userId: user.id },
    include: { outfits: { include: { outfit: { include: { items: { include: { item: true } } } } } } },
  });
  if (!item) notFound();

  const d = daysSince(item.lastWornAt);
  const cpw = item.price != null ? (item.wearCount > 0 ? Math.round(item.price / item.wearCount) : Math.round(item.price)) : null;
  const looks = item.outfits.map((o) => o.outfit);
  const ticks = Math.min(item.wearCount, 80);
  const credit = creditFor(item.photo);

  return (
    <>
      <div className="row">
        <Link href="/closet" className="mono">← The archive</Link>
        <div className="spacer" />
        <Link href={`/closet/${item.id}/edit`} className="btn btn-sm">Edit piece</Link>
      </div>
      {sp.added && <div className="alert ok toast" role="status">Added to your closet.</div>}
      {sp.saved && <div className="alert ok toast" role="status">Changes saved.</div>}
      <div className="spec">
        <div className="spec-stage" style={{ background: tintOf(item.color) }}>
          <Cutout item={item} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <div className="eyebrow">{item.category} · No. {String(item.id).padStart(3, '0')}</div>
            <h1 className="display" style={{ fontSize: 'clamp(44px, 5vw, 76px)', marginTop: 10 }}>{item.name}</h1>
            <p className="sub">
              {d == null ? 'Never worn yet.' : d === 0 ? 'Worn today.' : d >= 90 ? `Hasn’t been out in ${d} days — style it back in.` : `Last worn ${d} day${d === 1 ? '' : 's'} ago.`}
            </p>
          </div>

          <table className="spec-table">
            <tbody>
              <tr><th>Colour</th><td><span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: item.color }} />{item.color.toUpperCase()} · {colourFamily(item.color)}</span></td></tr>
              <tr><th>Season</th><td>{item.season}</td></tr>
              <tr><th>Price</th><td>{item.price != null ? `₹${Math.round(item.price).toLocaleString('en-IN')}` : '—'}</td></tr>
              <tr><th>Cost per wear</th><td>{cpw != null ? `₹${cpw.toLocaleString('en-IN')}` : '—'}</td></tr>
              <tr><th>Added</th><td>{formatDate(item.createdAt)}</td></tr>
              <tr><th>Last worn</th><td>{formatDate(item.lastWornAt)}</td></tr>
              {credit && <tr><th>Photo</th><td><a href={credit.sourceUrl} target="_blank" rel="noreferrer">{credit.photographer || 'Pexels'}</a> / <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a></td></tr>}
            </tbody>
          </table>

          <div className="field">
            <span className="label">Worn {item.wearCount}×</span>
            {ticks > 0 ? <div className="wear-ticks" aria-hidden="true">{Array.from({ length: ticks }, (_, i) => <i key={i} />)}</div> : <span className="muted small">No wears logged yet.</span>}
          </div>

          <div className="row wrap">
            <Link href={`/studio?items=${item.id}`} className="btn btn-primary">Style it on the table</Link>
            <form action={wearItemToday}><input type="hidden" name="id" value={item.id} /><button className="btn">Wore it today</button></form>
            <form action={deleteItem}><input type="hidden" name="id" value={item.id} /><button className="btn btn-danger">Delete</button></form>
          </div>

          <div className="field">
            <span className="label">In {looks.length} look{looks.length === 1 ? '' : 's'}</span>
            {looks.length > 0 && (
              <div className="looks-fan">
                {looks.map((o) => (
                  <Link key={o.id} href={`/studio?outfit=${o.id}`}>
                    <span className="swatch-row">{o.items.map(({ item: it }) => <span key={it.id} className="swatch" style={{ background: it.color }} />)}</span>
                    <span className="mono">{o.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
