import { requireUser } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import TiltLayer from '@/components/TiltLayer';

export default async function AppLayout({ children }) {
  const user = await requireUser();
  const links = [
    { href: '/today', label: 'Today' },
    { href: '/closet', label: 'Closet' },
    { href: '/studio', label: 'Studio' },
    { href: '/planner', label: 'Planner' },
    { href: '/insights', label: 'Insights' },
  ];
  if (user.role === 'ADMIN') links.push({ href: '/admin', label: 'Admin' });
  return (
    <div className="shell">
      <Sidebar user={user} links={links} subtitle={user.role === 'ADMIN' ? 'Admin' : 'Member'} />
      <main className="main">{children}</main>
      <footer className="app-foot"><span>Hanger</span><span>Catalogue photos provided by <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a></span></footer>
      <TiltLayer />
    </div>
  );
}
