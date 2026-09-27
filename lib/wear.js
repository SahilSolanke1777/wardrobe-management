import { prisma } from './db';

// Marks an outfit and each of its pieces as worn on the given date (default: now)
export async function markOutfitWorn(outfitId, userId, when = new Date()) {
  const outfit = await prisma.outfit.findFirst({ where: { id: outfitId, userId }, include: { items: true } });
  if (!outfit) return;
  await prisma.$transaction([
    prisma.outfit.update({ where: { id: outfit.id }, data: { wearCount: { increment: 1 }, lastWornAt: when } }),
    prisma.item.updateMany({
      where: { id: { in: outfit.items.map((i) => i.itemId) }, userId },
      data: { wearCount: { increment: 1 }, lastWornAt: when },
    }),
  ]);
}
