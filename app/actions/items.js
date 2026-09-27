'use server';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { CATEGORIES, SEASONS } from '@/lib/wardrobe';
import { findCatalogueEntry } from '@/lib/catalogue';
import { isCataloguePath } from '@/lib/catalogue-shared';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

async function savePhoto(file) {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  const ext = EXT[file.type];
  if (!ext) throw new Error('Photo must be a JPG, PNG, WEBP or GIF image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Photo must be smaller than 5 MB.');
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

// Only files the user uploaded live in /uploads; catalogue images (/clothing/...) are shared and never deleted
async function removeUpload(photo) {
  if (photo && !photo.startsWith('/')) await fs.unlink(path.join(UPLOAD_DIR, photo)).catch(() => {});
}

function catalogueChoice(formData) {
  const p = String(formData.get('catalogPhoto') || '');
  if (!isCataloguePath(p)) return null;
  const e = findCatalogueEntry(p);
  return e ? e.best : null;
}

export async function createItem(formData) {
  const user = await requireUser();
  const name = String(formData.get('name') || '').trim();
  const category = String(formData.get('category') || '');
  const season = String(formData.get('season') || 'All year');
  const color = String(formData.get('color') || '#D8C7A6');
  const priceRaw = String(formData.get('price') || '').trim();
  const bad = (m) => redirect(`/closet/new?error=${encodeURIComponent(m)}`);
  if (!name) bad('Please give the item a name.');
  if (!CATEGORIES.includes(category)) bad('Please choose a category.');
  if (!SEASONS.includes(season)) bad('Please choose a season.');
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) bad('Please choose a colour.');
  const price = priceRaw === '' ? null : Number(priceRaw);
  if (price !== null && (!Number.isFinite(price) || price < 0)) bad('Price must be a positive number.');
  let photo = null;
  try {
    photo = await savePhoto(formData.get('photo'));
  } catch (e) {
    bad(e.message);
  }
  if (!photo) photo = catalogueChoice(formData);
  const created = await prisma.item.create({ data: { userId: user.id, name, category, season, color, price, photo } });
  revalidatePath('/closet');
  redirect(`/closet/${created.id}?added=1`);
}

export async function deleteItem(formData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  const item = await prisma.item.findFirst({ where: { id, userId: user.id } });
  if (item) {
    await prisma.item.delete({ where: { id } });
    await removeUpload(item.photo);
  }
  revalidatePath('/closet');
  redirect('/closet');
}

export async function wearItemToday(formData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  await prisma.item.updateMany({
    where: { id, userId: user.id },
    data: { wearCount: { increment: 1 }, lastWornAt: new Date() },
  });
  revalidatePath('/closet');
  revalidatePath(`/closet/${id}`);
}

export async function updateItem(formData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  const item = await prisma.item.findFirst({ where: { id, userId: user.id } });
  if (!item) redirect('/closet');
  const name = String(formData.get('name') || '').trim();
  const category = String(formData.get('category') || '');
  const season = String(formData.get('season') || 'All year');
  const color = String(formData.get('color') || '#D8C7A6');
  const priceRaw = String(formData.get('price') || '').trim();
  const bad = (m) => redirect(`/closet/${id}/edit?error=${encodeURIComponent(m)}`);
  if (!name) bad('Please give the item a name.');
  if (!CATEGORIES.includes(category)) bad('Please choose a category.');
  if (!SEASONS.includes(season)) bad('Please choose a season.');
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) bad('Please choose a colour.');
  const price = priceRaw === '' ? null : Number(priceRaw);
  if (price !== null && (!Number.isFinite(price) || price < 0)) bad('Price must be a positive number.');
  let photo = item.photo;
  try {
    const next = await savePhoto(formData.get('photo'));
    if (next) photo = next;
  } catch (e) {
    bad(e.message);
  }
  if (photo === item.photo) {
    const picked = catalogueChoice(formData);
    if (picked) photo = picked;
  }
  if (formData.get('removePhoto') && photo === item.photo) photo = null;
  if (photo !== item.photo) await removeUpload(item.photo);
  await prisma.item.update({ where: { id }, data: { name, category, season, color, price, photo } });
  revalidatePath('/closet');
  revalidatePath(`/closet/${id}`);
  redirect(`/closet/${id}?saved=1`);
}
