'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Cutout } from './Garment';
import Icon from './Icon';
import SubmitButton from './SubmitButton';
import { CATEGORIES, OCCASIONS, ZONES, boxFor, slotFor } from '@/lib/wardrobe';
import { suggest, parseQuery, slotsFromItems } from '@/lib/stylist';
import { addStyleRules, deleteStyleRule } from '@/app/actions/stylist';

const EMPTY = { outer: null, top: null, bottom: null, shoes: null, extra: null };
const SPRING = 'cubic-bezier(.34, 1.56, .64, 1)';
const EXIT = 'cubic-bezier(.4, 0, .7, .2)';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const inside = (x, y, r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

const WHY = [
  { kind: 'too_warm', label: 'Too warm' },
  { kind: 'wrong_colour', label: 'Wrong colour' },
  { kind: 'not_me', label: 'Not me' },
  { kind: 'worn_recently', label: 'Wore it recently' },
];

const NUDGES = [
  { key: 'warmer', label: 'Warmer', apply: (n) => ({ ...n, warmth: n.warmth === 1 ? 0 : 1 }) },
  { key: 'cooler', label: 'Cooler', apply: (n) => ({ ...n, warmth: n.warmth === -1 ? 0 : -1 }) },
  { key: 'dressier', label: 'Dressier', apply: (n) => ({ ...n, dressy: n.dressy === 1 ? 0 : 1 }) },
  { key: 'relaxed', label: 'Relaxed', apply: (n) => ({ ...n, dressy: n.dressy === -1 ? 0 : -1 }) },
  { key: 'colour', label: 'More colour', apply: (n) => ({ ...n, colour: !n.colour }) },
];
const nudgeOn = (key, n) => (key === 'warmer' && n.warmth === 1) || (key === 'cooler' && n.warmth === -1) || (key === 'dressier' && n.dressy === 1) || (key === 'relaxed' && n.dressy === -1) || (key === 'colour' && n.colour);

export default function Table({ items, initialRules = [], initialSlots, saveAction, savedLooks = [], wearAction, deleteAction }) {
  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const [slots, setSlots] = useState(initialSlots || EMPTY);
  const [pinned, setPinned] = useState({});
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState({});
  const [reason, setReason] = useState('');
  const [planB, setPlanB] = useState([]);
  const [rules, setRules] = useState(initialRules);
  const [tab, setTab] = useState('All');
  const [query, setQuery] = useState('');
  const [occasion, setOccasion] = useState('Casual');
  const [nudges, setNudges] = useState({ warmth: 0, dressy: 0, colour: false });
  const [thinking, setThinking] = useState(false);
  const [whyNot, setWhyNot] = useState(null);
  const [hotZone, setHotZone] = useState(null);
  const [dragZone, setDragZone] = useState(null);
  const [ghostItem, setGhostItem] = useState(null);
  const [bump, setBump] = useState(0);
  const [panel, setPanel] = useState('look');

  const stageRef = useRef(null);
  const ghostRef = useRef(null);
  const pieceRefs = useRef({});
  const drawerRefs = useRef({});
  const flyFrom = useRef({});
  const enterFrom = useRef({});
  const drag = useRef(null);
  const reduced = useRef(false);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => { reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches; }, []);

  const topIsDress = slots.top != null && byId[slots.top]?.category === 'Dresses';
  const inUse = new Set(Object.values(slots).filter((v) => v != null));
  const placed = ZONES.filter((z) => slots[z.key] != null);

  // ---------- state changes (with undo) ----------
  const commit = useCallback((next, keepNotes = false) => {
    setHistory((h) => [...h.slice(-30), { slots: slotsRef.current, pinned }]);
    setSlots(next);
    if (!keepNotes) {
      setNotes((n) => {
        const out = {};
        for (const k of Object.keys(n)) if (next[k] === slotsRef.current[k]) out[k] = n[k];
        return out;
      });
    }
  }, [pinned]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setSlots(prev.slots);
      setPinned(prev.pinned);
      return h.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  // Apply the dress/bottom rule after putting `item` into its zone
  const withItem = (base, item) => {
    const zone = slotFor(item.category);
    const next = { ...base, [zone]: item.id };
    if (item.category === 'Dresses') next.bottom = null;
    if (item.category === 'Bottoms' && base.top != null && byId[base.top]?.category === 'Dresses') next.top = null;
    return next;
  };

  // ---------- motion helpers ----------
  // Animate a piece out of the stage using a detached clone, so React can move on immediately.
  const flyOut = (el, { dx = 0, dy = 60, rot = 8, fixed = false } = {}) => {
    if (!el || reduced.current) return;
    const r = el.getBoundingClientRect();
    const clone = el.cloneNode(true);
    clone.classList.remove('dragging');
    clone.removeAttribute('id');
    const host = fixed ? document.body : stageRef.current;
    const hr = fixed ? { left: 0, top: 0 } : host.getBoundingClientRect();
    Object.assign(clone.style, {
      position: fixed ? 'fixed' : 'absolute', left: `${r.left - hr.left}px`, top: `${r.top - hr.top}px`,
      width: `${r.width}px`, height: `${r.height}px`, transform: 'none', margin: 0, pointerEvents: 'none', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1, border: 0, background: 'transparent', padding: 0,
    });
    clone.className = 'fly-clone';
    host.appendChild(clone);
    const a = clone.animate(
      [{ transform: 'none', opacity: 1 },
       { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(.85)`, opacity: 0 }],
      { duration: 440, easing: EXIT, fill: 'forwards' },
    );
    a.onfinish = () => clone.remove();
  };

  // FLIP: after a render, animate each moved piece from where it "came from" to its zone.
  useLayoutEffect(() => {
    const froms = flyFrom.current;
    const enters = enterFrom.current;
    flyFrom.current = {};
    enterFrom.current = {};
    if (reduced.current) return;
    for (const [zone, from] of Object.entries(froms)) {
      const el = pieceRefs.current[zone];
      if (!el || !from) continue;
      const r = el.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (r.left + r.width / 2);
      const dy = from.top + from.height / 2 - (r.top + r.height / 2);
      const s = clamp(Math.min(from.width / r.width, from.height / r.height), 0.2, 1.6);
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px) scale(${s}) rotate(${from.rot || 0}deg)` }, { transform: 'translate(0,0) scale(1.03)', offset: 0.75 }, { transform: 'none' }],
        { duration: 620, easing: SPRING, delay: from.delay || 0, fill: 'backwards' },
      );
    }
    for (const [zone, e] of Object.entries(enters)) {
      const el = pieceRefs.current[zone];
      if (!el) continue;
      el.animate(
        [{ transform: `translate(${e.dx}px, ${e.dy}px) rotate(${e.rot}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 560, easing: SPRING, delay: e.delay || 0, fill: 'backwards' },
      );
    }
  }, [slots, bump]);

  // ---------- actions ----------
  const place = (item, from) => {
    const zone = slotFor(item.category);
    const cur = slotsRef.current;
    if (cur[zone] === item.id) return;
    if (cur[zone] != null) flyOut(pieceRefs.current[zone], { dy: 80, rot: -6 });
    if (item.category === 'Dresses' && cur.bottom != null) flyOut(pieceRefs.current.bottom, { dy: 90, rot: 8 });
    flyFrom.current[zone] = from;
    commit(withItem(cur, item));
  };

  const zoneList = (zone) => items.filter((i) => slotFor(i.category) === zone);

  const cycle = (zone, dir, { fromGhost = false } = {}) => {
    const list = zoneList(zone);
    if (!list.length) return;
    const cur = slotsRef.current;
    const idx = list.findIndex((i) => i.id === cur[zone]);
    const next = list[(idx + dir + list.length) % list.length];
    if (!next || next.id === cur[zone]) { setBump((b) => b + 1); return; }
    if (!fromGhost) flyOut(pieceRefs.current[zone], { dx: -dir * 180, dy: 0, rot: -dir * 14 });
    enterFrom.current[zone] = { dx: dir * 180, dy: 0, rot: dir * 12 };
    commit(withItem(cur, next));
  };

  const reject = (zone, { fromGhost = false } = {}) => {
    const cur = slotsRef.current;
    const itemId = cur[zone];
    if (itemId == null) return;
    if (!fromGhost) flyOut(pieceRefs.current[zone], { dy: 160, rot: 18 });
    const otherIds = Object.entries(cur).filter(([k, v]) => k !== zone && v != null).map(([, v]) => v);
    setPinned((p) => ({ ...p, [zone]: false }));
    commit({ ...cur, [zone]: null });
    setWhyNot({ itemId, otherIds, name: byId[itemId]?.name || 'piece' });
  };

  const togglePin = (zone) => {
    if (slotsRef.current[zone] == null) return;
    setPinned((p) => ({ ...p, [zone]: !p[zone] }));
  };

  const shuffle = () => {
    const cur = slotsRef.current;
    let next = { ...cur };
    let k = 0;
    const pick = (list, not) => {
      const pool = list.filter((i) => i.id !== not);
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    };
    for (const z of ZONES) {
      if (pinned[z.key]) continue;
      if ((z.key === 'outer' || z.key === 'extra') && cur[z.key] == null) continue;
      if (z.key === 'bottom' && next.top != null && byId[next.top]?.category === 'Dresses') continue;
      const it = pick(zoneList(z.key), cur[z.key]);
      if (!it) continue;
      if (cur[z.key] != null) flyOut(pieceRefs.current[z.key], { dy: -60, rot: -10 });
      next = withItem(next, it);
      enterFrom.current[z.key] = { dx: 0, dy: -120, rot: 8, delay: k++ * 70 };
    }
    commit(next);
    setReason('');
  };

  const clearAll = () => {
    for (const z of ZONES) if (slotsRef.current[z.key] != null && !pinned[z.key]) flyOut(pieceRefs.current[z.key], { dy: 120, rot: 10 });
    const next = { ...EMPTY };
    for (const z of ZONES) if (pinned[z.key]) next[z.key] = slotsRef.current[z.key];
    commit(next);
    setReason('');
    setPlanB([]);
  };

  // ---------- the stylist ----------
  const applyLook = (look, sourceRectFor) => {
    const cur = slotsRef.current;
    const stageR = stageRef.current.getBoundingClientRect();
    let k = 0;
    for (const z of ZONES) {
      const id = look.slots[z.key];
      if (id === cur[z.key]) continue;
      if (cur[z.key] != null) flyOut(pieceRefs.current[z.key], { dy: 100, rot: 8 });
      if (id != null) {
        const src = sourceRectFor?.(id) || drawerRefs.current[id]?.getBoundingClientRect();
        const r = src && src.width ? src : { left: stageR.left + stageR.width / 2 - 40, top: stageR.bottom, width: 80, height: 80 };
        flyFrom.current[z.key] = { left: r.left, top: r.top, width: r.width, height: r.height, rot: -8, delay: k++ * 90 };
      }
    }
    commit({ ...EMPTY, ...look.slots }, true);
    setNotes(look.notes || {});
    setReason(look.reason || '');
  };

  const ask = (overrides = {}) => {
    const n = overrides.nudges || nudges;
    const q = parseQuery(overrides.query ?? query);
    const occ = q.occasion || overrides.occasion || occasion;
    if (q.occasion) setOccasion(q.occasion);
    const pinnedSlots = {};
    for (const z of ZONES) if (pinned[z.key] && slotsRef.current[z.key] != null) pinnedSlots[z.key] = slotsRef.current[z.key];
    setThinking(true);
    setWhyNot(null);
    const delay = reduced.current ? 0 : 950;
    setTimeout(() => {
      const looks = suggest(items, rules, {
        occasion: occ,
        warmth: q.warmth || n.warmth,
        dressy: q.dressy || n.dressy,
        colour: q.colour || n.colour,
        rain: q.rain,
        pinned: pinnedSlots,
        seed: Math.floor(Math.random() * 1e9),
      });
      setThinking(false);
      if (!looks.length) { setReason('Add a few more pieces — I need at least a top to work with.'); return; }
      applyLook(looks[0]);
      setPlanB(looks.slice(1, 3));
    }, delay);
  };

  const choosePlanB = (idx, e) => {
    const look = planB[idx];
    const current = { slots: slotsRef.current, notes, reason };
    const r = e.currentTarget.getBoundingClientRect();
    applyLook(look, () => r);
    setPlanB((p) => p.map((x, i) => (i === idx ? current : x)));
  };

  const answerWhy = async (kind) => {
    const w = whyNot;
    setWhyNot(null);
    if (!w || !kind) return;
    try {
      const added = await addStyleRules({ kind, itemId: w.itemId, otherIds: w.otherIds });
      if (added?.length) setRules((r) => [...added, ...r]);
    } catch { /* keep going; the rule just isn't saved */ }
  };

  useEffect(() => {
    if (!whyNot) return;
    const t = setTimeout(() => setWhyNot(null), 9000);
    return () => clearTimeout(t);
  }, [whyNot]);

  const removeRule = async (id) => {
    setRules((r) => r.filter((x) => x.id !== id));
    try { await deleteStyleRule(id); } catch { /* ignore */ }
  };

  // ---------- pointer: one gesture system for rail items and placed pieces ----------
  const onPointerDown = (e, itemId, fromZone) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const d = { itemId, fromZone, el, rect, x0: e.clientX, y0: e.clientY, lastX: e.clientX, lastT: performance.now(), rot: 0, active: false, pinnedByPress: false, pointerId: e.pointerId };
    if (fromZone) {
      d.longPress = setTimeout(() => {
        if (drag.current === d && !d.active) { d.pinnedByPress = true; togglePin(fromZone); }
      }, 520);
    }
    drag.current = d;
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.active) {
      if (Math.hypot(dx, dy) < 7) return;
      d.active = true;
      clearTimeout(d.longPress);
      const size = clamp(Math.max(d.rect.width, d.rect.height), 90, 260);
      d.w = size; d.h = size;
      const g = ghostRef.current;
      g.style.width = `${size}px`;
      g.style.height = `${size}px`;
      g.style.display = 'block';
      setGhostItem(byId[d.itemId]);
      if (d.fromZone) setDragZone(d.fromZone);
    }
    const t = performance.now();
    const vx = (e.clientX - d.lastX) / Math.max(8, t - d.lastT);
    d.lastX = e.clientX; d.lastT = t;
    d.rot += (clamp(vx * 10, -16, 16) - d.rot) * 0.25;
    ghostRef.current.style.transform = `translate(${e.clientX - d.w / 2}px, ${e.clientY - d.h / 2}px) rotate(${d.rot.toFixed(2)}deg) scale(1.04)`;
    const sr = stageRef.current.getBoundingClientRect();
    const hz = inside(e.clientX, e.clientY, sr) ? slotFor(byId[d.itemId].category) : null;
    setHotZone((h) => (h === hz ? h : hz));
  };

  const endDrag = (e, cancelled = false) => {
    const d = drag.current;
    if (!d || (e && e.pointerId !== d.pointerId)) return;
    drag.current = null;
    clearTimeout(d.longPress);
    const item = byId[d.itemId];
    if (!d.active) {
      if (!cancelled && !d.fromZone && !d.pinnedByPress) place(item, d.rect);
      return;
    }
    const g = ghostRef.current;
    const gr = g.getBoundingClientRect();
    const sr = stageRef.current.getBoundingClientRect();
    const x = e?.clientX ?? 0, y = e?.clientY ?? 0;
    const over = !cancelled && inside(x, y, sr);
    const dx = x - d.x0, dy = y - d.y0;
    const from = { left: gr.left, top: gr.top, width: gr.width, height: gr.height, rot: d.rot };

    if (d.fromZone) {
      const flick = over && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2 && zoneList(d.fromZone).length > 1;
      if (!over && !cancelled) {
        flyOut(g, { dy: 140, rot: d.rot * 2 + 12, fixed: true });
        reject(d.fromZone, { fromGhost: true });
      } else if (flick) {
        const dir = dx < 0 ? 1 : -1;
        flyOut(g, { dx: dx < 0 ? -220 : 220, dy: 0, rot: dx < 0 ? -16 : 16, fixed: true });
        cycle(d.fromZone, dir, { fromGhost: true });
      } else {
        flyFrom.current[d.fromZone] = from;
        setBump((b) => b + 1);
      }
    } else if (over) {
      place(item, from);
    }
    g.style.display = 'none';
    setGhostItem(null);
    setDragZone(null);
    setHotZone(null);
  };

  const onPieceKey = (e, zone) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); cycle(zone, 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); cycle(zone, -1); }
    else if (e.key.toLowerCase() === 'p') { e.preventDefault(); togglePin(zone); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); reject(zone); }
  };

  const drawerItems = tab === 'All' ? items : items.filter((i) => i.category === tab);
  const chosenIds = Object.values(slots).filter((v) => v != null);
  const dragging = ghostItem != null;

  const loadLook = (o) => {
    applyLook({ slots: slotsFromItems(o.itemIds, byId), notes: {}, reason: o.name });
    setPlanB([]);
    setPinned({});
    setPanel('look');
  };

  if (!items.length) {
    return (
      <div className="empty">
        <span className="display-sm" style={{ color: 'var(--ink)' }}>The table is set. The rail is empty.</span>
        <span>Add a few pieces to your closet and they&apos;ll appear here to style.</span>
        <a className="btn btn-primary" href="/closet/new">Add a piece</a>
      </div>
    );
  }

  return (
    <div className="workspace">
      {/* ---------- left: the rail (drag source) ---------- */}
      <aside className="ws-rail" aria-label="Your rail">
        <div className="ws-tabs" role="tablist">
          {['All', ...CATEGORIES].map((c) => (
            <button type="button" role="tab" key={c} aria-selected={tab === c} className={tab === c ? 'ws-tab on' : 'ws-tab'} onClick={() => setTab(c)}>
              {c}<span>{c === 'All' ? items.length : items.filter((i) => i.category === c).length}</span>
            </button>
          ))}
        </div>
        <div className="ws-rail-items">
          {drawerItems.map((it, i) => (
            <button
              type="button"
              key={it.id}
              ref={(el) => { drawerRefs.current[it.id] = el; }}
              className={`drawer-item${inUse.has(it.id) ? ' in-use' : ''}${thinking ? ' pulling' : ''}`}
              style={{ '--i': i % 12 }}
              title={it.name}
              aria-label={`Put ${it.name} on the table`}
              onPointerDown={(e) => onPointerDown(e, it.id, null)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => endDrag(e)}
              onPointerCancel={(e) => endDrag(e, true)}
              onClick={(e) => { if (e.detail === 0) place(it, e.currentTarget.getBoundingClientRect()); }}
            >
              <Cutout item={it} />
              <span className="drawer-name">{it.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ---------- centre: the table ---------- */}
      <section className={`stage${dragging ? ' is-dragging' : ''}${thinking ? ' is-thinking' : ''}`} ref={stageRef} aria-label="Outfit table">
        <div className="stage-toolbar">
          <button type="button" className="chip" onClick={shuffle} title="Re-deal everything that isn't pinned"><Icon name="shuffle" size={14} />Shuffle</button>
          <button type="button" className="chip" onClick={undo} disabled={!history.length} title="Undo (Ctrl+Z)">Undo</button>
          {placed.length > 0 && <button type="button" className="chip" onClick={clearAll}>Clear</button>}
          <div className="spacer" />
          <span className="eyebrow" aria-live="polite">{thinking ? 'Pulling pieces from your rail…' : placed.length ? `${placed.length} on the table` : 'An empty table'}</span>
        </div>

        {reason && <p className="stage-reason" key={reason}>{reason}</p>}

        <div className="canvas">
        {ZONES.map((z) => {
          const id = slots[z.key];
          const item = id != null ? byId[id] : null;
          const [l, t, w, h] = boxFor(z.key, topIsDress);
          if (z.key === 'bottom' && topIsDress && !item) return null;
          const canHold = zoneList(z.key).length > 0;
          if (!item && !canHold) return null;
          return (
            <div key={z.key} className={`zone${hotZone === z.key ? ' hot' : ''}${item ? ' filled' : ' empty-zone'}`} style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, zIndex: item ? z.z + 5 : 1 }}>
              {!item && <div className="zone-guide"><span>+ {z.label}</span></div>}
              {item && (
                <>
                  <button
                    type="button"
                    ref={(el) => { pieceRefs.current[z.key] = el; }}
                    className={`piece${dragZone === z.key ? ' dragging' : ''}${pinned[z.key] ? ' pinned' : ''}`}
                    aria-label={`${item.name}${pinned[z.key] ? ', pinned' : ''}. Arrow keys: try another ${z.label.toLowerCase()}. P: pin. Delete: take it off.`}
                    onPointerDown={(e) => onPointerDown(e, item.id, z.key)}
                    onPointerMove={onPointerMove}
                    onPointerUp={(e) => endDrag(e)}
                    onPointerCancel={(e) => endDrag(e, true)}
                    onKeyDown={(e) => onPieceKey(e, z.key)}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <Cutout item={item} />
                    {pinned[z.key] && (
                      <span className="pin-tag" aria-hidden="true">
                        <svg viewBox="0 0 26 40"><path d="M13 0v8" stroke="#151412" strokeWidth="1.2" /><rect x="3" y="8" width="20" height="28" rx="3" fill="#8E3A1C" /><circle cx="13" cy="14" r="2.2" fill="#F4F0E8" /></svg>
                      </span>
                    )}
                  </button>
                  {zoneList(z.key).length > 1 && (
                    <div className="cycle-arrows">
                      <button type="button" aria-label={`Previous ${z.label.toLowerCase()}`} onClick={() => cycle(z.key, -1)}><Icon name="left" size={16} /></button>
                      <button type="button" aria-label={`Next ${z.label.toLowerCase()}`} onClick={() => cycle(z.key, 1)}><Icon name="right" size={16} /></button>
                    </div>
                  )}
                  {notes[z.key] && <span className="piece-note" key={notes[z.key]}>{notes[z.key]}</span>}
                </>
              )}
            </div>
          );
        })}
        </div>

        {placed.length === 0 && !thinking && (
          <div className="stage-empty">
            <p className="display-sm">Drag pieces onto the table,<br /><em>or ask the stylist below.</em></p>
          </div>
        )}

        {planB.length > 0 && (
          <div className="planb">
            <span className="eyebrow label">Plan B</span>
            {planB.map((look, i) => (
              <button type="button" key={i} onClick={(e) => choosePlanB(i, e)} aria-label={`Try alternative look ${i + 1}`}>
                {Object.values(look.slots).filter((v) => v != null).map((id) => <span key={id} style={{ background: byId[id]?.color }} />)}
              </button>
            ))}
          </div>
        )}

        {whyNot && (
          <div className="whynot" role="dialog" aria-label="Why not this piece?">
            <span className="q">Why not the {whyNot.name.toLowerCase()}?</span>
            {WHY.filter((w) => w.kind !== 'wrong_colour' || whyNot.otherIds.length).map((w) => (
              <button type="button" key={w.kind} onClick={() => answerWhy(w.kind)}>{w.label}</button>
            ))}
            <button type="button" onClick={() => answerWhy(null)} aria-label="Skip">Skip</button>
          </div>
        )}

        {/* ---------- the stylist dock ---------- */}
        <div className="dock">
          <div className="nudges">
            {NUDGES.map((n) => (
              <button type="button" key={n.key} className={nudgeOn(n.key, nudges) ? 'chip on' : 'chip'} aria-pressed={nudgeOn(n.key, nudges)}
                onClick={() => { const next = n.apply(nudges); setNudges(next); ask({ nudges: next }); }}>{n.label}</button>
            ))}
            {Object.values(pinned).some(Boolean) && <button type="button" className="chip" onClick={() => ask()}>Restyle the rest</button>}
          </div>
          <form className="ask" onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <svg className="spark" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" /></svg>
            <label htmlFor="ask" className="sr-only">Ask the stylist</label>
            <input id="ask" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Client lunch, then drinks — it's hot and might rain…" autoComplete="off" />
            <button className="btn btn-dark" disabled={thinking}>{thinking ? 'Styling…' : 'Style me'}</button>
          </form>
        </div>
      </section>

      {/* ---------- right: inspector ---------- */}
      <aside className="ws-inspector">
        <div className="ws-seg" role="tablist">
          {[['look', 'Look'], ['saved', `Saved · ${savedLooks.length}`], ['rules', `Rules · ${rules.length}`]].map(([k, label]) => (
            <button type="button" role="tab" key={k} aria-selected={panel === k} className={panel === k ? 'on' : ''} onClick={() => setPanel(k)}>{label}</button>
          ))}
        </div>

        {panel === 'look' && (
          <div className="ws-panel" key="look">
            {placed.length === 0 ? (
              <p className="muted small">Nothing on the table yet.</p>
            ) : (
              <ul className="look-list">
                {placed.map((z) => {
                  const it = byId[slots[z.key]];
                  return (
                    <li key={z.key}>
                      <span className="look-thumb"><Cutout item={it} /></span>
                      <span className="credit" style={{ flexGrow: 1, minWidth: 0 }}>
                        <span className="name" style={{ fontSize: 17 }}>{it.name}</span>
                        <span className="meta">{notes[z.key] || `${z.label.toUpperCase()} · WORN ${it.wearCount}×`}</span>
                      </span>
                      <button type="button" className={pinned[z.key] ? 'mini on' : 'mini'} aria-pressed={!!pinned[z.key]} aria-label={pinned[z.key] ? `Unpin ${it.name}` : `Pin ${it.name}`} onClick={() => togglePin(z.key)} title="Pin">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={pinned[z.key] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M7 3h10l-2 7 3 3H6l3-3z" /><path d="M12 13v8" /></svg>
                      </button>
                      <button type="button" className="mini" aria-label={`Take off ${it.name}`} onClick={() => reject(z.key)} title="Take off"><Icon name="x" size={14} /></button>
                    </li>
                  );
                })}
              </ul>
            )}
            <form action={saveAction} className="save-form">
              {chosenIds.map((id) => <input key={id} type="hidden" name="itemId" value={id} />)}
              <div className="field">
                <label htmlFor="oname">Name this look</label>
                <input id="oname" name="name" className="input" placeholder="Sunday brunch" maxLength={60} />
              </div>
              <div className="field">
                <label htmlFor="occ">Occasion</label>
                <select id="occ" name="occasion" className="select" value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                  {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <SubmitButton disabled={chosenIds.length === 0}>{chosenIds.length ? 'Save look' : 'Put pieces on the table'}</SubmitButton>
            </form>
            <p className="ws-help">Drag from the rail · flick sideways for the next piece · hold to pin · throw off to reject · Ctrl+Z undo</p>
          </div>
        )}

        {panel === 'saved' && (
          <div className="ws-panel" key="saved">
            {savedLooks.length === 0 ? (
              <p className="muted small">No saved looks yet. Build one and save it from the Look tab.</p>
            ) : (
              <ul className="saved-list">
                {savedLooks.map((o, i) => (
                  <li key={o.id} style={{ '--i': i }}>
                    <button type="button" className="saved-open" onClick={() => loadLook(o)} aria-label={`Put ${o.name} on the table`}>
                      <span className="saved-stack">
                        {o.itemIds.slice(0, 4).map((id, k) => byId[id] && <span key={id} style={{ '--k': k }}><Cutout item={byId[id]} /></span>)}
                      </span>
                      <span className="credit">
                        <span className="name" style={{ fontSize: 18 }}>{o.name}</span>
                        <span className="meta">{o.occasion.toUpperCase()} · WORN {o.wearCount}×</span>
                      </span>
                    </button>
                    <div className="row" style={{ gap: 4 }}>
                      {wearAction && <form action={wearAction}><input type="hidden" name="id" value={o.id} /><button className="btn btn-sm btn-ghost">Wore it</button></form>}
                      {deleteAction && <form action={deleteAction}><input type="hidden" name="id" value={o.id} /><button className="btn btn-sm btn-ghost" aria-label={`Delete ${o.name}`}>Delete</button></form>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {panel === 'rules' && (
          <div className="ws-panel rules" key="rules">
            {rules.length === 0 ? (
              <p className="muted small" style={{ margin: 0 }}>Throw a piece off the table and tell me why. I&apos;ll remember it here, and you can undo anything I learn.</p>
            ) : (
              <ul>
                {rules.map((r) => (
                  <li key={r.id}>
                    <span>{r.text}</span>
                    <button type="button" onClick={() => removeRule(r.id)} aria-label={`Forget: ${r.text}`}><Icon name="x" size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>

      {/* the piece you're holding */}
      <div ref={ghostRef} className="ghost" style={{ display: 'none' }} aria-hidden="true">
        {ghostItem && <Cutout item={ghostItem} />}
      </div>
    </div>
  );
}
