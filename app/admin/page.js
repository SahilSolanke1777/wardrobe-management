import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { setUserRole, setUserStatus } from '@/app/actions/admin';
import { formatDate } from '@/lib/wardrobe';

export default async function AdminOverview({ searchParams }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 864e5);

  const [userCount, activeSessions, itemCount, outfitCount, suspended, recentSignups, users] = await Promise.all([
    prisma.user.count(),
    prisma.session.findMany({ where: { createdAt: { gte: weekAgo } }, select: { userId: true }, distinct: ['userId'] }),
    prisma.item.count(),
    prisma.outfit.count(),
    prisma.user.count({ where: { status: 'SUSPENDED' } }),
    prisma.user.findMany({ where: { createdAt: { gte: twelveWeeksAgo } }, select: { createdAt: true } }),
    prisma.user.findMany({
      where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { items: true, outfits: true } } },
    }),
  ]);

  // sign-ups per week, oldest first
  const weeks = Array.from({ length: 12 }, () => 0);
  for (const u of recentSignups) {
    const idx = 11 - Math.floor((Date.now() - u.createdAt.getTime()) / (7 * 864e5));
    if (idx >= 0 && idx < 12) weeks[idx] += 1;
  }
  const maxWeek = Math.max(1, ...weeks);

  const kpis = [
    { label: 'Total users', value: userCount, note: `${recentSignups.length} joined in the last 12 weeks` },
    { label: 'Active this week', value: activeSessions.length, note: 'Users who logged in in the last 7 days' },
    { label: 'Items uploaded', value: itemCount, note: `${outfitCount} outfits built` },
    { label: 'Suspended accounts', value: suspended, note: suspended ? 'Review in the table below' : 'None' },
  ];

  return (
    <>
      <div className="row"><h1 style={{ fontSize: 28 }}>Overview</h1></div>
      <div className="grid g4" style={{ gap: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="card kpi" style={{ borderColor: '#E4E1DA' }}>
            <span className="muted small">{k.label}</span>
            <span style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>{k.value.toLocaleString('en-IN')}</span>
            <span className="small muted">{k.note}</span>
          </div>
        ))}
      </div>

      <section className="panel" style={{ borderColor: '#E4E1DA' }}>
        <h2>New sign-ups per week</h2>
        <div className="signup-bars" role="img" aria-label={`Sign-ups over the last 12 weeks: ${weeks.join(', ')}`}>
          {weeks.map((n, i) => (
            <div key={i} title={`${n} sign-ups`}>
              <span>{n}</span>
              <b style={{ height: `${(n / maxWeek) * 100}px` }} />
              <span>{i === 11 ? 'This wk' : `-${11 - i}w`}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ borderColor: '#E4E1DA', overflow: 'hidden' }}>
        <div className="row" style={{ padding: '16px 24px' }}>
          <h2 style={{ fontSize: 16 }}>Users</h2>
          <div className="spacer" />
          <form className="search" role="search" action="/admin" style={{ width: 320 }}>
            <label htmlFor="uq" className="sr-only">Search users</label>
            <input id="uq" name="q" type="search" defaultValue={q} placeholder="Search name or email…" />
          </form>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr><th>User</th><th>Items</th><th>Outfits</th><th>Joined</th><th>Role</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <span className="avatar" style={{ width: 32, height: 32, background: '#EDE7DC', color: 'var(--ink)', fontSize: 13 }}>{u.name.charAt(0).toUpperCase()}</span>
                      <span style={{ display: 'flex', flexDirection: 'column' }}><strong>{u.name}{u.id === me.id ? ' (you)' : ''}</strong><span className="muted small">{u.email}</span></span>
                    </div>
                  </td>
                  <td>{u._count.items}</td>
                  <td>{u._count.outfits}</td>
                  <td className="muted">{formatDate(u.createdAt)}</td>
                  <td><span className={`pill ${u.role === 'ADMIN' ? 'ADMIN' : ''}`}>{u.role === 'ADMIN' ? 'Admin' : 'Member'}</span></td>
                  <td><span className={`pill ${u.status}`}>{u.status === 'ACTIVE' ? 'Active' : 'Suspended'}</span></td>
                  <td>
                    {u.id !== me.id && (
                      <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                        <form action={setUserRole}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="role" value={u.role === 'ADMIN' ? 'USER' : 'ADMIN'} />
                          <button className="btn btn-sm">{u.role === 'ADMIN' ? 'Remove admin' : 'Make admin'}</button>
                        </form>
                        <form action={setUserStatus}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="status" value={u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'} />
                          <button className={u.status === 'ACTIVE' ? 'btn btn-sm btn-danger' : 'btn btn-sm'}>{u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
