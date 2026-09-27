import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createOutfit, deleteOutfit, wearOutfitToday } from '@/app/actions/outfits';
import { slotsFromItems } from '@/lib/stylist';
import Table from '@/components/Table';

export const metadata = { title: 'Studio — Hanger' };

export default async function StudioPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [raw, rules, outfits] = await Promise.all([
    prisma.item.findMany({ where: { userId: user.id }, orderBy: [{ category: 'asc' }, { wearCount: 'desc' }] }),
    prisma.styleRule.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.outfit.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, include: { items: { include: { item: true } } } }),
  ]);

  const items = raw.map((i) => ({
    id: i.id, name: i.name, category: i.category, color: i.color, season: i.season, photo: i.photo,
    wearCount: i.wearCount, lastWornAt: i.lastWornAt ? i.lastWornAt.toISOString() : null,
  }));
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));

  let startIds = [];
  if (typeof sp.items === 'string') startIds = sp.items.split(',').map(Number).filter(Number.isInteger);
  if (sp.outfit) {
    const o = outfits.find((x) => x.id === Number(sp.outfit));
    if (o) startIds = o.items.map((x) => x.itemId);
  }
  const initialSlots = slotsFromItems(startIds, byId);
  const plainRules = rules.map((r) => ({ id: r.id, kind: r.kind, itemId: r.itemId, otherItemId: r.otherItemId, season: r.season, text: r.text, createdAt: r.createdAt.toISOString() }));

  const savedLooks = outfits.map((o) => ({ id: o.id, name: o.name, occasion: o.occasion, wearCount: o.wearCount, itemIds: o.items.map((x) => x.itemId) }));

  return (
    <>
      {sp.error && <div className="alert" role="alert">{sp.error}</div>}
      {sp.saved && <div className="alert ok toast" role="status">Look saved to your archive.</div>}
      <Table
        key={startIds.join(',') || 'empty'}
        items={items}
        initialRules={plainRules}
        initialSlots={initialSlots}
        saveAction={createOutfit}
        savedLooks={savedLooks}
        wearAction={wearOutfitToday}
        deleteAction={deleteOutfit}
      />
    </>
  );
}
