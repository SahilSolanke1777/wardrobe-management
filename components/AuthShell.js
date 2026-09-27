import { Cutout } from './Garment';

const FLOAT = [
  { name: 'Overshirt', category: 'Tops', color: '#D8C7A6' },
  { name: 'Slip dress', category: 'Dresses', color: '#8E3A1C' },
  { name: 'Loafers', category: 'Shoes', color: '#6A4128' },
];

export default function AuthShell({ children }) {
  return (
    <div className="auth">
      <div className="auth-art">
        <div className="logo" style={{ color: 'var(--paper)' }}>Hanger</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="eyebrow" style={{ color: '#BDB5A7', marginBottom: 18 }}>The wardrobe studio</div>
          <div className="display">Your closet,<br /><em>as an archive.</em></div>
          <p style={{ color: '#CFC8BC', maxWidth: 420, fontSize: 17, marginTop: 20 }}>
            Style it on the table. Throw back what isn&apos;t you. A stylist that learns as you go.
          </p>
        </div>
        <div className="mono" style={{ color: '#8F887C' }}>Private to your account.</div>
        <div className="auth-garments" aria-hidden="true">
          {FLOAT.map((g, i) => <div key={g.name} style={{ '--i': i }}><Cutout item={g} /></div>)}
        </div>
      </div>
      <div className="auth-form">{children}</div>
    </div>
  );
}
