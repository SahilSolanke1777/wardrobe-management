'use client';
import { useEffect } from 'react';

// Garments tilt toward the cursor, like picking up a hanger. One listener for the whole app.
export default function TiltLayer() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    let current = null;
    const reset = (el) => { el.style.removeProperty('--tx'); el.style.removeProperty('--ty'); };
    const onMove = (e) => {
      const el = e.target.closest?.('[data-tilt]');
      if (current && current !== el) { reset(current); current = null; }
      if (!el) return;
      current = el;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--tx', (x * 14).toFixed(2));
      el.style.setProperty('--ty', (-y * 10).toFixed(2));
    };
    const onLeave = () => { if (current) { reset(current); current = null; } };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); };
  }, []);
  return null;
}
