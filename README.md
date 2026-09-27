# Hanger — wardrobe & outfit manager

A multi-user web app to catalog your clothes, build outfits, plan what to wear and see what you actually wear. Includes an admin panel.

**Stack:** Next.js 15 (App Router, server actions) · React 19 · Prisma + SQLite · cookie sessions with bcrypt-hashed passwords. No external services needed.

## Run it locally (Windows, macOS or Linux)

You need **Node.js 18.18 or newer** (20 or 22 LTS recommended). Check with `node -v`.

```bash
cd path\to\this\folder
npm install        # installs packages and generates the Prisma client
npm run setup      # creates the SQLite database (prisma/dev.db) and demo data
npm run dev        # starts the site at http://localhost:3000
```

Log in with a demo account:

| Account | Email | Password |
|---|---|---|
| Admin | `admin@hanger.local` | `admin12345` |
| Demo user (sample closet) | `demo@hanger.local` | `demo12345` |

Or click **Create an account** to make your own. (If you skip `npm run setup`'s seed, the first account that signs up becomes the admin.)

## Clothing photos (optional)

The catalogue photos aren't stored in this repository. To rebuild them, get a free Pexels API key and follow [`cloths/README.md`](cloths/README.md):

```
python cloths/fetch_pexels.py      # downloads ~380 photos into public/clothing
python cloths/make_cutouts.py      # transparent cut-outs (pip install pillow numpy)
npm run photos:demo                # give the demo closet matching photos
```

Without them everything still works; pieces without a photo are drawn.

> On Windows PowerShell, if `npm` says "running scripts is disabled", use `npm.cmd …` or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

## Features

- **Landing page** (signed out) — garments you can grab and throw, a hanging rail, a scroll-driven "getting dressed" sequence and a live stylist demo.
- **Illustrated garments** — every piece is drawn with collars, buttons, seams, stitching, folds, fabric grain and prints (stripe, check, floral, dots), chosen from its name and tinted with its colour. Photos are used when you upload one.
- **Today** — the look of the day (or your planned outfit) as a still life, with a note per piece; *Wear this* logs every piece.
- **Closet** — the **Rail** (garments swing as you scroll) and the **Archive** grid; filter with a sentence; garments tilt toward your cursor. Click any piece for a **quick-look sheet** (← → to browse, Esc to close).
- **Add / edit a piece** — a live preview that redraws as you pick category, type, colour (swatches or custom), pattern and season; drag-and-drop photo upload; auto-suggested names.
- **Studio** — a full-screen workspace: rail · table · inspector.
  - Drag pieces onto the table; they snap into place and layer themselves. Flick sideways for the next piece, hold (or use the inspector) to pin, throw off the table to reject, Shuffle re-deals what isn't pinned, Ctrl+Z undoes.
  - The **stylist dock**: type the day ("client lunch, then drinks, it's hot"), nudge it (warmer, cooler, dressier, relaxed, more colour), pick a Plan B.
  - Inspector tabs: **Look** (pieces, pins, save), **Saved** (click to load a look onto the table), **Rules** (what the stylist has learned — delete any).
- **Planner** — drag a saved look onto a day (or click a look, then a day); drag a day back to the tray to clear it; mark worn. Each day shows the actual garments.
- **Insights** and **Admin panel**.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run setup` | Apply database changes (safe to re-run; keeps your data) |
| `npm run build` then `npm start` | Production build and server |
| `npm run db:reset` | Wipes the database and re-creates the demo data |
| `npx prisma studio` | Browse/edit the database in your browser |

Photos are stored in the `uploads/` folder; the database is `prisma/dev.db`.

## Project layout

```
app/
  (app)/closet, outfits, planner, insights   user pages
  admin/                                     admin panel
  actions/                                   server actions (all writes)
  api/uploads/[file]/route.js                serves uploaded photos (logged-in only)
  login/, signup/
components/                                  UI pieces (sidebar, outfit builder, …)
lib/                                         db client, auth/sessions, helpers
prisma/schema.prisma, seed.js                database schema and demo data
```

## Going further

- Switch SQLite for Postgres: in `prisma/schema.prisma` change `provider` to `"postgresql"` and `url` to `env("DATABASE_URL")`, then set `DATABASE_URL` in a `.env` file.
- Store photos in S3/Cloudinary instead of `uploads/` for a hosted deployment.
- Add a weather API to make "Suggested for today" weather-aware.
