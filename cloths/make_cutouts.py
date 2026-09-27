#!/usr/bin/env python3
"""
Cut the clothing photos out of their backgrounds, so they sit on Hanger's table like real objects.

  python cloths/make_cutouts.py              # every image in public/clothing
  python cloths/make_cutouts.py --only jeans # one category
  python cloths/make_cutouts.py --redo       # redo images that already have a cut-out

For each public/clothing/{category}/{name}.jpg it writes {name}.png (transparent, trimmed)
next to it and adds  "cutout": "/clothing/{category}/{name}.png"  plus a quality score to
metadata.json. Photos whose background is too busy to cut cleanly are left as photos —
the website shows those as framed photo cards instead.

Engines
  simple  (default fallback) — needs:  pip install pillow numpy
          Works well on plain studio / white-wall backgrounds.
  rembg   (used automatically when installed) — pip install "rembg[cpu]"
          AI background removal; much better on busy photos. Downloads a ~170 MB model once.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import deque
from pathlib import Path

try:
    import numpy as np
    from PIL import Image, ImageFilter
except ImportError:  # pragma: no cover
    print("This script needs Pillow and numpy:  pip install pillow numpy", file=sys.stderr)
    sys.exit(2)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DIR = PROJECT_ROOT / "public" / "clothing"
MAX_SIDE = 900


# ---------------------------------------------------------------------------
# "simple" engine: flood-fill the background from the edges of the photo
# ---------------------------------------------------------------------------
def simple_mask(img: Image.Image) -> tuple[np.ndarray, float]:
    """Return (alpha mask 0..255, background evenness 0..1)."""
    small = img.copy()
    small.thumbnail((360, 360))
    a = np.asarray(small.convert("RGB"), dtype=np.float32)
    h, w, _ = a.shape

    border = np.concatenate([a[0, :], a[-1, :], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
    border_d = np.sqrt(((border - bg) ** 2).sum(axis=1))
    evenness = float(np.clip(1.0 - np.percentile(border_d, 80) / 60.0, 0, 1))

    # a pixel counts as background if it's close to the background colour;
    # allow a gentle gradient (lighting falloff) by using a generous but adaptive threshold
    thresh = max(18.0, min(60.0, np.percentile(border_d, 95) * 1.6 + 10))
    bgish = dist < thresh

    # flood fill from every edge pixel through background-like pixels
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bgish[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bgish[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and bgish[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))

    fg = ~seen
    # keep the main object(s): drop specks smaller than 1.5% of the largest piece
    fg = keep_large_components(fg, 0.015)
    mask = Image.fromarray((fg * 255).astype(np.uint8)).resize(img.size, Image.BILINEAR)
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    return np.asarray(mask), evenness


def keep_large_components(fg: np.ndarray, min_frac: float) -> np.ndarray:
    h, w = fg.shape
    labels = np.zeros((h, w), dtype=np.int32)
    sizes = [0]
    cur = 0
    for sy in range(h):
        for sx in range(w):
            if fg[sy, sx] and labels[sy, sx] == 0:
                cur += 1
                n = 0
                q = deque([(sy, sx)])
                labels[sy, sx] = cur
                while q:
                    y, x = q.popleft()
                    n += 1
                    for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                        if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and labels[ny, nx] == 0:
                            labels[ny, nx] = cur
                            q.append((ny, nx))
                sizes.append(n)
    if cur == 0:
        return fg
    biggest_label = int(np.argmax(sizes))
    biggest = sizes[biggest_label]
    edge_labels = set(np.unique(np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])).tolist())
    keep = np.zeros(len(sizes), dtype=bool)
    keep[biggest_label] = True
    for lab, n in enumerate(sizes):
        # other pieces (a second shoe, the other lens) must be substantial and not bits of the room at the edges
        if lab and lab != biggest_label and n >= biggest * max(min_frac, 0.2) and lab not in edge_labels:
            keep[lab] = True
    return keep[labels]


# ---------------------------------------------------------------------------
# rembg engine (optional)
# ---------------------------------------------------------------------------
_REMBG_SESSION = None


def rembg_mask(img: Image.Image) -> tuple[np.ndarray, float]:
    global _REMBG_SESSION
    from rembg import new_session, remove  # type: ignore
    if _REMBG_SESSION is None:
        print("  loading rembg model (first run downloads it)…")
        _REMBG_SESSION = new_session("isnet-general-use")
    out = remove(img, session=_REMBG_SESSION)
    alpha = np.asarray(out.split()[-1])
    return alpha, 1.0


# ---------------------------------------------------------------------------
def quality(alpha: np.ndarray, evenness: float) -> tuple[float, str]:
    """0..1 score and a reason. Rejects cut-outs that are empty, full-frame, or spill off the photo."""
    fgm = alpha > 128
    frac = float(fgm.mean())
    if frac < 0.03:
        return 0.0, "nothing left after cutting"
    if frac > 0.82:
        return 0.1, "background not separable"
    sides = [fgm[0, :].mean(), fgm[-1, :].mean(), fgm[:, 0].mean(), fgm[:, -1].mean()]
    touched = sum(1 for v in sides if v > 0.12)  # sides the object (or leftover room) runs off
    edge_pen = min(1.0, float(np.mean(sides)) * 3)
    score = 0.55 * evenness + 0.45 * (1 - edge_pen)
    if touched >= 2:
        score *= 0.6
    elif touched == 1:
        score *= 0.9
    if frac < 0.08:
        score *= 0.8
    if score >= 0.5:
        return float(score), "ok"
    return float(score), "busy background" if evenness < 0.5 else "object runs off the photo"


def cut(img: Image.Image, alpha: np.ndarray) -> Image.Image:
    rgba = img.convert("RGBA")
    rgba.putalpha(Image.fromarray(alpha.astype(np.uint8)))
    ys, xs = np.nonzero(alpha > 20)
    if len(xs):
        pad = int(max(img.size) * 0.03)
        box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(img.width, xs.max() + pad), min(img.height, ys.max() + pad))
        rgba = rgba.crop(box)
    return rgba


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")
        except Exception:
            pass
    ap = argparse.ArgumentParser(description="Make transparent cut-outs of the clothing photos.")
    ap.add_argument("--dir", default=str(DEFAULT_DIR), help="dataset folder (default public/clothing)")
    ap.add_argument("--only", nargs="+", metavar="CATEGORY")
    ap.add_argument("--engine", choices=["auto", "simple", "rembg"], default="auto")
    ap.add_argument("--min-score", type=float, default=0.5, help="keep cut-outs scoring at least this (0..1, default 0.5)")
    ap.add_argument("--redo", action="store_true", help="redo images that already have a cut-out")
    args = ap.parse_args()

    base = Path(args.dir)
    meta_path = base / "metadata.json"
    if not meta_path.is_file():
        print(f"No {meta_path}. Run fetch_pexels.py first.", file=sys.stderr)
        return 2
    metadata = json.loads(meta_path.read_text(encoding="utf-8"))

    engine = args.engine
    if engine == "auto":
        try:
            import rembg  # noqa: F401
            engine = "rembg"
        except Exception:
            engine = "simple"
    print(f"Engine: {engine}" + ("  (tip: pip install \"rembg[cpu]\" for better results on busy photos)" if engine == "simple" else ""))

    def save():
        tmp = meta_path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(meta_path)

    made = kept_photo = 0
    try:
        for i, m in enumerate(metadata):
            if args.only and m["category"] not in args.only:
                continue
            src = base / m["category"] / m["filename"]
            if not src.is_file():
                continue
            png = src.with_suffix(".png")
            if m.get("cutout") and png.is_file() and not args.redo:
                continue
            if "cutoutScore" in m and not m.get("cutout") and not args.redo:
                continue  # already judged too busy

            img = Image.open(src).convert("RGB")
            img.thumbnail((MAX_SIDE, MAX_SIDE))
            alpha, evenness = (rembg_mask(img) if engine == "rembg" else simple_mask(img))
            score, why = quality(alpha, evenness)
            m["cutoutScore"] = round(score, 2)
            if score >= args.min_score:
                cut(img, alpha).save(png, optimize=True)
                m["cutout"] = f"/clothing/{m['category']}/{png.name}"
                made += 1
                print(f"  ✓ {m['filename']}  cut-out ({score:.2f})")
            else:
                m.pop("cutout", None)
                if png.is_file():
                    png.unlink()
                kept_photo += 1
                print(f"  · {m['filename']}  kept as photo — {why} ({score:.2f})")
            if (i + 1) % 10 == 0:
                save()
    except KeyboardInterrupt:
        print("\nStopped. Progress saved; run again to continue.")
    save()
    print(f"\nDone: {made} cut-outs made, {kept_photo} kept as photos. Metadata updated: {meta_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
