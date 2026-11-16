# Prueba real: Movimientos del creador con los pagos reales de Supabase.
# Cuentas temporales (@nexo-pruebas.dev) que se borran al final, con sus comprobantes.
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> python3 tests/supabase_movimientos.py
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
def mk(email, name, carnet=None):
    u = admin("POST", "users", {"email": email, "password": "Prueba12345", "email_confirm": True, "user_metadata": {"full_name": name, **({"carnet": carnet} if carnet else {})}}); created.append(u["id"]); return u["id"]
def check(label, ok, extra=""):
    results.append(ok); print(("OK   " if ok else "FALLA") + " " + label + (f"  [{extra}]" if extra and not ok else ""))
async def login(ctx, email):
    pg = await ctx.new_page(); pg.errs = []; pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    await pg.goto(U + "#login"); await pg.wait_for_timeout(1000)
    await pg.fill("#l-mail", email); await pg.fill("#l-pass", "Prueba12345"); await pg.click("#loginForm button[type=submit]"); await pg.wait_for_timeout(5000)
    return pg
async def main():
    stu = mk("e6.estudiante@nexo-pruebas.dev", "Estudiante Seis", "20259990061"); cre = mk("e6.creador@nexo-pruebas.dev", "Creador Seis"); otro = mk("e6.otro@nexo-pruebas.dev", "Otro Seis", "20259990062")
    sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='creator' where id='{cre}';")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium"))
        cs, cc, co = [await b.new_context(viewport={"width": 1366, "height": 900}) for _ in range(3)]
        ps = await login(cs, "e6.estudiante@nexo-pruebas.dev")
        await ps.evaluate("""() => { WALLET = Math.round((WALLET + 10) * 100) / 100; saveWallet();
          addMovement("Recarga de wallet", "Estacionamiento · Visa ····4242", "+$10,00", "Pagado", "ok", { icon: "wallet" });
          addMovement("Cancha de tenis 02", "Canchas · Vie 20 nov · 18:00–19:00", "−$12,60", "Pagado", "ok", { icon: "dribbble" });
          addMovement("Factura de noviembre", "Universidad · Transferencia · Ref. 345678", "$160,00", "En revisión", "neutral"); }""")
        await ps.wait_for_timeout(3000)
        pc = await login(cc, "e6.creador@nexo-pruebas.dev")
        await pc.evaluate("go('movimientos')"); await pc.wait_for_timeout(3500)
        txt = await pc.inner_text("#mvList")
        check("el creador ve los pagos reales con el nombre de quien pagó", "Estudiante Seis" in txt and "Cancha de tenis 02" in txt and "Recarga de wallet" in txt, txt[:300])
        check("muestra la etiqueta de datos reales y el resumen", "Datos reales" in txt and "comisión de Nexo" in txt, txt[:200])
        check("el pago en revisión lleva su estado y no suma comisión", "En revisión" in txt and await pc.evaluate("sbMoves.find(x => x.status === 'En revisión').fee === null"))
        fee = await pc.evaluate("sbMoves.find(x => x.service === 'canchas').fee")
        check("la comisión de canchas usa la tasa configurada (5 %)", abs(fee - 0.63) < 0.01, str(fee))
        check("sin pagos de ejemplo", await pc.evaluate("sbMoves.every(x => x.who !== 'Ana Torres')"))
        po = await login(co, "e6.otro@nexo-pruebas.dev")
        leak = await po.evaluate(f"sb.from('payments').select('id').eq('user_id', '{stu}').then(r => (r.data || []).length)")
        check("un estudiante no ve los pagos de otro", leak == 0, str(leak))
        errs = ps.errs + pc.errs + po.errs
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
