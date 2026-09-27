'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { currentSeason } from '@/lib/wardrobe';

const KINDS = ['not_me', 'wrong_colour', 'too_warm', 'worn_recently'];

function ruleText(kind, item, other, season) {
  const n = item.name.toLowerCase();
  if (kind === 'not_me') return `Don't suggest the ${n}.`;
  if (kind === 'too_warm') return `The ${n} is too warm for ${season.toLowerCase()}.`;
  if (kind === 'worn_recently') return `Rest the ${n} for a week.`;
  return `Don't pair the ${n} with the ${other.name.toLowerCase()}.`;
}

const plain = (r) => ({ id: r.id, kind: r.kind, itemId: r.itemId, otherItemId: r.otherItemId, season: r.season, text: r.text, createdAt: r.createdAt.toISOString() });

// Called from the Table when a piece is thrown off and the user says why.
export async function addStyleRules({ kind, itemId, otherIds = [] }) {
  const user = await requireUser();
  if (!KINDS.includes(kind)) return [];
  const item = await prisma.item.findFirst({ where: { id: Number(itemId), userId: user.id } });
  if (!item) return [];
  const season = currentSeason();
  const created = [];
  if (kind === 'wrong_colour') {
    const others = await prisma.item.findMany({ where: { id: { in: otherIds.map(Number).slice(0, 4) }, userId: user.id } });
    for (const o of others) {
      created.push(await prisma.styleRule.create({ data: { userId: user.id, kind, itemId: item.id, otherItemId: o.id, text: ruleText(kind, item, o) } }));
    }
  } else {
    created.push(await prisma.styleRule.create({ data: { userId: user.id, kind, itemId: item.id, season: kind === 'too_warm' ? season : null, text: ruleText(kind, item, null, season) } }));
  }
  revalidatePath('/today');
  return created.map(plain);
}

export async function deleteStyleRule(id) {
  const user = await requireUser();
  await prisma.styleRule.deleteMany({ where: { id: Number(id), userId: user.id } });
  revalidatePath('/today');
  return true;
}

// "Wear this" for a look that isn't a saved outfit: log every piece as worn today.
export async function wearItemsToday(formData) {
  const user = await requireUser();
  const ids = formData.getAll('itemId').map(Number).filter(Number.isInteger);
  if (ids.length) {
    await prisma.item.updateMany({ where: { id: { in: ids }, userId: user.id }, data: { wearCount: { increment: 1 }, lastWornAt: new Date() } });
  }
  revalidatePath('/today');
  revalidatePath('/closet');
  revalidatePath('/insights');
}
