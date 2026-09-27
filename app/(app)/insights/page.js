import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { CATEGORIES, currentSeason, formatDate } from '@/lib/wardrobe';
import { wearOutfitToday } from '@/app/actions/outfits';

export const metadata = { title: 'Insights — Hanger' };

const CAT_COLORS = { Tops: '#1D1C1A', Bottoms: '#4A5A34', Shoes: '#9A3F1E', Outerwear: '#B08A5B', Dresses: '#CFC3AE', Accessories: '#7C8DA6' };

export default async function InsightsPage() {
  const user = await requireUser();
  const [items, outfits] = await Promise.all([
    prisma.item.findMany({ where: { userId: user.id } }),
    prisma.outfit.findMany({ where: { userId: user.id }, include: { items: { include: { item: true } } } }),
  ]);

  if (items.length === 0) {
    return (
      <>
        <h1 className="display">Insights</h1>
        <div className="empty">
          <strong style={{ color: 'var(--ink)' }}>No data yet</strong>
          <span>Add clothes and log what you wear — your stats show up here.</span>
          <Link href="/closet/new" className="btn btn-primary">Add item</Link>
        </div>
      </>
    );
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const forgotten = items.filter((i) => !i.lastWornAt || i.lastWornAt < cutoff).sort((a, b) => (a.lastWornAt?.getTime() ?? 0) - (b.lastWornAt?.getTime() ?? 0));
  const priced = items.filter((i) => i.price != null);
  const totalSpend = priced.reduce((a, i) => a + i.price, 0);
  const totalWears = priced.reduce((a, i) => a + i.wearCount, 0);
  const cpw = priced.length ? Math.round(totalSpend / Math.max(totalWears, 1)) : null;
  const mostWorn = [...items].sort((a, b) => b.wearCount - a.wearCount).slice(0, 6);
  const maxWorn = Math.max(1, ...mostWorn.map((i) => i.wearCount));
  const cats = CATEGORIES.map((c) => ({ name: c, n: items.filter((i) => i.category === c).length, color: CAT_COLORS[c] })).filter((c) => c.n > 0);

  const season = currentSeason();
  const suggestions = outfits
    .filter((o) => o.items.every(({ item }) => item.season === 'All year' || item.season === season))
    .sort((a, b) => (a.lastWornAt?.getTime() ?? 0) - (b.lastWornAt?.getTime() ?? 0))
    .slice(0, 3);

  const tops = items.filter((i) => i.category === 'Tops').length;
  const bottoms = items.filter((i) => i.category === 'Bottoms').length;
  let tip = null;
  if (tops > bottoms * 1.6 && tops >= 4) tip = 'You have far more tops than bottoms — one versatile pair of trousers would unlock the most new outfits.';
  else if (bottoms > tops * 1.6 && bottoms >= 4) tip = 'Bottoms outnumber tops — a couple of neutral tops would go with most of what you own.';

  const kpis = [
    { label: 'Pieces in closet', value: items.length, note: `${items.filter((i) => i.createdAt > new Date(Date.now() - 30 * 864e5)).length} added in the last 30 days` },
    { label: 'Outfits saved', value: outfits.length, note: `${outfits.filter((o) => o.wearCount > 0).length} worn at least once` },
    { label: 'Avg. cost per wear', value: cpw == null ? '—' : `₹${cpw}`, note: cpw == null ? 'Add prices to items to see this' : `Across ${priced.length} priced items` },
    { label: 'Unworn in 90 days', value: forgotten.length, note: `${Math.round((forgotten.length / items.length) * 100)}% of your closet` },
  ];

  return (
    <>
      <h1 className="display">Insights</h1>
      <div className="grid g4" style={{ gap: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="card kpi">
            <span className="muted small">{k.label}</span>
            <span className="val">{k.value}</span>
            <span className="small" style={{ color: 'var(--ink-2)' }}>{k.note}</span>
          </div>
        ))}
      </div>

      <div className="grid g2" style={{ gap: 16 }}>
        <section className="panel">
          <h2>Most worn</h2>
          {mostWorn.map((i) => (
            <div key={i.id} className="bar-row">
              <span className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(i.wearCount / maxWorn) * 100}%` }} /></div>
              <strong className="small" style={{ textAlign: 'right' }}>{i.wearCount}×</strong>
            </div>
          ))}
        </section>

        <section className="panel dark-panel">
          <div className="row"><h2>Suggested for today</h2><div className="spacer" /><span className="muted small">{season} · least recently worn</span></div>
          {suggestions.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Save a few outfits and suggestions will appear here. <Link href="/studio" style={{ color: '#F1C8B4' }}>Build one</Link></p>
          ) : (
            <div className="grid g3" style={{ gap: 12 }}>
              {suggestions.map((o) => (
                <div key={o.id} className="suggest">
                  <div style={{ display: 'flex', gap: 4, height: 90 }}>
                    {o.items.map(({ item }) => <span key={item.id} style={{ flexGrow: 1, borderRadius: 6, background: item.color }} />)}
                  </div>
                  <strong style={{ fontSize: 14 }}>{o.name}</strong>
                  <span className="muted small">Last worn: {formatDate(o.lastWornAt)}</span>
                  <form action={wearOutfitToday} style={{ marginTop: 'auto' }}>
                    <input type="hidden" name="id" value={o.id} />
                    <button className="btn btn-sm" style={{ width: '100%', background: 'var(--bg)' }}>Wear this</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid g2" style={{ gap: 16 }}>
        <section className="panel">
          <h2>Closet by category</h2>
          <div className="stack" role="img" aria-label={cats.map((c) => `${c.name} ${c.n}`).join(', ')}>
            {cats.map((c) => <span key={c.name} style={{ background: c.color, width: `${(c.n / items.length) * 100}%` }} />)}
          </div>
          <div className="legend">
            {cats.map((c) => <div key={c.name}><i style={{ background: c.color }} /><span className="small">{c.name}</span><strong className="small">{c.n}</strong></div>)}
          </div>
          {tip && <p className="small" style={{ margin: 0, color: 'var(--ink-2)' }}>{tip}</p>}
        </section>

        <section className="panel">
          <div className="row"><h2>Forgotten pieces</h2><div className="spacer" /><span className="muted small">Not worn in 90+ days</span></div>
          {forgotten.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Nice — you&apos;ve worn everything recently.</p>
          ) : forgotten.slice(0, 5).map((i) => (
            <div key={i.id} className="row">
              <span style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #CFC8BC', background: i.color, flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <strong style={{ fontSize: 14 }}>{i.name}</strong>
                <span className="muted small">Last worn: {formatDate(i.lastWornAt)}</span>
              </div>
              <Link href="/studio" className="btn btn-sm">Style it</Link>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
