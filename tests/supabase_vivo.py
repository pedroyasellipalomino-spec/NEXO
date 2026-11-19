# Prueba real de la etapa 2 contra Supabase: estudiante, comercio y moderadora en vivo (cuentas temporales que se borran al final).
# Uso: servir dist/nexo-app en localhost:8888 y correr con SK=<clave service_role> CHROME_PATH=... python3 tests/supabase_vivo.py
# La clave service_role nunca se guarda en el código: pásala solo como variable de entorno.
import asyncio, os, json, subprocess, urllib.request
from playwright.async_api import async_playwright
R="iwgdisuzfznrmythylvg"; SK=os.environ["SK"]; U="http://localhost:8888/index.html"
def admin(method, path, body=None):
    req=urllib.request.Request(f"https://{R}.supabase.co/auth/v1/admin/{path}", data=json.dumps(body).encode() if body else None, method=method, headers={"apikey":SK,"Authorization":"Bearer "+SK,"content-type":"application/json"})
    with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read() or b"{}")
def sql(q):
    r=subprocess.run(['curl','-sS','-X','POST',f'https://api.supabase.com/v1/projects/{R}/database/query','-H','content-type: application/json','-d',json.dumps({"query":q})],capture_output=True,text=True); return json.loads(r.stdout)
created=[]
def verify(uid): sql(f"select set_config('nexo.role_change','on',false); update public.profiles set carnet_status='ok', carnet_trim=public.current_trim() where id='{uid}'")
def mk(email, name, carnet=None):
    u = admin("POST","users",{"email":email,"password":"Prueba12345","email_confirm":True,"user_metadata":{"full_name":name, **({"carnet":carnet} if carnet else {})}}); created.append(u["id"])
    if carnet: verify(u["id"])  # carnet de este trimestre ya verificado (el flujo de la foto se prueba en supabase_carnet.py)
    return u["id"]
async def login(ctx, email):
    pg=await ctx.new_page(); pg.errs=[]; pg.on("pageerror",lambda e: pg.errs.append(str(e)))
    await pg.goto(U+"#login"); await pg.wait_for_timeout(1000)
    await pg.fill("#l-mail",email); await pg.fill("#l-pass","Prueba12345"); await pg.click("#loginForm button[type=submit]"); await pg.wait_for_timeout(4500)
    return pg
toasts="[...document.querySelectorAll('.toast')].map(t=>t.textContent).join(' | ')"
async def main():
    stu=mk("e2.estudiante@nexo-pruebas.dev","Estudiante Dos","20259990011"); loc=mk("e2.local@nexo-pruebas.dev","Cocina Pincho"); mod=mk("e2.mod@nexo-pruebas.dev","Moderadora Dos")
    sql(f"select set_config('nexo.role_change','on',false); update public.profiles set role='local', local_id='pinchopan' where id='{loc}'; update public.profiles set role='mod' where id='{mod}';")
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ["CHROME_PATH"])
        cs, cl, cm = [await b.new_context(viewport={"width":1280,"height":900}) for _ in range(3)]
        ps=await login(cs,"e2.estudiante@nexo-pruebas.dev"); pl=await login(cl,"e2.local@nexo-pruebas.dev"); pm=await login(cm,"e2.mod@nexo-pruebas.dev")
        print("pantallas:", await ps.evaluate("location.hash"), await pl.evaluate("location.hash"), await pm.evaluate("location.hash"))
        print("comercio sin pedidos de ejemplo:", await pl.evaluate("allOrders().length"), "| moderadora sin tickets de ejemplo:", await pm.evaluate("tickets.length"))
        # 1) estudiante pide y paga con tarjeta
        await ps.evaluate("curLocal='pinchopan'; openItem('pincho'); go('detalle')"); await ps.wait_for_timeout(700)
        await ps.click("#detAdd"); await ps.wait_for_timeout(700); await ps.click("#cartPay"); await ps.wait_for_timeout(3000)
        oid=await ps.evaluate("trackId"); print("pedido creado:", oid, await ps.evaluate("location.hash"))
        print("en la base:", sql(f"select id, local_id, data->>'studentName' as nombre from public.orders where id='{oid}'"))
        await pl.wait_for_timeout(2500)
        print("comercio lo ve en vivo:", await pl.evaluate(f"allOrders().some(x => x.o.id === '{oid}')"), "| aviso:", (await pl.evaluate(toasts))[:120])
        await pl.evaluate("go('local-pedidos')"); await pl.wait_for_timeout(800)
        await pl.locator("[data-lp-ready]").first.click(); await pl.wait_for_timeout(3000)
        print("estudiante ve el estado:", await ps.evaluate(f"orderStatus(orders.find(o => o.id === '{oid}'))"), "| aviso:", (await ps.evaluate(toasts))[:160])
        # 2) ticket
        await ps.evaluate("go('soporte')"); await ps.wait_for_timeout(700); await ps.click("#supNew")
        await ps.fill("#sp-subj","No me llegó el pedido"); await ps.fill("#sp-msg","Pagué con tarjeta y quiero confirmar el retiro, gracias."); await ps.click("#supForm button[type=submit]"); await ps.wait_for_timeout(3000)
        tid=await ps.evaluate("tickets[tickets.length-1].id"); print("ticket:", tid, "| en la base:", sql(f"select id, data->>'status' st from public.tickets where id='{tid}'"))
        await pm.wait_for_timeout(2000)
        print("moderadora lo ve en vivo:", await pm.evaluate(f"tickets.some(t => t.id === '{tid}')"), "| aviso:", (await pm.evaluate(toasts))[:140])
        await pm.evaluate(f"mdSel='{tid}'; mdTab='all'; go('moderacion'); renderModeracion()"); await pm.wait_for_timeout(800)
        print("form de respuesta visible:", await pm.locator("#mdReply").count(), "| ticket en memoria mod:", await pm.evaluate(f"JSON.stringify(tkById('{tid}')).slice(0,200)"))
        await pm.fill("#mdText","Hola, ya lo verifiqué: tu pedido está listo en Pincho Pan.")
        print("antes de enviar → texto:", await pm.evaluate("document.getElementById('mdText').value.length"), "| mdSel:", await pm.evaluate("mdSel"), "| mdMode:", await pm.evaluate("mdMode"), "| botones submit:", await pm.locator("#mdReply button[type=submit]").count(), "| visible:", await pm.locator("#mdReply button[type=submit]").first.is_visible())
        await pm.evaluate("window.__sub=0; document.addEventListener('submit', e => { window.__sub = e.target.id }, true)")
        await pm.click("#mdReply button[type=submit]"); await pm.wait_for_timeout(3000)
        print("submit capturado:", await pm.evaluate("window.__sub"), "| texto tras click:", await pm.evaluate("(document.getElementById('mdText')||{}).value"))
        print("mensajes en la base tras responder:", sql(f"select jsonb_array_length(data->'messages') n, data->>'mod' as mod, data->>'status' st from public.tickets where id='{tid}'"), "| avisos mod:", (await pm.evaluate(toasts))[:200], "| errores consola:", pm.errs)
        await ps.wait_for_timeout(1500)
        print("estudiante ve la respuesta:", await ps.evaluate(f"(tickets.find(t => t.id === '{tid}').messages.slice(-1)[0] || {{}}).from"), "| inicio:", (await ps.evaluate("homeItems().map(x => x.title).join(' · ')"))[:200])
        # 3) seguridad: el comercio no ve tickets; otro estudiante no ve pedidos ajenos
        print("comercio ve tickets:", await pl.evaluate("sb.from('tickets').select('id').then(r => (r.data||[]).length)"), "| estudiante ve pedidos de otros:", await ps.evaluate("sb.from('orders').select('user_id').then(r => (r.data||[]).filter(x => x.user_id !== account.sb).length)"))
        print("errores JS:", ps.errs, pl.errs, pm.errs)
        await b.close()
try: asyncio.run(main())
finally:
    for uid in created:
        try: admin("DELETE", f"users/{uid}")
        except Exception as e: print("no se borró", uid, e)
    print("limpieza:", sql("select (select count(*) from public.profiles where email like '%@nexo-pruebas.dev') perfiles, (select count(*) from public.orders) pedidos, (select count(*) from public.tickets) tickets"))
