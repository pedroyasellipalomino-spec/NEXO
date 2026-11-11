"""Prueba de humo del prototipo Nexo.

Uso:  python tests/smoke.py
Requiere: pip install playwright && playwright install chromium
"""
import asyncio
import pathlib
import sys

from playwright.async_api import async_playwright

URL = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri()


async def main() -> int:
    fails = []

    def check(cond, msg):
        print(("OK   " if cond else "FAIL ") + msg)
        if not cond:
            fails.append(msg)

    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=__import__("os").environ.get("CHROME_PATH") or None)
        pg = await b.new_page(viewport={"width": 1280, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))

        # cuenta nueva
        await pg.goto(URL + "#registro")
        await pg.evaluate("localStorage.clear(); sessionStorage.clear()")
        await pg.reload()
        await pg.fill("#r-name", "Prueba Nexo")
        await pg.fill("#r-carnet", "20231234567")
        await pg.dispatch_event("#r-carnet", "input")
        await pg.fill("#r-mail", "prueba@correo.unimet.edu.ve")
        await pg.fill("#r-pass", "clave12345")
        await pg.click("#registerForm button[type=submit]")
        await pg.wait_for_timeout(800)
        check(await pg.evaluate("location.hash") == "#inicio", "registro lleva a inicio")

        # una cuenta nueva sin materias es enviada al formulario previo
        await pg.goto(URL + "#materias")
        await pg.wait_for_timeout(300)
        check(await pg.evaluate("location.hash") == "#inscripcion", "sin materias -> formulario de inscripción")

        await pg.select_option("#insCareer", "Derecho")
        await pg.click("[data-mcount='2']")
        rows = pg.locator("#insRows input")
        await rows.nth(0).fill("derecho constitucional")
        await rows.nth(1).fill("BPTEJ05")
        await pg.click("#insForm button[type=submit]")
        await pg.wait_for_timeout(300)
        lista = await pg.inner_text("#matList")
        check("BPTEJ11" in lista and "Obligaciones" in lista, "nombre y código se resuelven contra MATDB")

        # cuenta demo
        await pg.evaluate("localStorage.removeItem('nexo-session'); sessionStorage.removeItem('nexo-session')")
        await pg.goto(URL + "#login")
        await pg.reload()
        await pg.fill("#l-mail", "ana.torres@correo.unimet.edu.ve")
        await pg.fill("#l-pass", "demo-nexo-01")
        await pg.click("#loginForm button[type=submit]")
        await pg.wait_for_timeout(800)
        await pg.goto(URL + "#materias")
        await pg.wait_for_timeout(300)
        check("BPTMI02" in await pg.inner_text("#matList"), "la cuenta demo conserva sus materias")

        check(not errs, f"sin errores de JavaScript {errs if errs else ''}")
        await b.close()

    print(f"\n{'Todo bien' if not fails else str(len(fails)) + ' fallo(s)'}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
