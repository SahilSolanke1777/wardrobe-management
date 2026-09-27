import fs from 'node:fs/promises';
import path from 'node:path';
import { getUser } from '@/lib/auth';

const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export async function GET(_req, { params }) {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { file } = await params;
  const m = /^[a-f0-9]{24}\.(jpg|png|webp|gif)$/.exec(file);
  if (!m) return new Response('Not found', { status: 404 });
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'uploads', file));
    return new Response(data, { headers: { 'Content-Type': TYPES[m[1]], 'Cache-Control': 'private, max-age=31536000, immutable' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
