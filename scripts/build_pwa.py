"""Arma dist/nexo-app/ (y dist/nexo-app.zip): la app instalable lista para publicar en cualquier hosting estático con https
(GitHub Pages, Netlify, Vercel, Cloudflare Pages).

Uso:  python3 scripts/build_pwa.py
Cada vez que se publique, sube VERSION en sw.js para que los teléfonos descarguen la versión nueva.
"""
import pathlib, shutil, zipfile, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "nexo-app"
FILES = ["index.html", "manifest.webmanifest", "sw.js", "css", "js", "vendor", "icons"]

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
for f in FILES:
    src = ROOT / f
    (shutil.copytree if src.is_dir() else shutil.copy2)(src, OUT / f)
# la versión de la caché lleva la fecha de armado: así cada publicación actualiza la app instalada
sw = (OUT / "sw.js").read_text(encoding="utf-8")
sw = sw.replace('const VERSION = "nexo-v1";', f'const VERSION = "nexo-{time.strftime("%Y%m%d%H%M")}";')
(OUT / "sw.js").write_text(sw, encoding="utf-8")
(OUT / ".nojekyll").write_text("")  # GitHub Pages: servir tal cual
zp = ROOT / "dist" / "nexo-app.zip"
with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.rglob("*")):
        if p.is_file():
            z.write(p, p.relative_to(OUT))
size = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file()) // 1024
print(f"Listo: dist/nexo-app/ ({size} KB) y dist/nexo-app.zip ({zp.stat().st_size // 1024} KB)")
