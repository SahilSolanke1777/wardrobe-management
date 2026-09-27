'use client';
import { useEffect, useRef, useState } from 'react';
import GarmentArt from '../GarmentArt';
import { DEMO } from './demo';
import { ZONES, boxFor } from '@/lib/wardrobe';

// A sticky stage: scrolling dresses the table piece by piece; scrolling back undresses it.
const STEPS = [
  { zone: 'bottom', item: DEMO.trousers, from: [-60, 40, -30], at: [0.08, 0.26], line: 'Start with what you actually wear.' },
  { zone: 'top', item: DEMO.shirt, from: [40, -70, 20], at: [0.24, 0.42], line: 'Pick it up. It snaps into place.' },
  { zone: 'outer', item: DEMO.coat, from: [-80, -30, -24], at: [0.40, 0.58], line: 'Layer it — the coat goes over, automatically.' },
  { zone: 'shoes', item: DEMO.loafers, from: [90, 60, 30], at: [0.56, 0.72], line: 'Finish it.' },
  { zone: 'extra', item: DEMO.tote, from: [90, -20, -30], at: [0.70, 0.86], line: 'And the stylist tells you why it works.' },
];
const ease = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export default function ScrollDress() {
  const sec = useRef(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setP(1); return; }
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = sec.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        setP(clamp01(-r.top / Math.max(1, total)));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);

  const current = [...STEPS].reverse().find((s) => p >= s.at[0]) || STEPS[0];

  return (
    <section className="scrolldress" ref={sec} aria-label="How styling works">
      <div className="sd-sticky">
        <div className="sd-copy">
          <span className="eyebrow">The table</span>
          <p className="sd-line" key={current.line}>{current.line}</p>
          <div className="sd-progress"><i style={{ transform: `scaleX(${p})` }} /></div>
        </div>
        <div className="sd-stage">
          {ZONES.map((z) => {
            const step = STEPS.find((s) => s.zone === z.key);
            if (!step) return null;
            const k = ease(clamp01((p - step.at[0]) / (step.at[1] - step.at[0])));
            const [l, t, w, h] = boxFor(z.key, false);
            const [fx, fy, fr] = step.from;
            return (
              <div key={z.key} className="sd-zone" style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, zIndex: z.z }}>
                <div className="sd-piece" style={{ opacity: k < 0.02 ? 0 : 1, transform: `translate(${(1 - k) * fx * 6}px, ${(1 - k) * fy * 6}px) rotate(${(1 - k) * fr}deg) scale(${0.85 + 0.15 * k})` }}>
                  <GarmentArt item={step.item} />
                </div>
              </div>
            );
          })}
          {p > 0.88 && <span className="sd-note" style={{ left: '46%', top: '47%' }}>A quiet base that lets the colour talk.</span>}
          {p > 0.92 && <span className="sd-note" style={{ left: '20%', top: '60%' }}>The coat goes over. Made for the cold.</span>}
          {p > 0.96 && <span className="sd-note" style={{ left: '80%', top: '92%' }}>Keeps it polished.</span>}
        </div>
      </div>
    </section>
  );
}
