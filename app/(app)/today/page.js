import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { currentSeason, toISODate, daysSince, ZONES } from '@/lib/wardrobe';
import { suggest, slotsFromItems } from '@/lib/stylist';
import { wearItemsToday } from '@/app/actions/stylist';
import { markPlanWorn } from '@/app/actions/plans';
import { Cutout } from '@/components/Garment';
import Composition from '@/components/Composition';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Today — Hanger' };

export default async function TodayPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const now = new Date();
  const iso = toISODate(now);
  const season = currentSeason(now);
  const weekday = now.getDay() >= 1 && now.getDay() <= 5;
  const occasion = weekday ? 'Work' : 'Casual';

  const [raw, rules, plan] = await Promise.all([
    prisma.item.findMany({ where: { userId: user.id } }),
    prisma.styleRule.findMany({ where: { userId: user.id } }),
    prisma.plan.findUnique({ where: { userId_date: { userId: user.id, date: iso } }, include: { outfit: { include: { items: true } } } }),
  ]);
  const items = raw.map((i) => ({ ...i, lastWornAt: i.lastWornAt ? i.lastWornAt.toISOString() : null }));
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));

  const dateTitle = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  if (items.length < 2) {
    return (
      <>
        <div className="eyebrow">{dateTitle}</div>
        <h1 className="display">Good to see you, {user.name.split(' ')[0]}.</h1>
        <div className="empty">
          <span className="display-sm" style={{ color: 'var(--ink)' }}>Start with three pieces.</span>
          <span>Add what you&apos;re wearing today. The stylist gets better with every piece.</span>
          <Link href="/closet/new" className="btn btn-primary">Add a piece</Link>
        </div>
      </>
    );
  }

  let look, planned = null, alternatives = [];
  if (plan && !sp.alt) {
    planned = plan;
    look = { slots: slotsFromItems(plan.outfit.items.map((x) => x.itemId), byId), notes: {}, reason: `Planned: ${plan.outfit.name}.` };
  } else {
    // stable for the day, so the page doesn't reshuffle on every refresh
    const seed = Number(iso.replaceAll('-', '')) + (Number(sp.alt) || 0) * 7919;
    const looks = suggest(items, rules, { occasion, season, seed, count: 3 });
    look = looks[0];
    alternatives = looks.slice(1);
  }
  if (!look) {
    return <div className="empty">Add at least one top so the stylist can build a look.</div>;
  }

  const pieces = ZONES.filter((z) => look.slots[z.key] != null).map((z) => ({ zone: z.key, item: byId[look.slots[z.key]], note: look.notes[z.key] }));
  const ids = pieces.map((p) => p.item.id);
  const forgotten = items.filter((i) => (daysSince(i.lastWornAt) ?? 999) >= 90).slice(0, 4);
  const altIndex = Number(sp.alt) || 0;

  return (
    <>
      <div className="today">
        <Composition slots={look.slots} byId={byId} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div>
            <div className="dateline">
              <span className="eyebrow">{season}</span>
              <span className="eyebrow">{planned ? 'From your planner' : `${occasion} · look ${altIndex + 1} of 3`}</span>
            </div>
            <h1 className="display" style={{ fontSize: 'clamp(46px, 5.4vw, 84px)', marginTop: 12 }}>{dateTitle}</h1>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, lineHeight: 1.25, margin: '18px 0 0' }}>{look.reason}</p>
          </div>

          <ul className="notes-list">
            {pieces.map((p, i) => (
              <li key={p.zone} style={{ '--i': i }}>
                <Link href={`/closet/${p.item.id}`} className="thumb lift" aria-label={p.item.name}><Cutout item={p.item} /></Link>
                <div className="credit">
                  <span className="name" style={{ fontSize: 19 }}>{p.item.name}</span>
                  <span className="meta">{p.note ? p.note : `${p.item.category.toUpperCase()} · WORN ${p.item.wearCount}×`}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="row wrap">
            {planned ? (
              planned.worn ? <span className="alert ok">Worn today. Nicely done.</span> : (
                <form action={markPlanWorn}><input type="hidden" name="date" value={iso} /><input type="hidden" name="from" value="today" /><SubmitButton pendingText="Logging…">Wear this</SubmitButton></form>
              )
            ) : (
              <form action={wearItemsToday}>
                {ids.map((id) => <input key={id} type="hidden" name="itemId" value={id} />)}
                <SubmitButton pendingText="Logging…">Wear this</SubmitButton>
              </form>
            )}
            <Link href={`/studio?items=${ids.join(',')}`} className="btn">Open on the table</Link>
            {!planned && <Link href={`/today?alt=${(altIndex + 1) % 3}`} className="btn btn-ghost" scroll={false}>Plan B →</Link>}
            {planned && <Link href="/today?alt=1" className="btn btn-ghost">Suggest something else</Link>}
          </div>
        </div>
      </div>

      {forgotten.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 40 }}>
          <hr className="rule" />
          <div className="row"><h2 className="display-sm">Gathering dust</h2><div className="spacer" /><span className="eyebrow">Not worn in 90+ days</span></div>
          <div className="looks-row">
            {forgotten.map((i) => (
              <Link key={i.id} href={`/studio?items=${i.id}`} className="look-card lift faded">
                <div className="garment" style={{ height: 200 }}><Cutout item={i} /></div>
                <span className="credit"><span className="name">{i.name}</span><span className="meta">STYLE IT BACK IN →</span></span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
