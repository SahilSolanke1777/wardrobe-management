'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { DATASET } from '@/lib/catalogue-shared';

// A browsable wall of catalogue photos for one app category (Tops, Shoes…)
export default function CataloguePicker({ group, colourHint, onPick, onClose }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [type, setType] = useState('all');
  const [colour, setColour] = useState('all');
  const closeRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/catalogue?group=${encodeURIComponent(group)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((d) => { if (alive) setItems(d.items); })
      .catch(() => { if (alive) setError('Couldn’t load the catalogue. Has fetch_pexels.py been run?'); });
    return () => { alive = false; };
  }, [group]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const types = useMemo(() => Object.entries(DATASET).filter(([, v]) => v.group === group).map(([k, v]) => [k, v.label]), [group]);
  const colours = useMemo(() => {
    const c = {};
    for (const it of items || []) if (it.colour) c[it.colour] = it.colourHex;
    return Object.entries(c).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);
  const shown = (items || []).filter((it) => (type === 'all' || it.dataset === type) && (colour === 'all' || it.colour === colour));
  // put likely matches for the colour you already chose first
  const hint = (colourHint || '').toLowerCase();
  const sorted = hint ? [...shown].sort((a, b) => (b.colour === hint) - (a.colour === hint)) : shown;

  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-label="Choose a photo from the catalogue">
      <button type="button" className="sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className="picker">
        <div className="picker-top">
          <div>
            <div className="eyebrow">The catalogue · {group}</div>
            <h2 className="display-sm" style={{ fontSize: 34 }}>Find one like yours</h2>
          </div>
          <div className="spacer" />
          <button type="button" className="icon-btn" ref={closeRef} onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        <div className="picker-filters">
          <div className="row wrap" style={{ gap: 6 }}>
            <button type="button" className={type === 'all' ? 'chip on' : 'chip'} onClick={() => setType('all')}>All</button>
            {types.map(([k, l]) => <button type="button" key={k} className={type === k ? 'chip on' : 'chip'} onClick={() => setType(k)}>{l}</button>)}
          </div>
          {colours.length > 1 && (
            <div className="row wrap" style={{ gap: 6 }}>
              <button type="button" className={colour === 'all' ? 'chip on' : 'chip'} onClick={() => setColour('all')}>Any colour</button>
              {colours.map(([c, hex]) => (
                <button type="button" key={c} className={colour === c ? 'chip on' : 'chip'} onClick={() => setColour(c)}>
                  <span className="dot" style={{ background: hex || '#ccc' }} />{c}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="picker-grid">
          {error && <p className="alert">{error}</p>}
          {!items && !error && Array.from({ length: 12 }, (_, i) => <div key={i} className="picker-skel" style={{ '--i': i }} />)}
          {items && sorted.length === 0 && <p className="muted">Nothing here yet for that filter.</p>}
          {sorted.map((it, i) => (
            <button type="button" key={it.id} className={`picker-item${it.cutout ? ' is-cut' : ''}`} style={{ '--i': Math.min(i, 24) }} onClick={() => onPick(it)} title={it.alt || it.label}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.src} alt={it.alt || it.label} loading="lazy" decoding="async" />
              <span className="picker-cap"><span className="dot" style={{ background: it.colourHex || '#ccc' }} />{it.colour || '—'} · {it.label}</span>
            </button>
          ))}
        </div>
        <p className="picker-credit">Photos provided by <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a>. Credits are kept with each photo.</p>
      </div>
    </div>
  );
}
