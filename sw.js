/* Service worker de Nexo: guarda la app para que abra sin conexión.
   Archivos propios: primero la red (para ver siempre la última versión) y, si no hay conexión, la copia guardada.
   Fuentes de Google: primero la copia guardada. Al publicar cambios importantes, sube VERSION. */
const VERSION = "nexo-v1";
const SHELL = [
  "./", "./index.html", "./css/styles.css", "./js/data.js", "./js/app.js", "./vendor/lucide.min.js", "./vendor/supabase.js",
  "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png", "./icons/icon-32.png", "./icons/icon.svg"
];
self.addEventListener("install", e => {
  // cache: "reload" salta la caché del navegador (GitHub Pages la guarda 10 min) para instalar la versión recién publicada
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Fuentes: cache primero
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return; // Supabase y otros servicios: siempre por la red, nunca de la copia
  // Navegación y archivos propios: red primero, copia guardada si no hay conexión
  e.respondWith(
    // cache: "no-cache" pregunta siempre al servidor si hay versión nueva (sin esto el navegador reusa su copia hasta 10 min)
    fetch(req, { cache: "no-cache" }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("./index.html") : undefined)))
  );
});
