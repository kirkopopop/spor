# Renders flag-icons (https://github.com/lipis/flag-icons, MIT) into public/flags/<iso>.png:
# a 60x45 flag with rounded corners on a white card with a soft shadow, 72x57 in all, shown at a
# third of that on the globe (sharp on 3x screens). Writes lib/flags.ts with the codes it made.
# Usage: python3 scripts/build-flags.py <flag-icons>/flags/4x3   (needs rsvg-convert and Pillow)
import os, re, subprocess, sys, tempfile
from PIL import Image, ImageChops, ImageDraw, ImageFilter

src = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "..", "public", "flags")
os.makedirs(out, exist_ok=True)
B, W, H, R, P = 3, 60, 45, 6, 3  # border, flag size, corner radius, shadow room

codes = []
for f in sorted(os.listdir(src)):
    c = f[:-4]
    if not f.endswith(".svg") or not re.fullmatch(r"[a-z]{2}", c) or c in ("xx", "eu", "un"):
        continue
    with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
        subprocess.run(["rsvg-convert", "-w", str(W), "-h", str(H), os.path.join(src, f), "-o", tmp.name], check=True)
        flag = Image.open(tmp.name).convert("RGBA")
    tw, th = W + 2 * B, H + 2 * B
    shadow = Image.new("L", (tw + 2 * P, th + 2 * P), 0)
    ImageDraw.Draw(shadow).rounded_rectangle([P, P + 1, P + tw - 1, P + th], R + B, fill=90)
    img = Image.new("RGBA", shadow.size, (0, 0, 0, 0))
    img.putalpha(shadow.filter(ImageFilter.GaussianBlur(1.5)))
    card = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle([0, 0, tw - 1, th - 1], R + B, fill=(255, 255, 255, 255))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, H - 1], R, fill=255)
    flag.putalpha(ImageChops.multiply(flag.getchannel("A"), mask))
    card.alpha_composite(flag, (B, B))
    img.alpha_composite(card, (P, P))
    img.save(os.path.join(out, f"{c}.png"), optimize=True)
    codes.append(c.upper())

with open(os.path.join(here, "..", "lib", "flags.ts"), "w") as fh:
    fh.write(
        "// Countries with a flag in public/flags (from flag-icons, MIT; rendered by scripts/build-flags.py).\n"
        f'export const FLAGS = new Set("{" ".join(codes)}".split(" "));\n\n'
        "export const flagUrl = (iso: string) => `/flags/${iso.toLowerCase()}.png`;\n"
    )
print(f"{len(codes)} flags")
