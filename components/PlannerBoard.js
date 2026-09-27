'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Cutout } from './Garment';
import Icon from './Icon';
import { ZONES, boxFor, slotFor } from '@/lib/wardrobe';
import { setPlan, clearPlan, wearPlan } from '@/app/actions/plans';

// A look drawn small: its pieces laid out on the same flat-lay zones as the Table
function MiniLook({ itemIds, byId }) {
  const slots = {};
  for (const id of itemIds) { const it = byId[id]; if (it) { const k = slotFor(it.category); if (slots[k] == null) slots[k] = it; } }
  const dress = slots.top?.category === 'Dresses';
  return (
    <span className="mini-look">
      {ZONES.map((z) => {
        const it = slots[z.key];
        if (!it) return null;
        const [l, t, w, h] = boxFor(z.key, dress);
        return <span key={z.key} style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, zIndex: z.z }}><Cutout item={it} /></span>;
      })}
    </span>
  );
}

export default function PlannerBoard({ monthTitle, prevHref, nextHref, todayHref, days, initialPlans, outfits, byId, initialSelected, todayISO }) {
  const [plans, setPlans] = useState(initialPlans); // iso -> { outfitId, worn }
  const [selected, setSelected] = useState(initialSelected);
  const [held, setHeld] = useState(null); // outfit id picked up (click-to-place)
  const [over, setOver] = useState(null);
  const [landed, setLanded] = useState(null);
  const [pending, startTransition] = useTransition();
  const dragInfo = useRef(null);
  const outfitById = Object.fromEntries(outfits.map((o) => [o.id, o]));

  useEffect(() => { setPlans(initialPlans); }, [initialPlans]);

  const assign = (iso, outfitId) => {
    setPlans((p) => ({ ...p, [iso]: { outfitId, worn: false } }));
    setSelected(iso);
    setLanded(iso);
    setTimeout(() => setLanded(null), 700);
    startTransition(async () => { await setPlan({ date: iso, outfitId }); });
  };
  const unassign = (iso) => {
    setPlans((p) => { const n = { ...p }; delete n[iso]; return n; });
    startTransition(async () => { await clearPlan({ date: iso }); });
  };
  const wear = (iso) => {
    setPlans((p) => ({ ...p, [iso]: { ...p[iso], worn: true } }));
    startTransition(async () => { await wearPlan({ date: iso }); });
  };

  // native drag and drop (desktop) — plus click a look, then click a day (touch & keyboard)
  const onDragStartLook = (e, outfitId) => {
    dragInfo.current = { outfitId, from: null };
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', String(outfitId));
  };
  const onDragStartDay = (e, iso) => {
    const p = plans[iso];
    if (!p) return;
    dragInfo.current = { outfitId: p.outfitId, from: iso };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(p.outfitId));
  };
  const onDropDay = (e, iso) => {
    e.preventDefault();
    setOver(null);
    const info = dragInfo.current;
    dragInfo.current = null;
    if (!info) return;
    if (info.from && info.from !== iso) unassign(info.from);
    assign(iso, info.outfitId);
  };
  const onDropTray = (e) => {
    e.preventDefault();
    const info = dragInfo.current;
    dragInfo.current = null;
    if (info?.from) unassign(info.from);
  };

  const clickDay = (iso) => {
    if (held != null) { assign(iso, held); setHeld(null); return; }
    setSelected(iso);
  };

  const sel = plans[selected];
  const selOutfit = sel ? outfitById[sel.outfitId] : null;
  const [sy, sm, sd] = selected.split('-').map(Number);
  const selLabel = new Date(sy, sm - 1, sd).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const planned = Object.keys(plans).filter((k) => days.some((d) => d.iso === k && d.inMonth)).length;

  return (
    <div className="planner2">
      {/* ---------- the tray of saved looks ---------- */}
      <aside className="tray" onDragOver={(e) => e.preventDefault()} onDrop={onDropTray} aria-label="Saved looks">
        <div className="eyebrow" style={{ padding: '4px 6px 10px' }}>Your looks · drag onto a day</div>
        {outfits.length === 0 && <p className="muted small">No saved looks yet. <Link href="/studio">Build one in the Studio.</Link></p>}
        {outfits.map((o, i) => (
          <button
            type="button"
            key={o.id}
            draggable
            onDragStart={(e) => onDragStartLook(e, o.id)}
            onClick={() => setHeld((h) => (h === o.id ? null : o.id))}
            className={held === o.id ? 'tray-look held' : 'tray-look'}
            aria-pressed={held === o.id}
            style={{ '--i': i }}
            title="Drag onto a day, or click then click a day"
          >
            <MiniLook itemIds={o.itemIds} byId={byId} />
            <span className="credit"><span className="name" style={{ fontSize: 16 }}>{o.name}</span><span className="meta">{o.occasion.toUpperCase()} · WORN {o.wearCount}×</span></span>
          </button>
        ))}
        <p className="ws-help" style={{ padding: '0 6px' }}>Drag a planned day back here to clear it.</p>
      </aside>

      {/* ---------- the month ---------- */}
      <section className="month">
        <div className="row" style={{ marginBottom: 14 }}>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 4.6vw, 64px)' }}>{monthTitle}</h1>
          <div className="spacer" />
          {pending && <span className="eyebrow">Saving…</span>}
          <Link className="icon-btn" href={prevHref} aria-label="Previous month"><Icon name="left" size={18} /></Link>
          <Link className="btn btn-sm" href={todayHref}>Today</Link>
          <Link className="icon-btn" href={nextHref} aria-label="Next month"><Icon name="right" size={18} /></Link>
        </div>
        {held != null && <div className="held-banner">Placing <strong>{outfitById[held]?.name}</strong> — click a day <button type="button" className="linklike" onClick={() => setHeld(null)}>cancel</button></div>}
        <div className="cal-head">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="eyebrow" style={{ padding: '0 6px' }}>{d}</div>)}
        </div>
        <div className="cal2">
          {days.map((d, i) => {
            const p = plans[d.iso];
            const o = p ? outfitById[p.outfitId] : null;
            const cls = ['day', !d.inMonth && 'out', d.iso === selected && 'sel', d.iso === todayISO && 'today', over === d.iso && 'over', landed === d.iso && 'landed', held != null && 'targetable', p?.worn && 'worn'].filter(Boolean).join(' ');
            return (
              <div
                key={d.iso}
                className={cls}
                style={{ '--i': i }}
                onDragOver={(e) => { e.preventDefault(); if (over !== d.iso) setOver(d.iso); }}
                onDragLeave={() => setOver((v) => (v === d.iso ? null : v))}
                onDrop={(e) => onDropDay(e, d.iso)}
              >
                <button type="button" className="day-hit" onClick={() => clickDay(d.iso)} aria-label={`${d.label}${o ? `, ${o.name}` : ''}`} aria-current={d.iso === selected ? 'date' : undefined} />
                <span className="num">{d.num}</span>
                {o && (
                  <span className="day-look" draggable onDragStart={(e) => onDragStartDay(e, d.iso)}>
                    <MiniLook itemIds={o.itemIds} byId={byId} />
                    <span className="pname">{o.name}</span>
                  </span>
                )}
                {p?.worn && <span className="worn-stamp">Worn</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- the selected day ---------- */}
      <aside className="dayview">
        <div className="eyebrow">{selected === todayISO ? 'Today' : 'Selected day'}</div>
        <h2 className="display-sm" style={{ fontSize: 34 }}>{selLabel}</h2>
        {selOutfit ? (
          <>
            <div className="dayview-stage" key={`${selected}-${selOutfit.id}`}><MiniLook itemIds={selOutfit.itemIds} byId={byId} /></div>
            <div className="credit"><span className="name">{selOutfit.name}</span><span className="meta">{selOutfit.occasion.toUpperCase()} · {selOutfit.itemIds.length} PIECES</span></div>
            <div className="row wrap">
              {sel.worn ? <span className="alert ok">Worn — logged on every piece.</span> : <button type="button" className="btn btn-primary" onClick={() => wear(selected)}>Mark as worn</button>}
              <Link className="btn" href={`/studio?outfit=${selOutfit.id}`}>Open on the table</Link>
              <button type="button" className="btn btn-ghost" onClick={() => unassign(selected)}>Clear day</button>
            </div>
          </>
        ) : (
          <div className="empty" style={{ padding: '36px 18px' }}>
            <span className="display-sm" style={{ fontSize: 26, color: 'var(--ink)' }}>Nothing planned.</span>
            <span>Drag a look from the left onto this day.</span>
          </div>
        )}
        <hr className="rule" />
        <div className="mono">{planned} day{planned === 1 ? '' : 's'} planned this month</div>
      </aside>
    </div>
  );
}
