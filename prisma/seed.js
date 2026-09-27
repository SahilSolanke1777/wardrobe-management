// Creates an admin account and a demo user with a sample closet.
// Run with:  npm run setup   (or  node prisma/seed.js)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function main() {
  if (await prisma.user.findUnique({ where: { email: 'admin@hanger.local' } })) {
    console.log('Seed data already exists — skipping. (Use "npm run db:reset" to start over.)');
    return;
  }

  await prisma.user.create({
    data: { name: 'Admin', email: 'admin@hanger.local', passwordHash: await bcrypt.hash('admin12345', 10), role: 'ADMIN' },
  });

  const demo = await prisma.user.create({
    data: { name: 'Demo', email: 'demo@hanger.local', passwordHash: await bcrypt.hash('demo12345', 10) },
  });

  const now = Date.now();
  const raw = [
    ['Linen overshirt', 'Tops', '#D8C7A6', 'Summer', 1800, 18, 12],
    ['White oxford shirt', 'Tops', '#F7F5F0', 'All year', 1500, 24, 6],
    ['Navy crewneck', 'Tops', '#2E3A57', 'Winter', 2200, 11, 118],
    ['Straight-leg jeans', 'Bottoms', '#4B6584', 'All year', 2800, 31, 3],
    ['Olive chinos', 'Bottoms', '#6B7248', 'All year', 1900, 9, 21],
    ['Black trousers', 'Bottoms', '#25221F', 'All year', 2400, 14, 6],
    ['Rust slip dress', 'Dresses', '#A2482A', 'Summer', 3200, 4, 28],
    ['Floral midi dress', 'Dresses', '#C98F9B', 'Summer', 2600, 2, 107],
    ['Wool overcoat', 'Outerwear', '#8A7458', 'Winter', 7500, 6, 190],
    ['Denim jacket', 'Outerwear', '#6D87A6', 'Monsoon', 3000, 12, 11],
    ['White sneakers', 'Shoes', '#F7F5F0', 'All year', 4500, 40, 2],
    ['Brown loafers', 'Shoes', '#6A4128', 'All year', 3800, 8, 9],
    ['Leather tote', 'Accessories', '#7A4A2A', 'All year', 5200, 22, 4],
    ['Silk scarf', 'Accessories', '#C9A227', 'All year', 1400, 3, 96],
  ];
  const items = {};
  for (const [name, category, color, season, price, wearCount, daysAgo] of raw) {
    items[name] = await prisma.item.create({
      data: { userId: demo.id, name, category, color, season, price, wearCount, lastWornAt: new Date(now - daysAgo * DAY), createdAt: new Date(now - 200 * DAY) },
    });
  }

  const outfitDefs = [
    ['Office Monday', 'Work', ['White oxford shirt', 'Black trousers', 'Brown loafers'], 6, 6],
    ['Weekend market', 'Casual', ['Linen overshirt', 'Straight-leg jeans', 'White sneakers'], 4, 12],
    ['Dinner out', 'Evening', ['Rust slip dress', 'Brown loafers'], 2, 28],
    ['Rainy commute', 'Work', ['Denim jacket', 'White oxford shirt', 'Olive chinos', 'White sneakers'], 3, 11],
    ['Sunday brunch', 'Casual', ['Linen overshirt', 'Olive chinos', 'White sneakers'], 0, null],
  ];
  const outfits = [];
  for (const [name, occasion, pieces, wearCount, daysAgo] of outfitDefs) {
    outfits.push(await prisma.outfit.create({
      data: {
        userId: demo.id, name, occasion, wearCount,
        lastWornAt: daysAgo == null ? null : new Date(now - daysAgo * DAY),
        items: { create: pieces.map((p) => ({ itemId: items[p].id })) },
      },
    }));
  }

  // A few plans around today
  const today = new Date();
  const offsets = [[-2, 0, true], [0, 1, false], [1, 3, false], [3, 4, false], [5, 0, false], [8, 2, false]];
  for (const [d, o, worn] of offsets) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
    await prisma.plan.create({ data: { userId: demo.id, date: iso(date), outfitId: outfits[o].id, worn } });
  }

  console.log('Seeded:');
  console.log('  admin@hanger.local / admin12345  (admin)');
  console.log('  demo@hanger.local  / demo12345   (demo closet)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
