// Hanger's built-in stylist: a rules-based engine that runs in the browser and on the server.
// It scores combinations from your own closet using season, occasion, colour harmony,
// how recently things were worn, and the style rules you've taught it.
import { slotFor, hexToHsl, isNeutral, hueDistance, formality, daysSince, currentSeason } from './wardrobe';

const OCCASION_TARGET = { Casual: -0.3, Work: 0.6, Evening: 0.9, Festive: 1, Travel: -0.5 };

// "Client lunch, then drinks — it's 34° and might rain" → structured intent
export function parseQuery(text = '') {
  const q = text.toLowerCase();
  const intent = { occasion: null, warmth: 0, colour: false, dressy: 0 };
  if (/work|office|meeting|client|interview|presentation|lunch/.test(q)) intent.occasion = 'Work';
  if (/date|dinner|drinks|party|night|evening|cocktail|club/.test(q)) intent.occasion = 'Evening';
  if (/wedding|festival|diwali|eid|holi|puja|pooja|sangeet|mehendi|festive/.test(q)) intent.occasion = 'Festive';
  if (/travel|trip|flight|airport|train|road ?trip/.test(q)) intent.occasion = 'Travel';
  if (/weekend|brunch|errand|market|casual|coffee|lazy|home|chill/.test(q)) intent.occasion = intent.occasion || 'Casual';
  if (/cold|chilly|cool|freez|winter|layer|wind/.test(q)) intent.warmth = 1;
  if (/hot|heat|humid|summer|warm|sunny|\b3\d\s*°|\b4\d\s*°/.test(q)) intent.warmth = -1;
  if (/rain|monsoon|drizzle|storm/.test(q)) intent.rain = true;
  if (/colou?r|bright|bold|fun|pop/.test(q)) intent.colour = true;
  if (/dress(y|ier|ed up)|smart|sharp|formal|polished|elegant/.test(q)) intent.dressy = 1;
  if (/relax|comfy|comfortable|easy|laid.?back/.test(q)) intent.dressy = -1;
  return intent;
}

function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pairScore(a, b, wantColour) {
  const na = isNeutral(a.color), nb = isNeutral(b.color);
  if (na && nb) return 0.3;
  if (na || nb) return 0.6;
  const d = hueDistance(a.color, b.color);
  if (d < 35) return 0.8; // tonal
  if (d > 150) return wantColour ? 0.7 : 0.1; // complementary
  const sa = hexToHsl(a.color).s, sb = hexToHsl(b.color).s;
  return sa > 0.35 && sb > 0.35 ? -0.5 : 0; // two strong, unrelated hues
}

/**
 * items: [{id, name, category, color, season, wearCount, lastWornAt}]
 * rules: [{kind, itemId, otherItemId, season, createdAt}]
 * opts: {season, occasion, warmth, colour, dressy, pinned: {zoneKey: itemId}, seed, count, now}
 * → [{ slots: {outer, top, bottom, shoes, extra}, notes: {zoneKey: text}, reason, score }]
 */
export function suggest(items, rules = [], opts = {}) {
  const now = opts.now ?? Date.now();
  const season = opts.season || currentSeason(new Date(now));
  const occasion = opts.occasion || 'Casual';
  const warmth = opts.warmth || 0;
  const wantColour = !!opts.colour;
  const target = (OCCASION_TARGET[occasion] ?? 0) + 0.6 * (opts.dressy || 0);
  const pinned = opts.pinned || {};
  const rand = rng(opts.seed ?? Math.floor(Math.random() * 1e9));
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));

  // ---- rules → exclusions and bad pairs
  const excluded = new Set();
  const badPairs = new Set();
  for (const r of rules) {
    if (r.kind === 'not_me') excluded.add(r.itemId);
    if (r.kind === 'too_warm' && (!r.season || r.season === season) && warmth <= 0) excluded.add(r.itemId);
    if (r.kind === 'worn_recently' && now - new Date(r.createdAt).getTime() < 7 * 864e5) excluded.add(r.itemId);
    if (r.kind === 'wrong_colour' && r.otherItemId) {
      badPairs.add(`${r.itemId}:${r.otherItemId}`);
      badPairs.add(`${r.otherItemId}:${r.itemId}`);
    }
  }
  for (const id of Object.values(pinned)) if (id != null) excluded.delete(id);

  // ---- single-item score
  const itemScore = (it) => {
    let s = 0;
    if (it.season === season) s += 1;
    else if (it.season !== 'All year') s -= 1.5;
    if (warmth > 0) s += it.season === 'Winter' ? 0.8 : it.season === 'Summer' ? -0.6 : 0;
    if (warmth < 0) s += it.season === 'Summer' ? 0.8 : it.season === 'Winter' ? -1.2 : 0;
    const d = daysSince(it.lastWornAt, now);
    const rest = d == null ? 60 : d;
    s += (Math.min(rest, 60) / 60) * 0.8;
    if (rest >= 90) s += 0.4;
    if (d != null && d < 2) s -= 0.8;
    if (wantColour && !isNeutral(it.color)) s += 0.5;
    return s;
  };

  const pool = (cats) => items
    .filter((i) => cats.includes(i.category) && !excluded.has(i.id))
    .map((i) => ({ i, s: itemScore(i) }))
    .sort((a, b) => b.s - a.s);

  const pickWeighted = (list) => {
    if (!list.length) return null;
    const top = list.slice(0, 6);
    const w = top.map((x, k) => Math.exp(x.s) / (k + 1));
    let r = rand() * w.reduce((a, b) => a + b, 0);
    for (let k = 0; k < top.length; k++) { r -= w[k]; if (r <= 0) return top[k].i; }
    return top[0].i;
  };

  const tops = pool(pinned.bottom != null ? ['Tops'] : ['Tops', 'Dresses']);
  const bottoms = pool(['Bottoms']);
  const shoes = pool(['Shoes']);
  const outers = pool(['Outerwear']);
  const extras = pool(['Accessories']);
  if (!tops.length && pinned.top == null) return [];

  const wantOuter = pinned.outer != null || (warmth >= 0 && (warmth > 0 || season === 'Winter' || (season === 'Monsoon' && opts.rain)));
  const maybeOuter = warmth >= 0 && season !== 'Summer';
  // an optional layer must suit the season (no wool coat thrown on in the monsoon)
  const seasonalOuters = outers.filter(({ i }) => i.season === 'All year' || i.season === season);

  const results = new Map();
  for (let n = 0; n < 260; n++) {
    const slots = { outer: null, top: null, bottom: null, shoes: null, extra: null };
    slots.top = pinned.top ?? pickWeighted(tops)?.id ?? null;
    const topItem = byId[slots.top];
    const isDress = topItem?.category === 'Dresses';
    if (!isDress) slots.bottom = pinned.bottom ?? pickWeighted(bottoms)?.id ?? null;
    slots.shoes = pinned.shoes ?? pickWeighted(shoes)?.id ?? null;
    if (pinned.outer != null) slots.outer = pinned.outer;
    else if (outers.length && wantOuter) slots.outer = pickWeighted(outers).id;
    else if (seasonalOuters.length && maybeOuter && rand() < 0.3) slots.outer = pickWeighted(seasonalOuters).id;
    if (pinned.extra != null) slots.extra = pinned.extra;
    else if (extras.length && rand() < 0.45) slots.extra = pickWeighted(extras).id;

    const chosen = Object.values(slots).filter((v) => v != null).map((id) => byId[id]);
    if (!chosen.length) continue;
    const key = Object.values(slots).join(',');
    if (results.has(key)) continue;

    let score = chosen.reduce((a, it) => a + itemScore(it), 0) / chosen.length;
    for (let x = 0; x < chosen.length; x++) {
      for (let y = x + 1; y < chosen.length; y++) {
        score += pairScore(chosen[x], chosen[y], wantColour) * 0.5;
        if (badPairs.has(`${chosen[x].id}:${chosen[y].id}`)) score -= 4;
      }
    }
    const avgF = chosen.reduce((a, it) => a + formality(it), 0) / chosen.length;
    score -= Math.abs(avgF - target) * 1.2;
    if (!isDress && slots.bottom == null && bottoms.length) score -= 3;
    results.set(key, { slots, score });
  }

  // best first, keeping the alternatives meaningfully different
  const ranked = [...results.values()].sort((a, b) => b.score - a.score);
  const picked = [];
  for (const r of ranked) {
    const ids = Object.values(r.slots).filter(Boolean);
    const tooClose = picked.some((p) => {
      const pids = Object.values(p.slots).filter(Boolean);
      const shared = ids.filter((id) => pids.includes(id)).length;
      return shared >= Math.max(ids.length, pids.length) - 1 && items.length > 8;
    });
    if (!tooClose) picked.push(r);
    if (picked.length >= (opts.count || 3)) break;
  }

  return picked.map((r) => ({
    slots: r.slots,
    score: r.score,
    notes: explain(r.slots, byId, { season, target, now, pinned }),
    reason: headline(r.slots, byId, { season, occasion, warmth, wantColour, pinned }),
  }));
}

function explain(slots, byId, { season, target, now, pinned }) {
  const notes = {};
  const placed = Object.entries(slots).filter(([, id]) => id != null).map(([k, id]) => [k, byId[id]]);
  for (const [k, it] of placed) {
    const others = placed.filter(([kk]) => kk !== k).map(([, o]) => o);
    const d = daysSince(it.lastWornAt, now);
    const tonal = others.find((o) => !isNeutral(o.color) && !isNeutral(it.color) && hueDistance(o.color, it.color) < 35);
    const contrast = others.find((o) => !isNeutral(o.color) && !isNeutral(it.color) && hueDistance(o.color, it.color) > 150);
    const colourful = others.some((o) => !isNeutral(o.color));
    const f = formality(it);
    let note;
    if (pinned && pinned[k] === it.id) note = 'Your pick — the rest is built around it.';
    else if (d == null) note = 'Never worn yet — its first outing.';
    else if (d >= 90) note = `Not out in ${d} days. Bring it back.`;
    else if (tonal) note = `Tonal with the ${tonal.name.toLowerCase()}.`;
    else if (contrast) note = `Plays against the ${contrast.name.toLowerCase()}.`;
    else if (isNeutral(it.color) && colourful) note = 'A quiet base that lets the colour talk.';
    else if (it.season === season && it.season !== 'All year') note = `Made for ${season.toLowerCase()}.`;
    else if (target >= 0.5 && f > 0) note = 'Keeps it polished.';
    else if (target < 0 && f < 0) note = 'Keeps it easy.';
    else note = 'Works with everything here.';
    notes[k] = note;
  }
  return notes;
}

function headline(slots, byId, { season, occasion, warmth, wantColour, pinned }) {
  const pin = Object.values(pinned || {}).find((id) => id != null);
  const parts = [];
  if (pin && byId[pin]) parts.push(`Built around your ${byId[pin].name.toLowerCase()}`);
  else parts.push(`${occasion === 'Casual' ? 'An easy' : occasion === 'Work' ? 'A work' : occasion === 'Travel' ? 'A travel' : occasion === 'Festive' ? 'A festive' : 'An evening'} look`);
  parts.push(`for ${season.toLowerCase()}`);
  let s = parts.join(' ');
  if (warmth > 0) s += ', layered for the cold';
  if (warmth < 0) s += ', light for the heat';
  if (wantColour) s += ', with more colour';
  return s + '.';
}

// Map an arbitrary list of item ids onto zones (used for ?items= links and saved looks)
export function slotsFromItems(ids, byId) {
  const slots = { outer: null, top: null, bottom: null, shoes: null, extra: null };
  for (const id of ids) {
    const it = byId[id];
    if (!it) continue;
    const k = slotFor(it.category);
    if (slots[k] == null) slots[k] = it.id;
  }
  if (slots.top != null && byId[slots.top]?.category === 'Dresses') slots.bottom = null;
  return slots;
}
