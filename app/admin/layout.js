import { requireAdmin } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';

export const metadata = { title: 'Admin — Hanger' };

export default async function AdminLayout({ children }) {
  const user = await requireAdmin();
  const links = [
    { href: '/admin', label: 'Overview', exact: true },
    { href: '/admin/content', label: 'Content' },
    { href: '/admin/catalogue', label: 'Catalogue' },
    { href: '/today', label: '← Back to Hanger' },
  ];
  return (
    <div className="shell admin">
      <Sidebar user={user} links={links} subtitle="Admin" admin />
      <main className="main">{children}</main>
    </div>
  );
}
