'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Cutout } from './Garment';
import Rail from './Rail';
import Icon from './Icon';
import { tintOf, formatDate } from '@/lib/wardrobe';

export default function ClosetView({ items, view, wearAction }) {
  const [open, setOpen] = useState(null); // index into items
  const [dir, setDir] = useState(0);
  const closeRef = useRef(null);
  const lastFocus = useRef(null);

  const show = useCallback((i, e) => {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) return; // let the link open normally
    e?.preventDefault();
    lastFocus.current = document.activeElement;
    setDir(0);
    setOpen(i);
  }, []);
  const close = useCallback(() => { setOpen(null); lastFocus.current?.focus?.(); }, []);
  const step = useCallback((d) => { setDir(d); setOpen((i) => (i == null ? i : (i + d + items.length) % items.length)); }, [items.length]);

  useEffect(() => {
    if (open == null) return;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, close, step]);

  const item = open != null ? items[open] : null;

  return (
    <>
      {view === 'rail' ? (
        <Rail items={items} onOpen={show} />
      ) : (
        <div className="archive">
          {items.map((it, i) => (
            <a key={it.id} href={`/closet/${it.id}`} onClick={(e) => show(i, e)} data-tilt className={`archive-item lift${it.forgotten ? ' faded' : ''}`} style={{ '--i': Math.min(i, 20) }}>
              <div className="garment"><Cutout item={it} /></div>
              <div className="credit">
                <span className="name">{it.name}</span>
                <span className="meta">{it.category.toUpperCase()} · {it.season.toUpperCase()} · WORN {it.wearCount}×</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {item && (
        <div className="sheet-root" role="dialog" aria-modal="true" aria-label={item.name}>
          <button type="button" className="sheet-backdrop" aria-label="Close" onClick={close} />
          <aside className="sheet">
            <div className="sheet-top">
              <span className="eyebrow">No. {String(item.id).padStart(3, '0')} · {open + 1} of {items.length}</span>
              <div className="spacer" />
              <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label="Previous piece"><Icon name="left" size={18} /></button>
              <button type="button" className="icon-btn" onClick={() => step(1)} aria-label="Next piece"><Icon name="right" size={18} /></button>
              <button type="button" className="icon-btn" ref={closeRef} onClick={close} aria-label="Close"><Icon name="x" size={18} /></button>
            </div>
            <div className="sheet-stage" style={{ background: tintOf(item.color) }}>
              <div className="sheet-art" key={item.id} style={{ '--dir': dir }}><Cutout item={item} /></div>
            </div>
            <div className="sheet-body" key={`b${item.id}`}>
              <h2 className="display-sm" style={{ fontSize: 38 }}>{item.name}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {item.daysSince == null ? 'Never worn yet.' : item.daysSince === 0 ? 'Worn today.' : item.daysSince >= 90 ? `Not out in ${item.daysSince} days — style it back in.` : `Last worn ${item.daysSince} day${item.daysSince === 1 ? '' : 's'} ago.`}
              </p>
              <table className="spec-table">
                <tbody>
                  <tr><th>Category</th><td>{item.category}</td></tr>
                  <tr><th>Season</th><td>{item.season}</td></tr>
                  <tr><th>Colour</th><td><span className="row" style={{ gap: 8 }}><span className="dot" style={{ background: item.color }} />{item.color.toUpperCase()}</span></td></tr>
                  <tr><th>Cost per wear</th><td>{item.price != null ? `₹${Math.round(item.price / Math.max(item.wearCount, 1)).toLocaleString('en-IN')}` : '—'}</td></tr>
                  <tr><th>Worn</th><td>{item.wearCount}× · last {formatDate(item.lastWornAt)}</td></tr>
                  <tr><th>In looks</th><td>{item.looks}</td></tr>
                </tbody>
              </table>
              {item.credit && (
                <p className="mono muted" style={{ margin: 0 }}>Photo: <a href={item.credit.sourceUrl} target="_blank" rel="noreferrer">{item.credit.photographer || 'Pexels'}</a> / <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a></p>
              )}
              {item.wearCount > 0 && <div className="wear-ticks" aria-hidden="true">{Array.from({ length: Math.min(item.wearCount, 60) }, (_, i) => <i key={i} />)}</div>}
              <div className="row wrap">
                <Link href={`/studio?items=${item.id}`} className="btn btn-primary">Style it</Link>
                <form action={wearAction}><input type="hidden" name="id" value={item.id} /><button className="btn">Wore it today</button></form>
                <Link href={`/closet/${item.id}/edit`} className="btn btn-ghost">Edit</Link>
                <Link href={`/closet/${item.id}`} className="btn btn-ghost">Full page →</Link>
              </div>
              <p className="ws-help">← → to browse · Esc to close</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
