# Prueba real: Gestión, Equipo y Moderación con el personal y los tickets reales (sin datos de ejemplo).
# Cuentas temporales (@nexo-pruebas.dev) que se borran al final, con sus comprobantes.
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> python3 tests/supabase_equipo.py
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
    adm = mk("e8.admin@nexo-pruebas.dev", "Admin Ocho"); m1 = mk("e8.mod1@nexo-pruebas.dev", "Moderadora Uno"); m2 = mk("e8.mod2@nexo-pruebas.dev", "Moderador Dos")
    stu = mk("e8.estudiante@nexo-pruebas.dev", "Estudiante Ocho", "20259990081")
    sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='admin' where id='{adm}'; update public.profiles set role='mod' where id in ('{m1}','{m2}');")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium"))
        ca, cm, cs = [await b.new_context(viewport={"width": 1366, "height": 900}) for _ in range(3)]
        # el estudiante crea un ticket real
        ps = await login(cs, "e8.estudiante@nexo-pruebas.dev")
        await ps.evaluate("go('soporte')"); await ps.wait_for_timeout(500)
        await ps.click("#supNew"); await ps.fill("#sp-subj", "Prueba de equipo real"); await ps.fill("#sp-msg", "Ticket creado por la prueba del equipo real.")
        await ps.click("#supForm button[type=submit]"); await ps.wait_for_timeout(3000)
        pa = await login(ca, "e8.admin@nexo-pruebas.dev")
        await pa.wait_for_timeout(2500)
        names = await pa.evaluate("mods().map(m => m.full).sort().join(',')")
        check("Gestión muestra solo moderadores reales (sin Lucía ni Carlos)", "Moderador Dos" in names and "Moderadora Uno" in names and "Lucía" not in names and "Carlos" not in names, names)
        tk = await pa.evaluate("tickets.filter(t => t.subject === 'Prueba de equipo real').map(t => t.id)")
        check("Gestión ve el ticket real del estudiante y ningún ticket de ejemplo", len(tk) == 1 and await pa.evaluate("!tickets.some(t => t.id === 'TK-1048')"), str(tk))
        check("no ofrece invitaciones de prueba con cuenta real", "Sumar a alguien al equipo" in await pa.inner_text("#gsSide"))
        # la administradora asigna el ticket a la moderadora real
        await pa.evaluate(f"assignTicket('{tk[0]}', 'e8.mod1@nexo-pruebas.dev')"); await pa.wait_for_timeout(2500)
        row = sql(f"select data->>'mod' m from public.tickets where id = '{tk[0]}'")
        check("asignar a una moderadora real queda en el servidor", row and row[0]["m"] == "e8.mod1@nexo-pruebas.dev", str(row))
        pm = await login(cm, "e8.mod1@nexo-pruebas.dev"); await pm.wait_for_timeout(2500)
        check("la moderadora ve el ticket como suyo", await pm.evaluate(f"tkById('{tk[0]}') && tkById('{tk[0]}').mod === 'e8.mod1@nexo-pruebas.dev'"))
        # desactivar desde Equipo
        await pa.evaluate("go('equipo')"); await pa.wait_for_timeout(800)
        txt = await pa.inner_text("#eqTable")
        check("Equipo lista a los moderadores reales con el ticket asignado", "Moderadora Uno" in txt and "Moderador Dos" in txt and "Lucía" not in txt, txt[:200])
        await pa.click("[data-mod-off='e8.mod1@nexo-pruebas.dev']"); await pa.wait_for_timeout(2500)
        d = sql(f"select disabled, role from public.profiles where id = '{m1}'")[0]
        check("desactivar guarda en el servidor y conserva el rol", d["disabled"] is True and d["role"] == "mod", str(d))
        check("su ticket queda sin asignar", sql(f"select data->>'mod' m from public.tickets where id = '{tk[0]}'")[0]["m"] is None)
        await pa.click("[data-mod-on='e8.mod1@nexo-pruebas.dev']"); await pa.wait_for_timeout(2500)
        check("reactivar también se guarda", sql(f"select disabled from public.profiles where id = '{m1}'")[0]["disabled"] is False)
        # seguridad
        r1 = await pm.evaluate(f"sb.rpc('set_staff_active', {{ target: '{m2}', active: false }}).then(r => r.error && r.error.message)")
        check("un moderador no puede desactivar a otro", "Sin permiso" in (r1 or ""), str(r1))
        r2 = await pa.evaluate(f"sb.rpc('set_staff_active', {{ target: '{adm}', active: false }}).then(r => r.error && r.error.message)")
        check("nadie se desactiva a sí mismo", "propia" in (r2 or ""), str(r2))
        r3 = await pa.evaluate(f"sb.rpc('set_user_role', {{ target: '{m2}', new_role: 'admin', new_local: null, new_disabled: false }}).then(r => r.error && r.error.message)")
        check("la administradora no puede subir a alguien a administrador", "Sin permiso" in (r3 or ""), str(r3))
        r4 = await ps.evaluate(f"sb.rpc('set_staff_active', {{ target: '{m2}', active: false }}).then(r => r.error && r.error.message)")
        check("un estudiante no puede tocar el equipo", "Sin permiso" in (r4 or ""), str(r4))
        errs = pa.errs + pm.errs + ps.errs
        check("sin errores de JavaScript", not errs, "; ".join(errs[:3]))
        await b.close()
try:
    asyncio.run(main())
finally:
    for uid in created:
        try: admin("DELETE", f"users/{uid}")
        except Exception as e: print("aviso: no se borró", uid, e)
    left = sql("select (select count(*) from public.profiles where email like '%@nexo-pruebas.dev') p, (select count(*) from public.tickets t where not exists (select 1 from public.profiles where id = t.user_id)) t")[0]
    print(f"\n{sum(results)}/{len(results)} OK · cuentas de prueba que quedan: {left['p']} · tickets huérfanos: {left['t']}")
