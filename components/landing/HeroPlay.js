'use client';
import { useEffect, useRef } from 'react';
import GarmentArt from '../GarmentArt';
import { DEMO } from './demo';

// Garments you can grab and throw. Simple physics: inertia, friction, soft walls, spin from velocity.
const START = [
  { item: DEMO.coat, x: 0.14, y: 0.16, w: 0.30, r: -8 },
  { item: DEMO.shirt, x: 0.46, y: 0.06, w: 0.27, r: 5 },
  { item: DEMO.jeans, x: 0.50, y: 0.44, w: 0.22, r: -3 },
  { item: DEMO.loafers, x: 0.10, y: 0.68, w: 0.26, r: 4 },
  { item: DEMO.tote, x: 0.74, y: 0.52, w: 0.22, r: 9 },
  { item: DEMO.scarf, x: 0.76, y: 0.10, w: 0.18, r: -12 },
];

export default function HeroPlay() {
  const box = useRef(null);
  const els = useRef([]);
  const state = useRef([]);

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const W = () => host.clientWidth, H = () => host.clientHeight;
    state.current = START.map((s, i) => ({ x: s.x * W(), y: s.y * H(), vx: 0, vy: 0, r: s.r, vr: 0, drag: false, w: s.w * W(), z: i + 1, t: Math.random() * 6 }));
    let raf = 0, last = performance.now(), zTop = START.length + 1;

    const render = () => {
      state.current.forEach((s, i) => {
        const el = els.current[i];
        if (!el) return;
        const bob = s.drag || reduced ? 0 : Math.sin(s.t) * 5;
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.width = `${s.w}px`;
        el.style.height = `${s.w * 1.25}px`;
        el.style.zIndex = s.z;
        el.style.transform = `translate(${s.x}px, ${s.y + bob}px) rotate(${s.r}deg) scale(${s.drag ? 1.06 : 1})`;
      });
    };

    const tick = (now) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      const w = W(), h = H();
      for (const s of state.current) {
        s.t += 0.02 * dt;
        if (s.drag) continue;
        s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt;
        s.vx *= Math.pow(0.93, dt); s.vy *= Math.pow(0.93, dt); s.vr *= Math.pow(0.9, dt);
        const sh = s.w * 1.25;
        if (s.x < -s.w * 0.2) { s.x = -s.w * 0.2; s.vx = Math.abs(s.vx) * 0.6; s.vr += 1; }
        if (s.x > w - s.w * 0.8) { s.x = w - s.w * 0.8; s.vx = -Math.abs(s.vx) * 0.6; s.vr -= 1; }
        if (s.y < -sh * 0.2) { s.y = -sh * 0.2; s.vy = Math.abs(s.vy) * 0.6; }
        if (s.y > h - sh * 0.8) { s.y = h - sh * 0.8; s.vy = -Math.abs(s.vy) * 0.6; }
        s.r = Math.max(-40, Math.min(40, s.r));
        s.r += (Math.max(-14, Math.min(14, s.r)) - s.r) * 0.08; // ease back into a relaxed tilt
      }
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => { state.current.forEach((s, i) => { s.w = START[i].w * W(); }); };
    window.addEventListener('resize', onResize);

    const cleanups = els.current.map((el, i) => {
      if (!el) return () => {};
      let px = 0, py = 0, lx = 0, ly = 0, lt = 0;
      const down = (e) => {
        const s = state.current[i];
        s.drag = true; s.z = ++zTop; s.vx = s.vy = 0;
        px = e.clientX - s.x; py = e.clientY - s.y; lx = e.clientX; ly = e.clientY; lt = performance.now();
        el.setPointerCapture(e.pointerId);
        el.classList.add('held');
      };
      const move = (e) => {
        const s = state.current[i];
        if (!s.drag) return;
        const t = performance.now(), d = Math.max(8, t - lt);
        s.vx = ((e.clientX - lx) / d) * 16; s.vy = ((e.clientY - ly) / d) * 16;
        lx = e.clientX; ly = e.clientY; lt = t;
        s.x = e.clientX - px; s.y = e.clientY - py;
        s.r += (Math.max(-20, Math.min(20, s.vx * 1.4)) - s.r) * 0.2;
      };
      const up = () => {
        const s = state.current[i];
        if (!s.drag) return;
        s.drag = false; s.vr = Math.max(-5, Math.min(5, s.vx * 0.15));
        el.classList.remove('held');
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
    });

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); cleanups.forEach((c) => c()); };
  }, []);

  return (
    <div className="heroplay" ref={box} aria-label="A few garments you can pick up and throw">
      {START.map((s, i) => (
        <div key={s.item.id} className="hp-piece" ref={(el) => { els.current[i] = el; }} style={{ width: `${s.w * 100}%`, left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: `rotate(${s.r}deg)` }}>
          <GarmentArt item={s.item} />
        </div>
      ))}
      <span className="hp-hint">Go on — pick one up.</span>
    </div>
  );
}
