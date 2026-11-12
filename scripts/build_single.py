"""Genera dist/nexo-prototipo.html: el prototipo en un solo archivo (CSS, datos, lógica e íconos adentro).

Uso:  python3 scripts/build_single.py [ruta/a/lucide.min.js]
Si no se da la ruta de Lucide, se intenta descargar de unpkg; si no se puede, se deja el enlace al CDN.
"""
import pathlib, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
LUCIDE_TAG = '<script src="vendor/lucide.min.js"></script>'
rd = lambda p: (ROOT / p).read_text(encoding="utf-8")
safe = lambda js: js.replace("</script", "<\\/script")

lucide = None
if (ROOT / "vendor" / "lucide.min.js").exists() and len(sys.argv) < 2:
    lucide = rd("vendor/lucide.min.js")
elif len(sys.argv) > 1:
    lucide = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
else:
    try:
        lucide = urllib.request.urlopen("https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js", timeout=20).read().decode("utf-8")
    except Exception as err:
        print(f"No se pudo descargar Lucide ({err}); se usará el CDN.")

s = rd("index.html")
s = s.replace('<link rel="stylesheet" href="css/styles.css">', "<style>\n" + rd("css/styles.css") + "\n</style>")
if lucide:
    s = s.replace(LUCIDE_TAG, "<script>" + safe(lucide) + "</script>")
s = s.replace('<script src="js/data.js"></script>', "<script>\n" + safe(rd("js/data.js")) + "\n</script>")
s = s.replace('<script src="js/app.js"></script>', "<script>\n" + safe(rd("js/app.js")) + "\n</script>")
# El archivo único no es instalable: se quitan manifiesto e íconos externos y el favicon va en línea
import base64, re
s = re.sub(r'<link rel="(icon|apple-touch-icon|manifest)"[^>]*>\n?', "", s)
s = s.replace("<title>", '<link rel="icon" href="data:image/svg+xml;base64,' + base64.b64encode((ROOT / "icons" / "icon.svg").read_bytes()).decode() + '">\n<title>', 1)
s = s.replace('src="icons/icon-192.png"', 'src="data:image/png;base64,' + base64.b64encode((ROOT / "icons" / "icon-192.png").read_bytes()).decode() + '"')
assert 'src="js/' not in s and 'href="css/' not in s
out = ROOT / "dist" / "nexo-prototipo.html"
out.parent.mkdir(exist_ok=True)
out.write_text(s, encoding="utf-8")
print(f"Listo: {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")
