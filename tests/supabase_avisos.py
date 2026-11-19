# Prueba real: avisos en vivo al personal (toast, sonido y aviso del teléfono) cuando algo llega desde otro teléfono.
# Cuentas temporales (@nexo-pruebas.dev) que se borran al final, con sus comprobantes.
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> python3 tests/supabase_avisos.py
# La clave service_role nunca se guarda en el código: pásala solo como variable de entorno.
import asyncio, os, json, subprocess, urllib.request
from playwright.async_api import async_playwright
R = "iwgdisuzfznrmythylvg"; SK = os.environ["SK"]; U = "http://localhost:8888/index.html"
H = {"apikey": SK, "Authorization": "Bearer " + SK, "content-type": "application/json"}
def call(method, url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method, headers=H)
    with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read() or b"{}")
def admin(method, path, body=None): return call(method, f"https://{R}.supabase.co/auth/v1/admin/{path}", body)
def sql(q):
    r = subprocess.run(['curl', '-sS', '-X', 'POST', f'https://api.supabase.com/v1/projects/{R}/database/query', '-H', 'content-type: application/json', '-d', json.dumps({"query": q})], capture_output=True, text=True); return json.loads(r.stdout)
created = []; results = []
def verify(uid): sql(f"select set_config('nexo.role_change','on',false); update public.profiles set carnet_status='ok', carnet_trim=public.current_trim() where id='{uid}'")
def mk(email, name, carnet=None):
    u = admin("POST", "users", {"email": email, "password": "Prueba12345", "email_confirm": True, "user_metadata": {"full_name": name, **({"carnet": carnet} if carnet else {})}}); created.append(u["id"])
    if carnet: verify(u["id"])  # carnet de este trimestre ya verificado (el flujo de la foto se prueba en supabase_carnet.py)
    return u["id"]
def check(label, ok, extra=""):
    results.append(ok); print(("OK   " if ok else "FALLA") + " " + label + (f"  [{extra}]" if extra and not ok else ""))
async def login(ctx, email):
    pg = await ctx.new_page(); pg.errs = []; pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    await pg.goto(U + "#login"); await pg.wait_for_timeout(1000)
    await pg.fill("#l-mail", email); await pg.fill("#l-pass", "Prueba12345"); await pg.click("#loginForm button[type=submit]"); await pg.wait_for_timeout(5000)
    return pg
SPY = """() => { window.__notes = [];
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  const rec = (t, o) => window.__notes.push((o && o.body) || t);
  try { ServiceWorkerRegistration.prototype.showNotification = function (t, o) { rec(t, o); return Promise.resolve(); }; } catch (e) {}
  window.Notification = class { constructor(t, o) { rec(t, o); } static get permission() { return 'granted'; } static requestPermission() { return Promise.resolve('granted'); } close() {} }; }"""
async def main():
    adm = mk("e9.caja@nexo-pruebas.dev", "Caja Nueve"); md = mk("e9.mod@nexo-pruebas.dev", "Moderadora Nueve"); stu = mk("e9.estudiante@nexo-pruebas.dev", "Estudiante Nueve", "20259990091")
    sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='admin' where id='{adm}'; update public.profiles set role='mod' where id='{md}';")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium"))
        ca, cm, cs = [await b.new_context(viewport={"width": 1366, "height": 900}) for _ in range(3)]
        pa = await login(ca, "e9.caja@nexo-pruebas.dev"); pm = await login(cm, "e9.mod@nexo-pruebas.dev"); ps = await login(cs, "e9.estudiante@nexo-pruebas.dev")
        await pa.wait_for_timeout(1500); await pm.wait_for_timeout(1500)
        for pg in (pa, pm): await pg.evaluate(SPY)
        check("el menú del personal ofrece activar los avisos del teléfono", await pa.evaluate("pushState() === 'on'"))
        # 1) el estudiante registra una recarga por Pago Móvil → aviso a Caja
        await ps.evaluate("""() => { pendRec.push({ id: 'r' + Date.now(), amount: 15, ref: '0011223344', bank: 'Mercantil · 0105', date: '2026-11-18', bs: 13736.1, estado: 'revision', sentAt: Date.now() }); savePend();
          addMovement('Recarga de wallet', 'Pago Móvil · Ref. 223344', '+$15,00', 'En revisión', 'neutral', { icon: 'smartphone' }); }""")
        await pa.wait_for_timeout(5000)
        t = await pa.evaluate("[...document.querySelectorAll('.toast')].map(x => x.textContent).join(' | ')")
        check("Caja recibe el aviso en pantalla", "Pago por validar" in t and "Estudiante Nueve" in t, t[:200])
        n = await pa.evaluate("window.__notes.join(' | ')")
        check("Caja recibe el aviso del teléfono con la app en segundo plano", "Pago por validar" in n, n[:200])
        check("el título de la pestaña cuenta lo que no ha visto", (await pa.title()).startswith("(1)"), await pa.title())
        # 2) el estudiante abre un ticket → aviso a moderación
        await ps.evaluate("go('soporte')"); await ps.wait_for_timeout(400)
        await ps.click("#supNew"); await ps.fill("#sp-subj", "Aviso en vivo"); await ps.fill("#sp-msg", "Probando que la moderadora reciba el aviso.")
        await ps.click("#supForm button[type=submit]"); await pm.wait_for_timeout(5000)
        nm = await pm.evaluate("window.__notes.join(' | ')")
        check("moderación recibe el aviso del ticket nuevo en el teléfono", "Nuevo ticket" in nm and "Aviso en vivo" in nm, nm[:200])
        # 3) la moderadora toma el ticket y el estudiante responde → aviso de respuesta
        tid = await pm.evaluate("tickets.find(t => t.subject === 'Aviso en vivo').id")
        await pm.evaluate(f"(() => {{ const t = tkById('{tid}'); t.mod = sessionEmail; t.messages.push({{ from: 'mod', name: user.full, t: Date.now(), role: 'mod', text: 'Hola, lo reviso.' }}); saveTickets(); liveSeen = liveKeys(); window.__notes = []; }})()")
        await pm.wait_for_timeout(2500)
        await ps.evaluate(f"(() => {{ const t = tkById('{tid}'); t.messages.push({{ from: 'student', name: user.full, t: Date.now(), text: 'Gracias, quedo atento.' }}); saveTickets(); }})()")
        await pm.wait_for_timeout(5000)
        nr = await pm.evaluate("window.__notes.join(' | ')")
        check("la moderadora recibe el aviso cuando el estudiante responde", "respondió" in nr, nr[:200])
        # 4) lo que hace la misma persona no se le avisa
        before = await pa.evaluate("window.__notes.length")
        await pa.evaluate("(() => { const it = cajaItems().find(x => !x.done); if (it) vlDecide(it.key + '|' + it.id, true, null, true); })()")
        await pa.wait_for_timeout(4000)
        check("lo que aprueba la propia Caja no le llega como aviso", await pa.evaluate("window.__notes.length") == before)
        errs = pa.errs + pm.errs + ps.errs
        check("sin errores de JavaScript", not errs, "; ".join(errs[:3]))
        await b.close()
try:
    asyncio.run(main())
finally:
    for uid in created:
        try: admin("DELETE", f"users/{uid}")
        except Exception as e: print("aviso: no se borró", uid, e)
    left = sql("select count(*) n from public.profiles where email like '%@nexo-pruebas.dev'")[0]["n"]
    print(f"\n{sum(results)}/{len(results)} OK · cuentas de prueba que quedan: {left}")
