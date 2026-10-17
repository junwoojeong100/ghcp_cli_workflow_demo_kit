import sys, glob
from PIL import Image
prefix, out, per = sys.argv[1], sys.argv[2], int(sys.argv[3])
start = int(sys.argv[4]) if len(sys.argv) > 4 else 1
files = sorted(glob.glob(prefix + "-*.jpg"))[start-1:start-1+per]
imgs = [Image.open(f) for f in files]
w, h = imgs[0].size
cols = 2
rows = (len(imgs) + cols - 1) // cols
sheet = Image.new("RGB", (w*cols + 8*(cols+1), h*rows + 8*(rows+1)), (120,120,120))
for i, im in enumerate(imgs):
    sheet.paste(im, (8 + (i%cols)*(w+8), 8 + (i//cols)*(h+8)))
sheet.save(out, quality=88)
print(out, sheet.size, len(imgs))
