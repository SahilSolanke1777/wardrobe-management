import { getUser } from '@/lib/auth';
import { loadCatalogue } from '@/lib/catalogue';

// GET /api/catalogue?group=Tops  → visible catalogue images for that app category
export async function GET(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const group = new URL(req.url).searchParams.get('group');
  const list = loadCatalogue()
    .filter((e) => !e.hidden && (!group || e.group === group))
    .map(({ id, best, photo, cutout, dataset, group: g, label, colour, colourHex, alt, photographer, photographerUrl, sourceUrl }) =>
      ({ id, src: best, photo, cutout, dataset, group: g, label, colour, colourHex, alt, photographer, photographerUrl, sourceUrl }));
  return Response.json({ items: list }, { headers: { 'Cache-Control': 'private, max-age=60' } });
}
