// Server-side access to the Pexels clothing dataset in public/clothing.
import fs from 'node:fs';
import path from 'node:path';
import { DATASET, COLOUR_HEX } from './catalogue-shared';

const ROOT = process.cwd();
const META = path.join(ROOT, 'public', 'clothing', 'metadata.json');
const HIDDEN = path.join(ROOT, 'data', 'catalogue-hidden.json');

let cache = { mtime: 0, hiddenMtime: 0, entries: [] };

function mtime(p) {
  try { return fs.statSync(p).mtimeMs; } catch { return 0; }
}

export function readHidden() {
  try { return new Set(JSON.parse(fs.readFileSync(HIDDEN, 'utf8'))); } catch { return new Set(); }
}

export function writeHidden(set) {
  fs.mkdirSync(path.dirname(HIDDEN), { recursive: true });
  fs.writeFileSync(HIDDEN, JSON.stringify([...set].sort(), null, 2));
}

// Every catalogue image, including hidden ones (flagged), newest metadata each call if files changed
export function loadCatalogue() {
  const m = mtime(META), h = mtime(HIDDEN);
  if (m && m === cache.mtime && h === cache.hiddenMtime) return cache.entries;
  let raw = [];
  try { raw = JSON.parse(fs.readFileSync(META, 'utf8')); } catch { raw = []; }
  const hidden = readHidden();
  const entries = raw
    .filter((e) => DATASET[e.category])
    .map((e) => {
      const photo = e.path || `/clothing/${e.category}/${e.filename}`;
      const cutoutOk = e.cutout && fs.existsSync(path.join(ROOT, 'public', e.cutout));
      const colour = (e.color || '').toLowerCase();
      return {
        id: photo,
        photo,
        cutout: cutoutOk ? e.cutout : null,
        best: cutoutOk ? e.cutout : photo,
        dataset: e.category,
        group: DATASET[e.category].group,
        label: DATASET[e.category].label,
        colour,
        colourHex: COLOUR_HEX[colour] || null,
        alt: e.alt || '',
        photographer: e.photographer || '',
        photographerUrl: e.photographerUrl || '',
        sourceUrl: e.sourceUrl || '',
        hidden: hidden.has(photo),
      };
    })
    .filter((e) => fs.existsSync(path.join(ROOT, 'public', e.photo)));
  cache = { mtime: m, hiddenMtime: h, entries };
  return entries;
}

// Look up the credit for an item's photo path (either the jpg or its cut-out)
export function creditFor(photoPath) {
  if (!photoPath || !photoPath.startsWith('/clothing/')) return null;
  const e = loadCatalogue().find((x) => x.photo === photoPath || x.cutout === photoPath);
  if (!e) return null;
  return { photographer: e.photographer, photographerUrl: e.photographerUrl, sourceUrl: e.sourceUrl };
}

export function findCatalogueEntry(photoPath) {
  return loadCatalogue().find((x) => (x.photo === photoPath || x.cutout === photoPath) && !x.hidden) || null;
}
