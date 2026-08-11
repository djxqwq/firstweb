from PIL import Image
import os

src = r"d:\daima\个人网站\frontend\public\logo.png"
im = Image.open(src).convert("RGBA")
pixels = im.load()
w, h = im.size


def almost_white(px):
    r_, g, b, a = px
    return a > 200 and r_ > 242 and g > 242 and b > 242


# Replace near-white background with site dark color
for y in range(h):
    for x in range(w):
        px = pixels[x, y]
        if almost_white(px):
            pixels[x, y] = (3, 0, 20, 255)

out_dir = r"d:\daima\个人网站\frontend\public"
im.save(os.path.join(out_dir, "logo.png"), "PNG")

icon = im.resize((512, 512), Image.Resampling.LANCZOS)
icon.save(os.path.join(out_dir, "icon.png"), "PNG")

ico = im.resize((64, 64), Image.Resampling.LANCZOS)
ico.save(
    os.path.join(out_dir, "favicon.ico"),
    format="ICO",
    sizes=[(64, 64), (32, 32), (16, 16)],
)
print("ok", w, h)
