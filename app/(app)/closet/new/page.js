import { createItem } from '@/app/actions/items';
import PieceEditor from '@/components/PieceEditor';

export const metadata = { title: 'Add a piece — Hanger' };

export default async function NewItemPage({ searchParams }) {
  const { error } = await searchParams;
  return <PieceEditor action={createItem} error={error} />;
}
