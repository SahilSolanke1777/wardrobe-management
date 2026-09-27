'use client';
import { useMemo, useState } from 'react';
import Garment from './Garment';
import Icon from './Icon';
import SubmitButton from './SubmitButton';
import { CATEGORIES, OCCASIONS, slotFor } from '@/lib/wardrobe';

const SLOTS = [
  { key: 'outer', label: 'Outerwear', empty: 'Add outerwear' },
  { key: 'top', label: 'Top / dress', empty: 'Add a top or dress' },
  { key: 'bottom', label: 'Bottom', empty: 'Add a bottom' },
  { key: 'shoes', label: 'Shoes', empty: 'Add shoes' },
  { key: 'extra', label: 'Accessory', empty: 'Add an accessory' },
];

export default function OutfitBuilder({ items, action }) {
  const [tab, setTab] = useState('All');
  const [slots, setSlots] = useState({});
  const [occasion, setOccasion] = useState('Casual');
  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const topIsDress = slots.top != null && byId[slots.top]?.category === 'Dresses';
  const chosen = Object.values(slots).filter((v) => v != null);
  const visible = tab === 'All' ? items : items.filter((i) => i.category === tab);
  const hasAccessories = items.some((i) => i.category === 'Accessories');
  const shownSlots = SLOTS.filter((s) => s.key !== 'extra' || hasAccessories || slots.extra != null);

  function pick(item) {
    const key = slotFor(item.category);
    setSlots((s) => {
      const next = { ...s, [key]: s[key] === item.id ? null : item.id };
      if (item.category === 'Dresses' && next.top === item.id) next.bottom = null;
      if (item.category === 'Bottoms' && s.top != null && byId[s.top]?.category === 'Dresses') next.top = null;
      return next;
    });
  }

  function surprise() {
    const rand = (cat) => {
      const xs = items.filter((i) => i.category === cat);
      return xs.length ? xs[Math.floor(Math.random() * xs.length)].id : null;
    };
    setSlots({
      outer: Math.random() > 0.5 ? rand('Outerwear') : null,
      top: rand('Tops'),
      bottom: rand('Bottoms'),
      shoes: rand('Shoes'),
      extra: null,
    });
  }

  if (items.length === 0) {
    return (
      <div className="empty">
        <strong style={{ color: 'var(--ink)' }}>Add some clothes first</strong>
        <span>Outfits are built from the pieces in your closet.</span>
        <a className="btn btn-primary" href="/closet/new">Add item</a>
      </div>
    );
  }

  return (
    <form action={action} className="builder">
      <section className="panel" aria-label="Pick pieces">
        <h2>Pick pieces</h2>
        <div className="row wrap" style={{ gap: 6 }}>
          {['All', ...CATEGORIES].map((c) => (
            <button type="button" key={c} className={tab === c ? 'chip on' : 'chip'} style={{ minHeight: 36, padding: '0 14px', fontSize: 13 }} aria-pressed={tab === c} onClick={() => setTab(c)}>{c}</button>
          ))}
        </div>
        <div className="picker">
          {visible.map((i) => {
            const on = chosen.includes(i.id);
            return (
              <button type="button" key={i.id} className={on ? 'pick on' : 'pick'} aria-pressed={on} aria-label={`${on ? 'Remove' : 'Add'} ${i.name}`} title={i.name} onClick={() => pick(i)}>
                <Garment item={i} size={60} height={88} />
              </button>
            );
          })}
        </div>
        <p className="muted small" style={{ margin: 0 }}>Tap a piece to put it in its slot; tap again to remove it. A dress replaces the top and bottom.</p>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="row">
          <h1 className="display" style={{ fontSize: 52 }}>New outfit</h1>
          <div className="spacer" />
          <button type="button" className="btn" onClick={surprise}><Icon name="shuffle" size={16} />Surprise me</button>
        </div>
        <div className="board">
          {shownSlots.map((s) => {
            const item = slots[s.key] != null ? byId[slots[s.key]] : null;
            const label = s.key === 'top' && topIsDress ? 'Dress' : s.label;
            const emptyText = s.key === 'bottom' && topIsDress ? 'Not needed with a dress' : s.empty;
            return (
              <div className="slot" key={s.key}>
                {item ? (
                  <>
                    <Garment item={item} size={160} height={250} />
                    <div className="slot-label">
                      <span className="eyebrow">{label}</span>
                      <strong>{item.name}</strong>
                    </div>
                    <button type="button" className="icon-btn" aria-label={`Remove ${item.name}`} onClick={() => setSlots((x) => ({ ...x, [s.key]: null }))}><Icon name="x" size={16} /></button>
                    <input type="hidden" name="itemId" value={item.id} />
                  </>
                ) : (
                  <div className="slot-empty"><Icon name="plus" size={28} />{emptyText}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel" aria-label="Outfit details">
        <div className="field">
          <label htmlFor="oname">Outfit name</label>
          <input id="oname" name="name" className="input" placeholder="e.g. Sunday brunch" maxLength={60} />
        </div>
        <div className="field">
          <span className="label">Occasion</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {OCCASIONS.map((o) => (
              <button type="button" key={o} className={occasion === o ? 'chip on' : 'chip'} style={{ minHeight: 36, padding: '0 14px', fontSize: 13 }} aria-pressed={occasion === o} onClick={() => setOccasion(o)}>{o}</button>
            ))}
          </div>
          <input type="hidden" name="occasion" value={occasion} />
        </div>
        <SubmitButton disabled={chosen.length === 0}>{chosen.length === 0 ? 'Pick pieces to save' : `Save outfit (${chosen.length} pieces)`}</SubmitButton>
      </section>
    </form>
  );
}
