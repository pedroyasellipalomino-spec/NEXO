"""Arma la app instalable y la publica en Netlify (sitio nexouni.netlify.app). Si existe netlify/functions, también
publica esas funciones (hoy no hay: las cuentas y los datos reales viven en Supabase).

Uso:  python3 scripts/deploy_netlify.py            → publica en producción
      python3 scripts/deploy_netlify.py --borrador → solo una vista previa (no cambia el sitio real)
Usa la API de Netlify (despliegue por huellas: sube solo los archivos y funciones que cambiaron).
En la sesión de Claude Code el token lo pone el proxy; fuera de ella, define NETLIFY_AUTH_TOKEN.
"""
import hashlib, json, os, pathlib, subprocess, sys, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_ID = os.environ.get("NETLIFY_SITE_ID", "fc24f73e-44ed-43df-8f6e-916a33f1422f")  # nexouni
API = "https://api.netlify.com/api/v1"
draft = "--borrador" in sys.argv

def call(method, path, data=None, ctype="application/json"):
    body = json.dumps(data).encode() if ctype == "application/json" and data is not None else data
    h = {"Content-Type": ctype}
    if os.environ.get("NETLIFY_AUTH_TOKEN"):
        h["Authorization"] = "Bearer " + os.environ["NETLIFY_AUTH_TOKEN"]
    try:
        with urllib.request.urlopen(urllib.request.Request(API + path, data=body, headers=h, method=method), timeout=180) as r:
            t = r.read()
            return json.loads(t) if t else {}
    except urllib.error.HTTPError as e:
        raise SystemExit(f"Netlify respondió {e.code} en {method} {path}: {e.read()[:500].decode('utf-8', 'replace')}")

subprocess.run([sys.executable, str(ROOT / "scripts" / "build_pwa.py")], check=True)
fns = []
if (ROOT / "netlify" / "functions").exists() and (ROOT / "scripts" / "zip_functions.mjs").exists():
    if not (ROOT / "node_modules" / "@netlify" / "zip-it-and-ship-it").exists():
        subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=ROOT, check=True)
    fns = json.loads(subprocess.run(["node", "scripts/zip_functions.mjs"], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip().splitlines()[-1])

site_dir = ROOT / "dist" / "nexo-app"
files = {"/" + p.relative_to(site_dir).as_posix(): p for p in site_dir.rglob("*") if p.is_file()}
digest = {k: hashlib.sha1(p.read_bytes()).hexdigest() for k, p in files.items()}
fdig = {f["name"]: hashlib.sha256((ROOT / f["path"]).read_bytes()).hexdigest() for f in fns}
# Metadatos de cada función (como los manda Netlify CLI): v2 = Request/Response, respuesta en modo "stream"
fcfg = {f["name"]: {"display_name": f["name"], "generator": "nexo-deploy", "build_data": {"runtimeAPIVersion": f["apiVersion"]}, "priority": f.get("priority") or 10,
                    "routes": f.get("routes") or [], "excluded_routes": []} for f in fns}
d = call("POST", f"/sites/{SITE_ID}/deploys", {"files": digest, "functions": fdig, "functions_config": fcfg, "draft": draft, "async": False})
dep = d["id"]
need = set(d.get("required") or [])
for k, p in files.items():
    if digest[k] in need:
        call("PUT", f"/deploys/{dep}/files{urllib.request.quote(k)}", p.read_bytes(), "application/octet-stream")
for f in fns:
    if fdig[f["name"]] in set(d.get("required_functions") or []):
        q = f"runtime={f['runtime']}" + (f"&invocation_mode={f['invocationMode']}" if f.get("invocationMode") else "")
        call("PUT", f"/deploys/{dep}/functions/{f['name']}?{q}", (ROOT / f["path"]).read_bytes(), "application/octet-stream")
for _ in range(60):
    st = call("GET", f"/deploys/{dep}")
    if st["state"] in ("ready", "error"):
        break
    time.sleep(3)
link = st.get("deploy_ssl_url") if draft else (st.get("ssl_url") or st.get("url"))
print(f"{'Borrador' if draft else 'Publicado'}: {link} · estado {st['state']} · id {dep}" + (f" · funciones {', '.join(x['n'] for x in st.get('available_functions') or [])}" if fns else ""))
if st["state"] != "ready":
    sys.exit(1)
