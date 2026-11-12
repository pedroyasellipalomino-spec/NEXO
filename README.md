# Nexo · prototipo

Prototipo clicable de Nexo, la app de servicios del campus de la Universidad Metropolitana (comida, estacionamiento, canchas, estado de cuenta, soporte y más).

**Abrirlo:** doble clic en `index.html`, o `npm run dev` y entrar a http://localhost:3000

**Cuenta de prueba:** ana.torres@correo.unimet.edu.ve · demo-nexo-01

**Seguir desarrollándolo con Claude Code:** abre una terminal en esta carpeta y ejecuta `claude`. El archivo `CLAUDE.md` le explica a Claude cómo está armado el proyecto.

**Probar:** `npm test` (requiere `pip install playwright` y `playwright install chromium`).

## Instalarla como app (PWA)

Nexo se puede instalar en el teléfono o la computadora: queda con su ícono, abre a pantalla completa y funciona sin conexión.
Para eso tiene que estar publicada en una dirección con **https** (abriendo el archivo suelto no se puede instalar).

1. Arma la carpeta para publicar: `npm run build:app` (o `python3 scripts/build_pwa.py`). Genera `dist/nexo-app/` y `dist/nexo-app.zip`.
2. Publícala gratis, por ejemplo:
   - **Netlify Drop:** entra a https://app.netlify.com/drop y arrastra la carpeta `dist/nexo-app`. Te da una dirección `https://…netlify.app`.
   - **GitHub Pages:** sube el contenido de `dist/nexo-app` a un repositorio y actívalo en Settings → Pages.
3. Abre esa dirección en el teléfono:
   - **Android (Chrome):** aparece "Instalar Nexo" en la app, o en el menú ⋮ → Instalar app.
   - **iPhone/iPad (Safari):** Compartir → Añadir a pantalla de inicio.
   - **Computadora (Chrome/Edge):** el ícono de instalar en la barra de direcciones.

Cada vez que vuelvas a armar y publicar, los teléfonos reciben el aviso "Hay una versión nueva" con el botón Actualizar.
