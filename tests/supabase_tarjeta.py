# Prueba real: los pagos con tarjeta quedan en revisión hasta que Caja los aprueba (migración 015).
# Cuentas temporales (@nexo-pruebas.dev) que se borran al final.
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> python3 tests/supabase_tarjeta.py
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
    if carnet: verify(u["id"])
    return u["id"]
def check(label, ok, extra=""):
    results.append(ok); print(("OK   " if ok else "FALLA") + " " + label + (f"  [{extra}]" if extra and not ok else ""))
def wallet(uid): r = sql(f"select wallet from public.student_state where user_id = '{uid}'"); return float(r[0]["wallet"]) if r else 0.0
async def login(ctx, email):
    pg = await ctx.new_page(); pg.errs = []; pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    await pg.goto(U + "#login"); await pg.wait_for_timeout(1000)
    await pg.fill("#l-mail", email); await pg.fill("#l-pass", "Prueba12345"); await pg.click("#loginForm button[type=submit]"); await pg.wait_for_timeout(5000)
    return pg
async def caja(pa):
    await pa.evaluate("sbLoadCaja().then(() => { go('validar'); renderValidar(); })"); await pa.wait_for_timeout(2500)
async def main():
    stu = mk("e15.estudiante@nexo-pruebas.dev", "Estudiante Quince", "20259991501")
    adm = mk("e15.admin@nexo-pruebas.dev", "Caja Quince")
    sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='admin' where id='{adm}';"
        f"insert into public.student_state (user_id, wallet) values ('{stu}', 5) on conflict (user_id) do update set wallet = 5;")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium"))
        cs, ca = [await b.new_context(viewport={"width": 1280, "height": 900}) for _ in range(2)]
        ps = await login(cs, "e15.estudiante@nexo-pruebas.dev"); await ps.wait_for_timeout(1500)
        # 1) el servidor no deja atajos
        r = await ps.evaluate("sb.rpc('wallet_add', { delta: 10 }).then(r => r.error && r.error.message)")
        check("la app no puede sumarse saldo sola", "Caja" in (r or ""), str(r))
        r = await ps.evaluate("sb.from('payments').insert({ service: 'comida', amount: 5, status: 'Pagado', method: 'tarjeta', detail: 'x' }).then(r => r.error && r.error.message)")
        check("un pago con tarjeta no se anota como pagado desde la app", bool(r), str(r))
        st = await ps.evaluate("sb.rpc('save_my_state', { p_pagos: { nov: { estado: 'pagada', monto: 160, via: 'Visa ···· 4242' } }, p_pendrec: [], p_moves: [] }).then(r => r.error ? r.error.message : (r.data.pagos.nov || {}).estado || 'ninguno')")
        check("una factura no queda pagada con tarjeta sin Caja", st != "pagada", str(st))
        # 2) recarga con tarjeta: en revisión y sin saldo hasta que Caja la aprueba
        await ps.evaluate("cards.push({ id: 'cT', brand: 'visa', last4: '4242', exp: '12/28', type: 'Crédito' }); saveCards(); rcCardId = 'cT'; rcMethod = 'card'; rcAmount = 12; go('recarga'); renderRecarga()"); await ps.wait_for_timeout(500)
        await ps.click("#rcGo"); await ps.wait_for_timeout(3500)
        row = sql(f"select wallet, pendrec from public.student_state where user_id = '{stu}'")[0]
        rec = [x for x in row["pendrec"] if x.get("method") == "tarjeta"]
        check("la recarga con tarjeta queda en revisión sin sumar saldo", len(rec) == 1 and rec[0]["estado"] == "revision" and abs(float(row["wallet"]) - 5) < 0.01, str(row))
        pa = await login(ca, "e15.admin@nexo-pruebas.dev"); await caja(pa)
        await pa.click(f"[data-vl-ok$='|{rec[0]['id']}']"); await pa.wait_for_timeout(3500)
        pay = sql(f"select status from public.payments where user_id = '{stu}' and service = 'recarga' order by created_at desc limit 1")
        check("Caja aprueba la recarga y el saldo se suma", abs(wallet(stu) - 17) < 0.01 and pay and pay[0]["status"] == "Acreditada", f"{wallet(stu)} {pay}")
        await ps.wait_for_timeout(2500)
        check("el estudiante ve el saldo nuevo en vivo", abs(await ps.evaluate("WALLET") - 17) < 0.01, str(await ps.evaluate("WALLET")))
        # 3) pedido con tarjeta: en revisión, nadie lo cambia, Caja lo aprueba
        await ps.evaluate("cart = { local: 'granier', lines: [{ item: LOCALES.find(l => l.id === 'granier').cats[0].items[0].id, sel: [], qty: 1, note: '' }] }; saveCart(); payMethod = 'card'; go('carrito')"); await ps.wait_for_timeout(600)
        await ps.click("#cartPay"); await ps.wait_for_timeout(4000)
        o = sql(f"select id, data->>'payStatus' ps from public.orders where user_id = '{stu}'")
        check("el pedido con tarjeta llega al servidor en revisión", len(o) == 1 and o[0]["ps"] == "revision", str(o))
        oid = o[0]["id"]
        await ps.evaluate(f"sb.from('orders').update({{ data: {{ ...orders.find(x => x.id === '{oid}'), payStatus: 'ok' }} }}).eq('id', '{oid}')"); await ps.wait_for_timeout(1500)
        check("el estudiante no puede marcar su pedido como pagado", sql(f"select data->>'payStatus' ps from public.orders where id = '{oid}'")[0]["ps"] == "revision")
        await caja(pa)
        await pa.click(f"[data-vl-ok$='|{oid}']"); await pa.wait_for_timeout(3500)
        od = sql(f"select data->>'payStatus' ps, (data->>'readyAt')::bigint ra from public.orders where id = '{oid}'")[0]
        pay = sql(f"select status from public.payments where user_id = '{stu}' and service = 'comida' order by created_at desc limit 1")
        mv = sql(f"select m->>'pill' pill from public.student_state s, jsonb_array_elements(s.moves) m where s.user_id = '{stu}' and m->>'order' = '{oid}'")
        check("Caja aprueba el pedido: empieza la preparación, el pago y el movimiento quedan pagados", od["ps"] == "ok" and od["ra"] and pay and pay[0]["status"] == "Pagado" and mv and mv[0]["pill"] == "Pagado", f"{od} {pay} {mv}")
        await ps.wait_for_timeout(2500)
        check("el estudiante ve su pedido en preparación", await ps.evaluate(f"orderStatus(orders.find(x => x.id === '{oid}'))") in ("preparando", "programado"), str(await ps.evaluate(f"orderStatus(orders.find(x => x.id === '{oid}'))")))
        r = await pa.evaluate(f"sb.rpc('order_pay_decide', {{ p_id: '{oid}', ok: true, motivo: null, p_patch: {{}} }}).then(r => r.error && r.error.message)")
        check("no se puede aprobar dos veces", "Ya revisado" in (r or ""), str(r))
        # 4) cancha con tarjeta: apartada en revisión; Caja la rechaza y la hora se libera
        day = await ps.evaluate("(() => { const d = new Date(Date.now() + 2 * 864e5); return d.toISOString().slice(0, 10); })()")
        await ps.evaluate(f"(() => {{ res.sport = 'padel'; res.iso = '{day}'; res.slot = '19:00'; courtMethod = 'card'; go('revision'); }})()"); await ps.wait_for_timeout(600)
        await ps.click("#revision [data-court-pay]"); await ps.wait_for_timeout(3500)
        bk = sql(f"select id, pay_status from public.court_bookings where user_id = '{stu}' and cancelled_at is null")
        check("la cancha con tarjeta queda apartada en revisión", len(bk) == 1 and bk[0]["pay_status"] == "revision", str(bk))
        await caja(pa)
        await pa.click(f"[data-vl-rej$='|{bk[0]['id']}']"); await pa.wait_for_timeout(400)
        await pa.click("[data-vl-reject-form] button[type=submit]"); await pa.wait_for_timeout(3500)
        bk2 = sql(f"select pay_status, cancelled_at is not null c from public.court_bookings where id = '{bk[0]['id']}'")[0]
        pay = sql(f"select status from public.payments where user_id = '{stu}' and service = 'canchas' order by created_at desc limit 1")
        check("Caja rechaza la cancha: se cancela, la hora queda libre y el pago queda rechazado", bk2["pay_status"] == "rechazada" and bk2["c"] and pay and pay[0]["status"] == "Rechazado", f"{bk2} {pay}")
        # 5) factura con tarjeta aprobada: queda pagada vía la tarjeta
        await ps.evaluate("pagos = { ...pagos, oct: { estado: 'revision', monto: 160, pp: false, method: 'tarjeta', card: 'Visa ···· 4242', ref: '445566', currency: 'usd', paidAmount: 160, date: isoOf(new Date()), sentAt: Date.now() } }; savePagos()"); await ps.wait_for_timeout(3000)
        await caja(pa)
        await pa.click("[data-vl-ok$='|oct']"); await pa.wait_for_timeout(3500)
        f = sql(f"select pagos->'oct' f from public.student_state where user_id = '{stu}'")[0]["f"]
        check("Caja aprueba la factura con tarjeta y queda pagada vía la tarjeta", f and f.get("estado") == "pagada" and f.get("via") == "Visa ···· 4242", str(f))
        errs = ps.errs + pa.errs
        check("sin errores de JavaScript", not errs, "; ".join(errs[:3]))
        await b.close()
try:
    asyncio.run(main())
finally:
    for uid in created:
        sql(f"delete from public.payments where user_id = '{uid}'; delete from public.court_bookings where user_id = '{uid}'; delete from public.orders where user_id = '{uid}'; delete from public.student_state where user_id = '{uid}'")
        try: admin("DELETE", f"users/{uid}")
        except Exception as e: print("no se borró", uid, e)
    print(f"\n{sum(results)}/{len(results)} comprobaciones")
