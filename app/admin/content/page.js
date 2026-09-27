import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { adminDeleteItem } from '@/app/actions/admin';
import { formatDate } from '@/lib/wardrobe';
import Garment from '@/components/Garment';

export const metadata = { title: 'Content — Hanger admin' };

export default async function AdminContent({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const onlyPhotos = sp.photos === '1';
  const items = await prisma.item.findMany({
    where: onlyPhotos ? { photo: { not: null } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: { user: { select: { name: true, email: true } } },
  });
  return (
    <>
      <div className="row">
        <div>
          <h1 style={{ fontSize: 28 }}>Content</h1>
          <p className="sub">Latest uploads across all users. Remove anything that breaks the rules.</p>
        </div>
        <div className="spacer" />
        <a className={onlyPhotos ? 'chip' : 'chip on'} href="/admin/content">All items</a>
        <a className={onlyPhotos ? 'chip on' : 'chip'} href="/admin/content?photos=1">With photos</a>
      </div>
      {items.length === 0 ? (
        <div className="empty">Nothing uploaded yet.</div>
      ) : (
        <div className="grid g4" style={{ gap: 16 }}>
          {items.map((i) => (
            <article key={i.id} className="card item-card" style={{ borderColor: '#E4E1DA' }}>
              <Garment item={i} size={110} height={170} />
              <div className="item-body">
                <strong>{i.name}</strong>
                <span className="muted small">{i.category} · {formatDate(i.createdAt)}</span>
                <span className="muted small">by {i.user.name} ({i.user.email})</span>
                <form action={adminDeleteItem} className="item-actions">
                  <input type="hidden" name="id" value={i.id} />
                  <button className="btn btn-sm btn-danger">Remove</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
