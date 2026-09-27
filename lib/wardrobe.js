export const CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'];
export const SEASONS = ['All year', 'Summer', 'Monsoon', 'Winter'];
export const OCCASIONS = ['Casual', 'Work', 'Evening', 'Travel', 'Festive'];

export const GARMENT_PATHS = {
  top: 'M35 18 L20 26 L12 42 L24 48 L28 40 L28 84 L72 84 L72 40 L76 48 L88 42 L80 26 L65 18 Q50 30 35 18 Z',
  pants: 'M30 12 L70 12 L75 88 L56 88 L50 38 L44 88 L25 88 Z',
  dress: 'M40 10 L60 10 L58 30 L80 88 L20 88 L42 30 Z',
  jacket: 'M36 14 L20 22 L12 80 L24 82 L28 46 L28 88 L72 88 L72 46 L76 82 L88 80 L80 22 L64 14 L50 42 Z',
  shoe: 'M12 56 L12 72 L90 72 Q92 60 80 57 L60 51 L52 38 L36 38 L34 50 Q24 55 12 56 Z',
  bag: 'M24 38 L76 38 L82 86 L18 86 Z M38 38 Q38 18 50 18 Q62 18 62 38',
};

const TYPE_BY_CATEGORY = {
  Tops: 'top', Bottoms: 'pants', Dresses: 'dress', Outerwear: 'jacket', Shoes: 'shoe', Accessories: 'bag',
};

export function garmentPath(category) {
  return GARMENT_PATHS[TYPE_BY_CATEGORY[category] || 'top'];
}

// Which slot an item fills in the outfit builder
export function slotFor(category) {
  if (category === 'Outerwear') return 'outer';
  if (category === 'Bottoms') return 'bottom';
  if (category === 'Shoes') return 'shoes';
  if (category === 'Accessories') return 'extra';
  return 'top'; // Tops and Dresses
}

// A light background tint made from the garment colour
export function tintOf(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#F3EEE4';
  const n = parseInt(m[1], 16);
  const mix = (c) => Math.round(c + (255 - c) * 0.82);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  // keep very light garments visible against their tile
  const lum = (0.299 * r + 0.587 * g + 0.114 * b);
  const k = lum > 245 ? 0.9 : 1;
  const h = (v) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Rough Indian seasons: Mar–Jun summer, Jul–Sep monsoon, Oct–Feb winter
export function currentSeason(date = new Date()) {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 6) return 'Summer';
  if (m >= 7 && m <= 9) return 'Monsoon';
  return 'Winter';
}

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDate(d) {
  if (!d) return 'Never';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------- The Table: five zones on a flat-lay body guide ----------
// box = [left%, top%, width%, height%]; z = stacking order (jacket over shirt, etc.)
export const ZONES = [
  { key: 'outer', label: 'Layer', cats: ['Outerwear'], box: [4, 6, 36, 52], z: 3 },
  { key: 'top', label: 'Top / dress', cats: ['Tops', 'Dresses'], box: [28, 3, 36, 46], z: 2 },
  { key: 'bottom', label: 'Bottom', cats: ['Bottoms'], box: [34, 44, 30, 50], z: 1 },
  { key: 'extra', label: 'Accessory', cats: ['Accessories'], box: [68, 24, 26, 32], z: 4 },
  { key: 'shoes', label: 'Shoes', cats: ['Shoes'], box: [66, 70, 28, 24], z: 4 },
];
export const ZONE_KEYS = ZONES.map((z) => z.key);

// A dress is long, so the top zone stretches when one is in it
export function boxFor(zoneKey, topIsDress) {
  const zone = ZONES.find((z) => z.key === zoneKey);
  if (zoneKey === 'top' && topIsDress) return [30, 3, 34, 90];
  return zone.box;
}

// ---------- colour ----------
export function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return { h: 0, s: 0, l: 0.5 };
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}

export function isNeutral(hex) {
  const { s, l } = hexToHsl(hex);
  return s < 0.2 || l > 0.9 || l < 0.13;
}

export const COLOUR_FAMILIES = ['Neutrals', 'Warm tones', 'Greens', 'Cool tones'];
export function colourFamily(hex) {
  if (isNeutral(hex)) return 'Neutrals';
  const { h } = hexToHsl(hex);
  if (h < 70 || h >= 330) return 'Warm tones';
  if (h < 170) return 'Greens';
  return 'Cool tones';
}

export function hueDistance(a, b) {
  const d = Math.abs(hexToHsl(a).h - hexToHsl(b).h) % 360;
  return d > 180 ? 360 - d : d;
}

// ---------- formality (a rough guess from the item's name) ----------
const FORMAL = /blazer|trouser|oxford|shirt|loafer|heel|pump|coat|silk|satin|slip|midi|suit|tailor|pleat|blouse|kurta|saree|sari|sherwani|lehenga|mule|derby|brogue|pencil/i;
const CASUAL = /sneaker|jean|denim|tee\b|t-shirt|hoodie|jogger|shorts|sweat|trainer|cargo|flip|slide|crewneck|overshirt|linen|tank|legging|canvas/i;
export function formality(item) {
  let f = 0;
  if (FORMAL.test(item.name)) f += 1;
  if (CASUAL.test(item.name)) f -= 1;
  if (item.category === 'Dresses') f += 0.4;
  return f;
}

export function daysSince(date, now = Date.now()) {
  if (!date) return null;
  return Math.floor((now - new Date(date).getTime()) / 864e5);
}

