import Link from 'next/link';
import GarmentArt from '../GarmentArt';
import HeroPlay from './HeroPlay';
import ScrollDress from './ScrollDress';
import StylistDemo from './StylistDemo';
import { DEMO } from './demo';

const RAIL = [DEMO.coat, DEMO.check, DEMO.slip, DEMO.jeans, DEMO.knit, DEMO.floral, DEMO.denim, DEMO.tee, DEMO.skirt, DEMO.blazer, DEMO.shirt, DEMO.trousers];

export default function Landing() {
  return (
    <div className="landing">
      <header className="l-top">
        <span className="logo">Hanger</span>
        <nav className="l-nav">
          <a href="#how">How it works</a>
          <a href="#stylist">The stylist</a>
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="btn btn-dark btn-sm">Start free</Link>
        </nav>
      </header>

      <section className="l-hero">
        <div className="l-hero-copy">
          <span className="eyebrow">The wardrobe studio</span>
          <h1 className="l-title">Your closet,<br /><em>as an archive.</em></h1>
          <p className="l-lede">Photograph what you own — or let us draw it. Style it on a table where clothes behave like clothes. A stylist that learns what you’ll actually wear.</p>
          <div className="row wrap">
            <Link href="/signup" className="btn btn-primary">Start with three pieces</Link>
            <Link href="/login" className="btn">I have an account</Link>
          </div>
        </div>
        <HeroPlay />
      </section>

      <section className="l-rail" aria-label="An archive of clothes">
        <div className="l-rail-track">
          {[...RAIL, ...RAIL].map((it, i) => (
            <div key={i} className="l-hang" style={{ '--k': (0.6 + ((i * 37) % 40) / 50).toFixed(2), '--d': `${(i % 7) * -0.7}s` }}>
              <svg className="hook" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M15 2c-3 0-4 3-2 4.5S15 9 15 11M15 11 4 22h22L15 11z" /></svg>
              <div className="l-hang-art"><GarmentArt item={it} /></div>
            </div>
          ))}
        </div>
      </section>

      <div id="how" />
      <ScrollDress />

      <section className="l-stylist" id="stylist">
        <div>
          <span className="eyebrow">The stylist</span>
          <h2 className="l-h2">Tell it the day.<br /><em>It pulls the pieces.</em></h2>
          <p className="l-lede">Occasion, heat, rain, what you wore last week. Every piece arrives with a reason. Throw one back and tell it why — it remembers, and you can see everything it’s learned.</p>
        </div>
        <StylistDemo />
      </section>

      <section className="l-three">
        {[
          ['The Rail', 'Every piece hangs where you can see it. Forgotten things fade and drift forward until you wear them again.', DEMO.denim],
          ['The Table', 'Drag, flick, pin, throw. Pieces snap into place and layer themselves. Undo anything.', DEMO.slip],
          ['The Planner', 'Drag a look onto a day. Mark it worn and every piece keeps count — cost per wear included.', DEMO.loafers],
        ].map(([t, d, it], i) => (
          <article key={t} className="l-card" data-tilt style={{ '--i': i }}>
            <div className="l-card-art"><GarmentArt item={it} /></div>
            <h3 className="display-sm">{t}</h3>
            <p className="muted">{d}</p>
          </article>
        ))}
      </section>

      <section className="l-cta">
        <h2 className="l-h2">Start with<br /><em>three pieces.</em></h2>
        <p className="l-lede" style={{ color: '#CFC8BC' }}>Free, private to you, and it takes about three minutes to your first look.</p>
        <Link href="/signup" className="btn btn-primary">Create your closet</Link>
      </section>

      <footer className="l-foot"><span className="logo" style={{ fontSize: 24 }}>Hanger</span><span className="mono">Wear what you own. · Catalogue photos by <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a></span></footer>
    </div>
  );
}
