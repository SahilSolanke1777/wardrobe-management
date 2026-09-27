'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Cutout } from './Garment';

// Garments hanging on a rail. Scrolling swings them: the sway follows scroll
// velocity and settles back with a damped spring, like real hangers.
export default function Rail({ items, onOpen }) {
  const wrap = useRef(null);
  const rail = useRef(null);

  useEffect(() => {
    const el = rail.current;
    const host = wrap.current;
    if (!el || !host) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let last = el.scrollLeft, lastT = performance.now();
    let angle = 0, vel = 0, target = 0, raf = 0;
    const onScroll = () => {
      const t = performance.now();
      const v = (el.scrollLeft - last) / Math.max(16, t - lastT); // px per ms
      last = el.scrollLeft; lastT = t;
      target = Math.max(-9, Math.min(9, -v * 6));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      // spring toward target, target decays to rest
      vel += (target - angle) * 0.12;
      vel *= 0.82;
      angle += vel;
      target *= 0.9;
      host.style.setProperty('--sway', angle.toFixed(2));
      if (Math.abs(angle) > 0.02 || Math.abs(vel) > 0.02 || Math.abs(target) > 0.02) raf = requestAnimationFrame(tick);
      else { host.style.setProperty('--sway', '0'); raf = 0; }
    };
    // vertical wheel scrolls the rail sideways
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('scroll', onScroll); el.removeEventListener('wheel', onWheel); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="rail-wrap" ref={wrap}>
      <div className="rail" ref={rail}>
        {items.map((item, i) => (
          <Link
            key={item.id}
            href={`/closet/${item.id}`}
            onClick={onOpen ? (e) => onOpen(i, e) : undefined}
            data-tilt
            className={`hang lift${item.forgotten ? ' faded' : ''}`}
            style={{ '--i': Math.min(i, 14), '--k': (0.75 + ((item.id * 37) % 50) / 100).toFixed(2) }}
            aria-label={`${item.name}, ${item.category}, worn ${item.wearCount} times`}
          >
            <svg className="hook" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M15 2c-3 0-4 3-2 4.5S15 9 15 11M15 11 4 22h22L15 11z" />
            </svg>
            <div className="garment"><Cutout item={item} /></div>
            <div className="credit">
              <span className="name">{item.name}</span>
              <span className="meta">{item.category.toUpperCase()} · WORN {item.wearCount}×</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
