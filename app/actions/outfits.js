'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { OCCASIONS } from '@/lib/wardrobe';
import { markOutfitWorn } from '@/lib/wear';

export async function createOutfit(formData) {
  const user = await requireUser();
  const name = String(formData.get('name') || '').trim() || 'Untitled outfit';
  const occasion = OCCASIONS.includes(String(formData.get('occasion'))) ? String(formData.get('occasion')) : 'Casual';
  const ids = formData.getAll('itemId').map(Number).filter(Number.isInteger);
  const owned = await prisma.item.findMany({ where: { id: { in: ids }, userId: user.id }, select: { id: true } });
  if (owned.length === 0) redirect('/studio?error=' + encodeURIComponent('Pick at least one piece first.'));
  await prisma.outfit.create({
    data: { userId: user.id, name, occasion, items: { create: owned.map((i) => ({ itemId: i.id })) } },
  });
  revalidatePath('/studio');
  redirect('/studio?saved=1');
}

export async function deleteOutfit(formData) {
  const user = await requireUser();
  await prisma.outfit.deleteMany({ where: { id: Number(formData.get('id')), userId: user.id } });
  revalidatePath('/studio');
}

export async function wearOutfitToday(formData) {
  const user = await requireUser();
  await markOutfitWorn(Number(formData.get('id')), user.id);
  revalidatePath('/studio');
  revalidatePath('/insights');
}
