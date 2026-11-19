# Prueba real de la etapa 4 contra Supabase: reservas de canchas sin choques y plan/vehículo por cuenta.
# Cuentas temporales (@nexo-pruebas.dev) que se borran al final.
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> python3 tests/supabase_canchas.py
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
async def main():
    a = mk("e4.ana@nexo-pruebas.dev", "Estudiante Cuatro", "20259990041"); bb = mk("e4.beto@nexo-pruebas.dev", "Estudiante Cinco", "20259990042")
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium"))
        c1, c2, c3 = [await b.new_context(viewport={"width": 1280, "height": 900}) for _ in range(3)]
        pa = await login(c1, "e4.ana@nexo-pruebas.dev"); pb = await login(c2, "e4.beto@nexo-pruebas.dev")
        days = await pa.evaluate("[...document.querySelectorAll('#dayPicker .day')].map(d => d.dataset.iso)")
        check("con cuenta real el selector muestra hoy y los 6 días siguientes", len(days) == 7 and days[0] == await pa.evaluate("isoDay(new Date())"), str(days))
        check("sin horarios ocupados de ejemplo", await pa.evaluate("sbCourtBusyFor('futbol', res.iso).every(t => parseInt(t) <= new Date().getHours())"))
        # los dos eligen la misma cancha, el mismo día (mañana) y la misma hora
        for pg in (pa, pb):
            await pg.evaluate("go('reserva')"); await pg.wait_for_timeout(500)
            await pg.click("#sportPicker [data-sport='futbol']"); await pg.click(f"#dayPicker [data-iso='{days[1]}']"); await pg.click("#slotPicker [data-slot='18:00']")
            await pg.evaluate("go('revision')"); await pg.wait_for_timeout(500)
        await pa.click("[data-court-pay]"); await pa.wait_for_timeout(3000)
        check("el primero reserva y ve su comprobante", await pa.evaluate("location.hash") == "#qr" and await pa.evaluate("moves.some(m => m.icon === 'dribbble')"))
        rows = sql(f"select sport, day::text, slot, price from public.court_bookings where user_id='{a}'")
        check("la reserva queda en el servidor", len(rows) == 1 and rows[0]["slot"] == "18:00" and rows[0]["day"] == days[1], str(rows))
        await pb.wait_for_timeout(1500)
        check("en vivo: al segundo se le marca la hora como ocupada", await pb.evaluate(f"sbCourtBusyFor('futbol', '{days[1]}').includes('18:00')"))
        # aunque intente pagar igual (pantalla vieja), el servidor no deja reservar la misma hora
        r = await pb.evaluate(f"sb.rpc('book_court', {{ p_sport: 'futbol', p_day: '{days[1]}', p_slot: '18:00', p_price: 21 }}).then(r => r.error && r.error.message)")
        check("el servidor rechaza la misma cancha y hora", "ya está reservado" in (r or ""), str(r))
        ok2 = await pb.evaluate(f"sb.rpc('book_court', {{ p_sport: 'futbol', p_day: '{days[1]}', p_slot: '19:00', p_price: 21 }}).then(r => !r.error)")
        check("otra hora de la misma cancha sí se puede", ok2)
        lim = await pb.evaluate(f"sb.rpc('book_court', {{ p_sport: 'tenis', p_day: '{days[1]}', p_slot: '20:00', p_price: 12.6 }}).then(() => sb.rpc('book_court', {{ p_sport: 'padel', p_day: '{days[1]}', p_slot: '21:00', p_price: 12.6 }})).then(r => r.error && r.error.message)")
        check("máximo 2 reservas por persona y día", "Máximo 2" in (lim or ""), str(lim))
        past = await pb.evaluate("sb.rpc('book_court', { p_sport: 'tenis', p_day: '2026-01-01', p_slot: '18:00', p_price: 12.6 }).then(r => r.error && r.error.message)")
        check("no se reserva un día que ya pasó", "pasó" in (past or ""), str(past))
        direct = await pb.evaluate(f"sb.from('court_bookings').insert({{ sport: 'tenis', day: '{days[2]}', slot: '18:00', price: 1 }}).then(r => !!r.error)")
        check("nadie inserta reservas directo (sin pasar por las reglas)", direct)
        cn = await pb.evaluate(f"sb.from('court_bookings').select('id').eq('user_id', '{a}').then(r => sb.rpc('cancel_court', {{ p_id: r.data[0].id }})).then(r => r.error && r.error.message)")
        check("nadie cancela la reserva de otro", "No se encontró" in (cn or ""), str(cn))
        # estacionamiento: vehículo y plan
        await pa.evaluate("""() => { vehicle = { brand: 'Toyota', model: 'Corolla', year: '2018', plate: 'AB123CD' }; saveVehicle();
          plan = { key: 'semanal', name: 'Semanal', price: 9, days: 7, start: isoDay(new Date()), end: isoDay(new Date(Date.now() + 6 * 864e5)), paidOn: isoDay(new Date()) }; savePlan(); }""")
        await pa.wait_for_timeout(3000)
        st = sql(f"select plan->>'key' k, vehicle->>'plate' pl from public.student_state where user_id='{a}'")
        check("el plan y el vehículo quedan en el servidor", st and st[0]["k"] == "semanal" and st[0]["pl"] == "AB123CD", str(st))
        pa2 = await login(c3, "e4.ana@nexo-pruebas.dev"); await pa2.wait_for_timeout(2000)
        check("en otro dispositivo aparecen el plan y el vehículo", await pa2.evaluate("!!plan && plan.key === 'semanal' && !!vehicle && vehicle.plate === 'AB123CD'"))
        check("y también la reserva en su Actividad", await pa2.evaluate("moves.some(m => m.icon === 'dribbble')"))
        await pa2.evaluate("vehicle = null; saveVehicle();"); await pa2.wait_for_timeout(3000)
        check("borrar el vehículo también se guarda", sql(f"select vehicle is null n from public.student_state where user_id='{a}'")[0]["n"] is True)
        # Mis reservas: cancelar sin cargo hasta 2 horas antes
        await pa.evaluate("go('reserva')"); await pa.wait_for_timeout(1500)
        check("Mis reservas muestra la reserva real", await pa.evaluate(f"myCourts.some(c => c.iso === '{days[1]}' && c.slot === '18:00')") and "Cancha de fútbol" in await pa.inner_text("#myCourts"))
        await pa.click("[data-court-cancel]"); await pa.wait_for_timeout(300); await pa.click("[data-cdlg-ok]"); await pa.wait_for_timeout(3000)
        row = sql(f"select cancelled_at is not null c from public.court_bookings where user_id='{a}' and day='{days[1]}'")
        pay = sql(f"select status from public.payments where user_id='{a}' and service='canchas'")
        check("cancelar libera la hora y el pago queda reembolsado", bool(row) and row[0]["c"] is True and [x["status"] for x in pay] == ["Reembolsado"], str(row) + str(pay))
        check("el reembolso aparece en la Actividad", await pa.evaluate("moves.some(m => m.title.startsWith('Reserva cancelada') && m.pill === 'Reembolsado')"))
        await pb.wait_for_timeout(1000)
        check("en vivo: la hora cancelada queda libre para otros", not await pb.evaluate(f"sbCourtBusyFor('futbol', '{days[1]}').includes('18:00')"))
        # a menos de 2 horas no se puede cancelar (el servidor lo impide aunque la pantalla esté vieja)
        cq = sql("select extract(hour from now() at time zone 'America/Caracas')::int h, (now() at time zone 'America/Caracas')::date::text d")[0]
        h, hoy = int(cq["h"]), cq["d"]  # la fecha de Caracas (el navegador de la prueba puede ir en UTC)
        if 16 <= h + 1 <= 21:
            slot = f"{h+1}:00"
            bk = await pb.evaluate(f"sb.rpc('book_court', {{ p_sport: 'voleibol', p_day: '{hoy}', p_slot: '{slot}', p_price: 12 }}).then(r => r.error ? r.error.message : 'ok')")
            print("   reserva a menos de 2 horas:", bk, slot)
            bid = sql(f"select id from public.court_bookings where user_id='{bb}' and sport='voleibol' and day='{hoy}' and slot='{slot}' and cancelled_at is null")[0]["id"]
            late = await pb.evaluate(f"sb.rpc('cancel_court', {{ p_id: '{bid}' }}).then(r => r.error && r.error.message)")
            check("a menos de 2 horas del turno no se puede cancelar", "2 horas" in (late or ""), str(late))
        else:
            print("(se omite la prueba de menos de 2 horas: fuera del horario de canchas)")
        stolen = await pa.evaluate(f"sb.from('court_bookings').select('id').eq('user_id', '{bb}').is('cancelled_at', null).limit(1).then(r => sb.rpc('cancel_court', {{ p_id: r.data[0].id }})).then(r => r.error && r.error.message)")
        check("nadie cancela la reserva de otro (con la regla nueva)", "No se encontró" in (stolen or ""), str(stolen))
        own = await pa.evaluate("sb.rpc('owner_extra').then(r => r.error && r.error.message)")
        check("un estudiante no ve el resumen del dueño", "Solo el dueño" in (own or ""), str(own))
        errs = pa.errs + pb.errs + pa2.errs
        check("sin errores de JavaScript", not errs, "; ".join(errs[:3]))
        await b.close()
try:
    asyncio.run(main())
finally:
    for uid in created:
        try: admin("DELETE", f"users/{uid}")
        except Exception as e: print("aviso: no se borró", uid, e)
    left = sql("select (select count(*) from public.profiles where email like '%@nexo-pruebas.dev') p, (select count(*) from public.court_bookings c where not exists (select 1 from public.profiles where id = c.user_id)) c")[0]
    print(f"\n{sum(results)}/{len(results)} OK · cuentas de prueba que quedan: {left['p']} · reservas huérfanas: {left['c']}")
