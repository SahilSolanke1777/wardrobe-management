import Link from 'next/link';
import NavLinks from './NavLinks';
import Icon from './Icon';
import { logout } from '@/app/actions/auth';

// Editorial masthead (kept the file name so existing imports still work)
export default function Sidebar({ user, links, subtitle, admin = false }) {
  return (
    <header className="topbar">
      <Link href={admin ? '/admin' : '/today'} className="logo">
        Hanger{admin && <span className="admin-tag">ADMIN</span>}
      </Link>
      <nav aria-label="Main"><NavLinks links={links} /></nav>
      <div className="user-card">
        <div className="who">
          <span>{user.name}</span>
          <span>{subtitle}</span>
        </div>
        <div className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</div>
        <form action={logout}>
          <button className="icon-btn" aria-label="Log out" title="Log out"><Icon name="logout" size={18} /></button>
        </form>
      </div>
    </header>
  );
}
