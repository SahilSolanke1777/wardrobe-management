'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

export default function NavLinks({ links }) {
  const path = usePathname();
  return (
    <div className="nav-links">
      {links.map((l) => {
        const active = l.exact ? path === l.href : path === l.href || path.startsWith(l.href + '/');
        return (
          <Link key={l.href} href={l.href} className={active ? 'nav-link active' : 'nav-link'} aria-current={active ? 'page' : undefined}>
            {l.icon && <Icon name={l.icon} />}
            <span>{l.label}</span>
            {l.badge ? <span className="badge">{l.badge}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
