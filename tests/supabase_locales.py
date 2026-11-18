# Prueba real: agotados, pausa y horario del comercio compartidos en vivo (tabla local_state).
# Cuentas temporales (@nexo-pruebas.dev) que se borran al final, con sus comprobantes.
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> python3 tests/supabase_locales.py
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
    loc = mk("e7.local@nexo-pruebas.dev", "Cocina Siete"); stu = mk("e7.estudiante@nexo-pruebas.dev", "Estudiante Siete", "20259990071"); otro = mk("e7.otro@nexo-pruebas.dev", "Otro Local")
    sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='local', local_id='pinchopan' where id='{loc}'; update public.profiles set role='local', local_id='lapausa' where id='{otro}';")
    before = sql("select local_id, paused, soldout, week from public.local_state where local_id = 'pinchopan'")
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium"))
            cl, cs, co = [await b.new_context(viewport={"width": 1366, "height": 900}) for _ in range(3)]
            pl = await login(cl, "e7.local@nexo-pruebas.dev"); ps = await login(cs, "e7.estudiante@nexo-pruebas.dev")
            await ps.evaluate("go('comida')"); await ps.wait_for_timeout(800)
            item = await pl.evaluate("itemsOf(myLocal())[0].id")
            # el comercio agota un producto y pausa los pedidos
            await pl.evaluate(f"lstate(myLocal().id).soldout = ['{item}']; lstate(myLocal().id).paused = true; saveLocalState();"); await pl.wait_for_timeout(3000)
            row = sql("select paused, soldout, updated_by from public.local_state where local_id='pinchopan'")
            check("el cambio del comercio queda en el servidor, firmado por su cuenta", row and row[0]["paused"] is True and row[0]["soldout"] == [item] and row[0]["updated_by"] == loc, str(row))
            check("en vivo: el estudiante ve el local en pausa y el producto agotado", await ps.evaluate(f"isPaused('pinchopan') && isSoldOut('pinchopan', '{item}')"))
            ps2 = await login(co, "e7.estudiante@nexo-pruebas.dev")
            check("otro teléfono del estudiante también lo ve al abrir", await ps2.evaluate(f"isPaused('pinchopan') && isSoldOut('pinchopan', '{item}')"))
            # el comercio reanuda y cambia el horario del lunes
            await pl.evaluate("lstate(myLocal().id).paused = false; lstate(myLocal().id).soldout = []; lstate(myLocal().id).week = weekOf(myLocal()).map((d, i) => i === 1 ? { ...d, from: '10:00', to: '16:00' } : d); saveLocalState();"); await pl.wait_for_timeout(3000)
            check("en vivo: se reanuda y el producto vuelve", await ps.evaluate(f"!isPaused('pinchopan') && !isSoldOut('pinchopan', '{item}')"))
            check("en vivo: el horario nuevo llega al estudiante", await ps.evaluate("weekOf(localById('pinchopan'))[1].from === '10:00' && weekOf(localById('pinchopan'))[1].to === '16:00'"))
            # seguridad
            sec = await ps.evaluate("sb.from('local_state').upsert({ local_id: 'pinchopan', paused: true, soldout: [] }).then(r => !!r.error)")
            check("un estudiante no puede cambiar un local", sec)
            po = await login(co, "e7.otro@nexo-pruebas.dev")
            cross = await po.evaluate("sb.from('local_state').upsert({ local_id: 'pinchopan', paused: true, soldout: [] }).then(r => !!r.error)")
            check("un comercio no puede cambiar otro local", cross)
            check("el local sigue sin pausa después de los intentos", sql("select paused from public.local_state where local_id='pinchopan'")[0]["paused"] is False)
            errs = pl.errs + ps.errs + ps2.errs + po.errs
            check("sin errores de JavaScript", not errs, "; ".join(errs[:3]))
            await b.close()
    finally:
        # deja el local como estaba antes de la prueba
        if before:
            r = before[0]
            sql("update public.local_state set paused = {}, soldout = '{}'::jsonb, week = {} where local_id = 'pinchopan'".format(
                "true" if r["paused"] else "false", json.dumps(r["soldout"]), "null" if r["week"] is None else "'" + json.dumps(r["week"]) + "'::jsonb"))
        else:
            sql("delete from public.local_state where local_id = 'pinchopan'")
try:
    asyncio.run(main())
finally:
    for uid in created:
        try: admin("DELETE", f"users/{uid}")
        except Exception as e: print("aviso: no se borró", uid, e)
    left = sql("select count(*) n from public.profiles where email like '%@nexo-pruebas.dev'")[0]["n"]
    st = sql("select count(*) n from public.local_state where local_id = 'pinchopan'")[0]["n"]
    print(f"\n{sum(results)}/{len(results)} OK · cuentas de prueba que quedan: {left} · filas de Pincho Pan tras restaurar: {st}")
