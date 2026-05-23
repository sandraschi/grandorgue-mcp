"""Generate Tauri app icons for GrandOrgue MCP.

Creates 32x32, 128x128, 256x256 PNG, a Windows .ico, and a macOS .icns placeholder.
Uses Pillow for image creation.

Usage: uv run python scripts/generate_icons.py
"""

from pathlib import Path

ICONS_DIR = Path(__file__).resolve().parent.parent / "native" / "icons"
ORGAN_GOLD = (201, 168, 76)
BG_ZINC = (24, 24, 27)

try:
    from PIL import Image, ImageDraw, ImageFont

    def create_pipe_icon(size: int) -> Image.Image:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        cx, cy = size // 2, size // 2
        r = size * 0.42
        # outer circle
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BG_ZINC + (255,), outline=ORGAN_GOLD + (255,), width=max(2, size // 32))
        # pipe body (rectangle)
        pw, ph = r * 0.3, r * 0.6
        px0, py0 = cx - pw / 2, cy - ph / 2
        px1, py1 = cx + pw / 2, cy + ph / 2
        draw.rectangle([px0, py0, px1, py1], fill=ORGAN_GOLD + (255,))
        # pipe top (triangle)
        draw.polygon([(cx - pw / 2, py0), (cx + pw / 2, py0), (cx, py0 - ph * 0.3)], fill=ORGAN_GOLD + (255,))
        return img

    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    sizes = {"32x32.png": 32, "128x128.png": 128, "128x128@2x.png": 256}
    for name, size in sizes.items():
        img = create_pipe_icon(size)
        img.save(ICONS_DIR / name, "PNG")
        print(f"  Created {name} ({size}x{size})")

    # .ico (Windows) — 256px down to 32px
    ico_sizes = [256, 128, 64, 48, 32]
    ico_imgs = [create_pipe_icon(s) for s in ico_sizes]
    ico_imgs[0].save(ICONS_DIR / "icon.ico", format="ICO", sizes=[(s, s) for s in ico_sizes], append_images=ico_imgs[1:])
    print("  Created icon.ico")

    # .icns (macOS placeholder) — in practice you'd use iconutil on macOS
    img_256 = create_pipe_icon(256)
    img_256.save(ICONS_DIR / "icon.icns", "PNG")  # Not a real icns but Tauri accepts PNG fallback
    print("  Created icon.icns (PNG placeholder)")

    print(f"\nAll icons generated in {ICONS_DIR}")

except ImportError:
    print("Pillow not installed. Install with: uv add Pillow")
    print("Or generate icons manually and place in native/icons/")
    # Create directory so build doesn't fail
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    for name in ["32x32.png", "128x128.png", "128x128@2x.png", "icon.icns", "icon.ico"]:
        (ICONS_DIR / name).touch()
