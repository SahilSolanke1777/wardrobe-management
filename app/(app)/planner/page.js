import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { toISODate } from '@/lib/wardrobe';
import PlannerBoard from '@/components/PlannerBoard';

export const metadata = { title: 'Planner — Hanger' };

export default async function PlannerPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = new Date();
  const todayISO = toISODate(today);

  let year = today.getFullYear();
  let month = today.getMonth();
  if (typeof sp.m === 'string' && /^\d{4}-\d{2}$/.test(sp.m)) {
    year = Number(sp.m.slice(0, 4));
    month = Number(sp.m.slice(5, 7)) - 1;
  }
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const start = new Date(year, month, 1 - offset);
  const lastOfMonth = new Date(year, month + 1, 0);
  const cells = Math.ceil((offset + lastOfMonth.getDate()) / 7) * 7;
  const dates = Array.from({ length: cells }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const days = dates.map((d) => ({ iso: toISODate(d), num: d.getDate(), inMonth: d.getMonth() === month, label: d.toDateString() }));
  const rangeStart = days[0].iso;
  const rangeEnd = days[days.length - 1].iso;

  const [plans, outfits, items] = await Promise.all([
    prisma.plan.findMany({ where: { userId: user.id, date: { gte: rangeStart, lte: rangeEnd } } }),
    prisma.outfit.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, include: { items: true } }),
    prisma.item.findMany({ where: { userId: user.id }, select: { id: true, name: true, category: true, color: true, photo: true } }),
  ]);

  const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const inView = today.getFullYear() === year && today.getMonth() === month;
  const selected = typeof sp.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : inView ? todayISO : toISODate(first);

  return (
    <PlannerBoard
      key={monthKey(year, month)}
      monthTitle={first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
      prevHref={`/planner?m=${monthKey(prev.getFullYear(), prev.getMonth())}`}
      nextHref={`/planner?m=${monthKey(next.getFullYear(), next.getMonth())}`}
      todayHref="/planner"
      days={days}
      initialPlans={Object.fromEntries(plans.map((p) => [p.date, { outfitId: p.outfitId, worn: p.worn }]))}
      outfits={outfits.map((o) => ({ id: o.id, name: o.name, occasion: o.occasion, wearCount: o.wearCount, itemIds: o.items.map((x) => x.itemId) }))}
      byId={Object.fromEntries(items.map((i) => [i.id, i]))}
      initialSelected={selected}
      todayISO={todayISO}
    />
  );
}
