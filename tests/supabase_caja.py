# Prueba real de la etapa 3 contra Supabase: wallet, factura con comprobante, recarga por Pago Móvil y Caja en vivo.
# Cuentas temporales (@nexo-pruebas.dev) que se borran al final, con sus comprobantes.
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> python3 tests/supabase_caja.py
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
    stu = mk("e3.estudiante@nexo-pruebas.dev", "Estudiante Tres", "20259990033"); adm = mk("e3.caja@nexo-pruebas.dev", "Caja Tres"); otro = mk("e3.otro@nexo-pruebas.dev", "Otro Tres", "20259990034")
    sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='admin' where id='{adm}';")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium"))
        cs, ca, co = [await b.new_context(viewport={"width": 1280, "height": 900}) for _ in range(3)]
        ps = await login(cs, "e3.estudiante@nexo-pruebas.dev")
        await ps.wait_for_timeout(2000)
        check("el estudiante arranca con wallet 0 en el servidor", await ps.evaluate("WALLET") == 0)
        # 1) materias, recarga con tarjeta, factura por transferencia con comprobante y recarga por Pago Móvil
        await ps.evaluate("""() => {
          MATERIAS = [{ n: "Física II", c: "BPTFI02" }]; saveMaterias();
          WALLET = Math.round((WALLET + 10) * 100) / 100; saveWallet();
          addMovement("Recarga de wallet", "Estacionamiento · Visa ····4242", "+$10,00", "Pagado", "ok", { icon: "wallet" });
          const f = new File(["%PDF-1.4 prueba de comprobante"], "transferencia.pdf", { type: "application/pdf" });
          const path = sbUploadReceipt(f, "factura");
          pagos.nov = { estado: "revision", monto: 160, pp: false, ref: "0012345678", bank: "Banesco · 0134", currency: "usd", paidAmount: 160, receipt: "transferencia.pdf", receiptPath: path, studentName: user.full, date: "2026-11-12", sentAt: Date.now() }; savePagos();
          addMovement("Factura de noviembre", "Universidad · Transferencia · Ref. 345678", "$160,00", "En revisión", "neutral");
          pendRec.push({ id: "r" + Date.now(), amount: 20, ref: "0098765432", bank: "Mercantil · 0105", date: "2026-11-12", bs: 18032.4, estado: "revision", sentAt: Date.now() }); savePend();
          addMovement("Recarga de wallet", "Pago Móvil · Ref. 765432", "+$20,00", "En revisión", "neutral", { icon: "smartphone" });
        }""")
        await ps.wait_for_timeout(4000)
        row = sql(f"select wallet, pagos->'nov'->>'estado' f, jsonb_array_length(pendrec) r, jsonb_array_length(moves) m, materias->'list'->0->>'c' mat, pagos->'nov'->>'receiptPath' rp from public.student_state where user_id='{stu}'")[0]
        check("el servidor guarda wallet, factura, recarga, movimientos y materias", float(row["wallet"]) == 10 and row["f"] == "revision" and row["r"] == 1 and row["m"] == 3 and row["mat"] == "BPTFI02", str(row))
        obj = sql(f"select count(*) n from storage.objects where bucket_id='comprobantes' and name = '{row['rp']}'")[0]["n"]
        check("el comprobante quedó en Storage, en la carpeta del estudiante", obj == 1 and row["rp"].startswith(stu + "/"), str(row["rp"]))
        pay = sql(f"select service, status from public.payments where user_id='{stu}' order by created_at")
        check("los pagos del dueño quedan anotados (recarga, factura en revisión, recarga en revisión)", sorted((x["service"], x["status"]) for x in pay) == [("materias", "En revisión"), ("recarga", "En revisión"), ("recarga", "Pagado")], str(pay))
        # 2) Caja
        pa = await login(ca, "e3.caja@nexo-pruebas.dev")
        await pa.evaluate("go('validar')"); await pa.wait_for_timeout(1500)
        mine = await pa.evaluate("cajaItems().filter(x => x.key === 'sb:" + stu + "' && !x.done).map(x => x.kind).sort().join(',')")
        check("Caja ve la factura y la recarga del estudiante (y ningún pago de ejemplo)", mine == "factura,recarga" and await pa.evaluate("cajaItems().every(x => x.key.startsWith('sb:'))"), mine)
        url = await pa.evaluate("sb.storage.from('comprobantes').createSignedUrl(cajaItems().find(x => x.kind === 'factura' && x.key === 'sb:" + stu + "').p.receiptPath, 60).then(r => r.data && r.data.signedUrl)")
        check("Caja abre el comprobante con un enlace temporal", bool(url and "token=" in url))
        # el estudiante mira su Actividad mientras Caja decide
        await ps.evaluate("go('actividad')")
        await pa.evaluate("""() => { const it = cajaItems().filter(x => x.key === 'sb:%s' && !x.done);
          vlDecide(it.find(x => x.kind === 'recarga').key + '|' + it.find(x => x.kind === 'recarga').id, true);
          vlDecide(it.find(x => x.kind === 'factura').key + '|' + it.find(x => x.kind === 'factura').id, false, 'El monto no coincide con el comprobante'); }""" % stu)
        await pa.wait_for_timeout(5000)
        st = await ps.evaluate("({ w: WALLET, f: pagos.nov.estado, mot: pagos.nov.motivo, pills: moves.map(m => m.pill).join('|'), dom: [...document.querySelectorAll('#actividad .move .pill')].map(p => p.textContent).join('|'), notif: buildNotifs().filter(n => /rechaz|acredit|aprob/i.test(n.title + n.body)).length })")
        check("en vivo: el estudiante recibe el saldo de la recarga aprobada ($30)", st["w"] == 30, str(st))
        check("en vivo: la factura queda rechazada con el motivo", st["f"] == "rechazada" and "monto" in (st["mot"] or ""), str(st))
        check("en vivo: los movimientos cambian a Acreditada y Rechazado", st["pills"] == "Pagado|Rechazado|Acreditada" and "Acreditada" in st["dom"] and "Rechazado" in st["dom"], str(st))
        check("el estudiante tiene avisos de las decisiones", st["notif"] >= 1, str(st))
        pay = sql(f"select status from public.payments where user_id='{stu}' order by created_at")
        check("los pagos del dueño pasan a su estado final", sorted(x["status"] for x in pay) == ["Acreditada", "Pagado", "Rechazado"], str(pay))
        dbl = await pa.evaluate(f"sb.rpc('caja_decide', {{ target: '{stu}', kind: 'factura', item_id: 'nov', ok: true, motivo: null, fecha: 'x', match: 'Factura de noviembre' }}).then(r => r.error && r.error.message)")
        check("no se puede decidir dos veces el mismo pago", "Ya revisado" in (dbl or ""), str(dbl))
        # 3) un guardado viejo del estudiante no deshace lo que decidió Caja
        stale = await ps.evaluate("""() => { const pg = JSON.parse(JSON.stringify(pagos)); pg.nov.estado = 'revision'; delete pg.nov.rejectedAt; const mv = moves.map(m => ({ ...m, pill: m.pill === 'Rechazado' ? 'En revisión' : m.pill }));
           return sb.rpc('save_my_state', { p_pagos: pg, p_pendrec: pendRec.map(r => ({ ...r, estado: 'revision' })), p_moves: mv }).then(r => r.data && [r.data.pagos.nov.estado, r.data.pendrec[0].estado, r.data.moves[1].pill].join(',')); }""")
        check("un guardado atrasado no pisa las decisiones de Caja", stale == "rechazada,aprobada,Rechazado", str(stale))
        # 4) reembolso del personal llega a la Actividad del estudiante
        await pa.evaluate("pushStudentMove('e3.estudiante@nexo-pruebas.dev', { title: 'Reembolso · TK-PRUEBA', detail: 'Pincho Pan', amount: '+$5,00', pill: 'Reembolsado', pillCls: 'ok', date: '13 nov 2026', icon: 'rotate-ccw' })")
        await ps.wait_for_timeout(4000)
        check("el reembolso llega en vivo a la Actividad del estudiante", await ps.evaluate("moves.some(m => m.title === 'Reembolso · TK-PRUEBA' && m.ext)"))
        # 5) seguridad
        sec = await ps.evaluate(f"""async () => ({{
          caja: (await sb.rpc('caja_decide', {{ target: '{stu}', kind: 'recarga', item_id: 'x', ok: true, motivo: null, fecha: 'x', match: 'x' }})).error?.message,
          grande: (await sb.rpc('wallet_add', {{ delta: 500 }})).error?.message,
          negativo: (await sb.rpc('wallet_add', {{ delta: -99 }})).error?.message,
          directo: (await sb.from('student_state').update({{ wallet: 9999 }}).eq('user_id', '{stu}').select()).data?.length || 0,
          otro: (await sb.from('student_state').select('user_id').neq('user_id', '{stu}')).data?.length || 0,
          push: (await sb.rpc('push_move', {{ target: '{otro}', p_move: {{ id: 'x', title: 'falso' }} }})).error?.message }})""")
        check("el estudiante no puede usar Caja", "Solo Caja" in (sec["caja"] or ""), str(sec))
        check("el wallet no acepta montos fuera de rango ni quedar negativo", "rango" in (sec["grande"] or "") and "insuficiente" in (sec["negativo"] or ""), str(sec))
        check("nadie escribe la tabla directo, ni ve el estado de otros", sec["directo"] == 0 and sec["otro"] == 0, str(sec))
        check("un estudiante no puede anotar movimientos a otro", "permiso" in (sec["push"] or ""), str(sec))
        po = await login(co, "e3.otro@nexo-pruebas.dev")
        leak = await po.evaluate(f"sb.storage.from('comprobantes').createSignedUrl('{row['rp']}', 60).then(r => !!(r.data && r.data.signedUrl))")
        check("otro estudiante no puede ver el comprobante ajeno", leak is False, str(leak))
        w = sql(f"select wallet from public.student_state where user_id='{stu}'")[0]["wallet"]
        check("el saldo del servidor sigue en $30", float(w) == 30, str(w))
        errs = ps.errs + pa.errs + po.errs
        check("sin errores de JavaScript", not errs, "; ".join(errs[:3]))
        await b.close()
try:
    asyncio.run(main())
finally:
    for uid in created:
        try:
            names = [x["name"] for x in sql(f"select name from storage.objects where bucket_id='comprobantes' and name like '{uid}/%'")]
            if names: call("DELETE", f"https://{R}.supabase.co/storage/v1/object/comprobantes", {"prefixes": names})
        except Exception as e: print("aviso: comprobantes", e)
        try: admin("DELETE", f"users/{uid}")
        except Exception as e: print("aviso: no se borró", uid, e)
    left = sql("select count(*) n from public.profiles where email like '%@nexo-pruebas.dev'")[0]["n"]
    print(f"\n{sum(results)}/{len(results)} OK · cuentas de prueba que quedan: {left}")
