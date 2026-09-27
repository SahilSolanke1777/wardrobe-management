'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import GarmentArt, { KIND_OPTIONS, garmentKind } from './GarmentArt';
import SubmitButton from './SubmitButton';
import { CATEGORIES, SEASONS, tintOf } from '@/lib/wardrobe';
import { photoSrc } from '@/lib/catalogue-shared';
import CataloguePicker from './CataloguePicker';

export const SWATCHES = [
  ['Ivory', '#F4F0E6'], ['White', '#F7F5F0'], ['Sand', '#D8C7A6'], ['Camel', '#B08A5B'], ['Chocolate', '#5A3A26'],
  ['Black', '#1E1D1B'], ['Charcoal', '#3B3A38'], ['Grey', '#9A9A96'], ['Navy', '#2E3A57'], ['Denim', '#4B6584'],
  ['Sky', '#9DB7D5'], ['Olive', '#6B7248'], ['Sage', '#A3B18A'], ['Forest', '#2F4A36'], ['Rust', '#A2482A'],
  ['Burgundy', '#6B1F2A'], ['Red', '#A81E24'], ['Blush', '#E3B5B0'], ['Pink', '#C98F9B'], ['Mustard', '#C9A227'], ['Lilac', '#B7A6C9'],
];
const PATTERNS = [['', 'Plain'], ['striped', 'Stripe'], ['check', 'Check'], ['floral', 'Floral'], ['polka dot', 'Dots']];
const EXTRA_KINDS = { Outerwear: [['jacket', 'Denim jacket']] };

function kindChoices(category) {
  return [...(KIND_OPTIONS[category] || []), ...(EXTRA_KINDS[category] || [])];
}
function autoName(colourName, pattern, label) {
  const words = [colourName, pattern, label.toLowerCase()].filter(Boolean);
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PieceEditor({ action, item, error }) {
  const editing = !!item;
  const [category, setCategory] = useState(item?.category || 'Tops');
  const initialKindLabel = useMemo(() => {
    if (!item) return kindChoices('Tops')[0][1];
    const k = garmentKind(item);
    const hit = kindChoices(item.category).find(([kk, label]) => kk === k && (label !== 'Denim jacket' || /denim/i.test(item.name)));
    return hit ? hit[1] : kindChoices(item.category)[0][1];
  }, [item]);
  const [kindLabel, setKindLabel] = useState(initialKindLabel);
  const [color, setColor] = useState(item?.color || '#D8C7A6');
  const [pattern, setPattern] = useState('');
  const [name, setName] = useState(item?.name || '');
  const [nameTouched, setNameTouched] = useState(editing);
  const [season, setSeason] = useState(item?.season || 'All year');
  const [price, setPrice] = useState(item?.price != null ? String(Math.round(item.price)) : '');
  const [photoUrl, setPhotoUrl] = useState(item?.photo ? photoSrc(item.photo) : null);
  const [photoIsPng, setPhotoIsPng] = useState(/\.png$/i.test(item?.photo || ''));
  const [catalog, setCatalog] = useState(null); // chosen catalogue entry
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [bump, setBump] = useState(0);
  const fileRef = useRef(null);

  const colourName = SWATCHES.find(([, h]) => h.toLowerCase() === color.toLowerCase())?.[0] || '';
  const suggested = autoName(colourName, pattern, kindLabel);
  const shownName = nameTouched ? name : suggested;

  useEffect(() => { setBump((b) => b + 1); }, [category, kindLabel, color, pattern]);

  const pickCategory = (c) => {
    setCategory(c);
    setKindLabel(kindChoices(c)[0][1]);
  };

  const onFile = (file) => {
    if (!file) return;
    if (photoUrl && photoUrl.startsWith('blob:')) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setPhotoIsPng(false);
    setCatalog(null);
    setRemovePhoto(false);
  };

  const KIND_FOR_DATASET = { tshirt: 'T-shirt', top: 'T-shirt', shirt: 'Shirt', sweater: 'Knit', hoodie: 'Knit', jeans: 'Jeans', trousers: 'Trousers', shorts: 'Shorts', skirt: 'Skirt', dress: 'Dress', jacket: 'Jacket', coat: 'Coat', sneakers: 'Sneakers', boots: 'Boots', loafers: 'Loafers', bag: 'Bag', cap: 'Cap' };
  const pickFromCatalogue = (e) => {
    setCatalog(e);
    setPhotoUrl(e.src);
    setPhotoIsPng(/\.png$/i.test(e.src));
    setRemovePhoto(false);
    if (fileRef.current) fileRef.current.value = '';
    if (e.colourHex) setColor(e.colourHex);
    const k = KIND_FOR_DATASET[e.dataset];
    if (k && kindChoices(category).some(([, l]) => l === k)) setKindLabel(k);
    const nm = `${e.colour ? e.colour.charAt(0).toUpperCase() + e.colour.slice(1) + ' ' : ''}${e.colour ? e.label.toLowerCase() : e.label}`;
    setName(nm);
    setNameTouched(true);
    setPickerOpen(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && fileRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileRef.current.files = dt.files;
      onFile(file);
    }
  };

  const preview = { id: item?.id, name: shownName || kindLabel, category, color };
  const showPhoto = photoUrl && !removePhoto;

  return (
    <form action={action} className="editor">
      {editing && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="season" value={season} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="name" value={shownName} />
      {removePhoto && <input type="hidden" name="removePhoto" value="1" />}
      {catalog && !removePhoto && <input type="hidden" name="catalogPhoto" value={catalog.photo} />}

      {/* ---------- live preview ---------- */}
      <div className="editor-preview" style={{ background: tintOf(color) }}>
        <div className="editor-art" key={`${bump}-${showPhoto ? 'p' : 'a'}`}>
          {showPhoto
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={photoUrl} alt="Chosen photo" className={`cutout ${photoIsPng ? 'cutout-png' : 'cutout-photo'}`} />
            : <GarmentArt item={preview} />}
        </div>
        <div className="editor-credit">
          <span className="name">{shownName || 'Untitled piece'}</span>
          <span className="meta">{category.toUpperCase()} · {season.toUpperCase()} · {color.toUpperCase()}{price ? ` · ₹${Number(price).toLocaleString('en-IN')}` : ''}</span>
          {catalog && showPhoto && catalog.photographer && (
            <span className="meta">Photo: <a href={catalog.sourceUrl} target="_blank" rel="noreferrer">{catalog.photographer}</a> / <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a></span>
          )}
        </div>
      </div>

      {/* ---------- controls ---------- */}
      <div className="editor-controls">
        <div>
          <div className="eyebrow">{editing ? 'Edit piece' : 'New piece'}</div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 4.4vw, 64px)', marginTop: 8 }}>{editing ? 'Refit it.' : 'Add to the archive.'}</h1>
        </div>
        {error && <div className="alert" role="alert">{error}</div>}

        <fieldset className="ed-group">
          <legend className="label">Category</legend>
          <div className="cat-tiles">
            {CATEGORIES.map((c) => (
              <button type="button" key={c} className={category === c ? 'cat-tile on' : 'cat-tile'} aria-pressed={category === c} onClick={() => pickCategory(c)}>
                <span className="cat-art"><GarmentArt item={{ name: kindChoices(c)[0][1], category: c, color: category === c ? color : '#CFC6B6' }} /></span>
                <span>{c}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="ed-group">
          <legend className="label">Type</legend>
          <div className="kind-tiles">
            {kindChoices(category).map(([k, label]) => (
              <button type="button" key={label} className={kindLabel === label ? 'kind-tile on' : 'kind-tile'} aria-pressed={kindLabel === label} onClick={() => setKindLabel(label)}>
                <span className="kind-art"><GarmentArt item={{ name: label, category, color }} /></span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="ed-group">
          <legend className="label">Colour{colourName ? ` · ${colourName}` : ''}</legend>
          <div className="swatches">
            {SWATCHES.map(([n, h]) => (
              <button type="button" key={h} className={color.toLowerCase() === h.toLowerCase() ? 'sw on' : 'sw'} style={{ background: h }} aria-label={n} aria-pressed={color.toLowerCase() === h.toLowerCase()} title={n} onClick={() => setColor(h)} />
            ))}
            <label className="sw sw-custom" title="Custom colour">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Custom colour" />
              <span aria-hidden="true">+</span>
            </label>
          </div>
        </fieldset>

        {!editing && (
          <fieldset className="ed-group">
            <legend className="label">Pattern</legend>
            <div className="row wrap" style={{ gap: 6 }}>
              {PATTERNS.map(([v, label]) => (
                <button type="button" key={label} className={pattern === v ? 'chip on' : 'chip'} aria-pressed={pattern === v} onClick={() => setPattern(v)}>{label}</button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="ed-row">
          <div className="field" style={{ flex: 2 }}>
            <label htmlFor="ed-name">Name</label>
            <input id="ed-name" className="input" value={shownName} maxLength={80} required
              onChange={(e) => { setNameTouched(true); setName(e.target.value); }} />
            {nameTouched && !editing && <button type="button" className="linklike" onClick={() => { setNameTouched(false); setName(''); }}>Use suggested name</button>}
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="ed-price">Price paid (₹)</label>
            <input id="ed-price" name="price" className="input" type="number" min="0" step="1" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <fieldset className="ed-group">
          <legend className="label">Season</legend>
          <div className="seg">
            {SEASONS.map((s) => (
              <button type="button" key={s} className={season === s ? 'on' : ''} aria-pressed={season === s} onClick={() => setSeason(s)}>{s}</button>
            ))}
          </div>
        </fieldset>

        <fieldset className="ed-group">
          <legend className="label">Photo</legend>
          <div className="photo-choices">
            <button type="button" className="photo-choice" onClick={() => setPickerOpen(true)}>
              <strong>Browse the catalogue</strong>
              <span>Pick a photo that looks like yours — no camera needed.</span>
            </button>
            <div
          className={`dropzone${dragOver ? ' over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input ref={fileRef} id="ed-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          <label htmlFor="ed-photo">
            <strong>{showPhoto ? 'Upload a different photo' : 'Upload your own photo'}</strong>
            <span>Or drop your own photo here / click to choose (up to 5 MB). No photo? We draw it for you.</span>
          </label>
          {showPhoto && <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setRemovePhoto(true); setCatalog(null); if (fileRef.current) fileRef.current.value = ''; }}>Use the drawing instead</button>}
        </div>
          </div>
        </fieldset>

        <div className="row wrap">
          <SubmitButton pendingText={editing ? 'Saving…' : 'Adding…'}>{editing ? 'Save changes' : 'Add to closet'}</SubmitButton>
          <Link href={editing ? `/closet/${item.id}` : '/closet'} className="btn btn-ghost">Cancel</Link>
        </div>
      </div>
      {pickerOpen && <CataloguePicker group={category} colourHint={colourName} onPick={pickFromCatalogue} onClose={() => setPickerOpen(false)} />}
    </form>
  );
}
