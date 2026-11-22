# Prueba real: cada comercio edita su menú (local_state.menu) y los estudiantes lo ven en vivo.
# Cuentas temporales (@nexo-pruebas.dev) que se borran al final; el local de prueba queda como estaba.
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> python3 tests/supabase_menu.py
import asyncio, os, json, subprocess, urllib.request
from playwright.async_api import async_playwright
R = "iwgdisuzfznrmythylvg"; SK = os.environ["SK"]; U = "http://localhost:8888/index.html"; LOC = "granier"
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
    if carnet: verify(u["id"])
    return u["id"]
def check(label, ok, extra=""):
    results.append(ok); print(("OK   " if ok else "FALLA") + " " + label + (f"  [{extra}]" if extra and not ok else ""))
async def login(ctx, email):
    pg = await ctx.new_page(); pg.errs = []; pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    await pg.goto(U + "#login"); await pg.wait_for_timeout(1000)
    await pg.fill("#l-mail", email); await pg.fill("#l-pass", "Prueba12345"); await pg.click("#loginForm button[type=submit]"); await pg.wait_for_timeout(5000)
    return pg
orig = sql(f"select row_to_json(l) r from public.local_state l where local_id = '{LOC}'")
async def main():
    m1 = mk("e12.granier@nexo-pruebas.dev", "Comercio Granier"); m2 = mk("e12.teeb@nexo-pruebas.dev", "Comercio Teeb")
    stu = mk("e12.estudiante@nexo-pruebas.dev", "Estudiante Doce", "20259990121")
    own = mk("e12.dueno@nexo-pruebas.dev", "Dueño Doce")
    sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='local', local_id='{LOC}' where id='{m1}'; update public.profiles set role='local', local_id='teeb' where id='{m2}'; update public.profiles set role='owner' where id='{own}';")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium"))
        cm, cs, ct, co = [await b.new_context(viewport={"width": 1280, "height": 900}) for _ in range(4)]
        ps = await login(cs, "e12.estudiante@nexo-pruebas.dev")
        await ps.evaluate(f"curLocal = '{LOC}'; go('local')"); await ps.wait_for_timeout(800)
        pm = await login(cm, "e12.granier@nexo-pruebas.dev")
        await pm.evaluate("go('local-menu')"); await pm.wait_for_timeout(800)
        first = await pm.evaluate("localById('granier').cats[0].items[0].id")
        await pm.click(f"[data-me-edit='{first}']"); await pm.fill("#me-price", "9,99")
        await pm.click("[data-me-gadd]"); await pm.fill("#me-g0", "Relleno"); await pm.fill("#me-g0c0", "Jamón"); await pm.fill("#me-g0c1", "Queso"); await pm.fill("#me-g0p1", "0,75")
        await pm.click("[data-me-gadd]"); await pm.fill("#me-g1", "Extras de prueba"); await pm.select_option("#me-g1t", "multi"); await pm.wait_for_timeout(100)
        await pm.fill("#me-g1c0", "Mantequilla"); await pm.fill("#me-g1p0", "0,25")
        await pm.click("[data-me-form] button[type=submit]"); await pm.wait_for_timeout(1500)

        await pm.click("[data-me-new='0']"); await pm.fill("#me-name", "Pan de jamón de prueba"); await pm.fill("#me-price", "6,50"); await pm.click("[data-me-form] button[type=submit]"); await pm.wait_for_timeout(3000)
        row = sql(f"select menu from public.local_state where local_id = '{LOC}'")[0]["menu"] or []
        names = [i["name"] for c in row for i in c["items"]]; prices = {i["id"]: i["price"] for c in row for i in c["items"]}
        check("el menú editado queda en el servidor", "Pan de jamón de prueba" in names and prices.get(first) == 9.99, str(names)[:200])
        opts = [i.get("opts") for c in row for i in c["items"] if i["id"] == first][0] or []
        ex = [g for g in opts if g.get("name") == "Extras de prueba"]
        check("los grupos de varias selecciones quedan en el servidor", ex and ex[0].get("multi") is True and ex[0]["choices"][0]["p"] == 0.25, str(ex)[:200])
        check("las opciones con recargo quedan en el servidor", any(g["name"] == "Relleno" and g["choices"][1]["p"] == 0.75 for g in opts), str(opts)[:200])
        await ps.wait_for_timeout(2500)
        lm = await ps.inner_text("#localMenu")
        check("el estudiante ve el producto nuevo y el precio en vivo", "Pan de jamón de prueba" in lm and "$9,99" in lm, lm[:200])
        # carrito con un producto que luego se borra
        nid = await pm.evaluate("localById('granier').cats[0].items.find(i => i.name === 'Pan de jamón de prueba').id")
        await ps.evaluate(f"cart = {{ local: '{LOC}', lines: [{{ item: '{nid}', sel: [], qty: 1, note: '' }}] }}; saveCart()")
        await pm.click(f"[data-me-edit='{nid}']"); await pm.click(f"[data-me-del='{nid}']"); await pm.click("[data-cdlg-ok]"); await pm.wait_for_timeout(3000)
        await ps.evaluate("go('carrito')"); await ps.wait_for_timeout(800)
        check("si el local borra un producto, sale del carrito del estudiante", await ps.evaluate("cart.lines.length") == 0)
        # seguridad
        r1 = await pm.evaluate(f"sb.from('local_state').update({{ menu: [{{ name: 'X', items: [{{ id: 'z', name: '<script>', price: 1 }}] }}] }}).eq('local_id', '{LOC}').then(r => r.error ? 'bloqueado' : 'ok')")
        check("no se puede guardar código en el menú", r1 == "bloqueado", r1)
        pt = await login(ct, "e12.teeb@nexo-pruebas.dev")
        await pt.evaluate(f"sb.from('local_state').update({{ menu: [{{ name: 'Robado', items: [] }}] }}).eq('local_id', '{LOC}')"); await pt.wait_for_timeout(1500)
        row2 = sql(f"select menu from public.local_state where local_id = '{LOC}'")[0]["menu"] or []
        check("otro comercio no puede cambiar el menú ajeno", not any(c["name"] == "Robado" for c in row2))
        # el dueño edita el menú del local desde su panel y el comercio lo ve en vivo
        po = await login(co, "e12.dueno@nexo-pruebas.dev")
        await po.evaluate(f"mnLocal = '{LOC}'; go('menus')"); await po.wait_for_timeout(1000)
        await po.click(f"[data-me-edit='{first}']"); await po.fill("#me-price", "8,80"); await po.click("[data-me-form] button[type=submit]"); await po.wait_for_timeout(3000)
        row3 = sql(f"select menu from public.local_state where local_id = '{LOC}'")[0]["menu"] or []
        check("el dueño cambia el menú de un local en el servidor", any(i["id"] == first and i["price"] == 8.8 for c in row3 for i in c["items"]))
        check("el comercio recibe el cambio del dueño en vivo", await pm.evaluate(f"itemById(localById('{LOC}'), '{first}').price") == 8.8)
        pm.errs += po.errs
        # la administración también puede
        sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='admin' where id='{own}'")
        await po.reload(); await po.wait_for_timeout(5000)
        await po.evaluate(f"mnLocal = '{LOC}'; go('menus')"); await po.wait_for_timeout(1000)
        check("la administración entra a Menús", await po.evaluate("current") == "menus")
        await po.click(f"[data-me-edit='{first}']"); await po.fill("#me-price", "7,70"); await po.click("[data-me-form] button[type=submit]"); await po.wait_for_timeout(3000)
        row4 = sql(f"select menu from public.local_state where local_id = '{LOC}'")[0]["menu"] or []
        check("la administración cambia el menú en el servidor", any(i["id"] == first and i["price"] == 7.7 for c in row4 for i in c["items"]))
        r2 = await ps.evaluate(f"sb.from('local_state').update({{ menu: null }}).eq('local_id', '{LOC}').select().then(r => (r.data || []).length)")
        check("un estudiante no puede cambiar menús", r2 == 0, str(r2))
        errs = pm.errs + ps.errs + pt.errs
        check("sin errores de JavaScript", not errs, "; ".join(errs[:3]))
        await b.close()
try:
    asyncio.run(main())
finally:
    o = orig[0]["r"] if orig else None
    if o: sql(f"update public.local_state set paused = {str(o['paused']).lower()}, soldout = '{json.dumps(o['soldout'])}'::jsonb, week = {('$$' + json.dumps(o['week']) + '$$::jsonb') if o.get('week') else 'null'}, menu = {('$$' + json.dumps(o['menu']) + '$$::jsonb') if o.get('menu') else 'null'} where local_id = '{LOC}'")
    else: sql(f"delete from public.local_state where local_id = '{LOC}'")
    for uid in created:
        try: admin("DELETE", f"users/{uid}")
        except Exception as e: print("aviso: no se borró", uid, e)
    left = sql(f"select (select count(*) from public.profiles where email like '%@nexo-pruebas.dev') p, (select menu is null from public.local_state where local_id = '{LOC}') m")[0]
    print(f"\n{sum(results)}/{len(results)} OK · cuentas de prueba que quedan: {left['p']} · menú de {LOC} restablecido: {left['m'] in (True, None)}")
