# Prueba real: "pagada fuera de Nexo" pide comprobante y la valida Caja (migración 016).
# Cuentas temporales (@nexo-pruebas.dev) que se borran al final.
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> python3 tests/supabase_externa.py
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
    ok = bool(ok); results.append(ok); print(("OK   " if ok else "FALLA") + " " + label + (f"  [{extra}]" if extra and not ok else ""))
def wallet(uid): r = sql(f"select wallet from public.student_state where user_id = '{uid}'"); return float(r[0]["wallet"]) if r else 0.0
async def login(ctx, email):
    pg = await ctx.new_page(); pg.errs = []; pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    await pg.goto(U + "#login"); await pg.wait_for_timeout(1000)
    await pg.fill("#l-mail", email); await pg.fill("#l-pass", "Prueba12345"); await pg.click("#loginForm button[type=submit]"); await pg.wait_for_timeout(5000)
    return pg
async def caja(pa):
    await pa.evaluate("sbLoadCaja().then(() => { go('validar'); renderValidar(); })"); await pa.wait_for_timeout(2500)
async def main():
    stu = mk("e16.estudiante@nexo-pruebas.dev", "Estudiante Dieciséis", "20259991601")
    adm = mk("e16.admin@nexo-pruebas.dev", "Caja Dieciséis")
    sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='admin' where id='{adm}';")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium"))
        cs, ca = [await b.new_context(viewport={"width": 1280, "height": 900}) for _ in range(2)]
        ps = await login(cs, "e16.estudiante@nexo-pruebas.dev"); await ps.wait_for_timeout(1500)
        st = await ps.evaluate("sb.rpc('save_my_state', { p_pagos: { sep: { estado: 'externa', via: 'Fuera de Nexo' } }, p_pendrec: [], p_moves: [] }).then(r => r.error ? r.error.message : (r.data.pagos.sep || {}).estado || 'ninguno')")
        check("la app no puede marcar sola un mes como pagado fuera de Nexo", st != "externa", str(st))
        # inscripción: marca septiembre como pagado fuera de Nexo con su comprobante
        await ps.evaluate("go('inscripcion')"); await ps.wait_for_timeout(800)
        await ps.click("[data-mcount='1']"); await ps.locator("#insRows input").nth(0).fill("BPTFI02")
        await ps.evaluate("insPaid = new Set(['sep']); renderInsPaid()"); await ps.wait_for_timeout(200)
        await ps.set_input_files("#ins-file", files=[{"name": "recibo.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4 recibo"}])
        await ps.fill("#ins-ref", "0012345678")
        await ps.click("#insForm button[type=submit]"); await ps.wait_for_timeout(4000)
        f = sql(f"select pagos->'sep' f from public.student_state where user_id = '{stu}'")[0]["f"]
        check("el mes queda en revisión con su comprobante en el servidor", f and f.get("estado") == "revision" and f.get("method") == "externa" and (f.get("receiptPath") or "").startswith(stu + "/"), str(f))
        obj = sql(f"select count(*) n from storage.objects where bucket_id='comprobantes' and name = '{f.get('receiptPath')}'")[0]["n"]
        check("el comprobante quedó guardado", obj == 1, str(obj))
        pa = await login(ca, "e16.admin@nexo-pruebas.dev"); await caja(pa)
        txt = await pa.inner_text("#vlList")
        check("Caja lo ve como pagado fuera de Nexo", "pagada fuera de Nexo" in txt and "Fuera de Nexo" in txt, txt[:200])
        await pa.click("[data-vl-ok$='|sep']"); await pa.wait_for_timeout(3500)
        f = sql(f"select pagos->'sep' f from public.student_state where user_id = '{stu}'")[0]["f"]
        check("Caja lo valida y queda como pagado fuera de Nexo", f and f.get("estado") == "externa" and f.get("validatedBy"), str(f))
        await ps.wait_for_timeout(2500)
        check("el estudiante lo ve validado en vivo", await ps.evaluate("statusOf(INVOICES.find(i => i.id === 'sep'))") == "externa", str(await ps.evaluate("pagos.sep")))
        errs = ps.errs + pa.errs
        check("sin errores de JavaScript", not errs, "; ".join(errs[:3]))
        await b.close()
try:
    asyncio.run(main())
finally:
    for uid in created:
        objs = sql(f"select name from storage.objects where bucket_id = 'comprobantes' and name like '{uid}/%'")
        names = [o["name"] for o in objs] if isinstance(objs, list) else []
        if names:
            try: call("DELETE", f"https://{R}.supabase.co/storage/v1/object/comprobantes", {"prefixes": names})
            except Exception as e: print("no se borraron los comprobantes", e)
        sql(f"delete from public.payments where user_id = '{uid}'; delete from public.student_state where user_id = '{uid}'")
        try: admin("DELETE", f"users/{uid}")
        except Exception as e: print("no se borró", uid, e)
    print(f"\n{sum(results)}/{len(results)} comprobaciones")
