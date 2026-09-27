'use client';
import { useMemo, useState, useTransition } from 'react';
import { toggleCatalogueHidden } from '@/app/actions/admin';
import { DATASET } from '@/lib/catalogue-shared';

// Admin: skim the Pexels dataset and hide anything that isn't right (wrong item, logos, busy scenes).
export default function CatalogueReview({ entries }) {
  const [hidden, setHidden] = useState(() => new Set(entries.filter((e) => e.hidden).map((e) => e.photo)));
  const [cat, setCat] = useState('all');
  const [show, setShow] = useState('all'); // all | visible | hidden | photos
  const [, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c = {};
    for (const e of entries) c[e.dataset] = (c[e.dataset] || 0) + (hidden.has(e.photo) ? 0 : 1);
    return c;
  }, [entries, hidden]);

  const toggle = (photo) => {
    setHidden((h) => { const n = new Set(h); if (n.has(photo)) n.delete(photo); else n.add(photo); return n; });
    startTransition(async () => { await toggleCatalogueHidden(photo); });
  };

  const list = entries.filter((e) =>
    (cat === 'all' || e.dataset === cat) &&
    (show === 'all' || (show === 'hidden' ? hidden.has(e.photo) : show === 'visible' ? !hidden.has(e.photo) : !e.cutout)));

  return (
    <>
      <div className="row wrap" style={{ gap: 6 }}>
        <button type="button" className={cat === 'all' ? 'chip on' : 'chip'} onClick={() => setCat('all')}>All · {entries.length - hidden.size}</button>
        {Object.keys(DATASET).map((k) => (
          <button type="button" key={k} className={cat === k ? 'chip on' : 'chip'} onClick={() => setCat(k)}>{DATASET[k].label} · {counts[k] || 0}</button>
        ))}
      </div>
      <div className="row wrap" style={{ gap: 6 }}>
        {[['all', 'Everything'], ['visible', 'Visible'], ['hidden', `Hidden · ${hidden.size}`], ['photos', 'No cut-out']].map(([k, l]) => (
          <button type="button" key={k} className={show === k ? 'chip on' : 'chip'} onClick={() => setShow(k)}>{l}</button>
        ))}
        <span className="muted small" style={{ marginLeft: 8 }}>Click an image to hide it from the site; click again to bring it back.</span>
      </div>
      <div className="review-grid">
        {list.map((e) => {
          const off = hidden.has(e.photo);
          return (
            <button type="button" key={e.photo} className={`review-item${off ? ' off' : ''}${e.cutout ? ' is-cut' : ''}`} onClick={() => toggle(e.photo)} aria-pressed={off} title={e.alt}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.best} alt={e.alt || e.label} loading="lazy" decoding="async" />
              <span className="review-cap">
                <span>{e.photo.split('/').pop()}</span>
                <span>{e.cutout ? 'cut-out' : 'photo'} · {e.colour || '—'}</span>
              </span>
              {off && <span className="review-off">Hidden</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
