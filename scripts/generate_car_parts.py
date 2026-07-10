#!/usr/bin/env python3
"""
eSpotly asset generator — Replicate (Flux 1.1 Pro + SAM 2)

Flow:
  1. Generate master car image with Flux (top-down, teal, nose pointing down)
  2. Use SAM 2 on Replicate to auto-segment the master into car parts
  3. Save each segmented part as a transparent PNG
  4. Generate supporting assets (road, map, pins, parking space) with Flux

Usage:
  source scripts/.venv/bin/activate
  python scripts/generate_car_parts.py
"""

import os, sys, io, time, pathlib
import replicate, requests
from PIL import Image

try:
    from rembg import remove as rembg_remove
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False

# ── Config ─────────────────────────────────────────────────────────────────────
OUT_DIR     = pathlib.Path(__file__).parent.parent / "assets" / "car-parts"
OUT_DIR.mkdir(parents=True, exist_ok=True)
MASTER_PATH = OUT_DIR / "_master_reference.png"

# Car is generated horizontally then rotated — Flux handles landscape better
GEN_W, GEN_H = 1440, 800

# ── Prompts ────────────────────────────────────────────────────────────────────
MASTER_PROMPT = (
    "exact top-down bird's-eye view of a futuristic electric supercar, "
    "car nose pointing RIGHT, tail on the left, horizontal orientation, "
    "aggressive aerodynamic body, wide low stance, sharp angular hood, "
    "wide rear haunches, large aero splitters, McLaren / Lamborghini proportions, "
    "teal color #339C8A, dark tinted panoramic glass roof, four visible wheels, "
    "clean minimal product illustration style, soft drop shadow, "
    "car fills 85 percent of frame, centered, "
    "solid pure white background, no gradients, no scenery, no text, no logo"
)

MASTER_NEG = (
    "side view, front view, three-quarter angle, perspective, tilted, "
    "dark background, black background, gray background, "
    "photorealistic photo, logo, badge, watermark, text, "
    "cartoon, anime, sketch, missing wheels, floating parts"
)

# Each part: (filename, detailed Flux prompt)
BASE = (
    "exact top-down bird's-eye view, futuristic electric supercar, "
    "teal color #339C8A, clean minimal product illustration style, "
    "soft drop shadow, solid pure white background, "
    "only this part visible and isolated, transparent surroundings, "
    "3D render quality, centered in frame, no text, no logo"
)

CAR_PARTS = [
    ("body_shell",
     f"isolated car body shell — chassis, fenders, side skirts, wheel arches, door openings — "
     f"no doors, no hood, no roof, no glass, no wheels, no lights, {BASE}"),
    ("hood",
     f"isolated car hood panel only — front bonnet, sharp aerodynamic creases, "
     f"teal painted surface viewed from directly above, {BASE}"),
    ("roof",
     f"isolated car roof panel only — flat aerodynamic roof surface, "
     f"teal painted, viewed from directly above, {BASE}"),
    ("doors",
     f"isolated car door panels only — both left and right doors, "
     f"door handles, bodyline creases, teal painted, viewed from directly above, {BASE}"),
    ("windows",
     f"isolated car glass panels only — panoramic windshield, side windows, rear glass, "
     f"dark tinted transparent glass, viewed from directly above, {BASE}"),
    ("wheels_front",
     f"isolated front wheels only — two teal-accented alloy rims with black tires, "
     f"front axle pair, viewed from directly above, {BASE}"),
    ("wheels_rear",
     f"isolated rear wheels only — two teal-accented alloy rims with black tires, "
     f"rear axle pair, slightly wider than front, viewed from directly above, {BASE}"),
    ("lights_front",
     f"isolated front LED headlight units only — sharp angular light strips, "
     f"glowing white-blue LEDs, teal housing, viewed from directly above, {BASE}"),
    ("lights_rear",
     f"isolated rear LED taillight bar only — full-width light strip, "
     f"glowing red-teal LEDs, viewed from directly above, {BASE}"),
    ("mirrors",
     f"isolated side mirror pods only — left and right aerodynamic mirror housings, "
     f"teal painted, viewed from directly above, {BASE}"),
    ("interior_seats",
     f"isolated car interior only — bucket seats, steering wheel, dashboard, "
     f"dark cockpit interior viewed from directly above through open roof, {BASE}"),
]

# Supporting assets generated with Flux
SUPPORT_ASSETS = [
    ("road",
     "top-down bird's-eye view of a straight vertical road, "
     "car drives downward on the road, dark asphalt #012030, "
     "white dashed center lane markings, road fills the frame vertically, "
     "minimal clean illustration style, soft edges, "
     "pure white outer background, no text, no vehicles"),
    ("city_map",
     "minimal top-down city map, clean grid of streets, "
     "teal #339C8A road lines on off-white #F7FAFC, simple city blocks, "
     "Apple Maps minimal style, no labels, no text, soft shadows"),
    ("map_pin_default",
     "single minimal teardrop map pin icon, "
     "gray #A0AEC0 color, soft drop shadow, "
     "Apple Maps style, pure white background, centered, large"),
    ("map_pin_highlighted",
     "single minimal teardrop map pin icon, "
     "glowing teal #339C8A color, soft pulse glow halo, "
     "Apple Maps style, pure white background, centered, large"),
    ("parking_space",
     "top-down view of a single vertical parking space, "
     "opening at the TOP so a car enters from above driving downward, "
     "white painted line markings on dark asphalt #012030, "
     "letter P centered inside, clean minimal graphic, "
     "Apple / Linear illustration style, pure white outer background"),
]

# ── Helpers ────────────────────────────────────────────────────────────────────

def url_to_pil(url: str) -> Image.Image:
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    return Image.open(io.BytesIO(r.content)).convert("RGBA")

def strip_bg(img: Image.Image) -> Image.Image:
    if not HAS_REMBG:
        return img
    white = Image.new("RGBA", img.size, (255, 255, 255, 255))
    white.paste(img.convert("RGBA"))
    buf = io.BytesIO()
    white.convert("RGB").save(buf, "PNG")
    return Image.open(io.BytesIO(rembg_remove(buf.getvalue()))).convert("RGBA")

def save_transparent(img: Image.Image, path: pathlib.Path):
    img = img.convert("RGBA")
    img.save(path, "PNG")
    kb = path.stat().st_size // 1024
    print(f"    saved → {path.name} ({kb} KB)")

def flux(prompt: str, w: int = GEN_W, h: int = GEN_H) -> Image.Image:
    out = replicate.run(
        "black-forest-labs/flux-1.1-pro",
        input={
            "prompt": prompt,
            "negative_prompt": MASTER_NEG,
            "width": w, "height": h,
            "num_inference_steps": 28,
            "guidance": 3.5,
            "output_format": "png",
            "output_quality": 100,
        },
    )
    url = out[0] if isinstance(out, list) else str(out)
    return url_to_pil(url)

def retry(fn, label: str, attempts: int = 5):
    for i in range(attempts):
        try:
            return fn()
        except Exception as e:
            msg = str(e)
            if "429" in msg or "throttled" in msg.lower():
                wait = 15 * (i + 1)
                print(f"\n    rate limited — waiting {wait}s…", end=" ", flush=True)
                time.sleep(wait)
            else:
                print(f"\n    ERROR ({label}): {e}")
                return None
    print(f"\n    gave up on {label}")
    return None

# ── Local crop segmentation ────────────────────────────────────────────────────

def crop_part(transparent_car: Image.Image, region: tuple) -> Image.Image:
    """Crop a region from the already-transparent master."""
    W, H = transparent_car.size
    x1 = int(region[0] * W)
    y1 = int(region[1] * H)
    x2 = int(region[2] * W)
    y2 = int(region[3] * H)
    # Create full-size canvas so parts stay pixel-aligned when layered in CSS
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cropped = transparent_car.crop((x1, y1, x2, y2))
    canvas.paste(cropped, (x1, y1))
    return canvas

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    if not os.environ.get("REPLICATE_API_TOKEN", "").strip():
        print("ERROR: set REPLICATE_API_TOKEN first.")
        sys.exit(1)

    # ── Step 1: Master ─────────────────────────────────────────────────────────
    if MASTER_PATH.exists():
        print("[1] Master exists — loading")
        master = Image.open(MASTER_PATH).convert("RGBA")
    else:
        print("[1] Generating master (Flux 1.1 Pro)…")
        img = retry(lambda: flux(MASTER_PROMPT), "master")
        if img is None:
            sys.exit(1)
        print("  stripping background…", end=" ", flush=True)
        img = strip_bg(img)
        print("done")
        # Rotate 90° CCW so nose points DOWN
        img = img.rotate(90, expand=True)
        save_transparent(img, MASTER_PATH)
        master = img

    W, H = master.size

    # ── Approval gate ──────────────────────────────────────────────────────────
    print(f"\n{'='*56}")
    print(f"  Master: {MASTER_PATH}")
    print(f"  Size: {W}x{H} — open it and confirm nose points DOWN.")
    print(f"{'='*56}")
    if input("\nApprove and generate parts? [y/N]: ").strip().lower() != "y":
        print("Stopped.")
        sys.exit(0)

    # ── Step 2: Strip master background once, then crop parts locally ─────────
    print("\n[2] Stripping master background for part cutting…")
    transparent_car = strip_bg(master)
    print(f"    transparent master ready ({W}x{H})")

    print(f"\n[3] Cutting {len(PART_CROPS)} car parts locally…")
    for i, (stem, region) in enumerate(PART_CROPS.items(), 1):
        out_path = OUT_DIR / f"{stem}.png"
        if out_path.exists():
            print(f"  [{i}/{len(PART_CROPS)}] {stem}.png exists — skipping")
            continue
        print(f"  [{i}/{len(PART_CROPS)}] {stem}…", end=" ", flush=True)
        part = crop_part(transparent_car, region)
        save_transparent(part, out_path)

    # ── Step 4: Supporting assets ──────────────────────────────────────────────
    print(f"\n[3] Generating {len(SUPPORT_ASSETS)} supporting assets (Flux)…")
    for i, (stem, prompt) in enumerate(SUPPORT_ASSETS, 1):
        out_path = OUT_DIR / f"{stem}.png"
        if out_path.exists():
            print(f"  [{i}/{len(SUPPORT_ASSETS)}] {stem}.png exists — skipping")
            continue
        sq = "pin" in stem or "parking" in stem
        w, h = (512, 512) if sq else (GEN_W, GEN_H)
        print(f"  [{i}/{len(SUPPORT_ASSETS)}] {stem}…", end=" ", flush=True)
        img = retry(lambda p=prompt, pw=w, ph=h: flux(p, pw, ph), stem)
        if img:
            img = strip_bg(img)
            save_transparent(img, out_path)
        time.sleep(11)

    print("\nAll done! Assets in assets/car-parts/")

if __name__ == "__main__":
    main()
