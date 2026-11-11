# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw
from pathlib import Path

SRC = Path(r"C:\Users\Sun\.cursor\projects\c-Users-Sun-Desktop\assets\OoS90yXGh6wbyZz.thumb.1000_0-ccaf4f88-2dee-4f2a-87a6-08fe3fa1221c.jpg")
ROOT = Path(r"c:\Users\Sun\Desktop\文件\fangji-app")
BG = (122, 154, 106)  # soft green wall approx

img = Image.open(SRC).convert("RGBA")
# center-crop to square
w, h = img.size
side = min(w, h)
left = (w - side) // 2
top = (h - side) // 2
sq = img.crop((left, top, left + side, top + side))

def cover(size):
    return sq.resize((size, size), Image.Resampling.LANCZOS)

def with_bg(size, pad_ratio=0.12):
    """Foreground for adaptive icon: image inset on solid bg (safe zone)."""
    canvas = Image.new("RGBA", (size, size), BG + (255,))
    inner = int(size * (1 - 2 * pad_ratio))
    icon = cover(inner)
    off = (size - inner) // 2
    canvas.paste(icon, (off, off), icon)
    return canvas

# PWA icons + brand asset copy
pub = ROOT / "public" / "icons"
pub.mkdir(parents=True, exist_ok=True)
cover(512).convert("RGB").save(pub / "icon-512.png", optimize=True)
cover(192).convert("RGB").save(pub / "icon-192.png", optimize=True)
# keep original brand source
sq.convert("RGB").save(pub / "icon-source.jpg", quality=92)

# Android mipmaps
res = ROOT / "android" / "app" / "src" / "main" / "res"
launcher = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
fg = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}
for folder, size in launcher.items():
    d = res / folder
    d.mkdir(parents=True, exist_ok=True)
    ico = cover(size).convert("RGBA")
    ico.save(d / "ic_launcher.png")
    ico.save(d / "ic_launcher_round.png")
for folder, size in fg.items():
    d = res / folder
    with_bg(size, 0.10).save(d / "ic_launcher_foreground.png")

# Splash: portrait / landscape / default — mascot centered on green
splash_specs = [
    ("drawable", 480, 480),
    ("drawable-port-mdpi", 320, 480),
    ("drawable-port-hdpi", 480, 800),
    ("drawable-port-xhdpi", 720, 1280),
    ("drawable-port-xxhdpi", 1080, 1920),
    ("drawable-port-xxxhdpi", 1280, 1920),
    ("drawable-land-mdpi", 480, 320),
    ("drawable-land-hdpi", 800, 480),
    ("drawable-land-xhdpi", 1280, 720),
    ("drawable-land-xxhdpi", 1920, 1080),
    ("drawable-land-xxxhdpi", 1920, 1280),
]

def make_splash(W, H):
    canvas = Image.new("RGB", (W, H), BG)
    # icon takes ~42% of shorter side
    s = int(min(W, H) * 0.42)
    icon = cover(s).convert("RGBA")
    # soft white circle behind for pop
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W // 2, H // 2
    r = int(s * 0.62)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(250, 246, 234, 230))
    canvas = canvas.convert("RGBA")
    canvas = Image.alpha_composite(canvas, overlay)
    ox, oy = cx - s // 2, cy - s // 2
    canvas.paste(icon, (ox, oy), icon)
    return canvas.convert("RGB")

for folder, W, H in splash_specs:
    d = res / folder
    d.mkdir(parents=True, exist_ok=True)
    make_splash(W, H).save(d / "splash.png", optimize=True)

# Android 12+ SplashScreen animated icon：正方形，四周透明，避免被系统拉扁
splash_icon_size = 288
inner = 200
si = Image.new("RGBA", (splash_icon_size, splash_icon_size), (0, 0, 0, 0))
si_icon = cover(inner).convert("RGBA")
off = (splash_icon_size - inner) // 2
si.paste(si_icon, (off, off), si_icon)
si.save(res / "drawable" / "splash_icon.png")

# background color xml
(res / "values" / "ic_launcher_background.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<resources>\n'
    '    <color name="ic_launcher_background">#7A9A6A</color>\n'
    '</resources>\n',
    encoding="utf-8",
)
print("ICONS_OK")
