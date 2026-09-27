import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { updateItem } from '@/app/actions/items';
import PieceEditor from '@/components/PieceEditor';

export const metadata = { title: 'Edit piece — Hanger' };

export default async function EditItemPage({ params, searchParams }) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;
  const item = await prisma.item.findFirst({ where: { id: Number(id), userId: user.id } });
  if (!item) notFound();
  const plain = { id: item.id, name: item.name, category: item.category, color: item.color, season: item.season, price: item.price, photo: item.photo };
  return <PieceEditor action={updateItem} item={plain} error={error} />;
}
