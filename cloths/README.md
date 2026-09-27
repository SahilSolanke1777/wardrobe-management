# Clothing image dataset (Pexels)

`fetch_pexels.py` builds a local set of clothing photos using the **official Pexels API** (no web scraping) and saves them where the website can serve them:

```
public/clothing/
  tshirt/tshirt_001.jpg … tshirt_020.jpg
  shirt/ … top/ … sweater/ … hoodie/ … jacket/ … coat/ … jeans/ … trousers/ …
  shorts/ … skirt/ … dress/ … sneakers/ … boots/ … loafers/ … watch/ … bag/ … cap/ … sunglasses/
  metadata.json
```

In the app, an image is available at `/clothing/<category>/<file>`, e.g. `/clothing/jeans/jeans_003.jpg`.

## 1. Get a free Pexels API key

1. Create a free account at <https://www.pexels.com> and sign in.
2. Open <https://www.pexels.com/api/> → **Your API Key** and request a key. You'll be asked what the project is; "personal wardrobe app" is fine.
3. Copy the key (a long string of letters and numbers).

## 2. Give the key to the script

Pick **one** of these:

**A. A `.env` file (easiest, remembered for next time).** In the project folder (`wardrobe\main`, next to `package.json`), create a file called `.env` containing one line:

```
PEXELS_API_KEY=paste_your_key_here
```

`.env` is already in `.gitignore`, so the key won't be committed.

**B. Just for this terminal session**

- Windows PowerShell: `$env:PEXELS_API_KEY="paste_your_key_here"`
- Windows Command Prompt: `set PEXELS_API_KEY=paste_your_key_here`
- macOS / Linux: `export PEXELS_API_KEY=paste_your_key_here`

Never paste the key into the script itself or share it in screenshots.

## 3. Run it

From the project folder (`wardrobe\main`):

```
python cloths/fetch_pexels.py
```

Optional but recommended — install Pillow first so the script can also check for clean plain backgrounds, read each garment's colour from the pixels, and catch near-duplicates:

```
pip install pillow
```

Useful options:

| Command | What it does |
|---|---|
| `python cloths/fetch_pexels.py` | All 19 categories, 20 images each |
| `python cloths/fetch_pexels.py --only jeans cap` | Only some categories |
| `python cloths/fetch_pexels.py --count 30` | More images per category |
| `python cloths/fetch_pexels.py --dry-run` | Search and filter, but download nothing |
| `python cloths/fetch_pexels.py --size large2x` | Bigger files (default `large`, about 940 px) |
| `python cloths/fetch_pexels.py --min-clean 0.2` | Accept busier backgrounds (Pillow only; default 0.35) |

**Re-running is safe.** Existing images and `metadata.json` are kept. Each category is only topped up to the count, and if you delete an image you don't like, the next run fills that number again with a different photo.

## How images are chosen

- **Several searches per category**, worded toward product shots, e.g. "plain t-shirt isolated white background", "t-shirt flat lay", "t-shirt on hanger". Edit the `queries` lists at the top of the script to change them.
- **Relevance:** the photo's Pexels description must mention the item (e.g. *jeans/denim*), and must not be a different item (e.g. *dress shirt* is kept out of *dress*).
- **Clean shots first:** descriptions with words like *isolated, white background, studio, flat lay, hanger, product* rank higher, and photos of people or street scenes rank lower. With Pillow, images whose edges aren't a fairly even background are skipped.
- **Logos:** photos whose description mentions a logo, brand names (Nike, Adidas, Gucci…), text, slogans or graphic prints are skipped. This works from the text description only, so it can't see an unlabelled logo in the picture. Glance through the folders and delete anything you don't want; the next run replaces it.
- **No duplicates:** the same Pexels photo is never saved twice (even across categories). Identical files are detected by hash and, with Pillow, near-identical images are detected by a perceptual hash.
- **Minimum size:** 800 px on the short side.

## Using the photos in Hanger

After the download, three steps:

1. **Cut the clothes out of their backgrounds** so they sit on the Table like real objects:
   ```
   pip install pillow numpy
   python cloths/make_cutouts.py
   ```
   This writes a transparent `.png` next to each `.jpg` whose background can be removed cleanly, and records it in `metadata.json` as `"cutout"`. Photos that are too busy to cut stay as photos, and the site shows those as framed photo cards. For much better results on busy photos, first run `pip install "rembg[cpu]"`: the script uses it automatically (it downloads a ~170 MB model the first time). Re-run with `--redo` after installing it.
2. **Review the catalogue:** log in as the admin, open **Admin → Catalogue**, and click any photo that's the wrong item, shows a logo or looks messy. Hidden photos disappear from the site. The list is saved in `data/catalogue-hidden.json`.
3. **Give the demo closet real photos** (optional):
   ```
   npm run photos:demo
   ```
   This matches each demo item to the closest catalogue photo by type and colour, preferring cut-outs. It never replaces photos you uploaded yourself. Add `-- --dry` to preview, or pass another account's email: `npm run photos:demo -- you@example.com`.

In the app, **Closet → Add a piece → Browse the catalogue** lets anyone pick a photo that looks like their item. It fills in the category, colour and name, and credits the photographer.

## metadata.json

One entry per image:

```json
{
  "filename": "jeans_003.jpg",
  "category": "jeans",
  "color": "blue",
  "source": "Pexels",
  "sourceUrl": "https://www.pexels.com/photo/…",
  "path": "/clothing/jeans/jeans_003.jpg",
  "pexelsId": 1234567,
  "photographer": "Jane Doe",
  "photographerUrl": "https://www.pexels.com/@janedoe",
  "alt": "Folded blue jeans on a white surface",
  "width": 4000,
  "height": 4000,
  "sha1": "…",
  "ahash": "…"
}
```

The first five fields are the ones you asked for. The rest are extras: `path` is ready to use as an `<img src>` in the app, the photographer fields are for credits, and the hashes are used for duplicate checks. `color` comes from the photo's description when it names a colour ("navy t-shirt on a white background" → `navy`). Otherwise it comes from the garment's pixels (Pillow), or failing that Pexels' average colour.

## Limits and licence

- Pexels allows **200 requests per hour and 20,000 per month** by default. A full run uses roughly 4–12 search requests per category; image downloads don't count. If you hit the limit the script stops cleanly with progress saved — wait an hour and run it again.
- Pexels photos are free to use, but Pexels asks API users to **show a link back to Pexels** ("Photos provided by Pexels") and to **credit photographers** where possible (the metadata includes names and links). Photos can't be resold unaltered or used to build a competing stock-photo service, and people in photos can't be shown endorsing a product. See <https://www.pexels.com/license/> and <https://www.pexels.com/api/documentation/>.
- The images you collected yourself in `cloths/` (accessories, jeans, jecket, shoes, tshirt) are left untouched. They didn't come through the API, so they're not in `metadata.json`.
