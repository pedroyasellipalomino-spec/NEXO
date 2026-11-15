#!/usr/bin/env python3
"""Publica la app instalable (dist/nexo-app) en GitHub Pages: la sube a la rama gh-pages del repositorio.

Uso: python3 scripts/deploy_pages.py
La dirección queda en https://pedroyasellipalomino-spec.github.io/NEXO/ (Pages debe estar activado en
Settings → Pages → Source: "Deploy from a branch", rama gh-pages, carpeta / (root)).
La rama gh-pages solo guarda la app construida; el código fuente sigue en main.
"""
import os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = "https://pedroyasellipalomino-spec.github.io/NEXO/"


def run(*args, cwd=ROOT):
    return subprocess.run(args, cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "build_pwa.py")], cwd=ROOT, check=True)
app = os.path.join(ROOT, "dist", "nexo-app")
src = run("git", "rev-parse", "--short", "HEAD")
remote = run("git", "remote", "get-url", "origin")

with tempfile.TemporaryDirectory() as tmp:
    out = os.path.join(tmp, "site")
    shutil.copytree(app, out)
    open(os.path.join(out, ".nojekyll"), "w").close()  # sin Jekyll: se sirven los archivos tal cual
    run("git", "init", "-q", "-b", "gh-pages", cwd=out)
    run("git", "add", "-A", cwd=out)
    run("git", "-c", "user.name=Nexo", "-c", "user.email=noreply@anthropic.com", "commit", "-q",
        "-m", f"Publicar la app (código {src})", cwd=out)
    # la rama solo tiene la versión publicada: se reemplaza en cada publicación
    for intento in range(4):
        r = subprocess.run(["git", "push", "-f", remote, "gh-pages"], cwd=out, capture_output=True, text=True)
        if r.returncode == 0:
            break
        print("Reintentando la subida…", r.stderr.strip()[-200:])
    else:
        sys.exit("No se pudo subir la rama gh-pages.")

print(f"Publicado en GitHub Pages (rama gh-pages, código {src}): {URL}")
