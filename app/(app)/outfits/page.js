import { redirect } from 'next/navigation';

// Outfits now live in the Studio
export default async function OutfitsPage({ searchParams }) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === 'string')).toString();
  redirect(q ? `/studio?${q}` : '/studio');
}
