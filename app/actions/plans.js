'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { markOutfitWorn } from '@/lib/wear';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function back(date) {
  redirect(`/planner?m=${date.slice(0, 7)}&d=${date}`);
}

export async function planOutfit(formData) {
  const user = await requireUser();
  const date = String(formData.get('date') || '');
  const outfitId = Number(formData.get('outfitId'));
  if (!DATE_RE.test(date)) redirect('/planner');
  const outfit = await prisma.outfit.findFirst({ where: { id: outfitId, userId: user.id } });
  if (outfit) {
    await prisma.plan.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: { outfitId, worn: false },
      create: { userId: user.id, date, outfitId },
    });
  }
  revalidatePath('/planner');
  back(date);
}

export async function removePlan(formData) {
  const user = await requireUser();
  const date = String(formData.get('date') || '');
  await prisma.plan.deleteMany({ where: { userId: user.id, date } });
  revalidatePath('/planner');
  back(date);
}

export async function markPlanWorn(formData) {
  const user = await requireUser();
  const date = String(formData.get('date') || '');
  const plan = await prisma.plan.findUnique({ where: { userId_date: { userId: user.id, date } } });
  if (plan && !plan.worn) {
    const [y, m, d] = date.split('-').map(Number);
    await markOutfitWorn(plan.outfitId, user.id, new Date(y, m - 1, d, 12));
    await prisma.plan.update({ where: { id: plan.id }, data: { worn: true } });
  }
  revalidatePath('/planner');
  revalidatePath('/today');
  if (formData.get('from') === 'today') redirect('/today');
  back(date);
}

// ---------- direct (no-redirect) versions for the drag-and-drop planner ----------
export async function setPlan({ date, outfitId }) {
  const user = await requireUser();
  if (!DATE_RE.test(String(date))) return { ok: false };
  const outfit = await prisma.outfit.findFirst({ where: { id: Number(outfitId), userId: user.id } });
  if (!outfit) return { ok: false };
  await prisma.plan.upsert({
    where: { userId_date: { userId: user.id, date } },
    update: { outfitId: outfit.id, worn: false },
    create: { userId: user.id, date, outfitId: outfit.id },
  });
  revalidatePath('/planner');
  revalidatePath('/today');
  return { ok: true };
}

export async function clearPlan({ date }) {
  const user = await requireUser();
  await prisma.plan.deleteMany({ where: { userId: user.id, date: String(date) } });
  revalidatePath('/planner');
  revalidatePath('/today');
  return { ok: true };
}

export async function wearPlan({ date }) {
  const user = await requireUser();
  const plan = await prisma.plan.findUnique({ where: { userId_date: { userId: user.id, date: String(date) } } });
  if (!plan || plan.worn) return { ok: false };
  const [y, m, d] = String(date).split('-').map(Number);
  await markOutfitWorn(plan.outfitId, user.id, new Date(y, m - 1, d, 12));
  await prisma.plan.update({ where: { id: plan.id }, data: { worn: true } });
  revalidatePath('/planner');
  revalidatePath('/today');
  return { ok: true };
}
