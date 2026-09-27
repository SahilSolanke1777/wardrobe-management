#!/usr/bin/env python3
"""
Build a local clothing image dataset from the official Pexels API.

  python cloths/fetch_pexels.py                    # all categories, 20 images each
  python cloths/fetch_pexels.py --only jeans cap   # just some categories
  python cloths/fetch_pexels.py --count 30         # more per category
  python cloths/fetch_pexels.py --dry-run          # show what would be downloaded

Images go to public/clothing/{category}/{category}_001.jpg ... and every image is
described in public/clothing/metadata.json. Re-running is safe: it keeps what is
already there, never downloads the same photo twice, and only tops categories up.

Needs a Pexels API key (free): see cloths/README.md.
Standard library only. If Pillow is installed (pip install pillow) the script also
checks for clean, plain backgrounds, reads the garment colour from the pixels, and
catches near-duplicate images.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path

try:  # optional, improves filtering and colour detection
    from PIL import Image  # type: ignore
except Exception:  # pragma: no cover
    Image = None

API_BASE = os.environ.get("PEXELS_API_BASE", "https://api.pexels.com/v1")
USER_AGENT = "hanger-dataset-builder/1.0 (+https://www.pexels.com/api/)"
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = PROJECT_ROOT / "public" / "clothing"

# ---------------------------------------------------------------------------
# Categories: search queries (tried in order) and words that must appear in the
# photo's description so we only keep relevant results.
# ---------------------------------------------------------------------------
CATEGORIES: dict[str, dict] = {
    "tshirt": {
        "queries": ["plain t-shirt isolated white background", "t-shirt flat lay", "blank t-shirt on hanger", "t-shirt product photo"],
        "must": ["t-shirt", "tshirt", "t shirt", "tee"],
    },
    "shirt": {
        "queries": ["button up shirt isolated", "dress shirt on hanger", "shirt flat lay", "folded shirt studio"],
        "must": ["shirt"],
        "exclude": ["t-shirt", "tshirt", "t shirt", "sweatshirt"],
    },
    "top": {
        "queries": ["women top isolated white background", "blouse on hanger", "crop top flat lay", "tank top product photo"],
        "must": ["top", "blouse", "camisole", "tank"],
    },
    "sweater": {
        "queries": ["knit sweater isolated", "sweater flat lay", "folded knit sweater", "wool sweater on hanger"],
        "must": ["sweater", "knit", "jumper", "cardigan", "pullover", "knitwear"],
    },
    "hoodie": {
        "queries": ["hoodie isolated white background", "hoodie flat lay", "hoodie on hanger", "plain hoodie product"],
        "must": ["hoodie", "hooded", "sweatshirt"],
    },
    "jacket": {
        "queries": ["jacket isolated white background", "denim jacket on hanger", "leather jacket product photo", "jacket flat lay"],
        "must": ["jacket", "blazer", "bomber"],
    },
    "coat": {
        "queries": ["coat on hanger", "wool coat isolated", "trench coat product photo", "coat flat lay"],
        "must": ["coat", "trench", "overcoat", "parka"],
    },
    "jeans": {
        "queries": ["jeans isolated white background", "folded jeans", "denim jeans flat lay", "jeans on hanger"],
        "must": ["jeans", "denim"],
        "exclude": ["jacket"],
    },
    "trousers": {
        "queries": ["trousers isolated", "chino pants flat lay", "dress pants on hanger", "folded trousers"],
        "must": ["trousers", "pants", "chino", "slacks"],
        "exclude": ["jeans"],
    },
    "shorts": {
        "queries": ["shorts isolated white background", "shorts flat lay", "denim shorts product photo", "folded shorts"],
        "must": ["shorts"],
    },
    "skirt": {
        "queries": ["skirt isolated white background", "skirt on hanger", "skirt flat lay", "pleated skirt product"],
        "must": ["skirt"],
    },
    "dress": {
        "queries": ["dress on hanger", "dress isolated white background", "summer dress flat lay", "dress on mannequin"],
        "must": ["dress", "gown"],
        "exclude": ["dress shirt", "dress shoes", "dress pants"],
    },
    "sneakers": {
        "queries": ["sneakers isolated white background", "white sneakers product photo", "sneaker studio shot", "running shoes isolated"],
        "must": ["sneaker", "trainer", "running shoe", "shoe"],
    },
    "boots": {
        "queries": ["leather boots isolated", "boots product photo", "chelsea boots studio", "ankle boots white background"],
        "must": ["boot"],
    },
    "loafers": {
        "queries": ["loafers shoes isolated", "leather loafers product photo", "loafers studio", "penny loafers"],
        "must": ["loafer", "moccasin", "leather shoe", "shoes"],
    },
    "watch": {
        "queries": ["wrist watch isolated white background", "watch product photo", "analog watch studio", "watch flat lay"],
        "must": ["watch", "wristwatch", "timepiece"],
    },
    "bag": {
        "queries": ["handbag isolated white background", "leather bag product photo", "tote bag studio", "backpack isolated"],
        "must": ["bag", "handbag", "purse", "tote", "backpack", "clutch"],
    },
    "cap": {
        "queries": ["baseball cap isolated", "cap product photo white background", "plain cap studio", "baseball cap flat lay"],
        "must": ["cap", "hat"],
    },
    "sunglasses": {
        "queries": ["sunglasses isolated white background", "sunglasses product photo", "sunglasses flat lay", "sunglasses studio"],
        "must": ["sunglasses", "eyewear", "shades", "glasses"],
    },
}

# Words in a photo's description that suggest a clean product/studio shot
GOOD_WORDS = ["isolated", "white background", "white surface", "studio", "flat lay", "flatlay", "product", "plain",
              "blank", "mockup", "mock up", "hanger", "hanging", "folded", "minimal", "on a white", "background"]
# Likely logos / branding / text on the item
LOGO_WORDS = ["logo", "brand", "branded", "nike", "adidas", "puma", "reebok", "gucci", "louis vuitton", "supreme",
              "champion", "vans", "converse", "jordan", "chanel", "prada", "balenciaga", "dior", "versace", "fila",
              "new balance", "under armour", "north face", "lacoste", "ralph lauren", "tommy", "levi", "zara", "h&m",
              "text", "lettering", "slogan", "writing", "print that says", "graphic", "printed words"]
# Busy scenes: fine sometimes, but we prefer the clothing on its own
PEOPLE_WORDS = ["man ", "woman", "girl", "boy", "people", "person", "model", "couple", "crowd", "portrait",
                "wearing", "posing", "selfie", "street", "city", "friends", "group"]

COLOR_NAMES = {
    "white": (245, 245, 242), "ivory": (238, 232, 214), "beige": (214, 196, 164), "camel": (176, 138, 91),
    "brown": (110, 70, 40), "black": (25, 25, 25), "charcoal": (60, 60, 60), "grey": (145, 145, 145), "gray": (145, 145, 145),
    "navy": (35, 45, 80), "blue": (60, 100, 170), "light blue": (150, 185, 220), "denim": (75, 101, 132),
    "green": (60, 130, 70), "olive": (107, 114, 72), "khaki": (170, 160, 110), "red": (170, 30, 35),
    "burgundy": (107, 31, 42), "pink": (225, 160, 175), "orange": (220, 120, 40), "rust": (162, 72, 42),
    "yellow": (225, 195, 50), "mustard": (200, 160, 40), "purple": (110, 60, 140), "lilac": (183, 166, 201),
    "teal": (40, 120, 120), "cream": (240, 230, 205), "tan": (200, 170, 130), "silver": (190, 192, 196), "gold": (200, 165, 70),
}
COLOR_WORDS = sorted(COLOR_NAMES.keys(), key=len, reverse=True)


# ---------------------------------------------------------------------------
# API key
# ---------------------------------------------------------------------------
def load_api_key() -> str | None:
    key = os.environ.get("PEXELS_API_KEY")
    if key:
        return key.strip()
    for env_file in (PROJECT_ROOT / ".env.local", PROJECT_ROOT / ".env", Path(__file__).resolve().parent / ".env"):
        if env_file.is_file():
            for line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
                m = re.match(r"\s*PEXELS_API_KEY\s*=\s*['\"]?([^'\"\s#]+)", line)
                if m:
                    return m.group(1)
    return None


# ---------------------------------------------------------------------------
# HTTP helpers (official API only; respects rate limits)
# ---------------------------------------------------------------------------
class RateLimited(Exception):
    pass


def http_get(url: str, headers: dict | None = None, timeout: int = 30) -> tuple[bytes, dict]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read(), {k.lower(): v for k, v in resp.headers.items()}
        except urllib.error.HTTPError as e:
            if e.code == 429:
                raise RateLimited("Pexels rate limit reached (200 requests/hour by default). Wait and re-run — progress is saved.")
            if e.code in (401, 403):
                raise SystemExit("Pexels rejected the API key (HTTP %d). Check PEXELS_API_KEY — see cloths/README.md." % e.code)
            if e.code >= 500 and attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise
        except urllib.error.URLError:
            if attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise
    raise RuntimeError("unreachable")


def search(api_key: str, query: str, page: int, per_page: int = 40) -> dict:
    params = urllib.parse.urlencode({"query": query, "page": page, "per_page": per_page})
    body, headers = http_get(f"{API_BASE}/search?{params}", {"Authorization": api_key})
    remaining = headers.get("x-ratelimit-remaining")
    if remaining is not None and remaining.isdigit() and int(remaining) < 5:
        print(f"  ! only {remaining} API requests left this period")
    return json.loads(body.decode("utf-8"))


# ---------------------------------------------------------------------------
# Scoring and filtering
# ---------------------------------------------------------------------------
def text_of(photo: dict) -> str:
    alt = photo.get("alt") or ""
    slug = urllib.parse.urlparse(photo.get("url") or "").path.replace("-", " ").replace("/", " ")
    return f" {alt} {slug} ".lower()


def describe_reject(photo: dict, spec: dict) -> str | None:
    t = text_of(photo)
    if not any(w in t for w in spec["must"]):
        return "not the right item"
    if any(w in t for w in spec.get("exclude", [])):
        return "different item"
    if any(re.search(rf"\b{re.escape(w)}\b", t) for w in LOGO_WORDS):
        return "likely logo/branding"
    w, h = photo.get("width") or 0, photo.get("height") or 0
    if w and h and min(w, h) < 800:
        return "too small"
    return None


def text_score(photo: dict) -> float:
    t = text_of(photo)
    score = sum(1.5 for w in GOOD_WORDS if w in t)
    score -= sum(1.0 for w in PEOPLE_WORDS if w in t)
    w, h = photo.get("width") or 1, photo.get("height") or 1
    if 0.6 <= w / h <= 1.4:
        score += 0.5  # roughly square frames suit a closet grid
    return score


def image_checks(data: bytes) -> dict:
    """With Pillow: background cleanliness (0..1), garment colour, and a perceptual hash."""
    if Image is None:
        return {}
    try:
        img = Image.open(BytesIO(data)).convert("RGB")
    except Exception:
        return {"broken": True}
    small = img.resize((64, 64))
    flat = getattr(small, "get_flattened_data", None)
    px = list(flat() if flat else small.getdata())
    border = [px[i] for i in range(64)] + [px[64 * 63 + i] for i in range(64)] + [px[64 * r] for r in range(64)] + [px[64 * r + 63] for r in range(64)]
    mean = [sum(c[k] for c in border) / len(border) for k in range(3)]
    spread = sum(sum(abs(c[k] - mean[k]) for k in range(3)) / 3 for c in border) / len(border)
    clean = max(0.0, 1.0 - spread / 40.0)  # 1.0 = perfectly even background

    # garment colour: centre pixels that differ from the background
    centre = [px[64 * r + c] for r in range(12, 52) for c in range(12, 52)]
    fg = [p for p in centre if sum(abs(p[k] - mean[k]) for k in range(3)) > 60] or centre
    avg = tuple(int(sum(p[k] for p in fg) / len(fg)) for k in range(3))

    grey = img.convert("L").resize((8, 8))
    gflat = getattr(grey, "get_flattened_data", None)
    vals = list(gflat() if gflat else grey.getdata())
    m = sum(vals) / 64
    ahash = "".join("1" if v > m else "0" for v in vals)
    return {"clean": clean, "rgb": avg, "ahash": ahash}


def nearest_color(rgb: tuple[int, int, int]) -> str:
    return min(COLOR_NAMES, key=lambda n: sum((rgb[k] - COLOR_NAMES[n][k]) ** 2 for k in range(3)))


BACKGROUND_PHRASE = re.compile(r"\b(on (an? )?)?(white|black|grey|gray|pink|blue|beige|yellow|green|red|dark|light)\s+(background|backdrop|surface|wall|table|floor|sheet|studio)\b")


def color_from_text(photo: dict) -> str | None:
    """First colour word that describes the item (ignores 'on a white background' etc.)."""
    t = BACKGROUND_PHRASE.sub(" ", (photo.get("alt") or "").lower())
    best = None
    for word in COLOR_WORDS:
        m = re.search(rf"\b{re.escape(word)}\b", t)
        if m and (best is None or m.start() < best[0]):
            best = (m.start(), word)
    if best:
        return {"gray": "grey"}.get(best[1], best[1])
    return None


def hex_to_rgb(h: str) -> tuple[int, int, int] | None:
    m = re.fullmatch(r"#?([0-9a-fA-F]{6})", h or "")
    if not m:
        return None
    n = int(m.group(1), 16)
    return (n >> 16) & 255, (n >> 8) & 255, n & 255


def hamming(a: str, b: str) -> int:
    return sum(x != y for x, y in zip(a, b))


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def main() -> int:
    for stream in (sys.stdout, sys.stderr):  # Windows consoles can't print every character in photo descriptions
        try:
            stream.reconfigure(errors="replace")
        except Exception:
            pass
    ap = argparse.ArgumentParser(description="Download a clothing image dataset from the Pexels API.")
    ap.add_argument("--count", type=int, default=20, help="images per category (default 20)")
    ap.add_argument("--only", nargs="+", metavar="CATEGORY", help="only these categories")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output folder (default public/clothing)")
    ap.add_argument("--size", default="large", choices=["medium", "large", "large2x", "original"], help="which Pexels image size to save (default large, ~940px)")
    ap.add_argument("--pages", type=int, default=3, help="result pages to scan per query (default 3)")
    ap.add_argument("--min-clean", type=float, default=0.35, help="with Pillow: minimum background cleanliness 0..1 (default 0.35)")
    ap.add_argument("--dry-run", action="store_true", help="search and filter, but don't download")
    args = ap.parse_args()

    api_key = load_api_key()
    if not api_key:
        print("No Pexels API key found. Set PEXELS_API_KEY — see cloths/README.md.", file=sys.stderr)
        return 2

    cats = args.only or list(CATEGORIES)
    unknown = [c for c in cats if c not in CATEGORIES]
    if unknown:
        print(f"Unknown categories: {', '.join(unknown)}. Choose from: {', '.join(CATEGORIES)}", file=sys.stderr)
        return 2

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    meta_path = out / "metadata.json"
    metadata: list[dict] = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.is_file() else []
    # forget entries whose file was deleted by hand
    metadata = [m for m in metadata if (out / m["category"] / m["filename"]).is_file()]

    seen_ids = {m.get("pexelsId") for m in metadata if m.get("pexelsId")}
    seen_hashes = {m.get("sha1") for m in metadata if m.get("sha1")}
    seen_ahash = [m.get("ahash") for m in metadata if m.get("ahash")]

    def save_metadata():
        tmp = meta_path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(meta_path)

    print(f"Saving to {out}" + ("" if Image else "  (tip: pip install pillow for background, colour and near-duplicate checks)"))
    try:
        for cat in cats:
            spec = CATEGORIES[cat]
            folder = out / cat
            folder.mkdir(parents=True, exist_ok=True)
            have = [m for m in metadata if m["category"] == cat]
            if len(have) >= args.count:
                print(f"[{cat}] already has {len(have)} — skipping")
                continue
            used_numbers = {int(n) for m in have for n in re.findall(rf"^{cat}_(\d+)\.jpg$", m["filename"])}
            print(f"[{cat}] have {len(have)}, need {args.count - len(have)}")

            # gather candidates from several queries, best-looking first
            candidates, rejected = [], {}
            for q in spec["queries"]:
                for page in range(1, args.pages + 1):
                    res = search(api_key, q, page)
                    photos = res.get("photos", [])
                    for p in photos:
                        if p.get("id") in seen_ids or any(c["id"] == p.get("id") for c in candidates):
                            continue
                        why = describe_reject(p, spec)
                        if why:
                            rejected[why] = rejected.get(why, 0) + 1
                            continue
                        candidates.append(p)
                    if not res.get("next_page") or len(photos) == 0:
                        break
                if len(candidates) >= (args.count - len(have)) * 3:
                    break
            candidates.sort(key=text_score, reverse=True)

            added = 0
            for p in candidates:
                if len(have) + added >= args.count:
                    break
                url = (p.get("src") or {}).get(args.size) or (p.get("src") or {}).get("large")
                if not url:
                    continue
                if args.dry_run:
                    print(f"    would download {p['id']}: {p.get('alt') or p.get('url')}")
                    added += 1
                    continue
                try:
                    data, _ = http_get(url, timeout=60)
                except urllib.error.URLError as e:
                    print(f"    skip {p['id']}: download failed ({e})")
                    continue
                sha1 = hashlib.sha1(data).hexdigest()
                if sha1 in seen_hashes:
                    rejected["exact duplicate"] = rejected.get("exact duplicate", 0) + 1
                    continue
                checks = image_checks(data)
                if checks.get("broken"):
                    continue
                if "clean" in checks and checks["clean"] < args.min_clean:
                    rejected["busy background"] = rejected.get("busy background", 0) + 1
                    continue
                if checks.get("ahash") and any(hamming(checks["ahash"], h) <= 4 for h in seen_ahash):
                    rejected["near-duplicate"] = rejected.get("near-duplicate", 0) + 1
                    continue

                n = 1
                while n in used_numbers:
                    n += 1
                used_numbers.add(n)
                filename = f"{cat}_{n:03d}.jpg"
                (folder / filename).write_bytes(data)

                color = color_from_text(p)
                if not color and checks.get("rgb"):
                    color = nearest_color(checks["rgb"])
                if not color:
                    rgb = hex_to_rgb(p.get("avg_color") or "")
                    color = nearest_color(rgb) if rgb else ""

                metadata.append({
                    "filename": filename,
                    "category": cat,
                    "color": color,
                    "source": "Pexels",
                    "sourceUrl": p.get("url", ""),
                    # extras: handy for the app and for crediting photographers
                    "path": f"/clothing/{cat}/{filename}",
                    "pexelsId": p.get("id"),
                    "photographer": p.get("photographer", ""),
                    "photographerUrl": p.get("photographer_url", ""),
                    "alt": p.get("alt", ""),
                    "width": p.get("width"),
                    "height": p.get("height"),
                    "sha1": sha1,
                    **({"ahash": checks["ahash"]} if checks.get("ahash") else {}),
                })
                seen_ids.add(p.get("id"))
                seen_hashes.add(sha1)
                if checks.get("ahash"):
                    seen_ahash.append(checks["ahash"])
                added += 1
                print(f"    + {filename}  ({color or 'unknown colour'})  {p.get('url', '')}")
                save_metadata()  # save as we go, so an interruption loses nothing
                time.sleep(0.2)

            if rejected:
                print("    skipped: " + ", ".join(f"{n} {why}" for why, n in rejected.items()))
            total = len(have) + added
            if total < args.count:
                print(f"    only found {total}/{args.count} suitable images for {cat}. Add queries in CATEGORIES or relax --min-clean.")
    except RateLimited as e:
        print(f"\n{e}")
        save_metadata()
        return 1
    except KeyboardInterrupt:
        print("\nStopped. Progress saved; run again to continue.")
        save_metadata()
        return 130

    if not args.dry_run:
        save_metadata()
    counts = {c: sum(1 for m in metadata if m["category"] == c) for c in cats}
    print("\nDone. " + ", ".join(f"{c}: {n}" for c, n in counts.items()))
    print(f"Metadata: {meta_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
