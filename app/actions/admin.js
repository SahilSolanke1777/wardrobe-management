'use server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export async function setUserStatus(formData) {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  const status = formData.get('status') === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';
  if (id === admin.id) return; // can't suspend yourself
  await prisma.user.update({ where: { id }, data: { status } });
  if (status === 'SUSPENDED') await prisma.session.deleteMany({ where: { userId: id } });
  revalidatePath('/admin');
}

export async function setUserRole(formData) {
  const admin = await requireAdmin();
  const id = Number(formData.get('id'));
  const role = formData.get('role') === 'ADMIN' ? 'ADMIN' : 'USER';
  if (id === admin.id) return; // can't demote yourself
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath('/admin');
}

export async function adminDeleteItem(formData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const item = await prisma.item.findUnique({ where: { id } });
  if (item) {
    await prisma.item.delete({ where: { id } });
    if (item.photo && !item.photo.startsWith('/')) await fs.unlink(path.join(process.cwd(), 'uploads', item.photo)).catch(() => {});
  }
  revalidatePath('/admin/content');
}

// Hide / show an image from the Pexels catalogue (admin review)
export async function toggleCatalogueHidden(photoPath) {
  await requireAdmin();
  const { readHidden, writeHidden } = await import('@/lib/catalogue');
  const { isCataloguePath } = await import('@/lib/catalogue-shared');
  if (!isCataloguePath(photoPath)) return { ok: false };
  const set = readHidden();
  const hidden = !set.has(photoPath);
  if (hidden) set.add(photoPath); else set.delete(photoPath);
  writeHidden(set);
  revalidatePath('/admin/catalogue');
  return { ok: true, hidden };
}
