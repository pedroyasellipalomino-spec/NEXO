# Prueba real: verificación de carnet por foto (carnets de menos de 11 dígitos).
# Cuentas temporales (@nexo-pruebas.dev) que se borran al final, con sus fotos.
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> python3 tests/supabase_carnet.py
# La clave service_role nunca se guarda en el código: pásala solo como variable de entorno.
import asyncio, os, json, subprocess, urllib.request, base64
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
PNG = None
async def main():
    global PNG
    adm = mk("e9.admin@nexo-pruebas.dev", "Admin Nueve")
    stu = mk("e9.corto@nexo-pruebas.dev", "Estudiante Corto", "9810234")
    lng = mk("e9.largo@nexo-pruebas.dev", "Estudiante Largo", "20259990091")
    sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='admin' where id='{adm}';")
    st = {r["id"]: r["carnet_status"] for r in sql(f"select id, carnet_status from public.profiles where id in ('{stu}','{lng}')")}
    check("carnet de 7 dígitos pide foto y uno de 11 entra directo", st.get(stu) == "foto" and st.get(lng) == "ok", str(st))
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium"))
        cs, ca, cl = [await b.new_context(viewport={"width": 1280, "height": 900}) for _ in range(3)]
        ps = await login(cs, "e9.corto@nexo-pruebas.dev")
        check("el estudiante con carnet corto entra a la verificación", await ps.evaluate("current") == "carnet", await ps.evaluate("current"))
        await ps.evaluate("go('comida')"); await ps.wait_for_timeout(400)
        check("sin verificar no entra a Comida", await ps.evaluate("current") == "carnet")
        pl = await login(cl, "e9.largo@nexo-pruebas.dev")
        check("el carnet de 11 dígitos entra al inicio", await pl.evaluate("current") == "inicio", await pl.evaluate("current"))
        # seguridad antes de enviar
        r1 = await ps.evaluate("sb.from('profiles').update({ carnet_status: 'ok' }).eq('id', account.sb).then(r => r.error && r.error.message)")
        check("el estudiante no puede marcarse verificado", "No puedes cambiar" in (r1 or ""), str(r1))
        r2 = await ps.evaluate(f"sb.rpc('submit_carnet', {{ p_path: '{lng}/x.jpg' }}).then(r => r.error && r.error.message)")
        check("no puede enviar una foto de otra carpeta", "no válida" in (r2 or ""), str(r2))
        r3 = await ps.evaluate(f"sb.storage.from('carnets').upload('{lng}/intruso.jpg', new Blob(['x'], {{ type: 'image/jpeg' }})).then(r => r.error && r.error.message)")
        check("no puede subir a la carpeta de otra persona", bool(r3), str(r3))
        # el estudiante envía la foto desde la app
        PNG = await ps.evaluate("(() => { const c = document.createElement('canvas'); c.width = 600; c.height = 380; const g = c.getContext('2d'); g.fillStyle = '#1F7A55'; g.fillRect(0, 0, 600, 380); g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.fillText('9810234', 30, 200); return c.toDataURL('image/png').split(',')[1]; })()")
        await ps.set_input_files("#caFile", files=[{"name": "carnet.png", "mimeType": "image/png", "buffer": base64.b64decode(PNG)}])
        await ps.wait_for_timeout(800); await ps.click("[data-ca-send]"); await ps.wait_for_timeout(3000)
        row = sql(f"select carnet_status, carnet_photo from public.profiles where id = '{stu}'")[0]
        check("la foto se sube y queda en revisión en el servidor", row["carnet_status"] == "pendiente" and (row["carnet_photo"] or "").startswith(stu + "/"), str(row))
        r4 = await ps.evaluate(f"sb.rpc('decide_carnet', {{ target: '{stu}', approve: true }}).then(r => r.error && r.error.message)")
        check("el estudiante no puede aprobarse a sí mismo", "Sin permiso" in (r4 or ""), str(r4))
        r5 = await pl.evaluate(f"sb.storage.from('carnets').createSignedUrl('{row['carnet_photo']}', 60).then(r => r.error ? 'bloqueado' : 'visible')")
        check("otro estudiante no puede ver la foto", r5 == "bloqueado", str(r5))
        # la administradora la ve en vivo y la rechaza
        pa = await login(ca, "e9.admin@nexo-pruebas.dev")
        await pa.evaluate("go('carnets')"); await pa.wait_for_timeout(3000)
        txt = await pa.inner_text("#caList")
        check("la administración ve el carnet por verificar con su foto", "Estudiante Corto" in txt and await pa.locator("#caList .ca-photo img").count() >= 1, txt[:150])
        await pa.click(f"[data-ca-rej='{stu}']"); await pa.select_option("#ca-motivo", "El número no coincide con el de la cuenta")
        await pa.click("[data-ca-reject-form] button[type=submit]"); await pa.wait_for_timeout(3000)
        row = sql(f"select carnet_status, carnet_reason, carnet_by from public.profiles where id = '{stu}'")[0]
        check("rechazar guarda el motivo y quién lo revisó", row["carnet_status"] == "rechazado" and "no coincide" in row["carnet_reason"] and row["carnet_by"] == "Admin Nueve", str(row))
        await ps.wait_for_timeout(2000)
        check("el estudiante ve el rechazo en vivo con el motivo", "no coincide" in await ps.inner_text("#caBody"), (await ps.inner_text("#caBody"))[:200])
        r6 = await pa.evaluate(f"sb.rpc('decide_carnet', {{ target: '{stu}', approve: true }}).then(r => r.error && r.error.message)")
        check("no se puede decidir dos veces (Ya revisado)", "Ya revisado" in (r6 or ""), str(r6))
        # reenvía y la administradora lo aprueba
        await ps.set_input_files("#caCam", files=[{"name": "carnet2.png", "mimeType": "image/png", "buffer": base64.b64decode(PNG)}])
        await ps.wait_for_timeout(800); await ps.click("[data-ca-send]"); await ps.wait_for_timeout(3500)
        check("la administración recibe la foto nueva en vivo", await pa.locator(f"[data-ca-ok='{stu}']").count() == 1)
        await pa.click(f"[data-ca-ok='{stu}']"); await pa.wait_for_timeout(300); await pa.click("[data-cdlg-ok]"); await pa.wait_for_timeout(3000)
        check("aprobar deja el carnet verificado", sql(f"select carnet_status from public.profiles where id = '{stu}'")[0]["carnet_status"] == "ok")
        await ps.wait_for_timeout(2000)
        await ps.evaluate("go('comida')"); await ps.wait_for_timeout(500)
        check("el estudiante recibe el acceso en vivo y entra a Comida", await ps.evaluate("current") == "comida", await ps.evaluate("current"))
        errs = ps.errs + pa.errs + pl.errs
        check("sin errores de JavaScript", not errs, "; ".join(errs[:3]))
        await b.close()
try:
    asyncio.run(main())
finally:
    for uid in created:
        try:
            names = [f"{uid}/{o['name']}" for o in call("POST", f"https://{R}.supabase.co/storage/v1/object/list/carnets", {"prefix": uid, "limit": 100})]
            if names: call("DELETE", f"https://{R}.supabase.co/storage/v1/object/carnets", {"prefixes": names})
        except Exception as e: print("aviso: no se borraron las fotos", uid, e)
        try: admin("DELETE", f"users/{uid}")
        except Exception as e: print("aviso: no se borró", uid, e)
    left = sql("select (select count(*) from public.profiles where email like '%@nexo-pruebas.dev') p, (select count(*) from storage.objects where bucket_id = 'carnets') f")[0]
    print(f"\n{sum(results)}/{len(results)} OK · cuentas de prueba que quedan: {left['p']} · fotos de carnet guardadas: {left['f']}")
