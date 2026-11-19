# Prueba real: wallet general (comida, canchas, facturas) y reembolsos al saldo.
# Cuentas temporales (@nexo-pruebas.dev) que se borran al final.
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> python3 tests/supabase_wallet.py
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
def wallet(uid): r = sql(f"select wallet from public.student_state where user_id = '{uid}'"); return float(r[0]["wallet"]) if r else 0.0
async def login(ctx, email):
    pg = await ctx.new_page(); pg.errs = []; pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    await pg.goto(U + "#login"); await pg.wait_for_timeout(1000)
    await pg.fill("#l-mail", email); await pg.fill("#l-pass", "Prueba12345"); await pg.click("#loginForm button[type=submit]"); await pg.wait_for_timeout(5000)
    return pg
async def main():
    stu = mk("e10.estudiante@nexo-pruebas.dev", "Estudiante Diez", "20259990101")
    loc = mk("e10.local@nexo-pruebas.dev", "Comercio Diez")
    otro = mk("e10.otro@nexo-pruebas.dev", "Otro Diez", "20259990102")
    sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='local', local_id='granier' where id='{loc}';"
        f"insert into public.student_state (user_id, wallet) values ('{stu}', 60) on conflict (user_id) do update set wallet = 60;")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium"))
        cs, cl, co = [await b.new_context(viewport={"width": 1280, "height": 900}) for _ in range(3)]
        ps = await login(cs, "e10.estudiante@nexo-pruebas.dev"); await ps.wait_for_timeout(1500)
        check("el estudiante ve su saldo del servidor", abs(await ps.evaluate("WALLET") - 60) < 0.01, str(await ps.evaluate("WALLET")))
        # canchas con wallet: book_court cobra en el servidor
        day = await ps.evaluate("(() => { const d = new Date(Date.now() + 2 * 864e5); return d.toISOString().slice(0, 10); })()")
        r = await ps.evaluate(f"sb.rpc('book_court', {{ p_sport: 'tenis', p_day: '{day}', p_slot: '18:00', p_price: 999, p_method: 'wallet' }}).then(r => r.error && r.error.message)")
        check("no reserva con wallet si el saldo no alcanza", "Monto fuera" in (r or "") or "insuficiente" in (r or ""), str(r))
        await ps.evaluate(f"(() => {{ res.sport = 'tenis'; res.iso = '{day}'; res.slot = '18:00'; go('revision'); }})()"); await ps.wait_for_timeout(600)
        check("la cancha propone pagar con el wallet", await ps.evaluate("courtMethodNow()") == "wallet")
        ct = await ps.evaluate("courtTotal()")
        await ps.click("#revision [data-court-pay]"); await ps.wait_for_timeout(3500)
        bk = sql(f"select id, paid_with, price from public.court_bookings where user_id = '{stu}' and cancelled_at is null")
        check("la reserva queda pagada con wallet y el servidor descuenta el saldo", len(bk) == 1 and bk[0]["paid_with"] == "wallet" and abs(wallet(stu) - (60 - ct)) < 0.01, f"{bk} {wallet(stu)}")
        check("la app muestra el mismo saldo que el servidor", abs(await ps.evaluate("WALLET") - wallet(stu)) < 0.01, str(await ps.evaluate("WALLET")))
        pay = sql(f"select method from public.payments where user_id = '{stu}' and service = 'canchas'")
        check("el pago del dueño queda anotado como wallet", pay and pay[-1]["method"] == "wallet", str(pay))
        await ps.evaluate("go('reserva')"); await ps.wait_for_timeout(1500)
        await ps.click(f"[data-court-cancel='{bk[0]['id']}']"); await ps.wait_for_timeout(300); await ps.click("[data-cdlg-ok]"); await ps.wait_for_timeout(3500)
        check("cancelar la cancha devuelve el dinero al wallet en el servidor", abs(wallet(stu) - 60) < 0.01, str(wallet(stu)))
        check("y la app lo refleja", abs(await ps.evaluate("WALLET") - 60) < 0.01, str(await ps.evaluate("WALLET")))
        # comida con wallet en Granier; el comercio lo cancela y el dinero vuelve
        await ps.evaluate("cart = { local: 'granier', lines: [{ item: LOCALES.find(l => l.id === 'granier').cats[0].items[0].id, sel: [], qty: 1, note: '' }] }; saveCart(); payMethod = 'wallet'; go('carrito')")
        await ps.wait_for_timeout(600)
        tot = await ps.evaluate("cartTotal()")
        await ps.click("#cartPay"); await ps.wait_for_timeout(4000)
        o = sql(f"select id, data->>'method' m from public.orders where user_id = '{stu}'")
        check("el pedido pagado con wallet llega al servidor y descuenta", len(o) == 1 and o[0]["m"] == "wallet" and abs(wallet(stu) - (60 - tot)) < 0.01, f"{o} {wallet(stu)}")
        pl = await login(cl, "e10.local@nexo-pruebas.dev"); await pl.wait_for_timeout(2000)
        oid = o[0]["id"]
        r1 = await pl.evaluate(f"sb.rpc('push_move', {{ target: '{stu}', p_move: {{ title: 'x', wallet: 500 }}, p_order: '{oid}' }}).then(r => r.error && r.error.message)")
        check("el comercio no puede devolver más que el pedido", "fuera de rango" in (r1 or ""), str(r1))
        await pl.evaluate(f"lpConfirm = null; renderLocalPedidos()")
        await pl.click(f"[data-lp-cancel$='{oid}']"); await pl.wait_for_timeout(300); await pl.click("[data-lp-cancel-yes]"); await pl.wait_for_timeout(4000)
        check("el comercio cancela y el dinero vuelve al wallet", abs(wallet(stu) - 60) < 0.01, str(wallet(stu)))
        r2 = await pl.evaluate(f"sb.rpc('push_move', {{ target: '{stu}', p_move: {{ title: 'x', wallet: 1, order: '{oid}' }}, p_order: '{oid}' }}).then(r => r.error && r.error.message)")
        check("no se puede devolver dos veces el mismo pedido", "Ya reembolsado" in (r2 or ""), str(r2))
        await ps.wait_for_timeout(2000)
        check("el estudiante ve el reembolso en vivo", abs(await ps.evaluate("WALLET") - 60) < 0.01, str(await ps.evaluate("WALLET")))
        po = await login(co, "e10.otro@nexo-pruebas.dev")
        r3 = await po.evaluate(f"sb.rpc('push_move', {{ target: '{stu}', p_move: {{ title: 'x', wallet: 50 }} }}).then(r => r.error && r.error.message)")
        check("un estudiante no puede sumarle saldo a otro", "Sin permiso" in (r3 or ""), str(r3))
        errs = ps.errs + pl.errs + po.errs
        check("sin errores de JavaScript", not errs, "; ".join(errs[:3]))
        await b.close()
try:
    asyncio.run(main())
finally:
    for uid in created:
        try: admin("DELETE", f"users/{uid}")
        except Exception as e: print("aviso: no se borró", uid, e)
    left = sql("select (select count(*) from public.profiles where email like '%@nexo-pruebas.dev') p, (select count(*) from public.orders o where not exists (select 1 from public.profiles where id = o.user_id)) o")[0]
    print(f"\n{sum(results)}/{len(results)} OK · cuentas de prueba que quedan: {left['p']} · pedidos huérfanos: {left['o']}")
