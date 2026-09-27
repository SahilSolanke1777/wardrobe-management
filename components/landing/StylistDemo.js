'use client';
import { useEffect, useRef, useState } from 'react';
import GarmentArt from '../GarmentArt';
import { DEMO } from './demo';

// Types a request, "pulls" pieces, lays out a look with a reason — then the next request.
const SCRIPTS = [
  { ask: 'Client lunch, then drinks — it’s 34° out', look: [DEMO.shirt, DEMO.trousers, DEMO.loafers], reason: 'Crisp and light for the heat; the loafers keep it office-ready.' },
  { ask: 'Rainy Monday, need to look sharp', look: [DEMO.blazer, DEMO.knit, DEMO.jeans, DEMO.boots], reason: 'Dark layers that shrug off the rain. The boots can take a puddle.' },
  { ask: 'Wedding sangeet, something with colour', look: [DEMO.floral, DEMO.heels, DEMO.scarf], reason: 'Floral midi plays against the gold — festive without trying too hard.' },
];

export default function StylistDemo() {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState('typing'); // typing → pulling → shown
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // start when on screen; pause when scrolled away (IntersectionObserver + a scroll fallback)
    const check = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setVisible(r.top < window.innerHeight * 0.8 && r.bottom > window.innerHeight * 0.2);
    };
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    if (ref.current) io.observe(ref.current);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', check); };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const s = SCRIPTS[i];
    let t;
    if (phase === 'typing') {
      if (typed.length < s.ask.length) t = setTimeout(() => setTyped(s.ask.slice(0, typed.length + 1)), 38);
      else t = setTimeout(() => setPhase('pulling'), 500);
    } else if (phase === 'pulling') t = setTimeout(() => setPhase('shown'), 1100);
    else t = setTimeout(() => { setI((i + 1) % SCRIPTS.length); setTyped(''); setPhase('typing'); }, 4200);
    return () => clearTimeout(t);
  }, [visible, i, typed, phase]);

  const s = SCRIPTS[i];
  return (
    <div className="stylistdemo" ref={ref}>
      <div className="sdm-ask">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" /></svg>
        <span>{typed}<i className="caret" /></span>
      </div>
      <div className={`sdm-stage ${phase}`}>
        {phase !== 'typing' && s.look.map((it, k) => (
          <div key={`${i}-${it.id}`} className="sdm-piece" style={{ '--k': k }}><GarmentArt item={it} /></div>
        ))}
        {phase === 'pulling' && <span className="eyebrow sdm-status">Pulling pieces from your rail…</span>}
      </div>
      <p className="sdm-reason" key={`${i}-${phase}`}>{phase === 'shown' ? s.reason : ' '}</p>
    </div>
  );
}
