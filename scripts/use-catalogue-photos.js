// Give an account's clothes matching photos from the Pexels catalogue (public/clothing).
//   node scripts/use-catalogue-photos.js                      → demo@hanger.local, items without a photo
//   node scripts/use-catalogue-photos.js you@example.com      → another account
//   node scripts/use-catalogue-photos.js demo@hanger.local --all   → also replace existing catalogue photos
//   add --dry to preview without saving
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const args = process.argv.slice(2);
const email = (args.find((a) => !a.startsWith('--')) || 'demo@hanger.local').toLowerCase();
const ALL = args.includes('--all');
const DRY = args.includes('--dry');
const ROOT = path.join(__dirname, '..');

const HEX = {
  white: '#F7F5F0', ivory: '#F4F0E6', cream: '#F0E6CD', beige: '#D6C4A4', tan: '#C8AA82', camel: '#B08A5B', brown: '#6E4628',
  black: '#1E1D1B', charcoal: '#3B3A38', grey: '#9A9A96', gray: '#9A9A96', silver: '#BEC0C4', navy: '#2E3A57', blue: '#3C64AA',
  'light blue': '#9DB7D5', denim: '#4B6584', teal: '#287878', green: '#3C8246', olive: '#6B7248', khaki: '#AAA06E', red: '#A81E24',
  burgundy: '#6B1F2A', pink: '#E1A0AF', orange: '#DC7828', rust: '#A2482A', yellow: '#E1C332', mustard: '#C9A227', gold: '#C8A546',
  purple: '#6E3C8C', lilac: '#B7A6C9',
};
const rgb = (h) => { const n = parseInt(String(h || '#999999').replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const dist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2); };

function datasetFor(item) {
  const n = item.name.toLowerCase();
  switch (item.category) {
    case 'Tops':
      if (/\btee\b|t-?shirt/.test(n)) return 'tshirt';
      if (/hoodie|sweatshirt/.test(n)) return 'hoodie';
      if (/knit|sweater|crewneck|cardigan|jumper|pullover/.test(n)) return 'sweater';
      if (/shirt|oxford|blouse/.test(n)) return 'shirt';
      if (/\btop\b|tank|cami/.test(n)) return 'top';
      return 'tshirt';
    case 'Bottoms':
      if (/jean|denim/.test(n)) return 'jeans';
      if (/short/.test(n)) return 'shorts';
      if (/skirt/.test(n)) return 'skirt';
      return 'trousers';
    case 'Dresses': return 'dress';
    case 'Outerwear': return /coat|trench|parka/.test(n) ? 'coat' : 'jacket';
    case 'Shoes':
      if (/boot/.test(n)) return 'boots';
      if (/loafer|oxford|derby|brogue|mule|flat/.test(n)) return 'loafers';
      return 'sneakers';
    case 'Accessories':
      if (/watch/.test(n)) return 'watch';
      if (/sunglass|glasses|shades/.test(n)) return 'sunglasses';
      if (/cap|hat/.test(n)) return 'cap';
      if (/bag|tote|purse|clutch|backpack/.test(n)) return 'bag';
      return null;
    default: return null;
  }
}

async function main() {
  const metaPath = path.join(ROOT, 'public', 'clothing', 'metadata.json');
  if (!fs.existsSync(metaPath)) { console.error('No public/clothing/metadata.json — run python cloths/fetch_pexels.py first.'); process.exit(1); }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  let hidden = new Set();
  try { hidden = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'catalogue-hidden.json'), 'utf8'))); } catch { /* none hidden */ }
  const pool = meta
    .map((e) => {
      const photo = e.path || `/clothing/${e.category}/${e.filename}`;
      const cut = e.cutout && fs.existsSync(path.join(ROOT, 'public', e.cutout)) ? e.cutout : null;
      return { dataset: e.category, photo, best: cut || photo, cut: !!cut, hex: HEX[(e.color || '').toLowerCase()] || null };
    })
    .filter((e) => !hidden.has(e.photo) && fs.existsSync(path.join(ROOT, 'public', e.photo)));

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { console.error(`No account with email ${email}`); process.exit(1); }
    const items = await prisma.item.findMany({ where: { userId: user.id }, orderBy: { id: 'asc' } });
    const used = new Set(items.map((i) => i.photo).filter(Boolean));
    let changed = 0;
    for (const item of items) {
      const hasUpload = item.photo && !item.photo.startsWith('/');
      if (hasUpload) continue; // never replace a photo the person uploaded
      if (item.photo && !ALL) continue;
      const ds = datasetFor(item);
      if (!ds) { console.log(`  – ${item.name}: no matching catalogue type`); continue; }
      const cands = pool.filter((e) => e.dataset === ds && (!used.has(e.best) || e.best === item.photo));
      if (!cands.length) { console.log(`  – ${item.name}: nothing left in ${ds}`); continue; }
      cands.sort((a, b) => ((a.hex ? dist(a.hex, item.color) : 200) - (a.cut ? 60 : 0)) - ((b.hex ? dist(b.hex, item.color) : 200) - (b.cut ? 60 : 0)));
      const pick = cands[0];
      used.add(pick.best);
      if (!DRY) await prisma.item.update({ where: { id: item.id }, data: { photo: pick.best } });
      changed++;
      console.log(`  ✓ ${item.name} → ${pick.best}${pick.cut ? ' (cut-out)' : ''}`);
    }
    console.log(`\n${DRY ? 'Would update' : 'Updated'} ${changed} item${changed === 1 ? '' : 's'} for ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
