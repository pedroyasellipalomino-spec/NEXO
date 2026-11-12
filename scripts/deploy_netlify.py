"""Arma la app instalable y la publica en Netlify (sitio nexouni.netlify.app).

Uso:  python3 scripts/deploy_netlify.py            → publica en producción
      python3 scripts/deploy_netlify.py --borrador → solo una vista previa (no cambia el sitio real)
El token de Netlify no está en el código: en la sesión de Claude Code el proxy lo agrega a las llamadas a
api.netlify.com. Fuera de esa sesión, define NETLIFY_AUTH_TOKEN.
"""
import json, os, pathlib, subprocess, sys, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_ID = os.environ.get("NETLIFY_SITE_ID", "fc24f73e-44ed-43df-8f6e-916a33f1422f")  # nexouni
draft = "--borrador" in sys.argv

subprocess.run([sys.executable, str(ROOT / "scripts" / "build_pwa.py")], check=True)
zip_bytes = (ROOT / "dist" / "nexo-app.zip").read_bytes()
url = f"https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys" + ("?draft=true" if draft else "")
headers = {"Content-Type": "application/zip"}
if os.environ.get("NETLIFY_AUTH_TOKEN"):
    headers["Authorization"] = "Bearer " + os.environ["NETLIFY_AUTH_TOKEN"]
req = urllib.request.Request(url, data=zip_bytes, headers=headers, method="POST")
with urllib.request.urlopen(req, timeout=120) as r:
    d = json.load(r)
link = d.get("deploy_ssl_url") if draft else (d.get("ssl_url") or d.get("url"))
print(f"{'Borrador' if draft else 'Publicado'}: {link} · estado {d.get('state')} · id {d.get('id')}")
