/* ---------- Almacenamiento de respaldo ----------
   Algunos visores (vistas previas de archivos, iframes aislados, modo privado) bloquean
   localStorage/sessionStorage. Si no funcionan, se usa un almacén guardado en window.name,
   que sobrevive a las recargas de la misma pestaña. Así el registro y el inicio de sesión
   (que recargan la página) siguen funcionando. */
(() => {
  const works = name => { try { const st = window[name], k = "__nexo_test__"; st.setItem(k, "1"); const ok = st.getItem(k) === "1"; st.removeItem(k); return ok; } catch (err) { return false; } };
  const needLocal = !works("localStorage"), needSession = !works("sessionStorage");
  if (!needLocal && !needSession) return;
  let all = {};
  try { const w = JSON.parse(window.name || "{}"); if (w && typeof w === "object" && w.__nexo) all = w.__nexo; } catch (err) {}
  const persist = () => { try { window.name = JSON.stringify({ __nexo: all }); } catch (err) {} };
  const make = area => {
    const data = all[area] || (all[area] = {});
    const api = {
      getItem: k => Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null,
      setItem: (k, v) => { data[k] = String(v); persist(); },
      removeItem: k => { delete data[k]; persist(); },
      clear: () => { Object.keys(data).forEach(k => delete data[k]); persist(); },
      key: i => Object.keys(data)[i] ?? null,
      get length() { return Object.keys(data).length; }
    };
    // Object.keys(localStorage) se usa al migrar claves: se exponen las claves como propiedades
    return new Proxy(api, { ownKeys: () => Object.keys(data), getOwnPropertyDescriptor: (t, k) => Object.prototype.hasOwnProperty.call(data, k) ? { value: data[k], enumerable: true, configurable: true } : undefined });
  };
  try { if (needLocal) Object.defineProperty(window, "localStorage", { value: make("local"), configurable: true }); } catch (err) {}
  try { if (needSession) Object.defineProperty(window, "sessionStorage", { value: make("session"), configurable: true }); } catch (err) {}
})();

/* ---------- Marco común de las pantallas internas ---------- */
const NAV = [
  ["inicio","house","Inicio","inicio"],
  ["servicios","layout-grid","Servicios","servicios"],
  ["actividad","receipt-text","Actividad","actividad"],
  ["cuenta","wallet","Estado de cuenta","materias"],
  ["soporte","message-circle","Soporte","soporte"],
  ["perfil","user-round","Mi cuenta","perfil"]
];
const TABS = NAV.filter(n => n[0] !== "cuenta" && n[0] !== "perfil");
/* Espacio de gestión: cada sección con data-staff="admin" o "mod" usa su propio menú */
const STAFF_NAV = {
  admin: [["gestion","inbox","Tickets abiertos","gestion"], ["equipo","users","Moderadores","equipo"], ["validar","badge-check","Pagos por validar","validar"]],
  mod: [["moderacion","inbox","Tickets","moderacion"], ["resueltos","circle-check","Resueltos","resueltos"]],
  local: [["local-pedidos","chef-hat","Pedidos","local-pedidos"], ["local-menu","book-open","Menú y horario","local-menu"]],
  owner: [["dueno","shield-check","Datos reales","dueno"], ["validar","badge-check","Caja","validar"]],
  creator: [["creador","chart-no-axes-combined","Resumen","creador"], ["creador-equipo","users","Equipo y tickets","creador-equipo"], ["movimientos","receipt-text","Movimientos","movimientos"], ["validar","badge-check","Pagos por validar","validar"], ["config","settings","Configuración","config"]]
};
const ROLE_LABEL = { owner: "Dueño", local: "Comercio", creator: "Creador", admin: "Administrador", mod: "Moderador", estudiante: "Estudiante" };
const ROLE_HOME = { owner: "dueno", local: "local-pedidos", creator: "creador", admin: "gestion", mod: "moderacion", estudiante: "inicio" };

document.querySelectorAll("[data-account]").forEach(el => el.append(document.getElementById("account-tpl").content.cloneNode(true)));

/* Ilustración de las pantallas de acceso: los servicios del campus conectados al logo (la idea de "nexo") */
(function heroNet() {
  const N = [["car-front", 17, 20, "Estacionamiento", "t-car"], ["utensils", 83, 17, "Comida", "t-food"], ["graduation-cap", 86, 70, "Materias", "t-uni"], ["dribbble", 15, 74, "Canchas", "t-court"]];
  const lines = N.map(([, x, y], i) => `<path class="hn-path" style="animation-delay:${i * -0.6}s" d="M50 47 Q ${(50 + x) / 2 + (i % 2 ? 8 : -8)} ${(47 + y) / 2 + (i < 2 ? 6 : -6)} ${x} ${y}"/>`).join("");
  const html = `<div class="hero-net" aria-hidden="true">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"><circle class="hn-ring" cx="50" cy="47" r="20"/><circle class="hn-ring r2" cx="50" cy="47" r="33"/>${lines}</svg>
    <span class="hn-core"><svg class="nexo-mark" viewBox="155 29 90 58" fill="none" aria-hidden="true"><rect x="162" y="36" width="38" height="44" rx="19" stroke="#3DBE85" stroke-width="10"/><rect x="188" y="47" width="50" height="22" rx="11" stroke="#EEF4F0" stroke-width="10"/><path d="M200 61A19 19 0 0 1 187.5 78.9" stroke="#3DBE85" stroke-width="10"/></svg></span>
    ${N.map(([ic, x, y, l, c], i) => `<span class="hn-node ${c}" style="left:${x}%;top:${y}%;animation-delay:${i * 0.4}s"><span class="svt-ic"><i data-lucide="${ic}"></i></span><em>${l}</em></span>`).join("")}
    <span class="hn-spark" style="left:34%;top:16%"></span><span class="hn-spark" style="left:68%;top:84%"></span><span class="hn-spark" style="left:92%;top:42%"></span>
  </div>`;
  document.querySelectorAll("aside.campus").forEach(a => a.insertAdjacentHTML("afterbegin", `<span class="hh-orb o1" aria-hidden="true"></span><span class="hh-orb o2" aria-hidden="true"></span>` + html));
})();
document.querySelectorAll("section.app").forEach(sec => {
  const tab = sec.dataset.tab, back = sec.dataset.back, title = sec.dataset.title, staff = sec.dataset.staff;
  const nav = staff ? STAFF_NAV[staff] : NAV, home = staff ? ROLE_HOME[staff] : "inicio";
  const body = document.createElement("main");
  body.className = "content gutter";
  while (sec.firstChild) body.append(sec.firstChild);

  const side = document.createElement("aside");
  side.className = "side";
  side.innerHTML = `
    <button class="brand" type="button" data-go="${home}" style="color:#fff"><span class="wordmark"><span aria-hidden="true">nex</span><svg class="wm-o" viewBox="155 29 90 58" fill="none" aria-hidden="true"><rect x="162" y="36" width="38" height="44" rx="19" class="wm-ring" stroke-width="10"/><rect x="188" y="47" width="50" height="22" rx="11" stroke="currentColor" stroke-width="10"/><path d="M200 61A19 19 0 0 1 187.5 78.9" class="wm-ring" stroke-width="10"/></svg><span class="sr-only">nexo</span></span></button>
    <div class="inst"><b>U. Metropolitana</b><span>Campus Central · Caracas</span></div>
    <nav class="nav">${nav.map(n => `<button type="button" data-go="${n[3]}" class="${n[0]===tab?'on':''}"><i data-lucide="${n[1]}"></i>${n[2]}</button>`).join("")}</nav>
    ${staff
      ? `<div class="profile"><p class="tag">ESPACIO DE GESTIÓN</p><button class="user userbtn" type="button" data-usermenu aria-haspopup="menu" aria-label="Abrir el menú de usuario"><span class="avatar" data-user="initials">AT</span><div><b data-user="full">Ana Torres</b><span>${ROLE_LABEL[staff]} · Menú</span></div></button></div>`
      : `<div class="profile"><p class="tag" data-space-tag>ESPACIO DE ESTUDIANTE</p><button class="user userbtn" type="button" data-usermenu aria-haspopup="menu" aria-label="Abrir el menú de usuario"><span class="avatar" data-user="initials">AT</span><div><b data-user="full">Ana Torres</b><span>Mi cuenta · Menú</span></div></button></div>`}
    <button class="logout" type="button" data-logout><i data-lucide="log-out"></i>Cerrar sesión</button>`;

  const main = document.createElement("div");
  main.className = "main";
  const left = back
    ? `<button class="title" type="button" data-go="${back}" data-back-btn><i data-lucide="arrow-left"></i>${title}</button>`
    : `<button class="brand" type="button" data-go="${home}"><span class="wordmark"><span aria-hidden="true">nex</span><svg class="wm-o" viewBox="155 29 90 58" fill="none" aria-hidden="true"><rect x="162" y="36" width="38" height="44" rx="19" class="wm-ring" stroke-width="10"/><rect x="188" y="47" width="50" height="22" rx="11" stroke="currentColor" stroke-width="10"/><path d="M200 61A19 19 0 0 1 187.5 78.9" class="wm-ring" stroke-width="10"/></svg><span class="sr-only">nexo</span></span></button>`;
  const macts = staff
    ? `<span class="pill ok">${ROLE_LABEL[staff]}</span><button class="avatarbtn" type="button" aria-label="Menú de usuario" aria-haspopup="menu" data-usermenu><span data-user="initials">AT</span></button>`
    : `<button class="bellbtn" type="button" aria-label="Notificaciones" data-go="notificaciones"><i data-lucide="bell"></i><span class="nbadge" data-notif-badge hidden></span></button><button class="avatarbtn" type="button" aria-label="Menú de usuario" aria-haspopup="menu" data-usermenu><span data-user="initials">AT</span></button>`;
  const dacts = staff
    ? `<span class="pill ok">Acceso: ${ROLE_LABEL[staff]}</span><button class="avatarbtn" type="button" aria-label="Menú de usuario" aria-haspopup="menu" data-usermenu><span data-user="initials">AT</span></button>`
    : `<span class="pill ok" data-trim-pill>Trimestre sep–nov 2026</span><button class="bellbtn desk" type="button" aria-label="Notificaciones" data-go="notificaciones"><i data-lucide="bell"></i><span class="nbadge" data-notif-badge hidden></span></button><button class="avatarbtn" type="button" aria-label="Menú de usuario" aria-haspopup="menu" data-usermenu><span data-user="initials">AT</span></button>`;
  const crumbBase = staff ? "" : "Mi campus&nbsp;&nbsp;/&nbsp;&nbsp;";
  main.innerHTML = `
    <header class="mbar gutter">${left}<div class="mbar-acts">${macts}</div></header>
    <header class="deskbar"><div class="crumbs">${back ? `<button class="deskback" type="button" data-go="${back}" data-back-btn aria-label="Volver"><i data-lucide="arrow-left"></i>Volver</button>` : ""}<span>${crumbBase}${sec.dataset.crumb.replace(/  \/  /g,"&nbsp;&nbsp;/&nbsp;&nbsp;")}</span></div>
      <div class="acts">${dacts}</div></header>`;
  if (staff) {
    // cabecera de gestión con el degradado de Nexo (tono según el rol, ver staffGreet)
    const h = body.firstElementChild;
    if (h && h.querySelector(".h1")) {
      const hero = document.createElement("div");
      hero.className = "staff-hero"; hero.dataset.tone = staff;
      hero.innerHTML = `<span class="hh-orb o1"></span><span class="hh-orb o2"></span><span class="hh-orb o3"></span><p class="sh-kick" data-staff-greet></p>`;
      body.insertBefore(hero, h); hero.append(h);
    }
  }
  main.append(body);
  const bar = document.createElement("nav");
  bar.className = "tabbar";
  bar.setAttribute("aria-label", "Navegación principal");
  bar.innerHTML = (staff ? nav : TABS).map(n => `<button type="button" data-go="${n[3]}" class="${n[0]===tab?'on':''}"><i data-lucide="${n[1]}"></i>${n[2]}</button>`).join("")
    + (staff ? `<button type="button" data-logout><i data-lucide="log-out"></i>Salir</button>` : "");
  bar.insertAdjacentHTML("afterbegin", `<span class="tb-ind" aria-hidden="true"></span>`);
  main.append(bar);
  sec.append(side, main);
});
/* Barra inferior: la "gota" de vidrio se desliza desde la pestaña anterior hasta la actual */
let tbLast = null;
function placeTabInd() {
  const sec = document.getElementById(current); if (!sec) return;
  const bar = sec.querySelector(".tabbar"), ind = bar && bar.querySelector(".tb-ind"), on = bar && bar.querySelector("button.on");
  if (!ind || !bar.offsetParent) return;
  if (!on) { ind.style.width = "0px"; return; }
  const to = { left: on.offsetLeft, width: on.offsetWidth };
  if (tbLast && (tbLast.left !== to.left)) {
    ind.classList.add("no-anim"); ind.style.left = tbLast.left + "px"; ind.style.width = tbLast.width + "px";
    void ind.offsetWidth; ind.classList.remove("no-anim");
  }
  requestAnimationFrame(() => { ind.style.left = to.left + "px"; ind.style.width = to.width + "px"; });
  tbLast = to;
}
window.addEventListener("resize", () => { tbLast = null; placeTabInd(); });

/* ---------- QR ilustrativo (patrón determinista, no escaneable) ---------- */
function drawQR(c) {
  const ctx = c.getContext("2d"), N = 29;
  let seed = [...c.dataset.qr].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, N, N); ctx.fillStyle = "#0F3D2E";
  const finder = (x, y) => { ctx.fillRect(x, y, 7, 7); ctx.clearRect(x+1, y+1, 5, 5); ctx.fillStyle="#fff"; ctx.fillRect(x+1,y+1,5,5); ctx.fillStyle="#0F3D2E"; ctx.fillRect(x+2, y+2, 3, 3); };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const inF = (x < 8 && y < 8) || (x > N-9 && y < 8) || (x < 8 && y > N-9);
    if (!inF && rnd() > .52) ctx.fillRect(x, y, 1, 1);
  }
  finder(0, 0); finder(N-7, 0); finder(0, N-7);
}
document.querySelectorAll("canvas[data-qr]").forEach(drawQR);


const CAREER_LIST = Object.keys(CARRERAS).sort((a, b) => a.localeCompare(b, "es"));
const LEGACY_CAREER = { "Administración": "Ciencias Administrativas", "Educación": "Educación, mención Gerencia" };
const fold = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
function myCareer() {
  const a = (typeof accounts !== "undefined" && accounts.find(x => x.email === sessionEmail)) || {};
  let c = LEGACY_CAREER[a.career] || a.career || "";
  if (!c && (typeof isDemo === "undefined" || isDemo)) c = "Ingeniería de Sistemas";
  return Object.prototype.hasOwnProperty.call(CARRERAS, c) ? c : "";
}
function careerOptions(sel, val) {
  if (sel.options.length <= 1) sel.insertAdjacentHTML("beforeend", CAREER_LIST.map(c => `<option>${c}</option>`).join(""));
  sel.value = val || "";
}
const careerCodes = c => (CARRERAS[c] ? CARRERAS[c].split(" ") : Object.keys(MATDB));
function findSubject(text, career) {
  const t = text.trim().replace(/\s+/g, " "), up = t.toUpperCase().replace(/[\s-]/g, "");
  if (MATDB[up]) return { n: MATDB[up], c: up };
  const f = fold(t), hit = k => fold(MATDB[k]) === f;
  const k = careerCodes(career).find(hit) || Object.keys(MATDB).find(hit);
  return k ? { n: MATDB[k], c: k } : { n: t, c: "" };
}
/* ---------- Cuentas y sesión ---------- */
/* Prototipo: las cuentas se guardan en el navegador de quien lo usa. La contraseña se guarda transformada, nunca tal cual. */
const DEMO_EMAIL = "ana.torres@correo.unimet.edu.ve";
const DEFAULT_USER = { full: "Ana Torres", carnet: "20241010186", email: DEMO_EMAIL };
function passKey(s) { let h1 = 0x811c9dc5, h2 = 5381; for (const ch of "nexo:" + s) { const c = ch.codePointAt(0); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = (Math.imul(h2, 33) + c) >>> 0; } return h1.toString(16) + h2.toString(16); }
const normEmail = s => s.trim().toLowerCase();
let accounts = [];
try { accounts = JSON.parse(localStorage.getItem("nexo-accounts") || "[]") || []; } catch (err) {}
if (!accounts.some(a => a.email === DEMO_EMAIL)) accounts.unshift({ ...DEFAULT_USER, pass: passKey("demo-nexo-01") });
/* Cuentas de gestión de ejemplo (sin carnet): administradora y dos moderadores */
const STAFF0 = [
  { full: "Diego Méndez", carnet: "", email: "diego.mendez@unimet.edu.ve", role: "creator", pw: "demo-creador-01" },
  { full: "María Vera", carnet: "", email: "maria.vera@unimet.edu.ve", role: "admin", pw: "demo-admin-01" },
  { full: "Lucía Rojas", carnet: "", email: "lucia.rojas@unimet.edu.ve", role: "mod", pw: "demo-mod-01" },
  { full: "Carlos Gil", carnet: "", email: "carlos.gil@unimet.edu.ve", role: "mod", pw: "demo-mod-02" }
];
/* Una cuenta por comercio (correo ilustrativo, misma contraseña de prueba) */
[["pinchopan", "Pincho Pan"], ["lapausa", "La Pausa"], ["migrill", "Mi Punto Grill"], ["teeb", "TEEB"], ["molokai", "Molokai"], ["sanahoria", "Sanahoria"], ["granier", "Granier"], ["pepperonis", "Pepperonis"], ["juicebar", "Juice Bar"], ["deydonuts", "Dey Donuts"], ["tienditaa1", "La Tiendita Unimetana A1"], ["tienditaa2", "La Tiendita Unimetana A2"], ["believe", "Kiosco Believe"]]
  .forEach(([id, full]) => STAFF0.push({ full, carnet: "", email: `${id}@comercio.nexo`, role: "local", local: id, pw: "demo-local-01" }));
STAFF0.forEach(({ pw, ...a }) => { if (!accounts.some(x => x.email === a.email)) accounts.push({ ...a, pass: passKey(pw) }); });
// Una cuenta del equipo desactivada conserva su rol guardado (para reactivarla), pero entra como usuario
const roleOf = a => (a && !a.disabled && a.role) || "estudiante";
/* Invitaciones de moderación: quien se registra con un correo invitado entra como moderador */
let invites = [];
try { invites = JSON.parse(localStorage.getItem("nexo-invites") || "[]") || []; } catch (err) {}
const saveInvites = () => { try { localStorage.setItem("nexo-invites", JSON.stringify(invites)); } catch (err) {} };
const saveAccounts = () => { try { localStorage.setItem("nexo-accounts", JSON.stringify(accounts)); } catch (err) {} };
saveAccounts();
function getSession() { let s = null; try { s = localStorage.getItem("nexo-session") || sessionStorage.getItem("nexo-session"); } catch (err) {} return s && accounts.some(a => a.email === s) ? s : null; }
function setSession(email, remember) {
  try { localStorage.removeItem("nexo-session"); sessionStorage.removeItem("nexo-session"); (remember ? localStorage : sessionStorage).setItem("nexo-session", email); } catch (err) {}
}
function clearSession() { try { localStorage.removeItem("nexo-session"); sessionStorage.removeItem("nexo-session"); } catch (err) {} }
/* Supabase (cuentas reales): solo cuando la app se sirve por http(s). Abierta como archivo suelto, todo es local. */
const SB_URL = "https://iwgdisuzfznrmythylvg.supabase.co", SB_KEY = "sb_publishable_ax9inYwOpcufFjZoGSyL8g_Ft8c6AaR"; // clave pública por diseño (las reglas de seguridad viven en la base de datos)
const SB_ON = /^https?:$/.test(location.protocol) && !!(window.supabase && window.supabase.createClient);
const sb = SB_ON ? window.supabase.createClient(SB_URL, SB_KEY, { auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, storageKey: "nexo-sb" } }) : null;
const sessionEmail = getSession();
const account = sessionEmail ? accounts.find(a => a.email === sessionEmail) : null;
const isDemo = !account || account.email === DEMO_EMAIL;
/* una cuenta nueva empieza desde cero: se quitan los datos de ejemplo de Ana */
document.querySelectorAll(isDemo ? "[data-new]" : "[data-demo]").forEach(el => el.remove());
document.documentElement.classList.add("acct-ready");
if (!isDemo) document.querySelectorAll("[data-defcard]").forEach(el => el.textContent = "Tarjeta de crédito o débito");
const createdAt = account && account.created ? new Date(account.created + "T12:00") : new Date();
/* los datos (pagos, tarjetas, avisos) se guardan por cuenta */
const K = key => key + ":" + (sessionEmail || "invitado");
let user = account ? { full: account.full, carnet: account.carnet, email: account.email } : { ...DEFAULT_USER };
function cleanName(s) { return s.trim().replace(/\s+/g, " ").split(" ").map(w => w ? w[0].toLocaleUpperCase("es") + w.slice(1) : w).join(" "); }
function applyUser() {
  const words = user.full.split(" ").filter(Boolean);
  const first = words[0] || "";
  const initials = ((words[0] || "")[0] || "") + ((words.length > 1 ? words[words.length - 1] : "")[0] || "");
  const vals = { full: user.full, first, initials: initials.toLocaleUpperCase("es"), carnet: user.carnet, email: user.email };
  document.querySelectorAll("[data-user]").forEach(el => { el.textContent = vals[el.dataset.user] ?? ""; });
  document.querySelectorAll("[data-has-carnet]").forEach(el => { el.hidden = !user.carnet; });
  document.querySelectorAll("[data-no-carnet]").forEach(el => { el.hidden = !!user.carnet; });
  if (typeof renderCards === "function" && document.getElementById("cardPicker")) try { renderCards(); } catch (err) {}
}
/* cambiar de cuenta recarga la app para cargar los datos de esa cuenta */
function enterApp(email, remember, flash) {
  setSession(email, remember);
  try { sessionStorage.setItem("nexo-flash", flash); } catch (err) {}
  const r = roleOf(accounts.find(a => a.email === email));
  let mode = null; try { mode = localStorage.getItem("nexo-mode:" + email); } catch (err) {}
  history.replaceState(null, "", "#" + (["owner", "creator", "admin", "mod"].includes(r) && mode === "usuario" ? "inicio" : ROLE_HOME[r]));
  location.reload();
}

/* ---------- Navegación ---------- */
const screens = [...document.querySelectorAll("section.screen")].map(s => s.id);
let current = null, previous = "tutorial";
/* Recorrido real para el botón "atrás": se guarda en la pestaña; si no hay a dónde volver, se usa data-back */
let navTrail = [];
try { navTrail = JSON.parse(sessionStorage.getItem("nexo-trail") || "[]"); if (!Array.isArray(navTrail)) navTrail = []; } catch (err) { navTrail = []; }
const NO_BACK = ["comprobante", "tarjeta", "pagoplan", "revision", "login", "registro", "recuperar", "tutorial", "ayuda", "invitacion"];
let goingBack = false;
function trailPush(id) {
  if (["login", "registro", "tutorial", "recuperar", "invitacion"].includes(id)) navTrail = []; // sesión nueva: recorrido nuevo
  if (goingBack && navTrail[navTrail.length - 2] === id) navTrail.pop(); // volvió atrás con el botón
  else if (navTrail[navTrail.length - 1] !== id) navTrail.push(id);
  goingBack = false;
  if (navTrail.length > 30) navTrail = navTrail.slice(-30);
  try { sessionStorage.setItem("nexo-trail", JSON.stringify(navTrail)); } catch (err) {}
}
function backTarget(fallback) {
  const staffNow = !!STAFF_SCREENS[current];
  for (let i = navTrail.length - 2; i >= 0; i--) {
    const p = navTrail[i];
    if (p === current) continue;
    let cartEmpty = false; try { cartEmpty = p === "carrito" && !cart.lines.length; } catch (err) {}
    if (NO_BACK.includes(p) || cartEmpty || !!STAFF_SCREENS[p] !== staffNow) continue;
    navTrail = navTrail.slice(0, i + 1).concat(current); // el show() siguiente detecta la vuelta y saca la pantalla actual
    return p;
  }
  return fallback;
}
window.addEventListener("click", e => {
  const b = e.target.closest("[data-back-btn]"); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  navTrail[navTrail.length - 1] !== current && navTrail.push(current);
  const to = backTarget(b.dataset.go);
  goingBack = navTrail[navTrail.length - 2] === to;
  go(to);
}, true);
const PUBLIC = ["tutorial", "login", "registro", "ayuda", "invitacion", "recuperar"];
/* Identidad de gestión: color e ícono por servicio, ícono de los indicadores y cabecera con saludo */
const SVC_TONE = { Comida: ["t-food", "utensils"], Estacionamiento: ["t-car", "car-front"], Materias: ["t-uni", "graduation-cap"], Canchas: ["t-court", "dribbble"] };
const svcTone = s => (SVC_TONE[s] || ["t-brand"])[0];
const svcChip = s => `<span class="svc-chip ${svcTone(s)}" aria-hidden="true"><i data-lucide="${(SVC_TONE[s] || [0, "life-buoy"])[1]}"></i></span>`;
const skIc = ic => ic ? `<span class="sk-ic" aria-hidden="true"><i data-lucide="${ic}"></i></span>` : "";
function staffGreet() {
  try {
    if (!account) return;
    const d = new Date(), h = d.getHours(), saludo = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
    const txt = `${DIA_LARGO_G[d.getDay()]} ${d.getDate()} de ${MES_LARGO_G[d.getMonth()]} · ${saludo}, ${(account.full || "").split(" ")[0]}`;
    document.querySelectorAll("[data-staff-greet]").forEach(el => { el.textContent = txt; });
    document.querySelectorAll(".staff-hero").forEach(el => { el.dataset.tone = roleOf(account) === "estudiante" ? el.dataset.tone : roleOf(account); });
  } catch (err) {}
}
const DIA_LARGO_G = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MES_LARGO_G = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
staffGreet();
const STAFF_SCREENS = { dueno: "owner", gestion: "admin", equipo: "admin", caso: "admin", moderacion: "mod", resueltos: "mod", creador: "creator", "creador-equipo": "creator", movimientos: "creator", config: "creator", "local-pedidos": "local", "local-menu": "local", validar: ["admin", "creator", "owner"] };
function show(id) {
  if (/^invitacion-[A-Z0-9]+$/.test(id)) { ivToken = id.slice(11); id = "invitacion"; }
  if (!screens.includes(id)) id = sessionEmail ? "inicio" : "tutorial";
  if (!sessionEmail && !PUBLIC.includes(id)) { id = "login"; if (location.hash !== "#login") history.replaceState(null, "", "#login"); setTimeout(() => toast("Inicia sesión para continuar."), 0); }
  if (sessionEmail && !PUBLIC.includes(id)) {
    const role = roleOf(account), need = STAFF_SCREENS[id];
    const dual = ["owner", "creator", "admin", "mod"].includes(role); // el personal puede usar Nexo como usuario
    const okRole = Array.isArray(need) ? need.includes(role) : need === role;
    if (role === "estudiante" ? need : dual ? (need && !okRole) : !okRole) { id = ROLE_HOME[role]; history.replaceState(null, "", "#" + id); }
    // solo el estado de cuenta universitario pide carnet ("revision" es el pago de canchas: lo puede usar cualquiera)
    if (!need && !account?.carnet && ["materias", "caja", "tarjeta", "inscripcion"].includes(id)) {
      id = "inicio"; history.replaceState(null, "", "#inicio");
      setTimeout(() => toast("El estado de cuenta universitario es para cuentas de estudiante con carnet."), 0);
    }
    if (dual) { try { localStorage.setItem(K("nexo-mode"), need ? "gestion" : "usuario"); } catch (err) {} }
  }
  if (current && current !== id) previous = current;
  current = id; trailPush(id);
  screens.forEach(s => { document.getElementById(s).hidden = s !== id; });
  try { fillRecentDays(document.getElementById(id)); } catch (err) {}
  if (id === "recarga" && typeof renderRecarga === "function") renderRecarga();
  if (id === "afiliar" && typeof renderAf === "function") renderAf();
  if (id === "vehiculo" && typeof openVehicleForm === "function") openVehicleForm();
  if (id === "perfil" && typeof openPerfil === "function") openPerfil();
  if (["materias", "caja", "tarjeta"].includes(id)) { let none = false; try { none = !MATERIAS.length; } catch (err) {} if (none) { insReturn = id; history.replaceState(null, "", "#inscripcion"); id = "inscripcion"; current = id; screens.forEach(s => { document.getElementById(s).hidden = s !== id; }); } }
  if (id === "inscripcion" && typeof openInscripcion === "function") openInscripcion();
  if (id === "invitacion" && typeof renderInvitacion === "function") renderInvitacion();
  if (id === "recuperar" && typeof renderRecuperar === "function") renderRecuperar();
  if (id === "inicio" && typeof renderHome === "function") try { renderHome(); } catch (err) {}
  if (id === "dueno" && typeof renderDueno === "function") try { renderDueno(); } catch (err) {}
  if (id === "comida" && typeof renderFoodList === "function") renderFoodList();
  if (id === "reserva" && typeof renderReserva === "function") try { renderReserva(); } catch (err) {} // horas ocupadas y Mis reservas al día
  if (id === "comida" && typeof renderFoodOrders === "function") try { renderFoodOrders(); } catch (err) {}
  if (id === "comida" && typeof renderFoodAgain === "function") try { renderFoodAgain(); } catch (err) {}
  if (id === "local" && typeof renderLocal === "function") renderLocal();
  if (id === "detalle" && typeof renderDetalle === "function") renderDetalle(document.getElementById("d-note") ? document.getElementById("d-note").value : "");
  if (id === "carrito" && typeof renderCarrito === "function") renderCarrito();
  if (id === "comprobante" && typeof renderComprobante === "function") renderComprobante();
  if (id === "factura" && typeof renderFactura === "function") renderFactura();
  if (id === "pedido" && typeof renderPedido === "function") renderPedido();
  if (id === "gestion" && typeof renderGestion === "function") renderGestion();
  if (id === "equipo" && typeof renderEquipo === "function") renderEquipo();
  if (id === "caso" && typeof renderCaso === "function") renderCaso();
  if (id === "moderacion" && typeof renderModeracion === "function") renderModeracion();
  if (id === "resueltos" && typeof renderResueltos === "function") renderResueltos();
  if (id === "soporte" && typeof renderSoporte === "function") renderSoporte();
  if (id === "creador" && typeof renderCreador === "function") renderCreador();
  if (id === "creador-equipo" && typeof renderCreadorEquipo === "function") renderCreadorEquipo();
  if (id === "movimientos" && typeof renderMovimientos === "function") renderMovimientos();
  if (id === "config" && typeof renderConfig === "function") renderConfig();
  if (id === "validar" && typeof renderValidar === "function") renderValidar();
  if (id === "notificaciones" && typeof renderNotifs === "function") try { renderNotifs(); } catch (err) {}
  if (id === "local-pedidos" && typeof renderLocalPedidos === "function") renderLocalPedidos();
  if (id === "local-menu" && typeof renderLocalMenu === "function") renderLocalMenu();
  if (id === "planes") { const s = document.querySelector("#planList .opt.plan.on"); if (s) try { updatePlan(s); } catch (err) {} }

  window.scrollTo(0, 0);
}
function go(id) { if (location.hash === "#" + id) show(id); else location.hash = id; }

let toastTimer;
/* Avisos: toast(msg) sale y se va solo; con { action, onAction } muestra un botón (p. ej. "Deshacer", 6 s);
   con { persist: true } se queda hasta que la persona lo cierra (para lo importante: pedido listo, pago rechazado…).
   Los persistentes se apilan; los pasajeros reemplazan al pasajero anterior. */
/* Ilustraciones propias (SVG en línea; los colores salen de los tokens, así que sirven en modo oscuro).
   illu(tipo) → inbox, receipt, search, bell, people, done, bag. */
const ILLU_BASE = `<ellipse class="il-bg" cx="80" cy="64" rx="62" ry="46"/><circle class="il-dot" cx="22" cy="30" r="3"/><circle class="il-dot" cx="142" cy="24" r="2.5"/><circle class="il-dot" cx="138" cy="98" r="3.5"/><path class="il-spark" d="M30 92v8M26 96h8M128 46v6M125 49h6"/>`;
const ILLU = {
  inbox: `<rect class="il-paper" x="52" y="26" width="56" height="40" rx="5"/><path class="il-soft" d="M60 38h40M60 47h28"/><path class="il-paper" d="M38 66l12-18h60l12 18v26a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6z"/><path class="il-line" d="M38 66h26a16 16 0 0 0 32 0h26"/>`,
  receipt: `<path class="il-paper" d="M56 20h48v74l-6-5-6 5-6-5-6 5-6-5-6 5-6-5-6 5z"/><path class="il-soft" d="M64 34h32M64 44h24M64 54h28"/><path class="il-line" d="M64 70h14M88 70h8"/>`,
  search: `<rect class="il-paper" x="40" y="28" width="64" height="58" rx="6"/><path class="il-soft" d="M50 42h30M50 52h40M50 62h22"/><circle class="il-glass" cx="102" cy="72" r="16"/><path class="il-line" d="M113.5 83.5L126 96"/>`,
  bell: `<path class="il-paper" d="M80 26a22 22 0 0 0-22 22v16l-8 12h60l-8-12V48a22 22 0 0 0-22-22z"/><path class="il-line" d="M72 84a8 8 0 0 0 16 0"/><path class="il-soft" d="M108 30h8l-8 9h8M120 18h5l-5 6h5"/>`,
  people: `<circle class="il-paper" cx="64" cy="48" r="13"/><path class="il-paper" d="M40 92a24 24 0 0 1 48 0z"/><circle class="il-paper2" cx="98" cy="54" r="11"/><path class="il-paper2" d="M80 94a20 20 0 0 1 38 0z"/><path class="il-line" d="M112 30v12M106 36h12"/>`,
  done: `<rect class="il-paper" x="50" y="24" width="60" height="74" rx="6"/><rect class="il-clip" x="66" y="18" width="28" height="12" rx="4"/><path class="il-soft" d="M60 46h40M60 56h30"/><circle class="il-okc" cx="80" cy="78" r="11"/><path class="il-ok" d="M75 78l4 4 7-8"/>`,
  bag: `<path class="il-line" d="M66 44v-8a14 14 0 0 1 28 0v8"/><path class="il-paper" d="M50 42h60l-4 54H54z"/><path class="il-soft" d="M66 58a14 14 0 0 0 28 0"/>`,
};
const illu = k => ILLU[k] ? `<svg class="illu" viewBox="0 0 160 120" aria-hidden="true">${ILLU_BASE}${ILLU[k]}</svg>` : "";
const ILLU_FOR = { inbox: "inbox", "receipt-text": "receipt", "search-x": "search", "filter-x": "search", "bell-off": "bell", users: "people", "check-check": "done", "badge-check": "done", "shopping-bag": "bag" };
/* Marca de éxito animada (círculo que se dibuja + check + destellos) */
const successMark = (cls = "") => `<span class="okmark ${cls}" aria-hidden="true"><svg viewBox="0 0 64 64"><circle class="ok-ring" cx="32" cy="32" r="26"/><path class="ok-tick" d="M21 33l7.5 7.5L44 25"/></svg><i></i><i></i><i></i><i></i><i></i><i></i></span>`;
/* Estado vacío uniforme: ilustración (o ícono), título, explicación y (opcional) una acción */
function emptyState(icon, title, text = "", act = "") {
  const art = ILLU_FOR[icon] ? illu(ILLU_FOR[icon]) : `<span class="ico lg"><i data-lucide="${icon}"></i></span>`;
  return `<div class="empty">${art}<b>${title}</b>${text ? `<p>${text}</p>` : ""}${act}</div>`;
}
function toast(msg, opts = {}) {
  let box = document.querySelector(".toasts");
  if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("aria-live", "polite"); document.body.append(box); }
  if (!opts.persist) { box.querySelectorAll(".toast:not(.persist)").forEach(x => x.remove()); clearTimeout(toastTimer); }
  else { const same = [...box.querySelectorAll(".toast.persist")].find(x => x.dataset.msg === msg); if (same) return; }
  const t = document.createElement("div");
  t.className = "toast" + (opts.persist ? " persist" : "") + (opts.action ? " has-act" : "");
  t.setAttribute("role", opts.persist ? "alert" : "status"); t.dataset.msg = msg;
  const span = document.createElement("span"); span.className = "toast-msg"; span.textContent = msg; t.append(span);
  const close = () => { t.remove(); };
  if (opts.action) { const b = document.createElement("button"); b.type = "button"; b.className = "toast-act"; b.textContent = opts.action; b.addEventListener("click", () => { close(); opts.onAction && opts.onAction(); }); t.append(b); }
  if (opts.persist || opts.action) { const x = document.createElement("button"); x.type = "button"; x.className = "toast-x"; x.setAttribute("aria-label", "Cerrar aviso"); x.textContent = "×"; x.addEventListener("click", close); t.append(x); }
  box.append(t);
  const persisted = box.querySelectorAll(".toast.persist"); if (persisted.length > 3) persisted[0].remove();
  if (!opts.persist) toastTimer = setTimeout(close, opts.action ? 6000 : 2600);
}

document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g) { e.preventDefault(); go(g.dataset.go); return; }
  if (e.target.closest("[data-go-prev]")) { go(previous === "ayuda" ? "tutorial" : previous); return; }
  const eye = e.target.closest("[data-eye]");
  if (eye) {
    const input = document.getElementById(eye.dataset.eye);
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    eye.setAttribute("aria-pressed", String(visible));
    eye.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
    eye.innerHTML = `<i data-lucide="${visible ? "eye" : "eye-off"}"></i>`;
    try { lucide.createIcons(); } catch (err) {}
    return;
  }
  const t = e.target.closest("[data-toast]");
  if (t) { toast(t.dataset.toast); return; }
  const cp = e.target.closest("[data-copy]");
  if (cp) {
    const txt = cp.dataset.copy;
    try { navigator.clipboard.writeText(txt).then(() => toast(cp.dataset.copyLabel || "Copiado: " + txt), () => toast(txt)); } catch (err) { toast(txt); }
    return;
  }
  const chip = e.target.closest("[data-chips] .pill");
  if (chip) {
    chip.parentElement.querySelectorAll(".pill").forEach(p => { p.classList.toggle("ok", p === chip); p.classList.toggle("neutral", p !== chip); });
    const f = chip.parentElement.dataset.filter, show = chip.dataset.show;
    if (f && show) document.getElementById(f).querySelectorAll("[data-group]").forEach(g => { g.hidden = show !== "all" && g.dataset.group !== show; });
    return;
  }
  const opt = e.target.closest("[data-radio] > .opt, [data-radio] > .day, [data-radio] > .slot:not(.busy)");
  if (opt) {
    opt.parentElement.querySelectorAll(":scope > .opt, :scope > .day, :scope > .slot").forEach(o => o.classList.toggle("on", o === opt));
    opt.parentElement.querySelectorAll(":scope > .slot:not(.busy) small").forEach(s => { s.textContent = s.parentElement === opt ? "Seleccionado" : "Disponible"; });
  }
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.matches && el.matches("[data-digits]")) {
    el.value = el.value.replace(/\D/g, "").slice(0, 11);
    const hint = document.querySelector(`[data-hint="${el.id}"]`);
    const n = el.value.length;
    el.closest(".field").classList.remove("bad");
    if (hint) hint.textContent = n === 11 ? "Carnet completo." : `Escribe los 11 dígitos de tu carnet, seguidos (${n}/11).`;
  }
});
/* ---------- Planes de estacionamiento: resumen según el plan elegido ---------- */
let WALLET = isDemo ? 40 : 0;
try { const w = localStorage.getItem(K("nexo-wallet")); if (w !== null && !isNaN(+w)) WALLET = +w; } catch (err) {}
const saveWallet = () => { try { localStorage.setItem(K("nexo-wallet"), String(WALLET)); } catch (err) {} try { sbSaveWallet(); } catch (err) {} };
const money = n => { const [i, d] = Math.abs(n).toFixed(2).split("."); return (n < 0 ? "-" : "") + "$" + i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + d; };
/* ---------- Tasa oficial del dólar (BCV) ----------
   Valor inicial: Dólar BCV del lunes 16/11/2026 = Bs. 915,74, indicado por el dueño (fuente oficial: bcv.org.ve).
   El creador la actualiza en Configuración (nexo-bcv, global). Todos los equivalentes en bolívares salen de aquí. */
const BCV0 = { rate: 915.74, date: "2026-11-16", source: "BCV · indicada por el dueño" };
let BCV = { ...BCV0 };
try { const b = JSON.parse(localStorage.getItem("nexo-bcv") || "null"); if (b && b.rate > 0 && b.date && b.date >= BCV0.date) BCV = { ...BCV0, ...b }; } catch (err) {}
const saveBCV = () => { try { localStorage.setItem("nexo-bcv", JSON.stringify(BCV)); } catch (err) {} };
const bcvRate = () => BCV.rate;
const bsAmt = n => "Bs. " + money(n).slice(1);
const bsOf = usd => bsAmt(Math.round(usd * BCV.rate * 100) / 100);
const bcvDateTxt = () => { const [y, m, d] = BCV.date.split("-").map(Number); return `${d} ${["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][m - 1]} ${y}`; };
const bcvStale = () => { const t = new Date(); return BCV.date < `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
const bsTag = usd => `<span class="bsv">${bsOf(usd)}</span>`;
function renderWallet() {
  document.querySelectorAll("[data-wallet]").forEach(el => el.textContent = money(WALLET));
  const sel = document.querySelector("#planList .opt.plan.on");
  if (sel) try { updatePlan(sel); } catch (err) { /* el plan aún no se ha cargado */ }
}
renderWallet();
/* ---------- Plan de estacionamiento del estudiante ---------- */
const MES3 = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dOf = s => new Date(s + "T12:00");
const fmtLong = d => `${String(d.getDate()).padStart(2, "0")} ${MES3[d.getMonth()]} ${d.getFullYear()}`;
const plusDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const PLAN_DESC = { dia: "Un acceso · 24 horas", semanal: "Accesos ilimitados · 7 días", mensual: "Accesos ilimitados · 30 días", bimestral: "Accesos ilimitados · 60 días", trimestral: "Accesos ilimitados · 90 días" };
let plan = isDemo ? { key: "mensual", name: "Mensual", price: 28, days: 30, start: "2026-11-02", end: "2026-12-01" } : null;
try { const sp = localStorage.getItem(K("nexo-plan")); if (sp !== null) plan = JSON.parse(sp); } catch (err) {}
const savePlan = () => { try { localStorage.setItem(K("nexo-plan"), JSON.stringify(plan)); } catch (err) {} try { sbSaveState(); } catch (err) {} };
const todayNoon = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12); };
const planActive = () => !!plan && dOf(plan.end) >= todayNoon();
let pendingPlan = null;
function renderPlanState() {
  const on = planActive();
  document.querySelectorAll("[data-plan]").forEach(el => el.hidden = el.dataset.plan !== (on ? "on" : "off"));
  if (plan) {
    const v = { lname: plan.name.toLowerCase(), end: fmtLong(dOf(plan.end)), desc: `${PLAN_DESC[plan.key]} · ${money(plan.price)}` };
    document.querySelectorAll("[data-planv]").forEach(el => { const k = el.dataset.planv; if (k in v) el.textContent = v[k]; });
  }
  document.querySelectorAll("#planList .cur-pill").forEach(x => x.remove());
  if (on) { const o = document.querySelector(`#planList [data-plan-key="${plan.key}"] .grow b`); if (o) o.insertAdjacentHTML("afterend", ` <span class="pill neutral cur-pill" style="margin-left:6px">Tu plan actual</span>`); }
}
function updatePlan(btn) {
  const ps = k => document.querySelector(`#planSummary [data-ps="${k}"]`);
  const price = parseFloat(btn.dataset.price.replace(",", "."));
  const key = btn.dataset.planKey, name = btn.dataset.name, days = +btn.dataset.days;
  const active = planActive(), isCurrent = active && plan.key === key;
  const start = active ? plusDays(dOf(plan.end), 1) : todayNoon(), end = plusDays(start, days - 1);
  pendingPlan = { key, name, price, days, start: isoOf(start), end: isoOf(end) };
  ps("tag").textContent = isCurrent ? `Renovación · Plan ${name.toLowerCase()}` : active ? `Siguiente período · Plan ${name.toLowerCase()}` : `Nuevo plan ${name.toLowerCase()}`;
  ps("range").textContent = days === 1 ? fmtLong(start) : `${fmtLong(start)} – ${fmtLong(end)}`;
  ps("price").innerHTML = `${money(price)}${bsTag(price)}`;
  let noVeh = false; try { noVeh = !vehicle; } catch (err) {}
  const after = WALLET - price, short = after < 0;
  ps("after").textContent = short ? money(WALLET) : money(after);
  ps("short").hidden = !short || noVeh; ps("topup").hidden = !short || noVeh;
  if (short) ps("shortmsg").textContent = `Tienes ${money(WALLET)} y el plan cuesta ${money(price)}. Te faltan ${money(-after)}.`;
  ps("needveh").hidden = !noVeh;
  const cta = ps("cta");
  cta.hidden = short || noVeh;
  cta.textContent = `${isCurrent ? "Renovar" : active ? "Agregar" : "Contratar"} plan ${name.toLowerCase()} · ${money(price)}`;
}
document.getElementById("planList").addEventListener("click", e => { const b = e.target.closest(".opt.plan"); if (b) updatePlan(b); });
/* ---------- Reserva de canchas ---------- */
/* Canchas: pelota de cada deporte (BALL_ART, 40×40) y la cancha vista desde arriba con su pelota (COURT_ART, 160×100) */
const BALL_ART = {
  futbol: `<circle cx="20" cy="20" r="16" fill="#fff" stroke="#2f3438" stroke-width="1.5"/><path d="M20 13l6 4-2 7h-8l-2-7z" fill="#2f3438"/><path d="M20 13V5M26 17l7-3M24 24l4 7M16 24l-4 7M14 17l-7-3" stroke="#2f3438" stroke-width="1.4"/><path d="M14 33l-1-4 3-3M26 33l1-4-3-3M33 25l-3-2M7 25l3-2" stroke="#2f3438" stroke-width="1.2" fill="none"/>`,
  beisbol: `<circle cx="20" cy="20" r="16" fill="#fff" stroke="#d9d4cc" stroke-width="1.5"/><path d="M10 8c5 7 5 17 0 24M30 8c-5 7-5 17 0 24" stroke="#e2483d" stroke-width="1.6" fill="none"/><path d="M10 13l3-1M11 18h3M11 23l3 1M10 28l3 1M30 13l-3-1M29 18h-3M29 23l-3 1M30 28l-3 1" stroke="#e2483d" stroke-width="1.2"/>`,
  tenis: `<circle cx="20" cy="20" r="16" fill="#d8ec3a" stroke="#b9cc1f" stroke-width="1.2"/><path d="M6 14c8 2 10 10 8 20M34 26c-8-2-10-10-8-20" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
  padel: `<g transform="rotate(-30 20 20)"><rect x="18" y="24" width="4" height="12" rx="2" fill="#2f3438"/><ellipse cx="20" cy="15" rx="10" ry="12" fill="#f06a3c"/><ellipse cx="20" cy="15" rx="7" ry="9" fill="#ff9a6a"/><circle cx="17" cy="12" r="1" fill="#fff"/><circle cx="23" cy="12" r="1" fill="#fff"/><circle cx="20" cy="16" r="1" fill="#fff"/><circle cx="17" cy="19" r="1" fill="#fff"/><circle cx="23" cy="19" r="1" fill="#fff"/></g><circle cx="32" cy="30" r="5" fill="#d8ec3a" stroke="#b9cc1f"/>`,
  baloncesto: `<circle cx="20" cy="20" r="16" fill="#f07a2a" stroke="#c75a14" stroke-width="1.2"/><path d="M4 20h32M20 4v32M9 9c6 6 6 16 0 22M31 9c-6 6-6 16 0 22" stroke="#7a3410" stroke-width="1.4" fill="none"/>`,
  voleibol: `<circle cx="20" cy="20" r="16" fill="#fff" stroke="#d9d4cc" stroke-width="1.2"/><path d="M20 4c-2 8 0 14 6 18M36 22c-8-3-14-1-18 5M8 31c5-6 6-13 2-21" stroke="#2a78d6" stroke-width="3" fill="none"/><path d="M20 4c-2 8 0 14 6 18" stroke="#ffd35c" stroke-width="3" fill="none" transform="rotate(120 20 20)"/>`,
};
const COURT_ART = {
  futbol: ["#1f9d55", `<rect x="8" y="10" width="144" height="80" rx="4" fill="#27ae60"/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${8 + i * 24}" y="10" width="12" height="80" fill="#2ec46d"/>`).join("")}<rect x="12" y="14" width="136" height="72" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M80 14v72" stroke="#fff" stroke-width="1.6"/><circle cx="80" cy="50" r="12" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="12" y="34" width="16" height="32" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="132" y="34" width="16" height="32" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="8" y="42" width="4" height="16" fill="#fff"/><rect x="148" y="42" width="4" height="16" fill="#fff"/>`],
  beisbol: ["#2e9e5b", `<rect x="8" y="10" width="144" height="80" rx="4" fill="#3fb36b"/><path d="M80 86L30 40a70 70 0 0 1 100 0z" fill="#4fc27b"/><path d="M80 82l-22-22 22-22 22 22z" fill="#c98a52"/><path d="M80 82l-22-22 22-22 22 22z" fill="none" stroke="#fff" stroke-width="1.4"/><circle cx="80" cy="60" r="5" fill="#d9a25a"/><rect x="77" y="79" width="6" height="6" fill="#fff" transform="rotate(45 80 82)"/><rect x="55" y="57" width="5" height="5" fill="#fff"/><rect x="77.5" y="35.5" width="5" height="5" fill="#fff"/><rect x="100" y="57" width="5" height="5" fill="#fff"/><path d="M80 82L20 22M80 82l60-60" stroke="#fff" stroke-width="1.2" opacity=".8"/>`],
  tenis: ["#2a78d6", `<rect x="8" y="10" width="144" height="80" rx="4" fill="#4c9a5a"/><rect x="18" y="16" width="124" height="68" fill="#2a78d6"/><rect x="18" y="16" width="124" height="68" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M18 24h124M18 76h124M48 24v52M112 24v52M48 50h64" stroke="#fff" stroke-width="1.4"/><path d="M80 12v76" stroke="#e8eef5" stroke-width="3"/><path d="M80 12v76" stroke="#2f3438" stroke-width="1" stroke-dasharray="2 2"/>`],
  padel: ["#1c5cab", `<rect x="8" y="10" width="144" height="80" rx="6" fill="#bfe3ff" opacity=".7"/><rect x="14" y="16" width="132" height="68" rx="2" fill="#2a78d6"/><rect x="14" y="16" width="132" height="68" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M38 16v68M122 16v68M38 50h84" stroke="#fff" stroke-width="1.4"/><path d="M80 13v74" stroke="#e8eef5" stroke-width="3"/><path d="M80 13v74" stroke="#2f3438" stroke-width="1" stroke-dasharray="2 2"/><rect x="8" y="10" width="144" height="80" rx="6" fill="none" stroke="#9cd2ff" stroke-width="3"/>`],
  baloncesto: ["#c97c2a", `<rect x="8" y="10" width="144" height="80" rx="4" fill="#e9a65a"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M8 ${20 + i * 10}h144" stroke="#d48b34" stroke-width="1" opacity=".6"/>`).join("")}<rect x="12" y="14" width="136" height="72" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M80 14v72" stroke="#fff" stroke-width="1.6"/><circle cx="80" cy="50" r="10" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="12" y="38" width="22" height="24" fill="#e2612c" stroke="#fff" stroke-width="1.6"/><rect x="126" y="38" width="22" height="24" fill="#e2612c" stroke="#fff" stroke-width="1.6"/><path d="M12 22a40 40 0 0 1 0 56M148 22a40 40 0 0 0 0 56" fill="none" stroke="#fff" stroke-width="1.6"/>`],
  voleibol: ["#d48b34", `<rect x="8" y="10" width="144" height="80" rx="4" fill="#f2d28f"/>${[[30, 30], [60, 70], [110, 24], [130, 72], [96, 56]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#d9b06a"/>`).join("")}<rect x="22" y="20" width="116" height="60" fill="none" stroke="#2a78d6" stroke-width="2"/><path d="M60 20v60M100 20v60" stroke="#2a78d6" stroke-width="1.4"/><path d="M80 14v72" stroke="#fff" stroke-width="3"/><path d="M80 14v72" stroke="#2f3438" stroke-width="1" stroke-dasharray="2 2"/><circle cx="80" cy="14" r="2.5" fill="#2f3438"/><circle cx="80" cy="86" r="2.5" fill="#2f3438"/>`],
};
const SPORT_BG = { futbol: "#d8f2e2", beisbol: "#e3f3e7", tenis: "#e1ecfb", padel: "#dbe8fb", baloncesto: "#fde6d2", voleibol: "#fbefd2" };
const ballArt = id => BALL_ART[id] ? `<svg class="ball-art" viewBox="0 0 40 40" aria-hidden="true">${BALL_ART[id]}</svg>` : "";
function courtArt(id) {
  const c = COURT_ART[id]; if (!c) return "";
  return `<span class="court-art" style="--fa:${SPORT_BG[id]}" aria-hidden="true"><svg viewBox="0 0 160 100"><g>${c[1]}</g><g transform="translate(118 58) scale(.95)"><circle cx="20" cy="38" rx="0" r="0"/><ellipse cx="20" cy="38" rx="13" ry="3" fill="#000" opacity=".18"/>${BALL_ART[id]}</g></svg></span>`;
}

const SPORTS = {"futbol": {"label": "Fútbol", "court": "Cancha de fútbol 7", "desc": "Césped sintético · Hasta 14 personas · Iluminación", "price": 20, "busy": ["17:00", "19:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7.5l3.2 2.3-1.2 3.7h-4l-1.2-3.7z\"/><path d=\"M12 7.5V3.2M15.2 9.8l4-1.4M14 13.5l2.5 3.5M10 13.5l-2.5 3.5M8.8 9.8l-4-1.4\"/></svg>"}, "beisbol": {"label": "Béisbol", "court": "Campo de béisbol", "desc": "Tierra y grama · Hasta 18 personas · Dugouts", "price": 30, "busy": ["16:00", "20:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M7.5 4.3c2 2.2 2.6 5.4 1.6 8.4-.6 1.9-1.8 3.5-3.4 4.7\"/><path d=\"M16.5 19.7c-2-2.2-2.6-5.4-1.6-8.4.6-1.9 1.8-3.5 3.4-4.7\"/></svg>"}, "tenis": {"label": "Tenis", "court": "Cancha de tenis 02", "desc": "Superficie dura · Hasta 4 personas · Iluminación", "price": 12, "busy": ["17:00", "20:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8\"/><path d=\"M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8\"/></svg>"}, "padel": {"label": "Pádel", "court": "Cancha de pádel 01", "desc": "Cristal y césped · Hasta 4 personas · Iluminación", "price": 14, "busy": ["18:00", "21:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><path d=\"M9.5 3.5c3.6 0 6.5 2.6 6.5 6 0 2.3-1.4 4.2-3.4 5.2L11 19.5\"/><path d=\"M9.5 3.5C5.9 3.5 3 6.1 3 9.5c0 2.3 1.4 4.2 3.4 5.2l1.6 4.8\"/><path d=\"M8 19.5h3\"/><circle cx=\"19\" cy=\"17\" r=\"2\"/></svg>"}, "baloncesto": {"label": "Baloncesto", "court": "Cancha de baloncesto", "desc": "Techada · Hasta 10 personas · Tableros reglamentarios", "price": 10, "busy": ["19:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3v18\"/><path d=\"M5.6 5.6c2.3 2.3 2.3 10.5 0 12.8M18.4 5.6c-2.3 2.3-2.3 10.5 0 12.8\"/></svg>"}, "voleibol": {"label": "Voleibol", "court": "Cancha de voleibol", "desc": "Techada · Hasta 12 personas · Red reglamentaria", "price": 10, "busy": ["16:00", "17:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 12c0-4 1.5-7 4-8.2\"/><path d=\"M12 12c-3.5 2-6.8 2.2-8.9.9\"/><path d=\"M12 12c3.5 2 5.4 4.8 5.3 7.3\"/></svg>"}};
const res = { sport: "tenis", day: "12", dname: "Jue", slot: "18:00", mon: 10, yr: 2026 };
const MES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const resMes = () => MES_LARGO[res.mon].slice(0, 3);
const pad2 = n => String(n).padStart(2, "0");
const DAYS_LONG = { Lun: "Lunes", Mar: "Martes", "Mié": "Miércoles", Jue: "Jueves", Vie: "Viernes", "Sáb": "Sábado", Dom: "Domingo" };
function renderReserva() {
  const sp = SPORTS[res.sport];
  document.querySelectorAll("#sportPicker .sport").forEach(b => b.classList.toggle("on", b.dataset.sport === res.sport));
  document.querySelectorAll("#dayPicker .day").forEach(b => b.classList.toggle("on", b.dataset.day === res.day));
  const busy = typeof sbCourtBusyFor === "function" && sbShared() ? sbCourtBusyFor(res.sport, res.iso) : [...sp.busy, ...myCourtSlots(res.sport)];
  if (busy.includes(res.slot)) res.slot = ["16:00","17:00","18:00","19:00","20:00","21:00"].find(t => !busy.includes(t)) || res.slot;
  const full = busy.includes(res.slot);
  document.querySelectorAll("[data-court-pay], [data-r-cta]").forEach(b => { b.disabled = full; });
  document.querySelectorAll("#slotPicker .slot").forEach(b => {
    const t = b.dataset.slot, isBusy = busy.includes(t), on = t === res.slot;
    b.classList.toggle("busy", isBusy); b.disabled = isBusy; b.classList.toggle("on", on);
    b.querySelector("small").textContent = isBusy ? "Ocupado" : on ? "Seleccionado" : "Disponible";
  });
  const end = pad2(parseInt(res.slot) + 1) + ":00";
  const fee = Math.round(sp.price * 5) / 100, total = sp.price + fee;
  const v = {
    label: sp.label, court: sp.court, desc: sp.desc, pricehour: money(sp.price),
    date: `${res.day} ${resMes()} ${res.yr}`, datelong: `${res.dname}, ${res.day} ${resMes()} ${res.yr}`,
    dayhint: full ? `${DAYS_LONG[res.dname]}, ${res.day} de ${MES_LARGO[res.mon]} · No quedan horas libres` : `${DAYS_LONG[res.dname]}, ${res.day} de ${MES_LARGO[res.mon]} · Selecciona una hora`,
    time: `${res.slot} – ${end}`, timeh: `${res.slot} – ${end} · 1 h`,
    rent: money(sp.price), fee: money(fee), total: money(total)
  };
  document.querySelectorAll("[data-r]").forEach(el => {
    const k = el.dataset.r;
    if (k === "icon") { el.innerHTML = el.classList.contains("court-ico") ? courtArt(res.sport) : ballArt(res.sport); el.classList.add("art-on"); } else if (k in v) el.textContent = v[k];
  });
  try { renderMyCourts(); } catch (err) {}
}
document.querySelectorAll("#sportPicker .sport").forEach(b => { const svg = b.querySelector("svg"); if (svg && BALL_ART[b.dataset.sport]) svg.outerHTML = ballArt(b.dataset.sport); });
document.getElementById("sportPicker").addEventListener("click", e => { const b = e.target.closest(".sport"); if (b) { res.sport = b.dataset.sport; renderReserva(); } });
document.getElementById("dayPicker").addEventListener("click", e => { const b = e.target.closest(".day"); if (b && !b.disabled) { res.day = b.dataset.day; res.dname = b.dataset.dname; if (b.dataset.iso) { res.iso = b.dataset.iso; res.mon = +b.dataset.iso.slice(5, 7) - 1; res.yr = +b.dataset.iso.slice(0, 4); } renderReserva(); } });
document.getElementById("slotPicker").addEventListener("click", e => { const b = e.target.closest(".slot"); if (b && !b.disabled) { res.slot = b.dataset.slot; renderReserva(); } });
renderReserva();
/* ---------- Facturas mensuales del trimestre ---------- */
const TRIM_ID = "2026-sep-nov", TRIM_LABEL = "sep–nov 2026";
let MATERIAS = isDemo ? [{ n: "Matemáticas II", c: "BPTMI02" }, { n: "Física II", c: "BPTFI02" }, { n: "Algoritmos y Programación", c: "BPTSP05" }] : [];
try { const sm = JSON.parse(localStorage.getItem(K("nexo-materias")) || "null"); if (sm && sm.trim === TRIM_ID && Array.isArray(sm.list) && !sm.list.some(m => /^[A-Z]{3}-\d{3}$/.test(m.c || ""))) MATERIAS = sm.list.map(m => (m.c && MATDB[m.c]) ? m : findSubject(m.n, myCareer())); } catch (err) {}
const saveMaterias = () => { try { localStorage.setItem(K("nexo-materias"), JSON.stringify({ trim: TRIM_ID, list: MATERIAS })); } catch (err) {} try { sbSaveState(); } catch (err) {} };
const PRICE_REG = 160, PRICE_PP = 150;
const MONTHS = [{ id: "sep", mes: "septiembre", m: 8 }, { id: "oct", mes: "octubre", m: 9 }, { id: "nov", mes: "noviembre", m: 10 }];
const MES_CORTO = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DIA_CORTO = ["dom","lun","mar","mié","jue","vie","sáb"];
const DIA_LARGO = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const fmtD = d => `${String(d.getDate()).padStart(2, "0")} ${MES_CORTO[d.getMonth()]} ${d.getFullYear()}`;
const fmtDW = d => `${DIA_CORTO[d.getDay()]} ${d.getDate()} ${MES_CORTO[d.getMonth()]}`;
const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/* Selectores de fecha y hora propios (sin <input type="date|time">: en es-VE el navegador pone el mes primero
   y la hora en a. m./p. m., y confunde). Fechas de pago: los últimos N días; horas: bloques de 15 min en 24 h. */
function recentDayOpts(n, selected) {
  const t = day0(new Date()), out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i), dm = `${d.getDate()} ${MES_CORTO[d.getMonth()]}`, dw = DIA_CORTO[d.getDay()];
    out.push(`<option value="${isoOf(d)}"${isoOf(d) === selected ? " selected" : ""}>${i === 0 ? "Hoy, " + dm : i === 1 ? "Ayer, " + dm : dw.charAt(0).toUpperCase() + dw.slice(1) + " " + dm}</option>`);
  }
  if (selected && !out.some(o => o.includes(`"${selected}"`))) { const d = new Date(selected + "T12:00"); out.push(`<option value="${selected}" selected>${fmtDW(d)}</option>`); }
  return out.join("");
}
function fillRecentDays(root = document) {
  root.querySelectorAll("select[data-recent-days]").forEach(sel => { const keep = sel.value; sel.innerHTML = recentDayOpts(+sel.dataset.recentDays); sel.value = keep && sel.querySelector(`option[value="${keep}"]`) ? keep : sel.options[0].value; });
}
// Fecha de simulación (modo demostración): todos los días del trimestre, agrupados por mes
(function fillSimDays() {
  const sel = document.getElementById("simDate"); if (!sel) return;
  sel.innerHTML = [[8, "Septiembre"], [9, "Octubre"], [10, "Noviembre"]].map(([m, name]) => `<optgroup label="${name} 2026">${Array.from({ length: new Date(2026, m + 1, 0).getDate() }, (_, i) => { const d = new Date(2026, m, i + 1); return `<option value="${isoOf(d)}">${DIA_CORTO[d.getDay()]} ${i + 1} ${MES_CORTO[m]}</option>`; }).join("")}</optgroup>`).join("");
})();
fillRecentDays();
function timeOpts(selected, from = 5, to = 23) {
  let out = "";
  for (let h = from; h <= to; h++) for (const m of [0, 15, 30, 45]) { const v = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; out += `<option value="${v}"${v === selected ? " selected" : ""}>${v}</option>`; }
  if (selected && !out.includes(`"${selected}"`)) out = `<option value="${selected}" selected>${selected}</option>` + out;
  return out;
}
function secondMonday(y, m) { const first = new Date(y, m, 1); const off = (8 - first.getDay()) % 7; return new Date(y, m, 1 + off + 7); }
function inv(mo) {
  const issue = secondMonday(2026, mo.m);
  return { ...mo, issue, ppEnd: new Date(issue.getFullYear(), issue.getMonth(), issue.getDate() + 4), due: new Date(2026, mo.m, 20) };
}
/* Las 3 facturas aplican siempre: el estudiante está inscrito en todo el trimestre aunque cree su cuenta después.
   Los meses que ya pagó fuera de Nexo los indica en #inscripcion (pagos[id].estado = "externa"). */
const INVOICES = MONTHS.map(inv);

const PAGOS0 = isDemo ? { sep: { estado: "pagada", monto: 450, fecha: "15 sep 2026", via: "Transferencia", pp: true }, oct: { estado: "pagada", monto: 450, fecha: "14 oct 2026", via: "Transferencia", pp: true } } : {};
let pagos, simDate;
try { pagos = JSON.parse(localStorage.getItem(K("nexo-pagos")) || "null"); } catch (err) {}
if (!pagos || typeof pagos !== "object") pagos = JSON.parse(JSON.stringify(PAGOS0));
else pagos = { ...JSON.parse(JSON.stringify(PAGOS0)), ...pagos };
const activeInvoices = () => MATERIAS.length ? INVOICES : [];
const realToday = () => { const t = day0(new Date()); const min = new Date(2026, 8, 1), max = new Date(2026, 10, 30); return t < min ? min : t > max ? max : t; };
try { const s = localStorage.getItem(K("nexo-sim")); simDate = s ? new Date(s + "T12:00") : null; } catch (err) {}
if (!simDate || isNaN(simDate)) simDate = realToday();
const savePagos = () => { try { localStorage.setItem(K("nexo-pagos"), JSON.stringify(pagos)); } catch (err) {} try { sbSaveState(); } catch (err) {} };
const isoD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function statusOf(iv) {
  const p = pagos[iv.id], t = day0(simDate);
  if (p && p.estado === "pagada") return "pagada";
  if (p && p.estado === "revision") return "revision";
  if (p && p.estado === "externa") return "externa";
  if (t < iv.issue) return "futura";
  if (t <= iv.ppEnd) return "pronto";
  if (t <= iv.due) return "pendiente";
  return "vencida";
}
const unitPrice = iv => statusOf(iv) === "pronto" ? PRICE_PP : PRICE_REG;
const amountOf = iv => { const p = pagos[iv.id]; return p && p.monto ? p.monto : unitPrice(iv) * MATERIAS.length; };
const payableInv = () => activeInvoices().filter(iv => ["pronto", "pendiente", "vencida"].includes(statusOf(iv)));
let paySel = [];
function defaultSel() { const p = payableInv(); paySel = p.length ? [p[0].id] : []; }

const ST = { externa: ["ok", "Pagada fuera de Nexo"], pagada: ["ok", "Pagada"], revision: ["neutral", "En revisión"], futura: ["neutral", "Aún no emitida"], pronto: ["ok", "Pronto pago"], pendiente: ["warn", "Pendiente"], vencida: ["warn", "Vencida"] };
function invLine(iv) {
  const s = statusOf(iv), p = pagos[iv.id];
  if (s === "pagada") return `Pagada el ${p.fecha} · ${p.via}${p.pp ? " · con pronto pago" : ""}`;
  if (p && p.estado === "rechazada" && ["pronto", "pendiente", "vencida"].includes(s)) return `Transferencia rechazada: ${p.motivo}. Vuelve a pagarla · ${s === "pronto" ? `Pronto pago hasta el ${fmtDW(iv.ppEnd)}` : s === "pendiente" ? `Vence el ${fmtDW(iv.due)}` : `Venció el ${fmtDW(iv.due)}`}`;
  if (s === "revision") return `Transferencia en revisión · ${p.currency === "bs" ? `${bsAmt(p.paidAmount)} (${money(p.monto)})` : money(p.monto)}${p.ref ? ` · Ref. ${p.ref.slice(-6)}` : ""}`;
  if (s === "externa") return "Indicaste que la pagaste fuera de Nexo · Puedes cambiarlo en Mis materias";
  if (s === "futura") return `Se emite el ${fmtDW(iv.issue)} · Pronto pago hasta el ${fmtDW(iv.ppEnd)}`;
  if (s === "pronto") return `Pronto pago hasta el ${fmtDW(iv.ppEnd)} · Luego ${money(PRICE_REG * MATERIAS.length)}`;
  if (s === "pendiente") return `Vence el ${fmtDW(iv.due)}`;
  return `Venció el ${fmtDW(iv.due)} · Págala cuanto antes`;
}
function renderDebt() {
  const t = day0(simDate);
  document.getElementById("simDate").value = isoD(t);
  document.querySelectorAll("#simChips .pill").forEach(c => { const v = c.dataset.sim === "today" ? isoD(realToday()) : c.dataset.sim; c.classList.toggle("ok", v === isoD(t)); c.classList.toggle("neutral", v !== isoD(t)); });
  document.querySelectorAll("[data-sim-date]").forEach(el => el.textContent = `${DIA_LARGO[t.getDay()]}, ${t.getDate()} ${MES_CORTO[t.getMonth()]} 2026`);

  const pay = payableInv();
  const owed = activeInvoices().filter(iv => ["pronto", "pendiente", "vencida", "revision"].includes(statusOf(iv)));
  const saldo = owed.reduce((a, iv) => a + amountOf(iv), 0);
  const paid = activeInvoices().filter(iv => statusOf(iv) === "pagada").reduce((a, iv) => a + pagos[iv.id].monto, 0);
  const futureInv = activeInvoices().filter(iv => statusOf(iv) === "futura");
  const future = futureInv.length * PRICE_REG * MATERIAS.length;
  const next = pay[0], nextFuture = futureInv[0];
  const review = owed.filter(iv => statusOf(iv) === "revision").length;
  const solvent = owed.length === 0;
  const summary = next
    ? (statusOf(next) === "pronto" ? `Factura de ${next.mes} con pronto pago hasta el ${fmtDW(next.ppEnd)}` : statusOf(next) === "vencida" ? `Factura de ${next.mes} vencida` : `Factura de ${next.mes} · Vence el ${fmtDW(next.due)}`) + (review ? ` · ${review} en revisión` : "")
    : review ? `${review} pago en revisión` : nextFuture ? `Al día · Próxima factura el ${fmtDW(nextFuture.issue)}` : "Trimestre pagado · Sin deuda";
  const vals = {
    saldo: money(saldo), paid: money(paid), future: money(future), summary,
    status: solvent ? "Al día" : next && statusOf(next) === "vencida" ? "Vencida" : "Con deuda",
    pill: solvent ? "Al día" : `Deuda ${money(saldo)}`,
    fact: `${MATERIAS.length} ${MATERIAS.length === 1 ? "materia" : "materias"} · Trimestre ${TRIM_LABEL} · ` + (next ? (statusOf(next) === "pronto" ? `Pronto pago hasta el ${fmtDW(next.ppEnd)}` : `Factura de ${next.mes} por pagar`) : nextFuture ? `Próxima factura el ${fmtDW(nextFuture.issue)}` : "Al día"),
    nextlabel: next ? `Factura de ${next.mes}` : "Sin facturas por pagar",
    nextline: next ? `${money(amountOf(next))} · ${statusOf(next) === "pronto" ? "Pronto pago hasta el " + fmtDW(next.ppEnd) : "Vence el " + fmtDW(next.due)}` : "",
    cta: next ? `Pagar factura de ${next.mes} · ${money(amountOf(next))}` : "",
    idle: nextFuture ? `No tienes facturas por pagar hoy. La de ${nextFuture.mes} se emite el ${fmtDW(nextFuture.issue)}: si la pagas antes del ${fmtDW(nextFuture.ppEnd)}, cuesta ${money(PRICE_PP * MATERIAS.length)}.` : "No tienes facturas por pagar en este trimestre."
  };
  if (!MATERIAS.length) Object.assign(vals, { saldo: money(0), summary: "Registra tus materias para ver tus facturas del trimestre", status: "Sin materias", pill: "Registra tus materias", fact: `Indica cuántas materias inscribiste en el trimestre ${TRIM_LABEL}`, idle: "Registra tus materias para calcular tus facturas." });
  document.querySelectorAll("[data-debt]").forEach(el => {
    const k = el.dataset.debt; if (!(k in vals)) return;
    el.textContent = vals[k];
    if (k === "status" || k === "pill") { const bad = !solvent || !MATERIAS.length; el.classList.toggle("warn", bad); el.classList.toggle("ok", !bad); }
  });
  document.querySelectorAll('[data-debt-show="unpaid"]').forEach(el => el.hidden = !next);
  document.querySelectorAll('[data-debt-show="paidall"]').forEach(el => el.hidden = !!next);
  const pc = document.getElementById("pendCard");
  if (pc) pc.querySelector("[data-pend-empty]").hidden = [...pc.querySelectorAll(".quick")].some(q => !q.hidden);

  document.getElementById("cuotasList").innerHTML = INVOICES.map((iv, i) => { if (!MATERIAS.length) return ""; const s = statusOf(iv);
    return `<div class="cuota"><span class="ico"><i data-lucide="${s === "pagada" || s === "externa" ? "circle-check" : s === "futura" ? "lock" : "file-text"}"></i></span>
      <div class="grow"><b>Factura de ${iv.mes}</b><span class="tiny">${invLine(iv)}</span></div>
      <div class="mv-actions"><b class="mono">${s === "futura" ? "desde " + money(PRICE_PP * MATERIAS.length) : s === "externa" ? "—" : money(amountOf(iv))}${["pronto", "pendiente", "vencida"].includes(s) ? bsTag(amountOf(iv)) : ""}</b><span class="pill ${ST[s][0]}">${ST[s][1]}</span></div></div>`; }).join("");

  const ci = document.getElementById("currentInvoice");
  if (next) {
    const s = statusOf(next), u = unitPrice(next), pp = s === "pronto";
    const daysLeft = Math.round((next.ppEnd - t) / 864e5);
    ci.hidden = false;
    ci.innerHTML = `<div class="row"><div><h2 class="h2">Factura de ${next.mes}</h2><p class="tiny">Emitida el ${fmtDW(next.issue)} · Vence el ${fmtDW(next.due)}</p></div><span class="pill ${ST[s][0]}">${ST[s][1]}</span></div>
      ${pp ? `<div class="inv-pp"><i data-lucide="badge-percent"></i><div><b>Pronto pago: ${money(PRICE_PP)} por materia</b>Paga ${daysLeft === 0 ? "hoy" : `antes del ${fmtDW(next.ppEnd)} (${daysLeft === 1 ? "queda 1 día" : `quedan ${daysLeft} días`})`} y ahorras ${money((PRICE_REG - PRICE_PP) * MATERIAS.length)}.</div></div>` : ""}
      ${s === "vencida" ? `<div class="notice warn"><i data-lucide="circle-alert"></i><p>Esta factura venció el ${fmtDW(next.due)}. Págala para quedar al día.</p></div>` : ""}
      ${MATERIAS.map(m => `<div class="kv"><span>${m.n} · ${m.c}</span><b>${pp ? `<span class="strike">${money(PRICE_REG)}</span>` : ""}${money(u)}</b></div>`).join("")}
      <div class="sep"></div>
      <div class="kv total"><span>Total de la factura</span><b>${pp ? `<span class="strike">${money(PRICE_REG * MATERIAS.length)}</span>` : ""}${money(u * MATERIAS.length)}</b></div>
      <div class="kv"><span>En bolívares · tasa BCV ${bcvDateTxt()}</span><b>${bsOf(u * MATERIAS.length)}</b></div>
      <button class="btn ghost" type="button" data-go="caja"><i data-lucide="credit-card"></i>Pagar esta factura</button>`;
  } else {
    ci.hidden = !nextFuture && !review;
    ci.innerHTML = nextFuture ? `<div class="row start"><span class="ico lg"><i data-lucide="calendar-check"></i></span><div><h2 class="h2">Estás al día</h2><p class="small" style="font-size:13px">${vals.idle}</p></div></div>` : review ? `<div class="row start"><span class="ico lg"><i data-lucide="clock"></i></span><div><h2 class="h2">Pago en revisión</h2><p class="small" style="font-size:13px">La universidad está validando tu transferencia.</p></div></div>` : "";
  }

  const future2 = activeInvoices().filter(iv => statusOf(iv) === "futura");
  document.getElementById("cuotaPicker").innerHTML = pay.map(iv => `
    <button class="cuota-pick${paySel.includes(iv.id) ? " on" : ""}" type="button" data-cuota="${iv.id}"><span class="box">${paySel.includes(iv.id) ? "✓" : ""}</span>
      <span class="grow"><b>Factura de ${iv.mes}</b><span class="tiny">${invLine(iv)}</span></span><b class="mono">${money(amountOf(iv))}</b></button>`).join("")
    + future2.map(iv => `<div class="cuota-pick locked" aria-disabled="true"><span class="box"><i data-lucide="lock"></i></span><span class="grow"><b>Factura de ${iv.mes}</b><span class="tiny">Disponible desde el ${fmtDW(iv.issue)} · No se aceptan pagos adelantados</span></span></div>`).join("");

  const sel = activeInvoices().filter(iv => paySel.includes(iv.id));
  const total = sel.reduce((a, iv) => a + amountOf(iv), 0);
  const disc = sel.filter(iv => statusOf(iv) === "pronto").length * (PRICE_REG - PRICE_PP) * MATERIAS.length;
  const lines = sel.length ? sel.map(iv => `<div class="kv"><span>Factura de ${iv.mes} · ${MATERIAS.length} materias</span><b>${money(PRICE_REG * MATERIAS.length)}</b></div>`).join("")
    + (disc ? `<div class="kv"><span>Descuento pronto pago</span><b class="pos">−${money(disc)}</b></div>` : "") : `<p class="small">No hay facturas seleccionadas.</p>`;
  ["paySel", "paySel2"].forEach(id => document.getElementById(id).innerHTML = lines);
  document.querySelectorAll('[data-pay="total"]').forEach(el => el.textContent = money(total));
  document.querySelectorAll('[data-pay="after"]').forEach(el => el.textContent = money(saldo - total));
  document.querySelectorAll('[data-pay="cta"]').forEach(el => el.textContent = `Pagar ${money(total)}`);
  document.querySelectorAll('[data-pay="lead"]').forEach(el => el.textContent = sel.length ? sel.map(iv => `Factura de ${iv.mes}`).join(" + ") + ` · ${money(total)}` : "No hay facturas por pagar");
  document.querySelectorAll("[data-pay-gate], [data-pay-card]").forEach(b => { b.disabled = !sel.length; b.style.opacity = sel.length ? "" : ".5"; });
  try { utRefresh(); } catch (err) {} // formulario de transferencia (se define más abajo)
  if (typeof renderNotifs === "function" && document.getElementById("notifList")) try { renderNotifs(); } catch (err) {}
  try { lucide.createIcons(); } catch (err) {}
}
function setSim(d) { simDate = d; try { localStorage.setItem(K("nexo-sim"), isoD(d)); } catch (err) {} defaultSel(); document.getElementById("debtNotice").hidden = true; renderDebt(); }
document.getElementById("simDate").addEventListener("change", e => { if (e.target.value) setSim(new Date(e.target.value + "T12:00")); });
document.getElementById("simChips").addEventListener("click", e => { const c = e.target.closest("[data-sim]"); if (c) setSim(c.dataset.sim === "today" ? realToday() : new Date(c.dataset.sim + "T12:00")); });
document.getElementById("cuotaPicker").addEventListener("click", e => {
  const b = e.target.closest("[data-cuota]"); if (!b) return;
  const ids = payableInv().map(iv => iv.id), i = ids.indexOf(b.dataset.cuota);
  paySel = paySel.includes(b.dataset.cuota) ? ids.slice(0, i) : ids.slice(0, i + 1);
  renderDebt();
});
let moves = [];
try { moves = JSON.parse(localStorage.getItem(K("nexo-moves")) || "[]") || []; } catch (err) {}
function drawMovement(m) {
  const card = document.getElementById("mvCount").closest(".card");
  const el = document.createElement("div");
  el.className = "move"; if (m.id) el.dataset.mv = m.id;
  el.innerHTML = `<span class="ico"><i data-lucide="${m.icon || "graduation-cap"}"></i></span><div class="info"><b>${m.title}</b><span>${m.detail}</span><br><span>${m.date}</span></div>
    <div class="mv-actions"><span class="amt${m.amount.startsWith("+") ? " pos" : ""}">${m.amount}</span><span class="pill ${m.pillCls}">${m.pill}</span><button class="link b" type="button" data-go="${m.go || "materias"}"${m.order ? ` data-order="${m.order}"` : ""} style="font-size:12px">${(m.goLabel || "Ver estado de cuenta →").replace("›", "→")}</button></div>`;
  card.querySelector("h2").after(el);
}
function addMovement(title, detail, amount, pill, pillCls, extra = {}) {
  try { trackMove(title, detail, amount, pill, extra); } catch (err) {}
  const m = { id: "m" + Date.now(), title, detail, amount, pill, pillCls, date: fmtD(day0(simDate)), ...extra };
  moves.push(m);
  try { localStorage.setItem(K("nexo-moves"), JSON.stringify(moves)); } catch (err) {}
  try { sbSaveState(); } catch (err) {}
  drawMovement(m);
  refreshActivity();
}
function refreshActivity() {
  const card = document.getElementById("mvCount").closest(".card");
  const pills = [...card.querySelectorAll(".move .pill")].map(p => p.textContent);
  document.getElementById("mvCount").textContent = card.querySelectorAll(".move").length;
  document.getElementById("stPaid").textContent = pills.filter(x => x === "Pagado").length;
  document.getElementById("stPend").textContent = pills.filter(x => x === "En revisión").length;
  document.getElementById("stRef").textContent = pills.filter(x => x === "Reembolsado").length;
  document.getElementById("mvEmpty").hidden = card.querySelectorAll(".move").length > 0;
}
moves.forEach(drawMovement);
refreshActivity();
function showDebtNotice(title, text) {
  const n = document.getElementById("debtNotice");
  n.querySelector('[data-debt-msg="title"]').textContent = title;
  n.querySelector('[data-debt-msg="text"]').textContent = " " + text;
  n.hidden = false;
}

/* ---------- Tarjetas afiliadas ---------- */
const CARDS0 = [
  { id: "c1", brand: "visa", last4: "4242", exp: "08/28", type: "Débito" },
  { id: "c2", brand: "mc", last4: "5454", exp: "12/27", type: "Crédito" },
  { id: "c3", brand: "amex", last4: "1005", exp: "03/29", type: "Crédito" }
];
let cards;
try { cards = JSON.parse(localStorage.getItem(K("nexo-cards")) || "null"); } catch (err) {}
if (!Array.isArray(cards)) cards = isDemo ? JSON.parse(JSON.stringify(CARDS0)) : [];
const saveCards = () => { try { localStorage.setItem(K("nexo-cards"), JSON.stringify(cards)); } catch (err) {} };
const BRAND_LABEL = { visa: "Visa", mc: "Mastercard", amex: "American Express", "": "Tarjeta" };
const BRAND_CHIP = { visa: "VISA", mc: "Mastercard", amex: "AMEX", "": "Tarjeta" };
const cardLabel = c => `${BRAND_LABEL[c.brand]} ···· ${c.last4}`;
let selectedCardId = cards[0] ? cards[0].id : "new", pendingDelete = null, affiliate = true;
function renderCards() {
  const box = document.getElementById("cardPicker");
  if (selectedCardId !== "new" && !cards.find(c => c.id === selectedCardId)) selectedCardId = cards[0] ? cards[0].id : "new";
  box.innerHTML = cards.length ? cards.map(c => pendingDelete === c.id
    ? `<div class="delconfirm"><span>¿Eliminar ${cardLabel(c)} de tu cuenta?</span><div class="acts"><button type="button" data-del-cancel>Cancelar</button><button type="button" class="danger" data-del-ok="${c.id}">Eliminar</button></div></div>`
    : `<div class="cardrow"><button class="opt cardopt${selectedCardId === c.id ? " on" : ""}" type="button" data-card="${c.id}"><span class="dot"></span><span class="brand-chip ${c.brand}">${BRAND_CHIP[c.brand]}</span><span class="grow">${cardLabel(c)}<br><span class="small" style="font-weight:400">${user.full} · Vence ${c.exp}</span></span><span class="pill neutral">${c.type}</span></button><button class="del" type="button" data-del="${c.id}" aria-label="Eliminar ${cardLabel(c)}"><i data-lucide="trash-2"></i></button></div>`).join("")
    : `<p class="small">No tienes tarjetas afiliadas. Usa una tarjeta nueva y elige si quieres afiliarla.</p>`;
  const isNew = selectedCardId === "new";
  document.getElementById("useNewCard").classList.toggle("on", isNew);
  document.getElementById("newCardForm").hidden = !isNew;
  const st = ncState();
  document.querySelectorAll('[data-pay="card"]').forEach(el => el.textContent = isNew ? (st.last4 ? `${st.label} ···· ${st.last4}` : "Tarjeta nueva") : cardLabel(cards.find(c => c.id === selectedCardId)));
  try { lucide.createIcons(); } catch (err) {}
}
document.getElementById("tarjeta").addEventListener("click", e => {
  const del = e.target.closest("[data-del]"); if (del) { pendingDelete = del.dataset.del; renderCards(); return; }
  if (e.target.closest("[data-del-cancel]")) { pendingDelete = null; renderCards(); return; }
  const ok = e.target.closest("[data-del-ok]");
  if (ok) { const c = cards.find(x => x.id === ok.dataset.delOk); cards = cards.filter(x => x.id !== ok.dataset.delOk); pendingDelete = null; saveCards(); renderCards(); toast(`${cardLabel(c)} se eliminó de tu cuenta.`); return; }
  const opt = e.target.closest(".cardopt"); if (opt) { selectedCardId = opt.dataset.card; pendingDelete = null; renderCards(); return; }
  const af = e.target.closest("[data-affil]");
  if (af) { affiliate = af.dataset.affil === "1"; document.querySelectorAll("#affilSeg button").forEach(b => { const on = b === af; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); }); }
});
/* tarjeta nueva: formato, marca y validación */
function brandOf(d) { if (/^4/.test(d)) return "visa"; if (/^(5[1-5]|2[2-7])/.test(d)) return "mc"; if (/^3[47]/.test(d)) return "amex"; return ""; }
function ncState() {
  const d = document.getElementById("nc-num").value.replace(/\D/g, "");
  const b = brandOf(d);
  return { digits: d, brand: b, label: BRAND_LABEL[b], last4: d.length >= 4 ? d.slice(-4) : "" };
}
function luhn(d) { let s = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; } return s % 10 === 0; }
function fmtNum(d, b) { return b === "amex" ? [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(" ") : d.match(/.{1,4}/g)?.join(" ") || ""; }
function renderNC() {
  const st = ncState(), b = st.brand, max = b === "amex" ? 15 : 16;
  const d = st.digits.slice(0, max);
  document.getElementById("nc-num").value = fmtNum(d, b);
  const cvv = document.getElementById("nc-cvv"); cvv.maxLength = b === "amex" ? 4 : 3; cvv.value = cvv.value.replace(/\D/g, "").slice(0, cvv.maxLength);
  document.querySelector('[data-nc-hint="cvv"]').textContent = b === "amex" ? "4 dígitos al frente de la tarjeta." : "3 dígitos al reverso.";
  const chip = document.getElementById("ncBrand"); chip.className = "brand-chip " + b; chip.textContent = BRAND_CHIP[b];
  const pv = document.getElementById("ncPreview"); pv.className = "card-preview " + b;
  pv.querySelector('[data-nc="brand"]').textContent = BRAND_CHIP[b];
  const mask = b === "amex" ? "•••• •••••• •••••" : "•••• •••• •••• ••••";
  let out = "", j = 0;
  for (const ch of mask) { if (ch === " ") out += " "; else { out += d[j] ?? "•"; j++; } }
  pv.querySelector('[data-nc="num"]').textContent = out;
  pv.querySelector('[data-nc="name"]').textContent = document.getElementById("nc-name").value.toUpperCase() || "NOMBRE EN LA TARJETA";
  pv.querySelector('[data-nc="exp"]').textContent = document.getElementById("nc-exp").value || "MM/AA";
  if (selectedCardId === "new") document.querySelectorAll('[data-pay="card"]').forEach(el => el.textContent = st.last4 ? `${st.label} ···· ${st.last4}` : "Tarjeta nueva");
}
document.getElementById("newCardForm").addEventListener("input", e => {
  if (e.target.id === "nc-exp") {
    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
    e.target.value = v;
  }
  e.target.closest(".field")?.classList.remove("bad");
  renderNC();
});
function validateNC() {
  const st = ncState(), errs = [];
  const mark = (id, msg) => { document.getElementById(id).closest(".field").classList.add("bad"); errs.push(msg); };
  const len = st.brand === "amex" ? 15 : 16;
  if (!st.brand) mark("nc-num", "Solo aceptamos Visa, Mastercard o American Express.");
  else if (st.digits.length !== len || !luhn(st.digits)) mark("nc-num", `Revisa el número: una ${st.label} tiene ${len} dígitos.`);
  if (!document.getElementById("nc-name").value.trim()) mark("nc-name", "Escribe el nombre como aparece en la tarjeta.");
  const m = document.getElementById("nc-exp").value.match(/^(\d{2})\/(\d{2})$/);
  if (!m || +m[1] < 1 || +m[1] > 12 || (2000 + +m[2]) * 12 + +m[1] < 2026 * 12 + 11) mark("nc-exp", "Revisa el vencimiento (MM/AA).");
  const cl = st.brand === "amex" ? 4 : 3;
  if (document.getElementById("nc-cvv").value.length !== cl) mark("nc-cvv", `El código tiene ${cl} dígitos.`);
  return errs;
}
document.addEventListener("click", e => {
  if (e.target.closest("[data-pay-card]")) {
    const sel = activeInvoices().filter(iv => paySel.includes(iv.id) && payableInv().includes(iv)); if (!sel.length) return;
    let label, affNote = "";
    if (selectedCardId === "new") {
      const errs = validateNC();
      if (errs.length) { toast(errs[0]); return; }
      const st = ncState(); label = `${st.label} ···· ${st.last4}`;
      if (affiliate) {
        cards.push({ id: "c" + Date.now(), brand: st.brand, last4: st.last4, exp: document.getElementById("nc-exp").value, type: "Crédito" });
        saveCards(); selectedCardId = cards[cards.length - 1].id; affNote = " La tarjeta quedó afiliada a tu cuenta.";
      } else affNote = " La tarjeta no se guardó.";
      document.getElementById("newCardForm").reset(); renderNC();
    } else label = cardLabel(cards.find(c => c.id === selectedCardId));
    const t = day0(simDate);
    let total = 0;
    sel.forEach(iv => { const pp = statusOf(iv) === "pronto", m = amountOf(iv); total += m; pagos[iv.id] = { estado: "pagada", monto: m, fecha: fmtD(t), via: label, pp }; });
    savePagos();
    addMovement(sel.map(iv => `Factura de ${iv.mes}`).join(" + "), `Universidad · ${label}`, "−" + money(total), "Pagado", "ok");
    defaultSel(); renderDebt(); renderCards();
    showDebtNotice("Pago confirmado.", `Pagaste ${money(total)} con ${label}. Tu saldo ya está actualizado.${affNote}`);
    go("materias");
    return;
  }
  if (e.target.closest("[data-debt-reset]")) {
    pagos = JSON.parse(JSON.stringify(PAGOS0)); savePagos();
    cards = isDemo ? JSON.parse(JSON.stringify(CARDS0)) : []; saveCards();
    simDate = realToday(); try { localStorage.removeItem(K("nexo-sim")); } catch (err) {}
    defaultSel(); renderDebt(); renderCards();
    document.getElementById("debtNotice").hidden = true;
    toast("Datos de ejemplo restablecidos.");
  }
});
defaultSel(); renderDebt(); renderNC(); renderCards();
/* ---------- Central de notificaciones ---------- */
const NCATS = {
  estacionamiento: { label: "Estacionamiento", icon: "car-front", desc: "Vencimiento de tu plan y saldo de la wallet" },
  universidad: { label: "Universidad", icon: "graduation-cap", desc: "Facturas emitidas, pronto pago y vencimientos" },
  canchas: { label: "Canchas", icon: "dribbble", desc: "Turnos que se liberan en las canchas" },
  comida: { label: "Comida", icon: "utensils", desc: "Descuentos y ofertas de locales y kioscos" },
  soporte: { label: "Soporte", icon: "message-circle", desc: "Respuestas a tus solicitudes" }
};
let nRead = {}, nPrefs = {}, nFilter = "all";
try { nRead = JSON.parse(localStorage.getItem(K("nexo-nread")) || "{}") || {}; nPrefs = JSON.parse(localStorage.getItem(K("nexo-nprefs")) || "{}") || {}; } catch (err) {}
const saveN = () => { try { localStorage.setItem(K("nexo-nread"), JSON.stringify(nRead)); localStorage.setItem(K("nexo-nprefs"), JSON.stringify(nPrefs)); } catch (err) {} };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
function buildNotifs() {
  const t = day0(simDate), list = [];
  const push = n => { if (n.when <= t) list.push(n); };
  // Estacionamiento: vence el plan mensual el 01 dic 2026
  const planEnd = plan ? new Date(plan.end + "T12:00") : new Date(2026, 11, 1), left = Math.round((day0(planEnd) - t) / 864e5);
  const pn = plan ? plan.name.toLowerCase() : "", pe = fmtD(planEnd);
  if (!isDemo) push({ id: "welcome", cat: "soporte", when: day0(createdAt) <= t ? day0(createdAt) : t, title: "Te damos la bienvenida a Nexo", body: "Aquí verás avisos de tus facturas, tu estacionamiento, turnos libres en canchas y ofertas de comida.", go: "servicios" });
  if (plan && plan.paidOn) push({ id: `plan-paid-${plan.paidOn}`, cat: "estacionamiento", when: day0(new Date(plan.paidOn + "T12:00")) <= t ? day0(new Date(plan.paidOn + "T12:00")) : t, title: `Activaste tu plan ${pn}`, body: `Válido hasta el ${pe}. Tu credencial ya está disponible.`, go: "acceso" });
  if (!plan) {} else if (left < 0) push({ id: `plan-exp-${plan.end}`, cat: "estacionamiento", alert: true, when: addDays(day0(planEnd), 1), title: `Tu plan ${pn} venció`, body: `Venció el ${pe}. Renuévalo para seguir entrando sin hacer fila.`, go: "planes" });
  else if (left <= 7) push({ id: `plan-7-${plan.end}`, cat: "estacionamiento", alert: true, when: addDays(day0(planEnd), -7) <= t ? addDays(day0(planEnd), -7) : t, title: left === 0 ? `Tu plan ${pn} vence hoy` : `Tu plan ${pn} vence en ${left} ${left === 1 ? "día" : "días"}`, body: `Vence el ${pe}. Renuévalo con tu wallet Nexo.`, go: "planes" });
  else if (left <= 30) push({ id: `plan-30-${plan.end}`, cat: "estacionamiento", when: addDays(day0(planEnd), -30) <= t ? addDays(day0(planEnd), -30) : t, title: `Tu plan ${pn} vence el ${pe}`, body: "Te avisaremos otra vez una semana antes. Si lo renuevas ahora, el nuevo período empieza al terminar el actual.", go: "planes" });
  if (isDemo && WALLET < 52) push({ id: "wallet-low", cat: "estacionamiento", when: addDays(day0(planEnd), -10) <= t ? addDays(day0(planEnd), -10) : t, title: `Tu wallet tiene ${money(WALLET)}`, body: "No alcanza para los planes bimestral ($52,00) ni trimestral ($75,00). Recarga si quieres cambiar de plan.", go: "recarga" });
  // Universidad: facturas
  activeInvoices().forEach(iv => {
    const s = statusOf(iv), amt = money(amountOf(iv));
    if (t < iv.issue) push({ id: `inv-${iv.id}-soon`, cat: "universidad", when: addDays(iv.issue, -5), title: `La factura de ${iv.mes} se emite el ${fmtDW(iv.issue)}`, body: `Págala antes del ${fmtDW(iv.ppEnd)} y cada materia te cuesta ${money(PRICE_PP)} en lugar de ${money(PRICE_REG)}.`, go: "materias" });
    if (s === "pagada") { push({ id: `inv-${iv.id}-paid`, cat: "universidad", when: PAGOS0[iv.id] ? addDays(iv.issue, 2) : t, title: `Recibimos el pago de la factura de ${iv.mes}`, body: `${money(pagos[iv.id].monto)} · ${pagos[iv.id].via}${pagos[iv.id].pp ? " · con pronto pago" : ""}.`, go: "materias" }); }
    if (pagos[iv.id] && pagos[iv.id].estado === "rechazada") push({ id: `inv-${iv.id}-rej-${pagos[iv.id].rejectedAt}`, cat: "universidad", alert: true, when: t, title: `Rechazamos tu transferencia de ${iv.mes}`, body: `${pagos[iv.id].motivo}. Revisa los datos y vuelve a pagarla.`, go: "materias" });
    if (s === "revision") push({ id: `inv-${iv.id}-rev`, cat: "universidad", when: t, title: `Tu transferencia de ${iv.mes} está en revisión`, body: "Te avisaremos cuando la universidad la valide.", go: "materias" });
    if (["pronto", "pendiente", "vencida"].includes(s) || (s === "pagada" || s === "revision") && t >= iv.issue) {
      push({ id: `inv-${iv.id}-issued`, cat: "universidad", when: iv.issue, title: `Ya puedes pagar la factura de ${iv.mes}`, body: `Pronto pago hasta el ${fmtDW(iv.ppEnd)}: ${money(PRICE_PP * MATERIAS.length)} en lugar de ${money(PRICE_REG * MATERIAS.length)}.`, go: s === "pagada" ? "materias" : "caja" });
    }
    if (s === "pronto") push({ id: `inv-${iv.id}-pplast`, cat: "universidad", alert: true, when: addDays(iv.ppEnd, -1), title: "El pronto pago termina mañana", body: `Paga la factura de ${iv.mes} antes del ${fmtDW(iv.ppEnd)} por ${amt} y ahorra ${money((PRICE_REG - PRICE_PP) * MATERIAS.length)}.`, go: "caja" });
    if (s === "pendiente") push({ id: `inv-${iv.id}-due`, cat: "universidad", when: addDays(iv.ppEnd, 1), title: `Terminó el pronto pago de ${iv.mes}`, body: `Tu factura ahora es de ${amt} y vence el ${fmtDW(iv.due)}.`, go: "caja" });
    if (s === "vencida") push({ id: `inv-${iv.id}-late`, cat: "universidad", alert: true, when: addDays(iv.due, 1), title: `Tu factura de ${iv.mes} está vencida`, body: `Venció el ${fmtDW(iv.due)}. Págala por ${amt} para quedar al día.`, go: "caja" });
  });
  // Canchas: turnos que se liberan (ejemplos)
  push({ id: `cancha-padel-${isoD(t)}`, cat: "canchas", when: t, title: "Se liberó un turno en la Cancha de pádel 01", body: "Hoy a las 19:00 · $14,00 la hora. Resérvalo antes de que lo tome alguien más.", go: "reserva", sport: "padel", slot: "19:00" });
  push({ id: `cancha-futbol-${isoD(t)}`, cat: "canchas", when: t, title: "Hay turnos libres en la Cancha de fútbol 7", body: "Hoy a las 16:00, 18:00 y 21:00 · $20,00 la hora.", go: "reserva", sport: "futbol", slot: "18:00" });
  // Comida: descuentos (ejemplos)
  push({ id: `food-pp-${isoD(t)}`, cat: "comida", when: t, title: "Pincho Pan · 10 % de descuento en el almuerzo del día", body: "Hoy de 11:30 a 13:00: $7,65 en lugar de $8,50. Retiro en la Feria Central.", go: "local" });
  push({ id: `food-believe-${isoD(t)}`, cat: "comida", when: addDays(t, -1), title: "Kiosco Believe · 2x1 en bebidas", body: "De 14:00 a 16:00. Válido en el kiosco.", go: "comida" });
  try { foodNotifs(t).forEach(push); } catch (err) {} // pedidos listos (módulo de comida)
  try { pendRec.filter(r => r.estado === "aprobada" || r.estado === "rechazada").forEach(r => push(r.estado === "aprobada"
    ? { id: `rec-ok-${r.id}`, cat: "estacionamiento", when: t, title: `Acreditamos tu recarga de ${money(r.amount)}`, body: "Tu Pago Móvil fue validado y el saldo ya está en tu wallet Nexo.", go: "recarga" }
    : { id: `rec-rej-${r.id}`, cat: "estacionamiento", alert: true, when: t, title: `Rechazamos tu recarga de ${money(r.amount)}`, body: `${r.motivo}. Revisa los datos y regístrala de nuevo.`, go: "recarga" })); } catch (err) {} // pendRec se define más abajo
  // Soporte
  if (isDemo) push({ id: "tk-1048", cat: "soporte", when: addDays(t, -1), title: "Lucía respondió tu solicitud TK-1048", body: "Cobro duplicado de almuerzo: estamos revisando tu comprobante.", go: "soporte" });
  return list.filter(n => nPrefs[n.cat] !== false).sort((a, b) => b.when - a.when || (b.alert ? 1 : 0) - (a.alert ? 1 : 0));
}
function relDay(d) {
  const diff = Math.round((day0(simDate) - d) / 864e5);
  return diff === 0 ? "Hoy" : diff === 1 ? "Ayer" : diff < 7 ? `Hace ${diff} días` : fmtD(d);
}
let lastNotifs = [];
function renderNotifs() {
  const all = buildNotifs(); lastNotifs = all;
  const unread = all.filter(n => !nRead[n.id]).length;
  document.querySelectorAll("[data-notif-badge]").forEach(b => { b.hidden = unread === 0; b.textContent = unread > 9 ? "9+" : unread; });
  document.querySelectorAll('[aria-label^="Notificaciones"]').forEach(b => b.setAttribute("aria-label", unread ? `Notificaciones, ${unread} sin leer` : "Notificaciones"));
  const lead = document.getElementById("notifLead");
  if (lead) lead.textContent = unread ? `Tienes ${unread} ${unread === 1 ? "aviso sin leer" : "avisos sin leer"}.` : "Estás al día. No tienes avisos sin leer.";
  document.querySelectorAll("#notifFilter .pill").forEach(c => { const on = c.dataset.nf === nFilter; c.classList.toggle("ok", on); c.classList.toggle("neutral", !on); const k = c.dataset.nf; const n = all.filter(x => (k === "all" || x.cat === k) && !nRead[x.id]).length; c.textContent = (k === "all" ? "Todas" : NCATS[k].label) + (n ? ` · ${n}` : ""); c.hidden = k !== "all" && nPrefs[k] === false; });
  const shown = all.filter(n => nFilter === "all" || n.cat === nFilter);
  const t = day0(simDate);
  const today = shown.filter(n => +day0(n.when) === +t), older = shown.filter(n => +day0(n.when) !== +t);
  const item = n => `<button class="notif${nRead[n.id] ? "" : " unread"}" type="button" data-notif="${n.id}">
      <span class="ico${n.alert ? " alert" : ""}"><i data-lucide="${n.alert ? "circle-alert" : NCATS[n.cat].icon}"></i></span>
      <span class="grow"><b>${n.title}</b><span class="body">${n.body}</span><span class="meta"><span>${NCATS[n.cat].label}</span><span>·</span><span>${relDay(n.when)}</span></span></span>
      <i data-lucide="chevron-right" style="color:var(--muted);font-size:18px;margin-top:10px"></i></button>`;
  const box = document.getElementById("notifList");
  box.innerHTML = shown.length
    ? (today.length ? `<p class="ngroup">HOY</p>` + today.map(item).join("") : "") + (older.length ? `<p class="ngroup">ANTERIORES</p>` + older.map(item).join("") : "")
    : emptyState("bell-off", "No hay avisos en este tema", "Cuando haya novedades aquí, te las mostraremos.", nFilter !== "all" ? `<button class="btn ghost sm" type="button" data-nf="all">Ver todos los avisos</button>` : "");
  document.getElementById("notifPrefs").innerHTML = Object.entries(NCATS).map(([k, c]) => `
    <div class="npref"><span class="ico"><i data-lucide="${c.icon}"></i></span><div class="grow"><b>${c.label}</b><span class="tiny">${c.desc}</span></div>
      <button class="switch" type="button" role="switch" aria-checked="${nPrefs[k] !== false}" aria-label="Recibir avisos de ${c.label}" data-npref="${k}"></button></div>`).join("");
  try { lucide.createIcons(); } catch (err) {}
}
document.getElementById("notificaciones").addEventListener("click", e => {
  const f = e.target.closest("[data-nf]"); if (f) { nFilter = f.dataset.nf; renderNotifs(); return; }
  const sw = e.target.closest("[data-npref]"); if (sw) { const k = sw.dataset.npref; nPrefs[k] = nPrefs[k] === false; if (nPrefs[k] === false && nFilter === k) nFilter = "all"; saveN(); renderNotifs(); toast(nPrefs[k] === false ? `Ya no verás avisos de ${NCATS[k].label.toLowerCase()}.` : `Volverás a ver avisos de ${NCATS[k].label.toLowerCase()}.`); return; }
  if (e.target.closest("#notifReadAll")) {
    const prev = { ...nRead };
    lastNotifs.forEach(n => nRead[n.id] = true); saveN(); renderNotifs();
    toast("Todas las notificaciones están leídas.", { action: "Deshacer", onAction: () => { nRead = prev; saveN(); renderNotifs(); toast("Las dejamos como estaban."); } });
    return;
  }
  const it = e.target.closest("[data-notif]");
  if (it) {
    const n = lastNotifs.find(x => x.id === it.dataset.notif); if (!n) return;
    nRead[n.id] = true; saveN();
    if (n.sport) { res.sport = n.sport; res.day = String(day0(simDate).getDate()); res.dname = DIA_CORTO[day0(simDate).getDay()][0].toUpperCase() + DIA_CORTO[day0(simDate).getDay()].slice(1); if (!document.querySelector(`#dayPicker [data-day="${res.day}"]`)) { res.day = "12"; res.dname = "Jue"; } res.slot = n.slot; renderReserva(); }
    if (n.order) trackId = n.order;
    renderNotifs(); go(n.go);
  }
});
renderNotifs();
/* ---------- Iniciar sesión: solo cuentas que existen ---------- */
function loginError(title, text, offerSignup) {
  const box = document.getElementById("loginError");
  box.querySelector('[data-le="title"]').textContent = title + " ";
  box.querySelector('[data-le="text"]').textContent = text;
  document.getElementById("loginToSignup").hidden = !offerSignup;
  box.hidden = false;
}
document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const idEl = document.getElementById("l-mail"), passEl = document.getElementById("l-pass");
  [idEl, passEl].forEach(i => i.closest(".field").classList.remove("bad"));
  const ident = idEl.value.trim(), pass = passEl.value;
  if (!ident || !pass) {
    (!ident ? idEl : passEl).closest(".field").classList.add("bad");
    loginError("Faltan datos.", !ident ? "Escribe tu correo institucional o tu carnet." : "Escribe tu contraseña.", false);
    (!ident ? idEl : passEl).focus(); return;
  }
  const byDigits = /^\d+$/.test(ident);
  if (SB_ON && !byDigits && !isTestAccount(normEmail(ident))) return sbLogin(normEmail(ident), pass, document.getElementById("l-rem").checked);
  if (SB_ON && byDigits && !accounts.some(a => a.carnet === ident && isTestAccount(a.email))) {
    idEl.closest(".field").classList.add("bad");
    return loginError("Entra con tu correo.", "Las cuentas reales de Nexo inician sesión con el correo con el que te registraste.", false);
  }
  const acc = accounts.find(a => byDigits ? a.carnet === ident : a.email === normEmail(ident));
  if (!acc) {
    idEl.closest(".field").classList.add("bad");
    loginError("No encontramos esa cuenta.", byDigits ? `No hay ninguna cuenta con el carnet ${ident}. Revisa los 11 dígitos o crea una cuenta.` : !ident.includes("@") ? `"${ident}" no es un correo registrado. Escribe tu correo institucional completo o tu carnet.` : `No hay ninguna cuenta con el correo ${normEmail(ident)}.`, !byDigits && ident.includes("@"));
    idEl.focus(); return;
  }
  if (acc.pass !== passKey(pass)) {
    passEl.closest(".field").classList.add("bad");
    loginError("La contraseña no es correcta.", "Revísala e inténtalo de nuevo, o usa \"¿Olvidaste tu contraseña?\" para crear una nueva.", false);
    passEl.select(); return;
  }
  enterApp(acc.email, document.getElementById("l-rem").checked, acc.disabled
    ? `Hola de nuevo, ${acc.full.split(" ")[0]}. Tu acceso de ${ROLE_LABEL[acc.role].toLowerCase()} está desactivado: entras como usuario.`
    : (acc.role === "local" ? `Hola, equipo de ${acc.full}.` : `Hola de nuevo, ${acc.full.split(" ")[0]}.`));
});
document.getElementById("loginForm").addEventListener("input", () => { document.getElementById("loginError").hidden = true; document.querySelectorAll("#loginForm .field.bad").forEach(f => f.classList.remove("bad")); });
document.getElementById("loginToSignup").addEventListener("click", () => {
  document.getElementById("r-mail").value = normEmail(document.getElementById("l-mail").value);
  go("registro");
});

/* ---------- Crear cuenta: no se repiten correos ni carnets ---------- */
function signupError(title, text, el) {
  const box = document.getElementById("signupError");
  box.querySelector('[data-se="title"]').textContent = title + " ";
  box.querySelector('[data-se="text"]').textContent = text;
  box.hidden = false;
  if (el) { el.closest(".field").classList.add("bad"); el.focus(); }
}
document.getElementById("registerForm").addEventListener("input", () => { document.getElementById("signupError").hidden = true; });
document.getElementById("registerForm").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  const nameEl = f.querySelector("#r-name"), carnetEl = f.querySelector("#r-carnet"), mailEl = f.querySelector("#r-mail"), passEl = f.querySelector("#r-pass");
  f.querySelectorAll(".field.bad").forEach(x => x.classList.remove("bad"));
  if (!nameEl.value.trim()) return signupError("Falta tu nombre.", "Escribe tu nombre completo.", nameEl);
  if (!/^\d{11}$/.test(carnetEl.value)) {
    const hint = f.querySelector(`[data-hint="${carnetEl.id}"]`);
    if (hint) hint.textContent = `El carnet debe tener 11 dígitos seguidos. Llevas ${carnetEl.value.length}.`;
    carnetEl.closest(".field").classList.add("bad"); carnetEl.focus(); return;
  }
  const email = normEmail(mailEl.value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return signupError("Revisa tu correo.", "Escribe un correo válido, por ejemplo nombre@correo.unimet.edu.ve.", mailEl);
  if (passEl.value.length < 8 || !/\d/.test(passEl.value)) return signupError("Contraseña muy débil.", "Usa al menos 8 caracteres y un número.", passEl);
  if (!f.querySelector("#r-terms").checked) return signupError("Falta aceptar los términos.", "Marca la casilla de términos de uso para continuar.", null);
  if (SB_ON && !isTestAccount(email)) return sbRegister({ full: cleanName(nameEl.value), carnet: carnetEl.value, email, pass: passEl.value, carnetEl, mailEl });
  if (accounts.some(a => a.email === email)) return signupError("Ese correo ya tiene una cuenta.", "Inicia sesión con él o usa otro correo.", mailEl);
  if (accounts.some(a => a.carnet === carnetEl.value)) return signupError("Ese carnet ya está registrado.", "Cada carnet solo puede tener una cuenta. Inicia sesión o revisa los dígitos.", carnetEl);
  const full = cleanName(nameEl.value);
  const now = new Date();
  const inv = invites.find(i => i.email === email);
  if (inv) { ivEmail = email; ivToken = null; go("invitacion"); toast("Ese correo tiene una invitación al equipo. Actívala aquí, sin carnet."); return; }
  accounts.push({ full, carnet: carnetEl.value, email, pass: passKey(passEl.value), created: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`, ...(inv ? { role: inv.role } : {}) });
  saveAccounts();
  if (inv) { invites = invites.filter(i => i !== inv); saveInvites(); }
  enterApp(email, true, inv ? `Cuenta creada. Ya eres parte del equipo de ${inv.role === "admin" ? "administración" : "moderación"}, ${full.split(" ")[0]}.` : `Cuenta creada. Te damos la bienvenida a Nexo, ${full.split(" ")[0]}.`);
});
document.addEventListener("click", e => {
  if (!e.target.closest("[data-logout]")) return;
  {
    let act = []; try { act = activeOrders(); } catch (err) {}
    if (act.length) {
      try { closeUserMenu(); } catch (err) {}
      const o = act[0], n = act.length;
      askConfirm({
        icon: "shopping-bag", title: "¿Cerrar sesión?",
        text: `${n === 1 ? "Tienes un pedido en curso" : `Tienes ${n} pedidos en curso`}${o.code ? ` (código de retiro ${o.code})` : ""}. Si cierras sesión, no te avisaremos cuando esté listo hasta que vuelvas a entrar.`,
        ok: "Cerrar sesión", cancel: "Seguir aquí", danger: true,
        onOk: doLogout
      });
      return;
    }
  }
  doLogout();
});
function doLogout() {
  if (sb && !doLogout.done) { doLogout.done = true; sb.auth.signOut({ scope: "local" }).catch(() => {}).finally(doLogout); return; }
  clearSession();
  try { sessionStorage.setItem("nexo-flash", "Cerraste sesión."); } catch (err) {}
  history.replaceState(null, "", "#login");
  location.reload();
}
/* Diálogo de confirmación genérico: askConfirm({ icon, title, text, ok, cancel, danger, onOk }) */
function askConfirm(o) {
  document.querySelectorAll(".cdlg-wrap").forEach(x => x.remove());
  const w = document.createElement("div"); w.className = "cdlg-wrap";
  w.innerHTML = `<div class="cdlg" role="alertdialog" aria-modal="true" aria-labelledby="cdlgT" aria-describedby="cdlgP">
    ${o.icon ? `<span class="cdlg-ic"><i data-lucide="${o.icon}"></i></span>` : ""}<h2 id="cdlgT">${o.title}</h2><p id="cdlgP">${o.text}</p>
    <div class="cdlg-acts"><button class="btn ghost" type="button" data-cdlg-no>${o.cancel || "Cancelar"}</button><button class="btn${o.danger ? " danger" : ""}" type="button" data-cdlg-ok>${o.ok || "Confirmar"}</button></div></div>`;
  document.body.append(w);
  const prevFocus = document.activeElement;
  const close = () => { w.remove(); document.removeEventListener("keydown", key); if (prevFocus && document.body.contains(prevFocus)) prevFocus.focus({ preventScroll: true }); };
  const key = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", key);
  w.addEventListener("click", e => {
    if (e.target === w || e.target.closest("[data-cdlg-no]")) { close(); return; }
    if (e.target.closest("[data-cdlg-ok]")) { close(); o.onOk && o.onOk(); }
  });
  try { lucide.createIcons(); } catch (err) {}
  w.querySelector("[data-cdlg-no]").focus();
}

/* ---------- Recarga de wallet ---------- */
const RC_MIN = 5, RC_MAX = 100;
let rcAmount = 10, rcMethod = "card", rcCardId = null, afReturn = "recarga";
let pendRec = [];
try { pendRec = JSON.parse(localStorage.getItem(K("nexo-pendrec")) || "[]") || []; } catch (err) {}
const savePend = () => { try { localStorage.setItem(K("nexo-pendrec"), JSON.stringify(pendRec)); } catch (err) {} try { sbSaveState(); } catch (err) {} };
const parseAmt = s => { const v = parseFloat(String(s).replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".")); return isNaN(v) ? 0 : v; };
function rcValid() { return rcAmount >= RC_MIN && rcAmount <= RC_MAX; }
function renderRecarga() {
  const rc = k => document.querySelectorAll(`[data-rc="${k}"]`);
  document.querySelectorAll("#rcChips .amt-chip").forEach(c => c.classList.toggle("on", +c.dataset.amt === rcAmount));
  const hint = document.getElementById("rc-hint"), field = document.getElementById("rc-m").closest(".field");
  const ok = rcValid();
  field.classList.toggle("bad", !ok && rcAmount > 0);
  hint.textContent = ok ? `Mínimo ${money(RC_MIN)} · Máximo ${money(RC_MAX)} por recarga.` : rcAmount > RC_MAX ? `El máximo por recarga es ${money(RC_MAX)}.` : `El mínimo por recarga es ${money(RC_MIN)}.`;
  rc("amount").forEach(el => el.textContent = money(ok ? rcAmount : 0));
  rc("bs").forEach(el => el.textContent = `${bsOf(ok ? rcAmount : 0)} · tasa BCV ${bcvDateTxt()}`);
  document.querySelectorAll("#rcMethods .opt").forEach(o => { const on = o.dataset.rcm === rcMethod; o.classList.toggle("on", on); o.setAttribute("aria-checked", String(on)); });
  // tarjeta
  if (rcCardId && !cards.find(c => c.id === rcCardId)) rcCardId = null;
  if (!rcCardId && cards.length) rcCardId = cards[0].id;
  const box = document.getElementById("rcCardBox");
  box.hidden = rcMethod !== "card";
  document.getElementById("rcPmBox").hidden = rcMethod !== "pm";
  if (!cards.length) {
    box.innerHTML = `<div class="notice warn"><i data-lucide="credit-card"></i><div><b>No tienes tarjetas afiliadas</b>Afilia una tarjeta para recargar al instante.</div></div>
      <button class="btn ghost" type="button" data-afiliar><i data-lucide="plus"></i>Afiliar una tarjeta</button>`;
  } else {
    box.innerHTML = `<p class="small" style="font-size:13px">Elige con qué tarjeta pagas:</p>` + cards.map(c => `
      <button class="opt cardopt${c.id === rcCardId ? " on" : ""}" type="button" data-rccard="${c.id}"><span class="dot"></span><span class="brand-chip ${c.brand}">${BRAND_CHIP[c.brand]}</span>
        <span class="grow">${cardLabel(c)}<br><span class="small" style="font-weight:400">${user.full} · Vence ${c.exp}</span></span><span class="pill neutral">${c.type}</span></button>`).join("")
      + `<button class="link b" type="button" data-afiliar style="font-size:13px">+ Afiliar otra tarjeta</button>`;
  }
  const card = cards.find(c => c.id === rcCardId);
  rc("method").forEach(el => el.textContent = rcMethod === "pm" ? "Pago Móvil" : card ? `${cardLabel(card)} · ${card.type}` : "Sin tarjeta afiliada");
  rc("afterlabel").forEach(el => el.textContent = rcMethod === "pm" ? "Saldo cuando se valide" : "Saldo tras la recarga");
  rc("after").forEach(el => el.textContent = money(WALLET + (ok ? rcAmount : 0)));
  const go = document.getElementById("rcGo");
  const cta = rcMethod === "pm" ? `Continuar a Pago Móvil` : card ? `Recargar ${money(rcAmount)}` : "Afiliar una tarjeta";
  rc("cta").forEach(el => el.textContent = ok ? cta : "Elige un monto válido");
  go.disabled = !ok; go.style.opacity = ok ? "" : ".5";
  rc("foot").forEach(el => el.textContent = rcMethod === "pm" ? "Verás los datos de Pago Móvil de Nexo y registrarás tu pago." : "Prototipo: no se realiza ningún cobro real.");
  const pend = pendRec.filter(r => r.estado === "revision");
  const pn = document.getElementById("rcPending");
  pn.hidden = !pend.length;
  if (pend.length) pn.querySelector('[data-rc="pendtext"]').textContent = ` ${pend.length === 1 ? "Tienes una recarga" : `Tienes ${pend.length} recargas`} por Pago Móvil de ${money(pend.reduce((a, r) => a + r.amount, 0))} esperando validación. Se sumará a tu saldo cuando la confirmemos.`;
  try { lucide.createIcons(); } catch (err) {}
}
document.getElementById("rcChips").addEventListener("click", e => {
  const c = e.target.closest("[data-amt]"); if (!c) return;
  rcAmount = +c.dataset.amt; document.getElementById("rc-m").value = rcAmount.toFixed(2).replace(".", ","); renderRecarga();
});
document.getElementById("rc-m").addEventListener("input", e => {
  e.target.value = e.target.value.replace(/[^\d,]/g, "").replace(/(,.*?),/g, "$1").replace(/(,\d{2}).+/, "$1");
  rcAmount = Math.round(parseAmt(e.target.value) * 100) / 100; renderRecarga();
});
document.getElementById("rc-m").addEventListener("blur", e => { if (rcAmount) e.target.value = rcAmount.toFixed(2).replace(".", ","); });
document.getElementById("recarga").addEventListener("click", e => {
  const m = e.target.closest("[data-rcm]"); if (m) { rcMethod = m.dataset.rcm; renderRecarga(); return; }
  const c = e.target.closest("[data-rccard]"); if (c) { rcCardId = c.dataset.rccard; renderRecarga(); return; }
  if (e.target.closest("[data-afiliar]")) { afReturn = "recarga"; go("afiliar"); return; }
  if (e.target.closest("#rcGo")) {
    if (!rcValid()) return;
    if (rcMethod === "pm") { openPagoMovil(); return; }
    const card = cards.find(x => x.id === rcCardId);
    if (!card) { afReturn = "recarga"; go("afiliar"); return; }
    WALLET = Math.round((WALLET + rcAmount) * 100) / 100; saveWallet(); renderWallet();
    addMovement("Recarga de wallet", `Estacionamiento · ${cardLabel(card)}`, "+" + money(rcAmount), "Pagado", "ok", { icon: "wallet", go: "estacionamiento", goLabel: "Ver wallet →" });
    toast(`Recargaste ${money(rcAmount)} con ${cardLabel(card)}. Tu saldo ahora es ${money(WALLET)}.`);
    renderRecarga(); go("estacionamiento");
  }
});

/* ---------- Afiliar tarjeta ---------- */
let afTypeVal = "Débito";
function afState() { const d = document.getElementById("af-num").value.replace(/\D/g, ""); const b = brandOf(d); return { digits: d, brand: b, label: BRAND_LABEL[b], last4: d.slice(-4) }; }
function renderAf() {
  const st = afState(), b = st.brand, d = st.digits.slice(0, b === "amex" ? 15 : 16);
  document.getElementById("af-num").value = fmtNum(d, b);
  const cvv = document.getElementById("af-cvv"); cvv.maxLength = b === "amex" ? 4 : 3; cvv.value = cvv.value.replace(/\D/g, "").slice(0, cvv.maxLength);
  document.getElementById("af-cvvhint").textContent = b === "amex" ? "4 dígitos al frente de la tarjeta." : "3 dígitos al reverso.";
  const pv = document.getElementById("afPreview"); pv.className = "card-preview " + b;
  pv.querySelector('[data-af="brand"]').textContent = BRAND_CHIP[b];
  pv.querySelector('[data-af="type"]').textContent = afTypeVal.toUpperCase();
  const mask = b === "amex" ? "•••• •••••• •••••" : "•••• •••• •••• ••••"; let out = "", j = 0;
  for (const ch of mask) { if (ch === " ") out += " "; else { out += d[j] ?? "•"; j++; } }
  pv.querySelector('[data-af="num"]').textContent = out;
  pv.querySelector('[data-af="name"]').textContent = document.getElementById("af-name").value.toUpperCase() || "NOMBRE EN LA TARJETA";
  pv.querySelector('[data-af="exp"]').textContent = document.getElementById("af-exp").value || "MM/AA";
  document.getElementById("afList").innerHTML = cards.length ? cards.map(c => `<div class="row start"><span class="brand-chip ${c.brand}">${BRAND_CHIP[c.brand]}</span><div style="flex:1;min-width:0"><b style="font-size:13px">${cardLabel(c)}</b><p class="tiny">${c.type} · Vence ${c.exp}</p></div></div>`).join("") : `<p class="small">Aún no tienes tarjetas afiliadas.</p>`;
}
document.getElementById("afForm").addEventListener("input", e => {
  if (e.target.id === "af-exp") { let v = e.target.value.replace(/\D/g, "").slice(0, 4); if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2); e.target.value = v; }
  e.target.closest(".field")?.classList.remove("bad"); renderAf();
});
document.getElementById("afType").addEventListener("click", e => {
  const b = e.target.closest("[data-aftype]"); if (!b) return; afTypeVal = b.dataset.aftype;
  document.querySelectorAll("#afType button").forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-checked", String(on)); }); renderAf();
});
document.getElementById("afForm").addEventListener("submit", e => {
  e.preventDefault();
  const st = afState(), errs = [];
  const mark = (id, msg) => { document.getElementById(id).closest(".field").classList.add("bad"); errs.push(msg); };
  const len = st.brand === "amex" ? 15 : 16;
  if (!st.brand) mark("af-num", "Solo aceptamos Visa, Mastercard o American Express.");
  else if (st.digits.length !== len || !luhn(st.digits)) mark("af-num", `Revisa el número: una ${st.label} tiene ${len} dígitos.`);
  if (!document.getElementById("af-name").value.trim()) mark("af-name", "Escribe el nombre como aparece en la tarjeta.");
  const m = document.getElementById("af-exp").value.match(/^(\d{2})\/(\d{2})$/);
  if (!m || +m[1] < 1 || +m[1] > 12 || (2000 + +m[2]) * 12 + +m[1] < 2026 * 12 + 11) mark("af-exp", "Revisa el vencimiento (MM/AA). La tarjeta no puede estar vencida.");
  if (document.getElementById("af-cvv").value.length !== (st.brand === "amex" ? 4 : 3)) mark("af-cvv", `El código de seguridad tiene ${st.brand === "amex" ? 4 : 3} dígitos.`);
  if (errs.length) { toast(errs[0]); return; }
  if (cards.some(c => c.brand === st.brand && c.last4 === st.last4)) { toast(`${st.label} ···· ${st.last4} ya está afiliada.`); return; }
  const c = { id: "c" + Date.now(), brand: st.brand, last4: st.last4, exp: document.getElementById("af-exp").value, type: afTypeVal };
  cards.push(c); saveCards(); rcCardId = c.id;
  e.target.reset(); renderAf(); renderCards(); renderRecarga();
  toast(`${cardLabel(c)} quedó afiliada a tu cuenta.`);
  go(afReturn);
});

/* ---------- Pago Móvil ---------- */
function openPagoMovil() {
  const amt = money(rcAmount);
  document.querySelector('[data-pm="lead"]').textContent = `Recarga de ${amt} a tu wallet Nexo`;

  document.querySelector('[data-pm="concept"]').textContent = `Wallet ${user.carnet || user.email.split("@")[0]}`;
  pmRefreshAmount();
  document.querySelector('[data-pm="cta"]').textContent = `Registrar pago de ${amt}`;
  const d = document.getElementById("pm-date"); if (!d.value) { const t = new Date(); d.value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; }
  document.getElementById("pmError").hidden = true;
  if (typeof PM_FIELDS !== "undefined") PM_FIELDS.forEach(id => { if (!document.getElementById(id).value) pmShow(id, ""); });
  go("pagomovil");
}
document.getElementById("pagomovil").addEventListener("click", e => {
  if (!e.target.closest("[data-pm-copyconcept]")) return;
  const txt = `Wallet ${user.carnet || user.email.split("@")[0]}`;
  try { navigator.clipboard.writeText(txt).then(() => toast("Concepto copiado"), () => toast(txt)); } catch (err) { toast(txt); }
});
document.getElementById("pm-phone").addEventListener("input", e => { let v = e.target.value.replace(/\D/g, "").slice(0, 11); if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4); e.target.value = v; });
["pm-ci", "pm-ref"].forEach(id => document.getElementById(id).addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, ""); }));
document.getElementById("pm-bs").addEventListener("input", e => { e.target.value = e.target.value.replace(/[^\d,]/g, "").replace(/(,.*?),/g, "$1").replace(/(,\d{2}).+/, "$1"); });
/* Validación del Pago Móvil: todos los errores a la vez, cada uno bajo su campo; también al salir de cada campo.
   El monto en bolívares se calcula con la tasa BCV vigente en la app (BCV.rate). */
const PM_TOL_LOW = 0.99, PM_TOL_HIGH = 1.05, PM_MAX_DAYS = 7;
const bs = bsAmt;
const pmExpected = () => Math.round(rcAmount * bcvRate() * 100) / 100;
const PM_PREFIX = ["0412", "0414", "0416", "0422", "0424", "0426"];
function pmCheck(id) {
  const v = document.getElementById(id).value.trim();
  if (id === "pm-bank") return v ? "" : "Elige el banco desde el que pagaste.";
  if (id === "pm-phone") {
    const d = v.replace(/\D/g, "");
    if (!d) return "Escribe el teléfono desde el que hiciste el pago.";
    if (d.length < 11) return `Faltan ${11 - d.length} ${11 - d.length === 1 ? "dígito" : "dígitos"}: el teléfono tiene 11 (por ejemplo, 0414-1234567).`;
    if (!PM_PREFIX.includes(d.slice(0, 4))) return `${d.slice(0, 4)} no es un prefijo de celular. Usa 0412, 0414, 0416, 0422, 0424 o 0426.`;
    return "";
  }
  if (id === "pm-ci") {
    const t = document.getElementById("pm-cit").value;
    if (!v) return t === "J" ? "Escribe el RIF del titular." : "Escribe la cédula del titular.";
    if (t === "J") return v.length === 9 ? "" : "El RIF tiene 9 dígitos, sin letras ni guiones (por ejemplo, 123456789).";
    const max = t === "E" ? 9 : 8;
    return v.length >= 6 && v.length <= max ? "" : `La cédula ${t === "E" ? "de extranjero" : "venezolana"} tiene entre 6 y ${max} dígitos.`;
  }
  if (id === "pm-ref") {
    if (!v) return "Escribe el número de referencia que aparece en tu comprobante.";
    if (v.length < 6) return "La referencia tiene al menos 6 dígitos. Cópiala completa de tu comprobante.";
    const dup = pendRec.find(r => r.ref === v || (r.ref.length >= 6 && v.length >= 6 && r.ref.slice(-6) === v.slice(-6) && r.bank === document.getElementById("pm-bank").value));
    return dup ? `Ya registraste un pago con esa referencia${dup.date ? ` el ${fmtD(new Date(dup.date + "T12:00"))}` : ""}. Si es otro pago, revisa el número.` : "";
  }
  if (id === "pm-date") {
    if (!v) return "Indica la fecha del pago.";
    const d = new Date(v + "T12:00"), today = day0(new Date()), days = Math.round((today - day0(d)) / 864e5);
    if (days < 0) return "La fecha no puede ser posterior a hoy.";
    if (days > PM_MAX_DAYS) return `Solo puedes registrar pagos de los últimos ${PM_MAX_DAYS} días. Para uno más antiguo, escríbenos en Soporte.`;
    return "";
  }
  if (id === "pm-bs") {
    const n = parseAmt(v), exp = pmExpected();
    if (!(n > 0)) return "Escribe el monto que pagaste en bolívares.";
    if (n < exp * PM_TOL_LOW) return `Ese monto equivale a ${money(n / bcvRate())}. Para recargar ${money(rcAmount)} debes pagar ${bs(exp)} (faltan ${bs(exp - n)}).`;
    if (n > exp * PM_TOL_HIGH) return `Pagaste ${bs(n - exp)} de más. Escribe el monto exacto de tu comprobante o elige una recarga mayor.`;
    return "";
  }
  return "";
}
const PM_FIELDS = ["pm-bank", "pm-phone", "pm-ci", "pm-ref", "pm-date", "pm-bs"];
function pmShow(id, msg) {
  const field = document.getElementById(id).closest(".field");
  let hint = field.querySelector("[data-pm-err]");
  if (!hint) { hint = document.createElement("p"); hint.className = "tiny pm-err"; hint.dataset.pmErr = id; hint.setAttribute("role", "alert"); field.append(hint); }
  field.classList.toggle("bad", !!msg); hint.hidden = !msg; hint.textContent = msg || "";
  document.getElementById(id).setAttribute("aria-invalid", msg ? "true" : "false");
}
function pmRefreshAmount() {
  const exp = pmExpected();
  document.querySelector('[data-pm="amount"]').textContent = `${bs(exp)} · equivale a ${money(rcAmount)}`;
  document.querySelector('[data-pm="bshint"]').innerHTML = `Debe ser ${bs(exp)}: ${money(rcAmount)} a la tasa BCV del ${bcvDateTxt()} (${bs(bcvRate())} por US$). <button class="link b" type="button" data-pm-fill style="font-size:11px">Usar este monto</button>`;
  document.querySelector('[data-pm="ratenote"]').textContent = `Tasa BCV del ${bcvDateTxt()}: ${bs(bcvRate())} por US$.${bcvStale() ? " Puede haber cambiado: confirma con tu banco la tasa del día." : ""}`;
}
document.getElementById("pm-cit").addEventListener("change", e => {
  const j = e.target.value === "J", lbl = document.querySelector('label[for="pm-ci"]'), inp = document.getElementById("pm-ci");
  lbl.textContent = j ? "RIF del titular" : "Cédula del titular"; inp.placeholder = j ? "123456789" : "12345678";
  if (inp.value) pmShow("pm-ci", pmCheck("pm-ci"));
});
document.getElementById("pmForm").addEventListener("input", e => {
  const id = e.target.id; if (PM_FIELDS.includes(id)) pmShow(id, "");
  document.getElementById("pmError").hidden = true;
});
document.getElementById("pmForm").addEventListener("change", e => { if (e.target.id === "pm-bank" || e.target.id === "pm-date") pmShow(e.target.id, pmCheck(e.target.id)); });
document.getElementById("pmForm").addEventListener("focusout", e => { const id = e.target.id; if (PM_FIELDS.includes(id) && e.target.value.trim()) pmShow(id, pmCheck(id)); });
document.getElementById("pmForm").addEventListener("click", e => { if (e.target.closest("[data-pm-fill]")) { const i = document.getElementById("pm-bs"); i.value = money(pmExpected()).slice(1); pmShow("pm-bs", ""); i.focus(); } });
document.getElementById("pmForm").addEventListener("submit", e => {
  e.preventDefault();
  const errs = PM_FIELDS.map(id => [id, pmCheck(id)]);
  errs.forEach(([id, m]) => pmShow(id, m));
  const bad = errs.filter(x => x[1]);
  if (bad.length) {
    const box = document.getElementById("pmError");
    box.querySelector('[data-pm="err"]').textContent = bad.length === 1 ? bad[0][1] : `Revisa los ${bad.length} datos marcados en rojo antes de registrar tu pago.`;
    box.hidden = false; document.getElementById(bad[0][0]).focus(); return;
  }
  const v = id => document.getElementById(id).value.trim();
  const ref = v("pm-ref");
  pendRec.push({ id: "r" + Date.now(), amount: rcAmount, ref, bank: v("pm-bank"), date: v("pm-date"), bs: parseAmt(v("pm-bs")), estado: "revision", sentAt: Date.now() }); savePend();
  addMovement("Recarga de wallet", `Pago Móvil · Ref. ${ref.slice(-6)}`, "+" + money(rcAmount), "En revisión", "neutral", { icon: "smartphone", go: "recarga", goLabel: "Ver estado →" });
  e.target.reset(); PM_FIELDS.forEach(id => pmShow(id, ""));
  toast(`Registramos tu Pago Móvil de ${money(rcAmount)}. Lo validaremos en un máximo de 24 horas hábiles.`);
  renderRecarga(); go("recarga");
});
renderRecarga(); renderAf();
/* ---------- Mi vehículo ---------- */
const CAR_MODELS = {"Toyota": ["Corolla", "Yaris", "Hilux", "Fortuner", "4Runner", "Land Cruiser", "Prado", "RAV4", "Camry", "Terios"], "Chevrolet": ["Aveo", "Optra", "Spark", "Cruze", "Captiva", "Silverado", "Tahoe", "Corsa", "Malibu", "Orlando"], "Ford": ["Fiesta", "Focus", "Fusion", "EcoSport", "Escape", "Explorer", "Ranger", "F-150", "Mustang", "Ka"], "Hyundai": ["Accent", "Elantra", "Getz", "Tucson", "Santa Fe", "Creta", "i10", "Sonata"], "Kia": ["Rio", "Picanto", "Cerato", "Sportage", "Sorento", "Soluto", "Seltos"], "Mitsubishi": ["Lancer", "Montero", "Outlander", "L200", "ASX", "Signo"], "Nissan": ["Sentra", "Tiida", "Versa", "X-Trail", "Frontier", "Patrol", "Kicks", "March"], "Renault": ["Logan", "Sandero", "Clio", "Duster", "Megane", "Symbol", "Twingo"], "Volkswagen": ["Gol", "Fox", "Jetta", "Polo", "Golf", "Tiguan", "Amarok", "Bora"], "Chery": ["Arauca", "Orinoco", "Tiggo 2", "Tiggo 4", "Tiggo 7", "Arrizo"], "Fiat": ["Palio", "Siena", "Uno", "Punto", "Mobi", "Cronos"], "Jeep": ["Cherokee", "Grand Cherokee", "Wrangler", "Compass", "Renegade"], "Honda": ["Civic", "Accord", "Fit", "CR-V", "HR-V"], "Mazda": ["Mazda 2", "Mazda 3", "Mazda 6", "CX-3", "CX-5", "BT-50"]};
const PLATE_RE = /^[A-Z]{2}\d{3}[A-Z]{2}$|^[A-Z]{3}\d{2}[A-Z]$|^[A-Z]\d{2}[A-Z]{3}$/;
let vehicle = isDemo ? { brand: "Toyota", model: "Yaris", year: "2019", plate: "AB123CD" } : null;
try { const sv = localStorage.getItem(K("nexo-vehicle")); if (sv !== null) vehicle = JSON.parse(sv); } catch (err) {}
const saveVehicle = () => { try { localStorage.setItem(K("nexo-vehicle"), JSON.stringify(vehicle)); } catch (err) {} try { sbSaveState(); } catch (err) {} };
function renderVehicle() {
  const v = vehicle;
  setTimeout(() => { const s = document.querySelector("#planList .opt.plan.on"); if (s) try { updatePlan(s); } catch (err) {} }, 0);
  const vals = v ? { name: `${v.brand} ${v.model}`, full: `${v.brand} ${v.model} ${v.year}`, plate: v.plate, summary: `${v.brand} ${v.model} ${v.year} · ${v.plate}`, action: "Editar" }
                 : { name: "", full: "Sin vehículo", plate: "—", summary: "Aún no registras un vehículo.", action: "Agregar" };
  document.querySelectorAll("[data-veh]").forEach(el => { const k = el.dataset.veh; if (k in vals) el.textContent = vals[k]; });
  document.querySelectorAll("[data-veh-show]").forEach(el => el.hidden = !v);
  document.querySelectorAll("[data-veh-missing]").forEach(el => el.hidden = !!v);
}
function fillModels(brand, keep) {
  const sel = document.getElementById("v-model");
  const list = CAR_MODELS[brand] || [];
  sel.disabled = !brand;
  sel.innerHTML = !brand ? `<option value="">Primero elige la marca</option>`
    : `<option value="">Elige el modelo</option>` + list.map(m => `<option>${m}</option>`).join("") + `<option value="Otro">Otro modelo</option>`;
  if (keep) sel.value = list.includes(keep) ? keep : (brand ? "Otro" : "");
  document.querySelector('[data-vf="modelother"]').hidden = sel.value !== "Otro" && !(brand === "Otra");
  if (brand === "Otra") { sel.innerHTML = `<option value="Otro">Escribe el modelo abajo</option>`; sel.value = "Otro"; document.querySelector('[data-vf="modelother"]').hidden = false; }
}
function vehFormValues() {
  const b = document.getElementById("v-brand").value, bo = document.getElementById("v-brand-o").value.trim();
  const m = document.getElementById("v-model").value, mo = document.getElementById("v-model-o").value.trim();
  return { brand: b === "Otra" ? bo : b, model: m === "Otro" ? mo : m, year: document.getElementById("v-year").value, plate: document.getElementById("v-plate").value.trim().toUpperCase() };
}
function renderVehPreview() {
  const f = vehFormValues();
  document.querySelector('[data-vf="pname"]').textContent = f.brand && f.model ? `${f.brand} ${f.model}` : f.brand || "Tu vehículo";
  document.querySelector('[data-vf="pyear"]').textContent = f.year ? `Año ${f.year}` : "Marca, modelo y año";
  document.querySelector('[data-vf="pplate"]').textContent = f.plate || "AA000AA";
}
function openVehicleForm() {
  const v = vehicle, known = v && CAR_MODELS[v.brand];
  document.getElementById("v-brand").value = v ? (known ? v.brand : "Otra") : "";
  document.getElementById("v-brand-o").value = v && !known ? v.brand : "";
  document.querySelector('[data-vf="brandother"]').hidden = !(v && !known);
  fillModels(v ? (known ? v.brand : "Otra") : "", v ? v.model : "");
  document.getElementById("v-model-o").value = v && (!known || !CAR_MODELS[v.brand].includes(v.model)) ? v.model : "";
  document.getElementById("v-year").value = v ? v.year : "";
  document.getElementById("v-plate").value = v ? v.plate : "";
  document.querySelector('[data-vf="title"]').textContent = v ? "Edita tu vehículo" : "Registra tu vehículo";
  document.querySelector('[data-vf="cta"]').textContent = v ? "Guardar cambios" : "Guardar vehículo";
  document.getElementById("vehDelete").hidden = !v;
  document.getElementById("vehDelConfirm").hidden = true;
  document.getElementById("vehError").hidden = true;
  document.querySelectorAll("#vehForm .field.bad").forEach(x => x.classList.remove("bad"));
  renderVehPreview();
}
document.getElementById("v-brand").addEventListener("change", e => {
  document.querySelector('[data-vf="brandother"]').hidden = e.target.value !== "Otra";
  fillModels(e.target.value, ""); renderVehPreview();
});
document.getElementById("v-model").addEventListener("change", e => { document.querySelector('[data-vf="modelother"]').hidden = e.target.value !== "Otro"; renderVehPreview(); });
document.getElementById("v-plate").addEventListener("input", e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7); });
document.getElementById("vehForm").addEventListener("input", e => { e.target.closest(".field")?.classList.remove("bad"); document.getElementById("vehError").hidden = true; renderVehPreview(); });
document.getElementById("vehForm").addEventListener("change", renderVehPreview);
document.getElementById("vehForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = vehFormValues(), b = document.getElementById("v-brand").value, m = document.getElementById("v-model").value;
  const checks = [
    ["v-brand", !!b, "Elige la marca de tu carro."],
    ["v-brand-o", b !== "Otra" || f.brand.length >= 2, "Escribe la marca de tu carro."],
    ["v-model", !!m, "Elige el modelo."],
    ["v-model-o", m !== "Otro" || f.model.length >= 1, "Escribe el modelo de tu carro."],
    ["v-year", !!f.year, "Elige el año."],
    ["v-plate", PLATE_RE.test(f.plate), "Revisa la placa: debe tener el formato AB123CD (2 letras, 3 números y 2 letras)."]
  ];
  const bad = checks.find(c => !c[1]);
  if (bad) {
    document.getElementById(bad[0]).closest(".field").classList.add("bad");
    const box = document.getElementById("vehError"); box.querySelector('[data-vf="err"]').textContent = bad[2]; box.hidden = false;
    document.getElementById(bad[0]).focus(); return;
  }
  const wasNew = !vehicle;
  vehicle = f; saveVehicle(); renderVehicle();
  toast(wasNew ? `Registraste tu ${f.brand} ${f.model} · ${f.plate}.` : `Guardamos los cambios de tu vehículo.`);
  go(previous && previous !== "vehiculo" ? previous : "estacionamiento");
});
document.getElementById("vehDelete").addEventListener("click", () => { document.getElementById("vehDelConfirm").hidden = false; });
document.getElementById("vehDelConfirm").addEventListener("click", e => {
  const b = e.target.closest("[data-vdel]"); if (!b) return;
  if (b.dataset.vdel === "yes") { vehicle = null; saveVehicle(); renderVehicle(); toast("Eliminaste el vehículo de tu cuenta."); go("estacionamiento"); }
  else document.getElementById("vehDelConfirm").hidden = true;
});
renderVehicle();
/* ---------- Pagar plan con wallet + código por correo ---------- */
const OTP_TTL = 10 * 60 * 1000, OTP_RESEND = 30, OTP_TRIES = 3;
let otp = null, otpTimer = null, ppPlan = null;
const maskEmail = e => { const [u, d] = e.split("@"); return (u.length <= 2 ? u[0] + "•" : u.slice(0, 2) + "••••") + "@" + d; };
function ppSetStep(n) {
  document.querySelectorAll("#pagoplan [data-ppstep]").forEach(el => el.hidden = +el.dataset.ppstep !== n);
  document.querySelectorAll("#pagoplan .steps3 li").forEach(li => { const s = +li.dataset.step; li.classList.toggle("on", s === n); li.classList.toggle("done", s < n); });
  document.getElementById("ppMail").hidden = n !== 2; document.getElementById("ppMailNote").hidden = n !== 2;
  document.querySelector('#pagoplan [data-pp="title"]').textContent = n === 3 ? "Plan activado" : n === 2 ? "Verifica que eres tú" : "Confirma tu pago";
}
function ppFill() {
  const p = ppPlan, set = (k, v) => document.querySelectorAll(`#pagoplan [data-pp="${k}"]`).forEach(el => el.textContent = v);
  set("plan", `Plan ${p.name.toLowerCase()}`); set("desc", PLAN_DESC[p.key]);
  set("range", p.days === 1 ? fmtLong(dOf(p.start)) : `${fmtLong(dOf(p.start))} – ${fmtLong(dOf(p.end))}`);
  set("end", fmtLong(dOf(p.end)));
  set("veh", vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}` : "—");
  set("before", money(WALLET)); set("price", money(p.price)); set("after", money(WALLET - p.price));
  set("email", maskEmail(user.email)); set("mailwhat", `Plan ${p.name.toLowerCase()} · ${money(p.price)}`);
  set("cta", `Verificar y pagar ${money(p.price)}`);
}
document.getElementById("planPay").addEventListener("click", () => {
  if (!pendingPlan) return;
  if (!vehicle) { go("vehiculo"); return; }
  if (WALLET < pendingPlan.price) { go("recarga"); return; }
  ppPlan = { ...pendingPlan }; otp = null; clearInterval(otpTimer);
  ppFill(); ppSetStep(1); go("pagoplan");
});
function sendOtp() {
  const a = new Uint32Array(1); crypto.getRandomValues(a);
  otp = { code: String(a[0] % 1000000).padStart(6, "0"), exp: Date.now() + OTP_TTL, tries: 0, resendAt: Date.now() + OTP_RESEND * 1000 };
  document.querySelector('#pagoplan [data-pp="code"]').textContent = otp.code;
  const now = new Date(); document.querySelector('#pagoplan [data-pp="mailtime"]').textContent = `Hoy, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  document.querySelectorAll("#ppOtp input").forEach(i => i.value = "");
  document.getElementById("ppOtp").classList.remove("bad"); document.getElementById("ppErr").hidden = true;
  document.getElementById("ppVerify").disabled = false; document.getElementById("ppVerify").style.opacity = "";
  clearInterval(otpTimer); otpTick(); otpTimer = setInterval(otpTick, 1000);
}
function otpTick() {
  if (!otp) return;
  const left = Math.max(0, otp.exp - Date.now()), rs = Math.max(0, Math.ceil((otp.resendAt - Date.now()) / 1000));
  document.querySelector('#pagoplan [data-pp="ttl"]').textContent = `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}`;
  const rb = document.getElementById("ppResend"); rb.disabled = rs > 0;
  document.querySelector('#pagoplan [data-pp="resendt"]').textContent = rs > 0 ? `en ${rs} s` : "";
  if (left === 0) ppError("El código venció. Pide uno nuevo con «Reenviar código».", true);
}
function ppError(msg, lock) {
  const box = document.getElementById("ppErr"); box.querySelector('[data-pp="err"]').textContent = msg; box.hidden = false;
  document.getElementById("ppOtp").classList.add("bad");
  if (lock) { const v = document.getElementById("ppVerify"); v.disabled = true; v.style.opacity = ".5"; document.getElementById("ppResend").disabled = false; document.querySelector('#pagoplan [data-pp="resendt"]').textContent = ""; clearInterval(otpTimer); }
}
document.getElementById("ppSend").addEventListener("click", () => {
  sendOtp(); ppSetStep(2);
  toast(`Enviamos un código a ${maskEmail(user.email)}.`);
  setTimeout(() => document.querySelector("#ppOtp input").focus(), 50);
});
document.getElementById("ppResend").addEventListener("click", () => { sendOtp(); toast("Te enviamos un código nuevo. El anterior ya no sirve."); document.querySelector("#ppOtp input").focus(); });
document.getElementById("ppBack").addEventListener("click", () => { clearInterval(otpTimer); otp = null; go("planes"); });
const otpBoxes = [...document.querySelectorAll("#ppOtp input")];
otpBoxes.forEach((inp, i) => {
  inp.addEventListener("input", () => {
    const d = inp.value.replace(/\D/g, "");
    if (d.length > 1) { d.split("").slice(0, 6 - i).forEach((ch, k) => otpBoxes[i + k].value = ch); otpBoxes[Math.min(5, i + d.length - 1)].focus(); }
    else { inp.value = d; if (d && i < 5) otpBoxes[i + 1].focus(); }
    document.getElementById("ppOtp").classList.remove("bad"); if (!document.getElementById("ppVerify").disabled) document.getElementById("ppErr").hidden = true;
    if (otpBoxes.every(b => b.value)) document.getElementById("ppCodeForm").requestSubmit();
  });
  inp.addEventListener("keydown", e => { if (e.key === "Backspace" && !inp.value && i > 0) { otpBoxes[i - 1].focus(); otpBoxes[i - 1].value = ""; } });
  inp.addEventListener("paste", e => { const t = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6); if (!t) return; e.preventDefault(); t.split("").forEach((ch, k) => { if (otpBoxes[k]) otpBoxes[k].value = ch; }); otpBoxes[Math.min(5, t.length - 1)].focus(); if (t.length === 6) document.getElementById("ppCodeForm").requestSubmit(); });
});
document.getElementById("ppCodeForm").addEventListener("submit", e => {
  e.preventDefault();
  if (!otp || document.getElementById("ppVerify").disabled) return;
  const code = otpBoxes.map(b => b.value).join("");
  if (code.length < 6) { ppError("Escribe los 6 dígitos del código."); return; }
  if (Date.now() > otp.exp) { ppError("El código venció. Pide uno nuevo con «Reenviar código».", true); return; }
  if (code !== otp.code) {
    otp.tries++;
    const left = OTP_TRIES - otp.tries;
    if (left <= 0) { ppError("Escribiste un código incorrecto 3 veces. Por seguridad, pide un código nuevo.", true); otp.code = null; }
    else ppError(`El código no es correcto. Te ${left === 1 ? "queda 1 intento" : `quedan ${left} intentos`}.`);
    otpBoxes.forEach(b => b.value = ""); otpBoxes[0].focus(); return;
  }
  // pago confirmado
  clearInterval(otpTimer); otp = null;
  const p = ppPlan;
  if (WALLET < p.price) { ppError("Tu saldo cambió y ya no alcanza. Recarga tu wallet para continuar.", true); return; }
  WALLET = Math.round((WALLET - p.price) * 100) / 100; saveWallet();
  const prev = planActive() ? plan : null;
  plan = { key: p.key, name: p.name, price: p.price, days: p.days, start: prev ? prev.start : p.start, end: p.end, paidOn: isoOf(todayNoon()) };
  savePlan();
  const ref = "EST-" + p.start.replace(/-/g, "").slice(2) + "-" + String(Math.floor(Math.random() * 9000) + 1000);
  addMovement(`Plan ${p.name.toLowerCase()}`, `Estacionamiento · Wallet Nexo · ${ref}`, "−" + money(p.price), "Pagado", "ok", { icon: "car-front", go: "acceso", goLabel: "Ver credencial →" });
  document.querySelector('#pagoplan [data-pp="ref"]').textContent = ref;
  document.querySelector('#pagoplan [data-pp="donetext"]').textContent = `Tu plan ${p.name.toLowerCase()} está ${prev ? "agregado" : "activo"} para ${vehicle.brand} ${vehicle.model} · ${vehicle.plate}.`;
  renderWallet(); renderPlanState(); if (typeof renderNotifs === "function") renderNotifs();
  ppSetStep(3);
});
renderPlanState();
updatePlan(document.querySelector("#planList .opt.plan.on"));
/* ---------- Mi cuenta ---------- */
function pfErr(n, msg, el) {
  const box = document.querySelector(`#perfil [data-pf="err${n}"]`);
  box.hidden = !msg; if (msg) box.querySelector("p").textContent = msg;
  if (el) { el.closest(".field").classList.add("bad"); el.focus(); }
}
function openPerfil() {
  const acc = account || {};
  document.getElementById("pf-name").value = user.full;
  document.getElementById("pf-mail").value = user.email;
  document.getElementById("pf-carnet").value = user.carnet || "Sin carnet · cuenta del equipo de Nexo";
  document.getElementById("pf-mailpass").value = "";
  document.querySelector('#perfil [data-pf="mailpass"]').hidden = true;
  const ci = acc.ci || "";
  document.getElementById("pf-cit").value = ci[0] === "E" ? "E" : "V";
  document.getElementById("pf-ci").value = ci.replace(/^[VE]-?/, "");
  document.getElementById("pf-phone").value = acc.phone || "";
  document.getElementById("pf-birth").value = acc.birth || ""; try { dobFill(acc.birth || ""); } catch (err) {}
  careerOptions(document.getElementById("pf-career"), myCareer());
  document.getElementById("pf-addr").value = acc.addr || "";
  ["pf-p0", "pf-p1", "pf-p2"].forEach(id => document.getElementById(id).value = "");
  pfStrength();
  [1, 2, 3].forEach(n => pfErr(n, ""));
  document.querySelectorAll("#perfil .field.bad").forEach(f => f.classList.remove("bad"));
  document.querySelector('#perfil [data-pf="cards"]').textContent = cards.length ? `${cards.length} ${cards.length === 1 ? "tarjeta" : "tarjetas"} · ${cards.map(c => "···· " + c.last4).join(", ")}` : "Aún no afilias tarjetas";
}
document.getElementById("perfil").addEventListener("input", e => { e.target.closest(".field")?.classList.remove("bad"); const f = e.target.closest("form"); if (f) { const n = { pfAccount: 1, pfPersonal: 2, pfPass: 3 }[f.id]; if (n) pfErr(n, ""); } });
document.getElementById("pf-mail").addEventListener("input", e => {
  const changed = normEmail(e.target.value) !== user.email;
  document.querySelector('#perfil [data-pf="mailpass"]').hidden = !changed;
});
document.getElementById("pf-phone").addEventListener("input", e => { let v = e.target.value.replace(/\D/g, "").slice(0, 11); if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4); e.target.value = v; });
document.getElementById("pf-ci").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, ""); });
function pfStrength() {
  const v = document.getElementById("pf-p1").value;
  const lvl = !v ? 0 : (v.length >= 8) + /\d/.test(v) + (/[A-ZÁÉÍÓÚÑ]/.test(v) && /[^A-Za-z0-9]/.test(v) || v.length >= 12);
  document.querySelector("#pfPass .strength").dataset.lvl = lvl;
  document.querySelector('#perfil [data-pf="strength"]').textContent = !v ? "Escribe tu contraseña nueva." : lvl < 2 ? "Muy débil: usa al menos 8 caracteres y un número." : lvl === 2 ? "Aceptable. Más larga o con símbolos es más segura." : "Segura.";
}
document.getElementById("pf-p1").addEventListener("input", pfStrength);
function saveAccount(changes) {
  const i = accounts.findIndex(a => a.email === sessionEmail);
  if (i < 0) return null;
  accounts[i] = { ...accounts[i], ...changes };
  saveAccounts();
  try { sbSaveProfile(changes); } catch (err) {} // cuenta real: también en Supabase
  return accounts[i];
}
document.getElementById("pfAccount").addEventListener("submit", e => {
  e.preventDefault();
  const nameEl = document.getElementById("pf-name"), mailEl = document.getElementById("pf-mail"), passEl = document.getElementById("pf-mailpass");
  const full = cleanName(nameEl.value), email = normEmail(mailEl.value);
  if (full.split(" ").filter(Boolean).length < 2) return pfErr(1, "Escribe tu nombre y al menos un apellido.", nameEl);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return pfErr(1, "Escribe un correo válido, por ejemplo nombre@correo.unimet.edu.ve.", mailEl);
  const mailChanged = email !== user.email;
  if (mailChanged && account && account.sb) return pfErr(1, "Para cambiar el correo de tu cuenta escríbenos desde Soporte: lo verificamos para proteger tu cuenta.", mailEl);
  if (mailChanged) {
    if (accounts.some(a => a.email === email)) return pfErr(1, "Ese correo ya pertenece a otra cuenta.", mailEl);
    const acc = accounts.find(a => a.email === sessionEmail);
    if (!passEl.value) return pfErr(1, "Escribe tu contraseña actual para cambiar el correo.", passEl);
    if (!acc || acc.pass !== passKey(passEl.value)) return pfErr(1, "La contraseña no es correcta.", passEl);
  }
  if (!mailChanged && full === user.full) { toast("No hay cambios que guardar."); return; }
  saveAccount({ full, email });
  if (mailChanged) {
    // los datos de la cuenta se guardan con el correo: se mueven al correo nuevo
    try {
      const old = ":" + sessionEmail;
      Object.keys(localStorage).filter(k => k.startsWith("nexo-") && k.endsWith(old)).forEach(k => { localStorage.setItem(k.slice(0, -old.length) + ":" + email, localStorage.getItem(k)); localStorage.removeItem(k); });
    } catch (err) {}
    let remember = true; try { remember = !!localStorage.getItem("nexo-session"); } catch (err) {}
    setSession(email, remember);
    try { sessionStorage.setItem("nexo-flash", `Listo. Tu correo ahora es ${email}.`); } catch (err) {}
    history.replaceState(null, "", "#perfil"); location.reload(); return;
  }
  user.full = full; applyUser(); openPerfil();
  toast("Guardamos tu nombre.");
});
/* Fecha de nacimiento con tres listas (día, mes, año): el campo de fecha nativo cambia el orden según el idioma
   (en es-VE pone el mes primero) y no dejaba cambiar el día. Los días se ajustan al mes y a los años bisiestos;
   el valor queda en #pf-birth como AAAA-MM-DD. */
const MES_NOM = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
function dobDays() {
  const dS = document.getElementById("pf-bd-d"), m = +document.getElementById("pf-bd-m").value, y = +document.getElementById("pf-bd-y").value || 2000;
  const max = m ? new Date(y, m, 0).getDate() : 31, keep = +dS.value;
  dS.innerHTML = `<option value="">Día</option>` + Array.from({ length: max }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
  if (keep) dS.value = String(Math.min(keep, max));
}
function dobSync() {
  const d = document.getElementById("pf-bd-d").value, m = document.getElementById("pf-bd-m").value, y = document.getElementById("pf-bd-y").value;
  document.getElementById("pf-birth").value = d && m && y ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
}
function dobFill(iso) {
  const yS = document.getElementById("pf-bd-y"), mS = document.getElementById("pf-bd-m"); if (!yS) return;
  const now = new Date().getFullYear();
  if (yS.options.length < 2) {
    yS.innerHTML = `<option value="">Año</option>` + Array.from({ length: 86 }, (_, i) => now - 14 - i).map(y => `<option value="${y}">${y}</option>`).join("");
    mS.innerHTML = `<option value="">Mes</option>` + MES_NOM.map((n, i) => `<option value="${i + 1}">${n}</option>`).join("");
  }
  const [y, m, d] = (iso || "").split("-").map(Number);
  if (y && !yS.querySelector(`option[value="${y}"]`)) yS.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
  yS.value = y ? String(y) : ""; mS.value = m ? String(m) : "";
  dobDays(); document.getElementById("pf-bd-d").value = d ? String(d) : "";
  dobSync();
}
["pf-bd-d", "pf-bd-m", "pf-bd-y"].forEach(id => document.getElementById(id).addEventListener("change", e => { if (e.target.id !== "pf-bd-d") dobDays(); dobSync(); }));
try { dobFill((account || {}).birth || ""); } catch (err) {}
document.getElementById("pfPersonal").addEventListener("submit", e => {
  e.preventDefault();
  const ci = document.getElementById("pf-ci"), ph = document.getElementById("pf-phone"), bd = document.getElementById("pf-birth");
  if (ci.value && !/^\d{6,9}$/.test(ci.value)) return pfErr(2, "La cédula debe tener entre 6 y 9 números.", ci);
  if (ph.value && !/^04(12|14|16|24|26|22)-\d{7}$/.test(ph.value)) return pfErr(2, "Escribe el teléfono con el formato 0414-1234567.", ph);
  const dobParts = ["pf-bd-d", "pf-bd-m", "pf-bd-y"].map(id => document.getElementById(id));
  if (!bd.value && dobParts.some(x => x.value)) return pfErr(2, "Completa el día, el mes y el año de tu fecha de nacimiento.", dobParts.find(x => !x.value));
  if (bd.value && new Date(bd.value + "T12:00") >= new Date()) return pfErr(2, "La fecha de nacimiento debe ser anterior a hoy.", dobParts[0]);
  saveAccount({ ci: ci.value ? `${document.getElementById("pf-cit").value}-${ci.value}` : "", phone: ph.value, birth: bd.value, career: document.getElementById("pf-career").value, addr: document.getElementById("pf-addr").value.trim() });
  Object.assign(account || {}, accounts.find(a => a.email === sessionEmail));
  toast("Guardamos tus datos personales.");
});
document.getElementById("pfPass").addEventListener("submit", e => {
  e.preventDefault();
  const p0 = document.getElementById("pf-p0"), p1 = document.getElementById("pf-p1"), p2 = document.getElementById("pf-p2");
  const acc = accounts.find(a => a.email === sessionEmail);
  if (!p0.value) return pfErr(3, "Escribe tu contraseña actual.", p0);
  if (!acc || acc.pass !== passKey(p0.value)) return pfErr(3, "La contraseña actual no es correcta.", p0);
  if (p1.value.length < 8 || !/\d/.test(p1.value)) return pfErr(3, "La contraseña nueva debe tener al menos 8 caracteres y un número.", p1);
  if (p1.value === p0.value) return pfErr(3, "La contraseña nueva debe ser distinta de la actual.", p1);
  if (p1.value !== p2.value) return pfErr(3, "Las contraseñas nuevas no coinciden.", p2);
  if (sb && account && account.sb) {
    const np = p1.value;
    sb.auth.updateUser({ password: np }).then(({ error }) => { if (error) toast(`No pudimos cambiar tu contraseña: ${sbMsg(error)[0]}`); else { saveAccount({ pass: passKey(np) }); toast("Cambiaste tu contraseña. Úsala la próxima vez que inicies sesión."); } });
    [p0, p1, p2].forEach(i => i.value = ""); pfStrength(); return;
  }
  saveAccount({ pass: passKey(p1.value) });
  [p0, p1, p2].forEach(i => i.value = ""); pfStrength();
  toast("Cambiaste tu contraseña. Úsala la próxima vez que inicies sesión.");
});
/* ---------- Registro de materias del trimestre ---------- */
function fillCatalog(c) {
  const dl = document.getElementById("matCatalog"), seen = new Set();
  dl.innerHTML = careerCodes(c).filter(k => { const n = fold(MATDB[k]); if (seen.has(n)) return false; seen.add(n); return true; })
    .sort((a, b) => MATDB[a].localeCompare(MATDB[b], "es")).map(k => `<option value="${MATDB[k]}">${k}</option>`).join("");
  const n = careerCodes(c).length;
  document.getElementById("insHint").textContent = CARRERAS[c] ? `Te sugerimos las ${n} materias del flujograma de ${c}. Puedes escribir el nombre o el código (por ejemplo, ${careerCodes(c)[1] || careerCodes(c)[0]}).`
    : c ? `Aún no tenemos el flujograma de ${c}: te mostramos todas las materias de la Unimet. Escribe el nombre o el código.` : "Elige tu carrera para ver las materias de tu flujograma, o escribe el nombre o el código.";
}
document.getElementById("insCareer").addEventListener("change", e => { saveAccount({ career: e.target.value }); fillCatalog(e.target.value); document.getElementById("insErr").hidden = true; });
let insN = 0, insNames = [], insReturn = "materias";
function renderMatList() {
  const box = document.getElementById("matList"); if (!box) return;
  box.innerHTML = MATERIAS.length ? MATERIAS.map((m, i) => `${i ? '<div class="sep"></div>' : ""}<div class="row" style="padding:12px 0"><div><b style="font-size:13px">${m.n}</b><p class="tiny">${m.c || "Código por confirmar"}</p></div><div class="mv-actions"><b class="mono">$160,00 / mes</b><span class="tiny">$150,00 con pronto pago</span></div></div>`).join("")
    : `<p class="small">Aún no registras tus materias.</p>`;
}
function insRender() {
  document.querySelectorAll("#insCount .amt-chip").forEach(c => { const on = +c.dataset.mcount === insN; c.classList.toggle("on", on); c.setAttribute("aria-checked", String(on)); c.setAttribute("role", "radio"); });
  const rows = document.getElementById("insRows");
  rows.innerHTML = Array.from({ length: insN }, (_, i) => `<div class="mrow"><span class="num">${i + 1}</span><div class="input"><input list="matCatalog" data-mi="${i}" aria-label="Materia ${i + 1}" placeholder="Nombre o código de la materia ${i + 1}" value="${(insNames[i] || "").replace(/"/g, "&quot;")}" autocomplete="off" maxlength="90"></div></div>`).join("");
  const set = (k, v) => document.querySelectorAll(`#inscripcion [data-ins="${k}"]`).forEach(el => el.textContent = v);
  set("n", `${insN} ${insN === 1 ? "materia" : "materias"}`);
  set("month", money(insN * PRICE_REG)); set("monthpp", money(insN * PRICE_PP)); set("trim", money(insN * PRICE_REG * 3));
  renderInsPaid();
}
/* Meses ya emitidos que no se pagaron por Nexo: el estudiante marca los que pagó por otra vía */
let insPaid = null;
const insEligible = () => INVOICES.filter(iv => day0(simDate) >= iv.issue && !(pagos[iv.id] && ["pagada", "revision"].includes(pagos[iv.id].estado)));
function renderInsPaid() {
  const box = document.getElementById("insPaid"), el = insEligible();
  box.hidden = !el.length;
  if (!el.length) return;
  if (!insPaid) insPaid = new Set(el.filter(iv => (pagos[iv.id] && pagos[iv.id].estado === "externa") || (!MATERIAS.length && iv.m < createdAt.getMonth() && createdAt.getFullYear() === 2026)).map(iv => iv.id));
  box.innerHTML = `<legend>¿Ya pagaste algún mes del trimestre fuera de Nexo?</legend>
    <p class="tiny">Por ejemplo, en la caja de la universidad o por transferencia antes de usar Nexo. Lo que no marques queda por pagar.</p>
    ${el.map(iv => `<label class="remember paidm"><input type="checkbox" data-ins-paid="${iv.id}"${insPaid.has(iv.id) ? " checked" : ""}><span class="grow">Factura de ${iv.mes}</span><span class="small">${insN ? money(insN * PRICE_REG) : ""}</span></label>`).join("")}`;
}
document.addEventListener("change", e => {
  const c = e.target.closest("[data-ins-paid]"); if (!c) return;
  if (!insPaid) insPaid = new Set();
  c.checked ? insPaid.add(c.dataset.insPaid) : insPaid.delete(c.dataset.insPaid);
});
function openInscripcion() {
  insN = MATERIAS.length; insNames = MATERIAS.map(m => m.n); insPaid = null;
  const car = myCareer(); careerOptions(document.getElementById("insCareer"), car); fillCatalog(car);
  const editing = MATERIAS.length > 0;
  document.querySelector('#inscripcion [data-ins="title"]').textContent = editing ? "Tus materias del trimestre" : "Antes de ver tu cuenta, cuéntanos qué inscribiste";
  document.querySelector('#inscripcion [data-ins="cta"]').textContent = editing ? "Guardar cambios" : "Guardar y ver mi estado de cuenta";
  document.querySelector('#inscripcion [data-ins="editnote"]').hidden = !editing;
  document.getElementById("insErr").hidden = true;
  insRender();
}
document.getElementById("insCount").addEventListener("click", e => {
  const c = e.target.closest("[data-mcount]"); if (!c) return;
  insNames = [...document.querySelectorAll("#insRows input")].map(i => i.value);
  insN = +c.dataset.mcount; insRender(); document.getElementById("insErr").hidden = true;
  const first = [...document.querySelectorAll("#insRows input")].find(i => !i.value); if (first) first.focus();
});
document.getElementById("insRows").addEventListener("input", e => { e.target.closest(".input")?.classList.remove("badin"); e.target.closest(".mrow").querySelector(".input").style.borderColor = ""; document.getElementById("insErr").hidden = true; });
document.getElementById("insForm").addEventListener("submit", e => {
  e.preventDefault();
  const err = (msg, el) => { const b = document.getElementById("insErr"); b.querySelector("p").textContent = msg; b.hidden = false; if (el) { el.closest(".input").style.borderColor = "#c2410c"; el.focus(); } };
  if (!insN) return err("Elige cuántas materias inscribiste.");
  const inputs = [...document.querySelectorAll("#insRows input")];
  const names = inputs.map(i => i.value.trim().replace(/\s+/g, " "));
  const empty = inputs.find((i, k) => !names[k]); if (empty) return err("Escribe el nombre de cada materia.", empty);
  const career = document.getElementById("insCareer").value;
  const found = names.map(n => findSubject(n, career));
  const seen = new Set();
  for (let k = 0; k < found.length; k++) { const key = found[k].c || fold(found[k].n); if (seen.has(key)) return err(`"${found[k].n}" está repetida. Revisa la lista.`, inputs[k]); seen.add(key); }
  const wasEmpty = !MATERIAS.length;
  if (career) saveAccount({ career });
  MATERIAS = found;
  insEligible().forEach(iv => { if (insPaid && insPaid.has(iv.id)) pagos[iv.id] = { estado: "externa", via: "Fuera de Nexo" }; else if (pagos[iv.id] && pagos[iv.id].estado === "externa") delete pagos[iv.id]; });
  savePagos();
  saveMaterias(); defaultSel(); renderDebt(); renderMatList(); if (typeof renderNotifs === "function") renderNotifs();
  toast(wasEmpty ? `Registramos tus ${MATERIAS.length} ${MATERIAS.length === 1 ? "materia" : "materias"}. Cada factura es de ${money(MATERIAS.length * PRICE_REG)}.` : "Actualizamos tus materias.");
  go(wasEmpty ? insReturn : "materias");
});
renderMatList();
/* ---------- Comida y kioscos: menús, carrito y pedidos ---------- */
// Cada local tiene categorías con productos. Las opciones son grupos de "elige una";
// el primer valor es el predeterminado y `p` es el recargo en USD.
const foodOpt = (name, note, choices) => ({ name, note, choices: choices.map(c => Array.isArray(c) ? { l: c[0], p: c[1] } : { l: c, p: 0 }) });
const TAMANO = foodOpt("Tamaño", "Elige uno · Obligatorio", ["Pequeño", ["Grande", 0.5]]);
/* Ilustraciones propias de cada local y kiosco (SVG 120×120; el fondo de color lo pone .food-art con --fa) */
const FOOD_ART = {
  pinchopan: { bg: "#ffe2a8", svg: `
    <ellipse cx="60" cy="98" rx="38" ry="6" fill="#000" opacity=".08"/>
    <path d="M24 70c0-6 5-10 11-10h50c6 0 11 4 11 10v4H24z" fill="#e7a24a"/>
    <path d="M22 66c6-4 10 3 16-1s10 3 16-1 10 3 16-1 10 3 16-1 8 2 12 0v6H22z" fill="#5cb85c"/>
    <rect x="26" y="60" width="68" height="7" rx="3" fill="#e2483d"/>
    <path d="M30 60l10-9 8 9z" fill="#ffd35c"/><path d="M58 60l12-10 10 10z" fill="#ffd35c"/>
    <path d="M26 58c0-16 15-26 34-26s34 10 34 26z" fill="#f2b45f"/>
    <path d="M30 56c2-11 13-19 30-19" stroke="#ffe0a3" stroke-width="4" stroke-linecap="round" fill="none"/>
    <circle cx="48" cy="44" r="1.6" fill="#fff3d6"/><circle cx="62" cy="40" r="1.6" fill="#fff3d6"/><circle cx="74" cy="46" r="1.6" fill="#fff3d6"/>
    <path d="M24 78h72v4c0 6-5 10-11 10H35c-6 0-11-4-11-10z" fill="#d48b34"/>
    <g transform="rotate(-28 92 34)"><rect x="70" y="32" width="44" height="3" rx="1.5" fill="#b07a45"/>
      <rect x="76" y="26" width="9" height="15" rx="3" fill="#9b4a2c"/><rect x="87" y="27" width="8" height="13" rx="3" fill="#f06a3c"/><rect x="97" y="26" width="9" height="15" rx="3" fill="#9b4a2c"/></g>` },
  lapausa: { bg: "#f1dcc4", svg: `
    <ellipse cx="54" cy="98" rx="36" ry="6" fill="#000" opacity=".08"/>
    <path d="M44 34c-4-5 4-8 0-13M56 32c-4-5 4-8 0-13M68 34c-4-5 4-8 0-13" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".85"/>
    <ellipse cx="56" cy="88" rx="34" ry="7" fill="#fff"/><ellipse cx="56" cy="86" rx="26" ry="4" fill="#e9e2da"/>
    <path d="M32 46h48v20c0 13-11 22-24 22s-24-9-24-22z" fill="#fff"/>
    <path d="M80 52h4c7 0 11 5 11 10s-4 10-11 10h-6" stroke="#fff" stroke-width="5" fill="none"/>
    <ellipse cx="56" cy="46" rx="24" ry="5" fill="#7a4a2a"/><ellipse cx="56" cy="45.5" rx="17" ry="3" fill="#a46a3f"/>
    <path d="M34 62c6 4 38 4 44 0" stroke="#1F7A55" stroke-width="4" fill="none"/>
    <g transform="translate(78 76) rotate(-12)"><path d="M0 10C2 2 10-2 18 0s14 8 16 12c-8 2-30 2-34-2z" fill="#e9a24a"/>
      <path d="M8 2c2 4 2 8 0 11M17 0c2 5 2 9 0 13M26 3c1 4 1 7 0 10" stroke="#c97c2a" stroke-width="2" fill="none" stroke-linecap="round"/></g>` },
  migrill: { bg: "#ffd2c2", svg: `
    <ellipse cx="60" cy="100" rx="36" ry="5" fill="#000" opacity=".08"/>
    <path d="M38 76l-8 20M82 76l8 20M60 78v18" stroke="#3a3f44" stroke-width="4" stroke-linecap="round"/>
    <path d="M22 60h76c0 12-17 20-38 20s-38-8-38-20z" fill="#2f3438"/>
    <path d="M38 58c-4-8 4-10 2-18 6 4 6 10 4 14 2-6 8-8 8-16 6 8 4 14 2 20z" fill="#ff9a2e"/>
    <path d="M62 58c-3-7 5-10 3-17 6 5 6 11 3 15 3-4 8-6 8-12 4 6 3 11 0 14z" fill="#ffc23d"/>
    <path d="M48 58c-2-5 3-7 2-11 4 3 4 7 2 11z" fill="#ff5a36"/>
    <rect x="20" y="56" width="80" height="5" rx="2.5" fill="#6b7177"/>
    <path d="M30 52h60" stroke="#9aa1a7" stroke-width="2" stroke-dasharray="6 4"/>
    <rect x="34" y="42" width="34" height="12" rx="6" fill="#8a3b22"/><path d="M40 44l6 8M50 44l6 8M60 44l5 7" stroke="#5e2414" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="80" cy="48" r="8" fill="#c0392b"/><path d="M80 40v-6" stroke="#6b7177" stroke-width="2.5" stroke-linecap="round"/>` },
  tienda: { bg: "#d6e7fb", svg: `
    <ellipse cx="60" cy="102" rx="40" ry="5" fill="#000" opacity=".08"/>
    <rect x="26" y="50" width="68" height="50" rx="4" fill="#fff"/>
    <rect x="34" y="62" width="30" height="24" rx="3" fill="#bfe3ff"/><path d="M38 80l8-10 6 6 4-4 6 8" stroke="#7fb5e6" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
    <rect x="70" y="64" width="16" height="36" rx="2" fill="#2a78d6"/><circle cx="82" cy="83" r="1.6" fill="#fff"/>
    <rect x="28" y="88" width="38" height="6" rx="2" fill="#e8eef5"/>
    <path d="M20 36h80l6 16H14z" fill="#1F7A55"/>
    <path d="M14 52a6.5 6.5 0 0 0 13 0a6.5 6.5 0 0 0 13 0a6.5 6.5 0 0 0 13 0a6.5 6.5 0 0 0 13 0a6.5 6.5 0 0 0 13 0a6.5 6.5 0 0 0 13 0a6.5 6.5 0 0 0 14 0" fill="#1F7A55"/>
    <path d="M27 36l-3 16M47 36l-1 16M67 36v16M87 36l2 16" stroke="#fff" stroke-width="7" opacity=".9"/>
    <rect x="40" y="20" width="40" height="14" rx="4" fill="#fff"/><text x="60" y="30.5" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="9" font-weight="700" fill="#1F7A55">{{SIGN}}</text>` },
  believe: { bg: "#fbd9e8", svg: `
    <ellipse cx="60" cy="100" rx="28" ry="5" fill="#000" opacity=".08"/>
    <path d="M66 14l-4 30" stroke="#1F7A55" stroke-width="5" stroke-linecap="round"/><path d="M66 14l12-4" stroke="#1F7A55" stroke-width="5" stroke-linecap="round"/>
    <path d="M36 40h48l-6 58H42z" fill="#e94f86"/>
    <path d="M38 52h44l-1 10H39z" fill="#fff" opacity=".9"/><text x="60" y="60" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="7" font-weight="700" fill="#e94f86">BELIEVE</text>
    <path d="M42 70c4 18 4 22 2 26" stroke="#ff8fb7" stroke-width="3" stroke-linecap="round" fill="none"/>
    <rect x="32" y="34" width="56" height="8" rx="4" fill="#fff"/>
    <circle cx="28" cy="58" r="3" fill="#fff" opacity=".8"/><circle cx="92" cy="48" r="4" fill="#fff" opacity=".8"/><circle cx="96" cy="66" r="2.5" fill="#fff" opacity=".8"/><circle cx="24" cy="76" r="2" fill="#fff" opacity=".8"/>` },
  teeb: { bg: "#ffe0b8", svg: `
    <ellipse cx="60" cy="100" rx="40" ry="5" fill="#000" opacity=".08"/>
    <path d="M70 92h30l-4-38H74z" fill="#e2483d"/><path d="M74 54h22l-1 8H75z" fill="#fff" opacity=".9"/>
    <path d="M78 54l-2-22M83 54l-1-26M88 54l1-24M93 54l2-20M85 54v-18" stroke="#ffc23d" stroke-width="5" stroke-linecap="round"/>
    <path d="M12 82c0-20 14-34 30-34s30 14 30 34z" fill="#f0b257"/><path d="M12 82h60" stroke="#d48b34" stroke-width="5" stroke-linecap="round"/>
    <path d="M18 82l3-4 3 4 3-4 3 4 3-4 3 4 3-4 3 4 3-4 3 4 3-4 3 4 3-4 3 4 3-4 3 4" stroke="#c97c2a" stroke-width="2" fill="none"/>
    <path d="M24 64c6-7 14-10 22-8" stroke="#ffd58f" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <g transform="translate(40 66) rotate(18)"><path d="M0 26c0-14 10-24 22-24s22 10 22 24z" fill="#e9a24a"/><path d="M0 26h44" stroke="#c97c2a" stroke-width="4" stroke-linecap="round"/><path d="M4 26l2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3" stroke="#b56d22" stroke-width="1.6" fill="none"/></g>` },
  molokai: { bg: "#cfeefb", svg: `
    <ellipse cx="60" cy="100" rx="40" ry="5" fill="#000" opacity=".08"/>
    <path d="M30 50c4-8 12-12 18-10 2-8 14-10 18-2 8-4 18 2 18 12z" fill="#fff"/>
    <rect x="34" y="40" width="16" height="12" rx="3" fill="#ff8a65" transform="rotate(-10 42 46)"/><path d="M36 44l12-2M37 48l12-2" stroke="#ffc1a8" stroke-width="1.5" transform="rotate(-10 42 46)"/>
    <rect x="52" y="38" width="15" height="12" rx="3" fill="#ff8a65" transform="rotate(8 60 44)"/>
    <ellipse cx="74" cy="46" rx="7" ry="5" fill="#7cc46a"/><ellipse cx="74" cy="46" rx="4" ry="3" fill="#b9e08a"/>
    <circle cx="60" cy="52" r="2" fill="#5aa84a"/><circle cx="66" cy="54" r="2" fill="#5aa84a"/><circle cx="84" cy="50" r="3" fill="#ffd35c"/>
    <path d="M22 54h76c0 22-17 38-38 38S22 76 22 54z" fill="#1c5cab"/><path d="M28 62c4 12 16 22 32 22" stroke="#5598e7" stroke-width="4" stroke-linecap="round" fill="none"/>
    <rect x="22" y="52" width="76" height="6" rx="3" fill="#2a78d6"/>
    <g transform="translate(92 26)"><circle r="5" fill="#ffd35c"/>${[0, 72, 144, 216, 288].map(a => `<ellipse rx="5" ry="9" cy="-10" fill="#e94f86" transform="rotate(${a})"/>`).join("")}<circle r="4" fill="#ffd35c"/></g>` },
  sanahoria: { bg: "#ffe2c8", svg: `
    <ellipse cx="60" cy="100" rx="36" ry="5" fill="#000" opacity=".08"/>
    ${[[-18, 40, 0], [0, 60, -6], [18, 80, 4]].map(([r, x, d]) => `<g transform="rotate(${r} ${x} 70)"><path d="M${x - 9} ${42 + d}h18l-9 52z" fill="#f2792c"/><path d="M${x - 6} ${54 + d}h7M${x - 3} ${66 + d}h7M${x - 5} ${78 + d}h5" stroke="#d45d16" stroke-width="2" stroke-linecap="round"/><path d="M${x} ${42 + d}c-2-10-8-14-12-16M${x} ${42 + d}c0-10 2-16 0-22M${x} ${42 + d}c2-10 8-14 12-16" stroke="#4caf50" stroke-width="4" stroke-linecap="round" fill="none"/></g>`).join("")}` },
  granier: { bg: "#f6dfbf", svg: `
    <ellipse cx="60" cy="100" rx="42" ry="5" fill="#000" opacity=".08"/>
    <path d="M14 74c0-18 18-30 40-30s40 12 40 30c0 8-6 14-14 14H28c-8 0-14-6-14-14z" fill="#c98a52"/>
    <path d="M30 56l8 14M46 50l8 16M62 50l8 16M78 56l6 12" stroke="#a46a3f" stroke-width="4" stroke-linecap="round"/>
    <path d="M22 66c4-10 14-16 24-17" stroke="#e3ad78" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M48 94c4-14 16-22 26-22s22 8 26 22c-6 2-10-2-12-6-3 5-8 7-14 7s-11-2-14-7c-2 4-6 8-12 6z" fill="#e9a24a"/>
    <path d="M62 80c2 4 2 8 0 12M74 76c2 5 2 11 0 16M86 80c2 4 2 8 0 12" stroke="#c97c2a" stroke-width="2.4" stroke-linecap="round" fill="none"/>` },
  pepperonis: { bg: "#ffd9c4", svg: `
    <ellipse cx="60" cy="100" rx="40" ry="5" fill="#000" opacity=".08"/>
    <circle cx="60" cy="58" r="40" fill="#e9a24a"/><circle cx="60" cy="58" r="34" fill="#e2483d"/><circle cx="60" cy="58" r="32" fill="#ffd35c"/>
    <path d="M60 58L60 18A40 40 0 0 1 98 46z" fill="#ffd9c4"/>
    ${[[48, 40], [40, 60], [56, 74], [74, 66], [64, 50], [80, 76], [44, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="#c0392b"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="1.5" fill="#e2483d"/>`).join("")}
    <path d="M70 12l30 12-24 34z" fill="#ffd35c" stroke="#e9a24a" stroke-width="4" stroke-linejoin="round" transform="translate(4 -2)"/>
    <circle cx="84" cy="24" r="4" fill="#c0392b"/><circle cx="80" cy="36" r="3.5" fill="#c0392b"/>` },
  juicebar: { bg: "#fff0b8", svg: `
    <ellipse cx="56" cy="100" rx="30" ry="5" fill="#000" opacity=".08"/>
    <path d="M62 12l-6 40" stroke="#1F7A55" stroke-width="5" stroke-linecap="round"/>
    <path d="M32 34h48l-6 64H38z" fill="#fff" opacity=".85"/><path d="M34 48h44l-5 48H39z" fill="#ff9a2e"/>
    <path d="M38 52h36" stroke="#ffc07a" stroke-width="3" stroke-linecap="round"/><rect x="44" y="62" width="9" height="9" rx="2" fill="#fff" opacity=".45"/><rect x="58" y="72" width="9" height="9" rx="2" fill="#fff" opacity=".45"/>
    <circle cx="82" cy="34" r="12" fill="#ffb02e"/><circle cx="82" cy="34" r="9" fill="#ffd27a"/><path d="M82 25v18M73 34h18M76 28l12 12M88 28L76 40" stroke="#ffb02e" stroke-width="1.4"/>
    <path d="M18 80c0-8 6-12 12-12s10 4 10 10c0 9-9 16-11 18-2-2-11-8-11-16z" fill="#e2483d"/><path d="M28 68c0-4 3-6 6-6" stroke="#4caf50" stroke-width="3" stroke-linecap="round" fill="none"/>` },
  deydonuts: { bg: "#fde0ec", svg: `
    <ellipse cx="60" cy="100" rx="40" ry="5" fill="#000" opacity=".08"/>
    <circle cx="60" cy="60" r="36" fill="#e9a24a"/>
    <path d="M60 28c18 0 32 13 32 30 0 6-4 6-6 3s-6 2-8 6-6 2-8-1-6 2-8 4-7 0-8-3-6-3-8 0-7 0-8-4-6-2-8-5c-2-8 4-30 29-30z" fill="#f48fb1"/>
    <circle cx="60" cy="58" r="11" fill="#fde0ec"/><circle cx="60" cy="58" r="11" fill="none" stroke="#e57fa4" stroke-width="2"/>
    ${[[42, 42, "#ffd35c", 20], [50, 34, "#4cc3ae", -30], [70, 36, "#2a78d6", 40], [80, 48, "#fff", -10], [38, 56, "#fff", 60], [74, 62, "#ffd35c", 10], [46, 66, "#4cc3ae", -40], [66, 44, "#e94f86", 70]].map(([x, y, c, r]) => `<rect x="${x}" y="${y}" width="7" height="2.6" rx="1.3" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`).join("")}` },
};
const FOOD_ART_FOR = { tienditaa1: ["tienda", "A1"], tienditaa2: ["tienda", "A2"] };
function foodArt(id, cls = "") {
  const [key, sign] = FOOD_ART_FOR[id] || [id, ""], a = FOOD_ART[key];
  if (!a) return "";
  return `<span class="food-art ${cls}" style="--fa:${a.bg}" aria-hidden="true"><svg viewBox="0 0 120 120">${a.svg.replace("{{SIGN}}", sign)}</svg></span>`;
}

/* Ilustraciones de productos (SVG 64×64, mismo estilo que FOOD_ART). Se reutilizan entre locales por id de producto. */
const PA_BG = { cafe: "#f1dcc4", fria: "#d6ecfb", comida: "#ffe2a8", grill: "#ffd2c2", bowl: "#d4f0dd", horno: "#fbe2bd", snack: "#fbd9e8" };
const paSh = `<ellipse cx="32" cy="56" rx="20" ry="3" fill="#000" opacity=".08"/>`;
const paCup = (fill, top = "") => `${paSh}<path d="M46 30h3a6 6 0 0 1 0 12h-3" stroke="#fff" stroke-width="3.5" fill="none"/><path d="M16 26h32v12a16 14 0 0 1-32 0z" fill="#fff"/><ellipse cx="32" cy="52" rx="20" ry="3.5" fill="#fff"/><ellipse cx="32" cy="26" rx="16" ry="4" fill="${fill}"/>${top}<path d="M27 18c-2-3 2-5 0-8M35 18c-2-3 2-5 0-8" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".9"/>`;
const paGlass = (liq, extra = "") => `${paSh}<path d="M19 14h26l-3 40H22z" fill="#fff" opacity=".75"/><path d="M20.5 24h23l-2.3 29H22.8z" fill="${liq}"/>${extra}<path d="M19 14h26" stroke="#fff" stroke-width="2"/>`;
const paBowl = top => `${paSh}${top}<path d="M10 32h44c0 12-10 21-22 21S10 44 10 32z" fill="#1F7A55"/><path d="M14 36c2 7 9 12 18 12" stroke="#4cc3ae" stroke-width="2.5" stroke-linecap="round" fill="none"/><rect x="10" y="30" width="44" height="4" rx="2" fill="#12a690"/>`;
const paBurger = patty => `${paSh}<path d="M14 40h36v3c0 5-4 8-9 8H23c-5 0-9-3-9-8z" fill="#d48b34"/><rect x="13" y="34" width="38" height="7" rx="3.5" fill="${patty}"/><path d="M13 34c4-3 6 2 10-1s6 2 10-1 6 2 10-1 6 2 8 0v3H13z" fill="#5cb85c"/><path d="M17 33l7-5 6 5z" fill="#ffd35c"/><path d="M14 31c0-9 8-15 18-15s18 6 18 15z" fill="#f2b45f"/><circle cx="26" cy="22" r="1" fill="#fff3d6"/><circle cx="34" cy="20" r="1" fill="#fff3d6"/><circle cx="40" cy="24" r="1" fill="#fff3d6"/>`;
const PROD_ART = {
  almuerzo: ["comida", `${paSh}<ellipse cx="32" cy="38" rx="24" ry="13" fill="#fff"/><ellipse cx="32" cy="37" rx="18" ry="9" fill="#f1f1ec"/><ellipse cx="25" cy="35" rx="8" ry="5" fill="#fff"/><circle cx="23" cy="34" r=".8" fill="#e9e5da"/><circle cx="27" cy="36" r=".8" fill="#e9e5da"/><path d="M33 30c6-3 12 0 11 5-1 4-8 5-12 2z" fill="#a8622f"/><ellipse cx="34" cy="42" rx="6" ry="3" fill="#5cb85c"/><path d="M40 41c3-2 7-1 7 1-2 2-5 2-7-1z" fill="#ffc23d"/><circle cx="30" cy="42" r="2" fill="#e2483d"/>`],
  pincho: ["grill", `${paSh}<path d="M34 50h18l-3-16H37z" fill="#e2483d"/><path d="M39 34l-1-10M43 34l1-12M47 34l1-9M41 34v-8" stroke="#ffc23d" stroke-width="3" stroke-linecap="round"/><path d="M8 48L36 14" stroke="#b07a45" stroke-width="2.5" stroke-linecap="round"/><rect x="13" y="34" width="8" height="10" rx="3" transform="rotate(-50 17 39)" fill="#9b4a2c"/><rect x="20" y="26" width="7" height="9" rx="3" transform="rotate(-50 23.5 30.5)" fill="#f06a3c"/><rect x="26" y="18" width="8" height="10" rx="3" transform="rotate(-50 30 23)" fill="#9b4a2c"/>`],
  wrap: ["comida", `${paSh}<g transform="rotate(-25 32 34)"><rect x="12" y="24" width="40" height="20" rx="10" fill="#f3d9a4"/><ellipse cx="50" cy="34" rx="6" ry="10" fill="#fff4d8"/><circle cx="49" cy="31" r="3" fill="#5cb85c"/><circle cx="51" cy="37" r="2.5" fill="#e2483d"/><circle cx="48" cy="38" r="2" fill="#c98a52"/><path d="M18 28h22M18 40h22" stroke="#e2c27f" stroke-width="2" stroke-linecap="round"/></g>`],
  sandjq: ["comida", `${paSh}<path d="M10 48l22-32 22 32z" fill="#f2c27a"/><path d="M14 44l18-25 18 25z" fill="#fff4d8"/><path d="M12 46l20-28 20 28" stroke="#f19aa8" stroke-width="3" fill="none"/><path d="M16 48l16-22 16 22" stroke="#ffd35c" stroke-width="3" fill="none"/>`],
  reina: ["comida", `${paSh}<ellipse cx="32" cy="42" rx="20" ry="9" fill="#e9c27d"/><path d="M14 38c6-4 30-4 36 0-2 3-34 3-36 0z" fill="#9bd36e"/><circle cx="22" cy="36" r="3" fill="#7cc46a"/><circle cx="32" cy="34" r="3.5" fill="#b9e08a"/><circle cx="42" cy="36" r="3" fill="#7cc46a"/><path d="M12 34c0-8 9-12 20-12s20 4 20 12z" fill="#f2d28f"/><circle cx="24" cy="27" r="1.2" fill="#d9a85a"/><circle cx="38" cy="26" r="1.2" fill="#d9a85a"/>`],
  limonada: ["fria", paGlass("#d9f06a", `<rect x="26" y="28" width="7" height="7" rx="1.5" fill="#fff" opacity=".6"/><circle cx="44" cy="16" r="7" fill="#c6e84a"/><circle cx="44" cy="16" r="5" fill="#eaf8a6"/><path d="M44 11v10M39 16h10" stroke="#c6e84a" stroke-width="1"/><path d="M36 6l-4 40" stroke="#1F7A55" stroke-width="2.5" stroke-linecap="round"/>`)],
  papelon: ["fria", paGlass("#c8893e", `<rect x="27" y="30" width="7" height="7" rx="1.5" fill="#fff" opacity=".5"/><circle cx="44" cy="16" r="7" fill="#7cc46a"/><circle cx="44" cy="16" r="5" fill="#c9eea6"/>`)],
  guayoyo: ["cafe", paCup("#5a3420")],
  negro: ["cafe", paCup("#3d2414")],
  marron: ["cafe", paCup("#a46a3f")],
  conleche: ["cafe", paCup("#c99566")],
  capuchino: ["cafe", paCup("#e8d2b6", `<path d="M32 30c-3-3-7 0-4 3l4 3 4-3c3-3-1-6-4-3z" fill="#a46a3f"/>`)],
  empanada: ["horno", `${paSh}<path d="M10 42c0-14 10-24 22-24s22 10 22 24z" fill="#f0b257"/><path d="M10 42h44" stroke="#d48b34" stroke-width="4" stroke-linecap="round"/><path d="M14 42l2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3" stroke="#c97c2a" stroke-width="1.6" fill="none"/><path d="M20 30c4-5 10-7 16-6" stroke="#ffd58f" stroke-width="2.5" stroke-linecap="round" fill="none"/>`],
  cachito: ["horno", `${paSh}<path d="M8 40c4-14 16-22 24-22s20 8 24 22c-6 2-10-2-12-6-3 5-8 7-12 7s-9-2-12-7c-2 4-6 8-12 6z" fill="#e9a24a"/><path d="M20 26c2 4 2 9 0 12M32 22c2 5 2 11 0 16M44 26c2 4 2 9 0 12" stroke="#c97c2a" stroke-width="2" stroke-linecap="round" fill="none"/>`],
  pastelito: ["horno", `${paSh}<rect x="12" y="24" width="40" height="24" rx="5" fill="#f0b257"/><rect x="12" y="24" width="40" height="8" rx="4" fill="#f6c879"/><path d="M18 38h4M26 38h4M34 38h4M42 38h4M18 43h4M26 43h4M34 43h4M42 43h4" stroke="#d48b34" stroke-width="1.6" stroke-linecap="round"/>`],
  golfeado: ["horno", `${paSh}<ellipse cx="32" cy="40" rx="20" ry="11" fill="#c97c2a"/><ellipse cx="32" cy="36" rx="20" ry="11" fill="#e2973f"/><path d="M32 36m-3 0a3 3 0 1 1 6 0a7 7 0 1 1-14 0a11 11 0 1 1 22 0a15 9 0 1 1-30 0" stroke="#a55a1d" stroke-width="2.2" fill="none"/><path d="M18 30c6-4 14-5 22-2" stroke="#fff3d6" stroke-width="2" stroke-linecap="round" fill="none" opacity=".8"/>`],
  torta: ["snack", `${paSh}<path d="M12 30l34-12 6 6v26H12z" fill="#5a3420"/><path d="M12 38h40M12 45h40" stroke="#f6d7c4" stroke-width="2.5"/><path d="M12 30l34-12 6 6-40 6z" fill="#7a4a2a"/><path d="M12 30h40v3H12z" fill="#3d2414"/><circle cx="44" cy="17" r="4" fill="#e2483d"/><path d="M44 13c1-3 3-4 5-4" stroke="#5cb85c" stroke-width="1.5" fill="none"/>`],
  parrilla: ["grill", `${paSh}<rect x="8" y="40" width="48" height="10" rx="3" fill="#c9915a"/><path d="M12 38c0-10 10-16 22-16s18 6 18 12-6 6-14 6z" fill="#8a3b22"/><path d="M20 28l8 10M28 25l10 12M38 25l8 9" stroke="#5e2414" stroke-width="2.4" stroke-linecap="round"/><path d="M44 36c3 0 6-1 7-4" stroke="#f3d1b8" stroke-width="2.5" stroke-linecap="round" fill="none"/>`],
  brasa: ["grill", `${paSh}<path d="M40 14c10 0 16 8 12 18-3 8-12 12-20 10l-8 10c-2 3-7 2-7-2-3 0-5-4-2-6l10-8c-2-8 2-22 15-22z" fill="#c8732e"/><path d="M44 18c5 1 7 6 5 11" stroke="#f0a95a" stroke-width="2.5" stroke-linecap="round" fill="none"/><circle cx="17" cy="51" r="3" fill="#f3e6d6"/><circle cx="14" cy="47" r="3" fill="#f3e6d6"/>`],
  clasica: ["grill", paBurger("#7a3b20")],
  hpollo: ["grill", paBurger("#d08a45")],
  refresco: ["fria", `${paSh}<rect x="20" y="12" width="24" height="42" rx="5" fill="#e2483d"/><rect x="20" y="12" width="24" height="5" rx="2.5" fill="#c9ced3"/><rect x="20" y="49" width="24" height="5" rx="2.5" fill="#c9ced3"/><path d="M24 26c6 6 10 4 16 10" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/><rect x="22" y="20" width="3" height="26" rx="1.5" fill="#fff" opacity=".35"/>`],
  agua: ["fria", `${paSh}<rect x="27" y="8" width="10" height="6" rx="2" fill="#2a78d6"/><path d="M24 16c0-2 2-3 3-3h10c1 0 3 1 3 3l2 6v30c0 2-2 4-4 4H26c-2 0-4-2-4-4V22z" fill="#cfe8fb"/><rect x="22" y="28" width="20" height="12" fill="#2a78d6"/><path d="M28 34h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/><rect x="25" y="20" width="3" height="30" rx="1.5" fill="#fff" opacity=".7"/>`],
  teriyaki: ["bowl", paBowl(`<ellipse cx="32" cy="30" rx="20" ry="7" fill="#fff"/><path d="M22 28c4-4 10-4 12 0-4 3-9 3-12 0zM32 26c4-4 10-3 11 1-4 3-9 2-11-1z" fill="#a8622f"/><circle cx="26" cy="27" r="1" fill="#f3e6d6"/><circle cx="38" cy="26" r="1" fill="#f3e6d6"/><path d="M42 30l4-3" stroke="#5cb85c" stroke-width="2.5" stroke-linecap="round"/>`)],
  veggie: ["bowl", paBowl(`<circle cx="22" cy="28" r="6" fill="#5aa84a"/><circle cx="32" cy="25" r="7" fill="#8fd16f"/><circle cx="42" cy="28" r="6" fill="#5aa84a"/><circle cx="28" cy="30" r="3" fill="#ff7a45"/><circle cx="38" cy="30" r="3" fill="#ffd35c"/>`)],
  cesar: ["bowl", paBowl(`<path d="M14 30c2-8 10-10 14-6 3-6 12-6 14 0 4-4 10 0 8 6z" fill="#b9e08a"/><rect x="24" y="24" width="5" height="5" rx="1" fill="#e9b25a"/><rect x="34" y="23" width="5" height="5" rx="1" fill="#e9b25a"/><path d="M26 30c3-2 8-2 12 0" stroke="#a8622f" stroke-width="3" stroke-linecap="round"/>`)],
  atun: ["bowl", paBowl(`<path d="M14 30c2-7 9-9 13-5 4-5 11-5 14 0 4-3 9 0 9 5z" fill="#8fd16f"/><ellipse cx="32" cy="27" rx="7" ry="4" fill="#e8a99a"/><circle cx="22" cy="28" r="2.5" fill="#e2483d"/><circle cx="43" cy="28" r="2.5" fill="#2f3438"/>`)],
  tefrio: ["fria", paGlass("#e0943f", `<rect x="25" y="28" width="7" height="7" rx="1.5" fill="#fff" opacity=".5"/><rect x="33" y="34" width="7" height="7" rx="1.5" fill="#fff" opacity=".5"/><circle cx="44" cy="16" r="6.5" fill="#ffb27a"/><path d="M44 10c2 2 2 4 0 6" stroke="#5cb85c" stroke-width="1.5" fill="none"/>`)],
  batido: ["fria", `${paSh}<path d="M20 18h24l-3 36H23z" fill="#7cc46a"/><path d="M19 18h26v4H19z" fill="#fff"/><path d="M36 4l-4 30" stroke="#e94f86" stroke-width="3" stroke-linecap="round"/><path d="M23 26h18" stroke="#a6dc8a" stroke-width="2.5" stroke-linecap="round"/><circle cx="28" cy="36" r="1.5" fill="#5aa84a"/><circle cx="35" cy="42" r="1.5" fill="#5aa84a"/>`],
  tequenos: ["horno", `${paSh}${[0, 1, 2].map(i => `<g transform="rotate(${-20 + i * 14} 32 34) translate(0 ${i * 2})"><rect x="10" y="${26 + i * 6}" width="40" height="8" rx="4" fill="#e9a24a"/><path d="M14 ${30 + i * 6}h32" stroke="#c97c2a" stroke-width="1.2" stroke-dasharray="3 3"/><ellipse cx="50" cy="${30 + i * 6}" rx="2.5" ry="3" fill="#fff4d8"/></g>`).join("")}`],
  galletas: ["snack", `${paSh}<circle cx="26" cy="38" r="14" fill="#d9a25a"/><circle cx="40" cy="30" r="13" fill="#e9b56a"/><circle cx="36" cy="26" r="2" fill="#5a3420"/><circle cx="44" cy="32" r="2" fill="#5a3420"/><circle cx="38" cy="36" r="1.6" fill="#5a3420"/><circle cx="20" cy="36" r="2" fill="#5a3420"/><circle cx="28" cy="44" r="1.6" fill="#5a3420"/>`],
  jugo: ["fria", `${paSh}<path d="M20 20l4-8h16l4 8v34H20z" fill="#ff9a2e"/><path d="M20 20h24v6H20z" fill="#ffb95c"/><circle cx="32" cy="38" r="8" fill="#ffd35c"/><circle cx="32" cy="38" r="5" fill="#fff0b8"/><path d="M38 12l6-8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`],
  energizante: ["snack", `${paSh}<rect x="20" y="10" width="24" height="44" rx="5" fill="#2f3438"/><rect x="20" y="10" width="24" height="5" rx="2.5" fill="#c9ced3"/><path d="M34 20l-8 14h6l-3 12 9-16h-6l3-10z" fill="#ffd35c"/>`],
  papitas: ["snack", `${paSh}<path d="M16 12h32l-2 6 2 6-2 24 2 6H16l2-6-2-24 2-6z" fill="#ffd35c"/><path d="M16 12h32M16 54h32" stroke="#e2483d" stroke-width="3"/><ellipse cx="32" cy="34" rx="9" ry="7" fill="#f6b73c"/><path d="M27 33c3-2 7-2 10 0" stroke="#d48b34" stroke-width="1.5" fill="none"/>`],
  chocolate: ["snack", `${paSh}<g transform="rotate(-18 32 34)"><rect x="12" y="24" width="40" height="22" rx="3" fill="#5a3420"/><path d="M22 24v22M32 24v22M42 24v22M12 35h40" stroke="#3d2414" stroke-width="1.5"/><path d="M32 22h22v26H32z" fill="#e94f86"/><path d="M36 30h14" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></g>`],
  mani: ["snack", `${paSh}<path d="M12 34h40c0 10-9 18-20 18s-20-8-20-18z" fill="#fff"/><path d="M12 34h40" stroke="#e8e2d6" stroke-width="2"/>${[[20, 30], [27, 27], [34, 29], [41, 27], [24, 33], [38, 32]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="3" fill="#d9a25a"/><path d="M${x - 1} ${y - 1}v2" stroke="#b07a45" stroke-width="1"/>`).join("")}`],
};

/* Productos de los locales nuevos (TEEB, Molokai, Sanahoria, Granier, Pepperonis, Juice Bar, Dey Donuts) */
const paDonut = (glaze, sprinkles) => `${paSh}<circle cx="32" cy="34" r="20" fill="#e9a24a"/><path d="M32 15c10 0 18 7 18 17 0 3-2 3-3 2s-3 1-4 3-3 1-4 0-3 1-4 2-4 0-5-2-3-2-4 0-4 0-4-2-3-1-4-3c-1-5 2-19 17-19z" fill="${glaze}"/><circle cx="32" cy="32" r="6" fill="#fde0ec"/>${sprinkles ? [[22, 24, "#ffd35c", 20], [28, 19, "#4cc3ae", -30], [38, 20, "#2a78d6", 40], [44, 28, "#fff", -10], [24, 33, "#fff", 60], [40, 36, "#ffd35c", 10]].map(([x, y, c, r]) => `<rect x="${x}" y="${y}" width="4.5" height="1.8" rx=".9" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`).join("") : ""}`;
const paSlice = (top, dots) => `${paSh}<path d="M10 16l44 8-26 30z" fill="#ffd35c" stroke="#e9a24a" stroke-width="5" stroke-linejoin="round"/>${top}${dots.map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="${c}"/>`).join("")}`;
const paTall = (liq, extra = "") => `${paSh}<path d="M20 14h24l-3 40H23z" fill="#fff" opacity=".8"/><path d="M21.2 22h21.6l-2.5 31H23.7z" fill="${liq}"/>${extra}<path d="M36 4l-4 34" stroke="#1F7A55" stroke-width="2.5" stroke-linecap="round"/>`;
Object.assign(PROD_ART, {
  papas: ["comida", `${paSh}<path d="M18 54h28l-4-26H22z" fill="#e2483d"/><path d="M22 28h20l-1 5H23z" fill="#fff" opacity=".85"/><path d="M25 28l-2-16M29 28l-1-19M33 28l1-18M37 28l2-15M31 28v-13" stroke="#ffc23d" stroke-width="3.5" stroke-linecap="round"/>`],
  tostones: ["comida", `${paSh}${[[20, 40], [36, 44], [30, 30], [44, 32]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="8" fill="#f0c04a"/><ellipse cx="${x}" cy="${y}" rx="6" ry="4.5" fill="#f6d77a"/>`).join("")}<path d="M18 30l4 2M28 22l4 3M40 26l3 3M34 40l4 2" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`],
  perro: ["comida", `${paSh}<g transform="rotate(-12 32 34)"><rect x="8" y="30" width="48" height="14" rx="7" fill="#e9a24a"/><rect x="6" y="27" width="52" height="8" rx="4" fill="#b8452a"/><path d="M10 26c4-3 6 2 10-1s6 2 10-1 6 2 10-1 6 2 10-1 5 2 6 0" stroke="#7cc46a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M12 25c5 3 9-3 14 0s9-3 14 0 9-3 14 0" stroke="#ffd35c" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="8" y="22" width="48" height="10" rx="5" fill="#f2b45f"/></g>`],
  "poke-salmon": ["bowl", paBowl(`<path d="M14 30c2-7 8-9 12-6 3-5 10-6 13-1 5-3 11 0 11 7z" fill="#fff"/><rect x="18" y="22" width="10" height="7" rx="2" fill="#ff8a65"/><rect x="30" y="20" width="9" height="7" rx="2" fill="#ff8a65"/><ellipse cx="44" cy="25" rx="5" ry="3.5" fill="#7cc46a"/><circle cx="36" cy="29" r="1.6" fill="#5aa84a"/><circle cx="26" cy="30" r="1.6" fill="#5aa84a"/>`)],
  "poke-atun": ["bowl", paBowl(`<path d="M14 30c2-7 8-9 12-6 3-5 10-6 13-1 5-3 11 0 11 7z" fill="#fff"/><rect x="18" y="22" width="10" height="7" rx="2" fill="#c0392b"/><rect x="30" y="20" width="9" height="7" rx="2" fill="#c0392b"/><rect x="41" y="22" width="7" height="6" rx="1.5" fill="#ffc23d"/><path d="M24 30l3-2M34 30l3-2" stroke="#5aa84a" stroke-width="2" stroke-linecap="round"/>`)],
  "poke-tofu": ["bowl", paBowl(`<path d="M14 30c2-7 8-9 12-6 3-5 10-6 13-1 5-3 11 0 11 7z" fill="#fff"/><rect x="18" y="22" width="8" height="8" rx="1.5" fill="#f3e3b5"/><rect x="28" y="20" width="8" height="8" rx="1.5" fill="#f3e3b5"/><ellipse cx="42" cy="25" rx="5" ry="3.5" fill="#7cc46a"/><path d="M30 30h8" stroke="#ff7a45" stroke-width="2.5" stroke-linecap="round"/><circle cx="24" cy="31" r="1.6" fill="#ffd35c"/>`)],
  edamame: ["bowl", `${paSh}<path d="M10 36h44c0 10-10 18-22 18S10 46 10 36z" fill="#fff"/><path d="M10 36h44" stroke="#e8e2d6" stroke-width="2"/>${[[18, 30, -20], [28, 26, 10], [38, 29, -5], [46, 32, 25]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - 9}" y="${y - 3.5}" width="18" height="7" rx="3.5" fill="#7cc46a"/><circle cx="${x - 4}" cy="${y}" r="2" fill="#a6dc8a"/><circle cx="${x + 2}" cy="${y}" r="2" fill="#a6dc8a"/></g>`).join("")}`],
  coco: ["fria", `${paSh}<circle cx="30" cy="38" r="18" fill="#7a4a2a"/><ellipse cx="30" cy="26" rx="14" ry="5" fill="#fff"/><circle cx="24" cy="44" r="1.5" fill="#5a3420"/><circle cx="34" cy="48" r="1.5" fill="#5a3420"/><path d="M36 26l8-20" stroke="#e94f86" stroke-width="3" stroke-linecap="round"/><path d="M42 8l6 2" stroke="#4caf50" stroke-width="3" stroke-linecap="round"/>`],
  griega: ["bowl", paBowl(`<path d="M14 30c2-7 9-9 13-5 4-5 11-5 14 0 4-3 9 0 9 5z" fill="#8fd16f"/><circle cx="22" cy="27" r="3" fill="#e2483d"/><circle cx="40" cy="26" r="3" fill="#e2483d"/><rect x="29" y="23" width="6" height="6" rx="1" fill="#fff"/><circle cx="34" cy="30" r="2" fill="#3a3f44"/><circle cx="26" cy="31" r="2" fill="#3a3f44"/>`)],
  "j-zana": ["fria", paTall("#ff8a2e", `<rect x="26" y="30" width="6" height="6" rx="1.5" fill="#fff" opacity=".45"/><path d="M44 18l8 12-4 2-6-12z" fill="#f2792c"/><path d="M44 18c-2-4-1-7 2-8M44 18c1-4 4-6 7-5" stroke="#4caf50" stroke-width="2" stroke-linecap="round" fill="none"/>`)],
  croissant: ["horno", `${paSh}<path d="M8 42c4-14 16-22 24-22s20 8 24 22c-6 2-10-2-12-6-3 5-8 7-12 7s-9-2-12-7c-2 4-6 8-12 6z" fill="#f0b257"/><path d="M20 28c2 4 2 9 0 12M32 24c2 5 2 11 0 16M44 28c2 4 2 9 0 12" stroke="#d48b34" stroke-width="2" stroke-linecap="round" fill="none"/>`],
  "croissant-ch": ["horno", `${paSh}<path d="M8 42c4-14 16-22 24-22s20 8 24 22c-6 2-10-2-12-6-3 5-8 7-12 7s-9-2-12-7c-2 4-6 8-12 6z" fill="#e9a24a"/><path d="M12 32c6-2 8 4 14 2s8 4 14 2 8 2 12 0" stroke="#5a3420" stroke-width="3" fill="none" stroke-linecap="round"/>`],
  napolitana: ["horno", `${paSh}<rect x="12" y="24" width="40" height="24" rx="5" fill="#f0b257"/><rect x="12" y="24" width="40" height="8" rx="4" fill="#f6c879"/><rect x="20" y="34" width="24" height="6" rx="3" fill="#5a3420"/><path d="M16 44h32" stroke="#d48b34" stroke-width="1.6" stroke-dasharray="3 3"/>`],
  pandequeso: ["horno", `${paSh}<ellipse cx="32" cy="38" rx="20" ry="14" fill="#f2c27a"/><ellipse cx="32" cy="34" rx="16" ry="9" fill="#f6d293"/><circle cx="26" cy="32" r="2.5" fill="#fff4d8"/><circle cx="36" cy="30" r="2" fill="#fff4d8"/><circle cx="38" cy="38" r="2.5" fill="#fff4d8"/>`],
  "pz-pepperoni": ["comida", paSlice("", [[24, 24, "#c0392b"], [36, 28, "#c0392b"], [30, 36, "#c0392b"]])],
  "pz-margarita": ["comida", paSlice(`<circle cx="26" cy="25" r="3.5" fill="#fff"/><circle cx="36" cy="30" r="3.5" fill="#fff"/>`, [[30, 36, "#5cb85c"], [22, 22, "#e2483d"]])],
  "pz-hawaiana": ["comida", paSlice(`<rect x="22" y="22" width="6" height="6" rx="1" fill="#ffc23d" stroke="#e9a24a"/><rect x="33" y="30" width="6" height="6" rx="1" fill="#ffc23d" stroke="#e9a24a"/>`, [[34, 24, "#f19aa8"], [27, 34, "#f19aa8"]])],
  calzone: ["comida", `${paSh}<path d="M8 44c0-16 11-28 24-28s24 12 24 28z" fill="#e9a24a"/><path d="M8 44h48" stroke="#c97c2a" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="32" r="1.6" fill="#c97c2a"/><circle cx="34" cy="26" r="1.6" fill="#c97c2a"/><circle cx="42" cy="34" r="1.6" fill="#c97c2a"/><path d="M16 36c4-8 10-12 18-12" stroke="#ffd58f" stroke-width="2.5" stroke-linecap="round" fill="none"/>`],
  "j-naranja": ["fria", paTall("#ffa63d", `<circle cx="46" cy="20" r="7" fill="#ffb02e"/><circle cx="46" cy="20" r="5" fill="#ffd27a"/>`)],
  "j-fresa": ["fria", paTall("#e2486b", `<path d="M44 14c0-4 3-6 6-6s6 2 6 6c0 5-5 9-6 10-1-1-6-5-6-10z" fill="#e2483d"/><path d="M50 8c0-2 1-3 3-3" stroke="#4caf50" stroke-width="2" stroke-linecap="round"/>`)],
  "j-mango": ["fria", paTall("#ffc23d", `<ellipse cx="47" cy="18" rx="7" ry="9" fill="#ffb02e" transform="rotate(30 47 18)"/><path d="M50 10l3-3" stroke="#4caf50" stroke-width="2" stroke-linecap="round"/>`)],
  merengada: ["fria", paTall("#f7a6c1", `<path d="M20 18c2-6 8-8 12-6 4-4 10-2 12 4z" fill="#fff"/><circle cx="32" cy="10" r="3" fill="#e2483d"/>`)],
  limococo: ["fria", paTall("#f3f7e8", `<circle cx="46" cy="20" r="7" fill="#7cc46a"/><circle cx="46" cy="20" r="5" fill="#c9eea6"/><rect x="26" y="30" width="6" height="6" rx="1.5" fill="#d6ecfb" opacity=".8"/>`)],
  "dn-glaseada": ["snack", paDonut("#f6e7c8")],
  "dn-chocolate": ["snack", paDonut("#5a3420")],
  "dn-fresa": ["snack", paDonut("#f48fb1", true)],
  "dn-rellena": ["snack", `${paSh}<circle cx="32" cy="36" r="19" fill="#e9a24a"/><path d="M14 36a18 18 0 0 1 36 0" fill="#f2b45f"/><ellipse cx="32" cy="36" rx="9" ry="5" fill="#fff4d0"/>${[[20, 26], [28, 22], [38, 24], [44, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#fff"/>`).join("")}`],
  "dn-caja": ["snack", `${paSh}<rect x="8" y="26" width="48" height="26" rx="3" fill="#fff"/><path d="M8 26l6-10h36l6 10z" fill="#f48fb1"/>${[[18, 38, "#f48fb1"], [32, 38, "#5a3420"], [46, 38, "#f6e7c8"]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="6" fill="#e9a24a"/><path d="M${x - 6} ${y - 1}a6 6 0 0 1 12 0" fill="${c}"/><circle cx="${x}" cy="${y}" r="2" fill="#fff"/>`).join("")}`],
});
const PROD_ALIAS = { "emp-carne": "empanada", "emp-pollo": "empanada", "emp-queso": "empanada", "emp-domino": "empanada", tequenos6: "tequenos", hsencilla: "clasica", "wrap-int": "wrap", "wrap-veg": "wrap" };
const PROD_BY_NAME = {};
function prodArt(id, fallbackIcon, cls = "", name = "") {
  const res = x => x && (PROD_ART[x] ? x : PROD_ALIAS[x]);
  const k = res(id) || res(PROD_BY_NAME[name]);
  const a = k && PROD_ART[k];
  if (!a) return `<span class="ico ${cls === "lg" ? "lg" : ""}"><i data-lucide="${fallbackIcon || "utensils"}"></i></span>`;
  return `<span class="food-art p-art ${cls}" style="--fa:${PA_BG[a[0]]}" aria-hidden="true"><svg viewBox="0 0 64 64">${a[1]}</svg></span>`;
}

/* "Pincho Pan abre mañana a las 11:30" / "Pincho Pan está cerrado por hoy" (antes salía "está abre…") */
const closedTxt = st => /^abre/i.test(st.label) ? st.label.charAt(0).toLowerCase() + st.label.slice(1) : "está " + st.label.toLowerCase();
const LOCALES = [
  { id: "pinchopan", kind: "local", name: "Pincho Pan", icon: "sandwich", place: "Feria Central", eta: "10–15 min", hours: "11:30–15:00",
    tagline: "Pinchos, sándwiches y almuerzos caseros.", pref: "PP", cats: [
    { name: "Almuerzos", items: [
      { id: "almuerzo", name: "Almuerzo del día", desc: "Pollo a la plancha, arroz y ensalada. Incluye bebida natural.", price: 8.5, icon: "utensils", tag: "Más pedido", opts: [
        foodOpt("Guarnición", "Elige una · Obligatorio", ["Arroz y ensalada", "Solo ensalada"]),
        foodOpt("Bebida natural", "Elige una · Incluida en tu almuerzo", ["Limonada", "Jugo de papelón"])] },
      { id: "pincho", name: "Pincho mixto con papas", desc: "Pollo y res a la parrilla con papas fritas.", price: 7, icon: "beef", opts: [
        foodOpt("Salsa", "Elige una", ["Ajo", "Tártara", "Sin salsa"])] }] },
    { name: "Meriendas", items: [
      { id: "wrap", name: "Wrap de pollo", desc: "Pollo a la plancha, lechuga y tomate.", price: 5, icon: "sandwich" },
      { id: "sandjq", name: "Sándwich de jamón y queso", desc: "Tostado al momento.", price: 4, icon: "sandwich", opts: [
        foodOpt("Pan", "Elige uno", ["Blanco", "Integral"])] }] },
    { name: "Bebidas", items: [
      { id: "limonada", name: "Limonada natural", desc: "Preparada al momento · 350 ml.", price: 2, icon: "cup-soda" },
      { id: "papelon", name: "Papelón con limón", desc: "Bien frío · 350 ml.", price: 2, icon: "cup-soda" }] }] },
  { id: "lapausa", kind: "local", name: "La Pausa", icon: "coffee", place: "Feria Central", eta: "5–10 min", hours: "7:00–16:00",
    tagline: "Café, desayunos y dulces.", pref: "LP", cats: [
    { name: "Café", items: [
      { id: "guayoyo", name: "Café guayoyo", desc: "Café colado, suave.", price: 1.5, icon: "coffee", tag: "Más pedido", opts: [TAMANO] },
      { id: "marron", name: "Marrón", desc: "Café con leche al estilo venezolano.", price: 2, icon: "coffee", opts: [TAMANO,
        foodOpt("Leche", "Elige una", ["Completa", "Descremada", ["Almendras", 0.5]])] },
      { id: "capuchino", name: "Capuchino", desc: "Espresso, leche y espuma.", price: 2.8, icon: "coffee", opts: [TAMANO] }] },
    { name: "Desayunos", items: [
      { id: "reina", name: "Arepa reina pepiada", desc: "Pollo, aguacate y mayonesa.", price: 3.5, icon: "sandwich" },
      { id: "empanada", name: "Empanada de queso", desc: "Recién frita.", price: 2, icon: "croissant" },
      { id: "cachito", name: "Cachito de jamón", desc: "Horneado en la mañana.", price: 2.2, icon: "croissant" }] },
    { name: "Dulces", items: [
      { id: "golfeado", name: "Golfeado", desc: "Con queso de mano.", price: 2.5, icon: "cookie" },
      { id: "torta", name: "Torta de chocolate", desc: "Porción individual.", price: 3, icon: "cake-slice" }] }] },
  { id: "migrill", kind: "local", name: "Mi Punto Grill", icon: "beef", place: "Feria Central", eta: "15–20 min", hours: "11:00–16:00",
    tagline: "Parrilla, hamburguesas y pollo a la brasa.", pref: "MG", cats: [
    { name: "Platos", items: [
      { id: "parrilla", name: "Parrilla de res", desc: "Carne de res a la parrilla con un contorno.", price: 11, icon: "beef", tag: "Más pedido", opts: [
        foodOpt("Término", "Elige uno · Obligatorio", ["Tres cuartos", "Bien cocida"]),
        foodOpt("Contorno", "Elige uno", ["Yuca frita", "Papas fritas", "Ensalada"])] },
      { id: "brasa", name: "Pollo a la brasa (1/4)", desc: "Con un contorno a elección.", price: 7.5, icon: "drumstick", opts: [
        foodOpt("Contorno", "Elige uno", ["Yuca frita", "Papas fritas", "Ensalada"])] }] },
    { name: "Hamburguesas", items: [
      { id: "clasica", name: "Hamburguesa clásica", desc: "Carne de res, queso, lechuga y tomate.", price: 6.5, icon: "beef", opts: [
        foodOpt("Extra", "Opcional", ["Sin extra", ["Tocineta", 1], ["Queso extra", 0.75]])] },
      { id: "hpollo", name: "Hamburguesa de pollo", desc: "Pechuga empanizada y salsa de la casa.", price: 6, icon: "drumstick" }] },
    { name: "Bebidas", items: [
      { id: "refresco", name: "Refresco 355 ml", desc: "Lata, varios sabores.", price: 1.5, icon: "cup-soda" },
      { id: "agua", name: "Agua mineral 600 ml", desc: "Sin gas.", price: 1, icon: "glass-water" }] }] },
  { id: "teeb", kind: "local", name: "TEEB", icon: "croissant", place: "Feria Central", eta: "5–10 min", hours: "8:00–16:00",
    tagline: "Empanadas, frituras y comida rápida.", pref: "TB", cats: [
    { name: "Empanadas", items: [
      { id: "emp-carne", name: "Empanada de carne mechada", desc: "Masa de maíz, recién frita.", price: 1.8, icon: "croissant", tag: "Más pedido", opts: [foodOpt("Salsa", "Elige una", ["Guasacaca", "Ajo", "Rosada", "Sin salsa"])] },
      { id: "emp-pollo", name: "Empanada de pollo", desc: "Masa de maíz, recién frita.", price: 1.8, icon: "croissant", opts: [foodOpt("Salsa", "Elige una", ["Guasacaca", "Ajo", "Rosada", "Sin salsa"])] },
      { id: "emp-queso", name: "Empanada de queso", desc: "Queso blanco rallado.", price: 1.6, icon: "croissant", opts: [foodOpt("Salsa", "Elige una", ["Guasacaca", "Ajo", "Rosada", "Sin salsa"])] },
      { id: "emp-domino", name: "Empanada dominó", desc: "Caraotas negras y queso.", price: 1.8, icon: "croissant", opts: [foodOpt("Salsa", "Elige una", ["Guasacaca", "Ajo", "Rosada", "Sin salsa"])] }] },
    { name: "Frituras", items: [
      { id: "tequenos6", name: "Tequeños (6)", desc: "Con salsa de la casa.", price: 4.5, icon: "cookie" },
      { id: "papas", name: "Papas fritas", desc: "Porción mediana.", price: 2.5, icon: "cookie", opts: [
        foodOpt("Tamaño", "Elige uno", ["Mediana", ["Grande", 1]])] },
      { id: "tostones", name: "Tostones con queso", desc: "Plátano verde frito con queso rallado.", price: 3, icon: "cookie" }] },
    { name: "Comida rápida", items: [
      { id: "perro", name: "Perro caliente", desc: "Repollo, papitas, queso y salsas.", price: 3, icon: "sandwich", opts: [
        foodOpt("Extra", "Opcional", ["Sin extra", ["Tocineta", 1], ["Queso extra", 0.5]])] },
      { id: "hsencilla", name: "Hamburguesa sencilla", desc: "Carne, queso, lechuga y tomate.", price: 4.5, icon: "beef" }] },
    { name: "Bebidas", items: [
      { id: "refresco", name: "Refresco 355 ml", desc: "Lata, varios sabores.", price: 1.5, icon: "cup-soda" },
      { id: "papelon", name: "Papelón con limón", desc: "Bien frío · 350 ml.", price: 2, icon: "cup-soda" }] }] },
  { id: "molokai", kind: "local", name: "Molokai", icon: "fish", place: "Feria Central", eta: "10–15 min", hours: "11:00–16:00",
    tagline: "Poke y bowls hawaianos.", pref: "ML", cats: [
    { name: "Pokes", items: [
      { id: "poke-salmon", name: "Poke de salmón", desc: "Salmón, aguacate, pepino, edamame y ajonjolí.", price: 10, icon: "fish", tag: "Más pedido", opts: [
        foodOpt("Base", "Elige una · Obligatorio", ["Arroz de sushi", "Arroz integral", ["Quinoa", 1]]),
        foodOpt("Salsa", "Elige una", ["Ponzu", "Spicy mayo", "Teriyaki"])] },
      { id: "poke-atun", name: "Poke de atún", desc: "Atún, mango, cebollín y ajonjolí.", price: 9.5, icon: "fish", opts: [
        foodOpt("Base", "Elige una · Obligatorio", ["Arroz de sushi", "Arroz integral", ["Quinoa", 1]]),
        foodOpt("Salsa", "Elige una", ["Ponzu", "Spicy mayo", "Teriyaki"])] },
      { id: "teriyaki", name: "Poke de pollo teriyaki", desc: "Pollo, vegetales salteados y ajonjolí.", price: 8, icon: "salad", opts: [
        foodOpt("Base", "Elige una · Obligatorio", ["Arroz de sushi", "Arroz integral", ["Quinoa", 1]])] },
      { id: "poke-tofu", name: "Poke de tofu", desc: "Tofu marinado, aguacate, zanahoria y maíz.", price: 7.5, icon: "salad", opts: [
        foodOpt("Base", "Elige una · Obligatorio", ["Arroz de sushi", "Arroz integral", ["Quinoa", 1]])] }] },
    { name: "Para acompañar", items: [
      { id: "edamame", name: "Edamame", desc: "Con sal marina.", price: 3, icon: "salad" }] },
    { name: "Bebidas", items: [
      { id: "tefrio", name: "Té frío de durazno", desc: "Hecho en casa · 400 ml.", price: 2, icon: "cup-soda" },
      { id: "coco", name: "Agua de coco", desc: "Natural · 350 ml.", price: 2.5, icon: "cup-soda" }] }] },
  { id: "sanahoria", kind: "local", name: "Sanahoria", icon: "carrot", place: "Feria Central", eta: "10–15 min", hours: "8:00–16:00",
    tagline: "Comida saludable: ensaladas, wraps y bowls.", pref: "SH", cats: [
    { name: "Ensaladas", items: [
      { id: "cesar", name: "César con pollo", desc: "Lechuga romana, parmesano y crutones.", price: 6.5, icon: "salad", tag: "Más pedido" },
      { id: "atun", name: "Ensalada de atún", desc: "Atún, huevo, papa y vegetales.", price: 6.5, icon: "salad" },
      { id: "griega", name: "Ensalada griega", desc: "Tomate, pepino, aceitunas y queso feta.", price: 6, icon: "salad" }] },
    { name: "Wraps", items: [
      { id: "wrap-int", name: "Wrap integral de pollo", desc: "Pollo, espinaca, tomate y yogur.", price: 5.5, icon: "sandwich" },
      { id: "wrap-veg", name: "Wrap vegetariano", desc: "Hummus, vegetales asados y lechuga.", price: 5, icon: "sandwich" }] },
    { name: "Bowls", items: [
      { id: "veggie", name: "Bowl vegetariano", desc: "Garbanzos, aguacate, tomate y maíz.", price: 7, icon: "salad", opts: [
        foodOpt("Base", "Elige una · Obligatorio", ["Arroz", ["Quinoa", 1]])] }] },
    { name: "Bebidas", items: [
      { id: "batido", name: "Batido verde", desc: "Piña, espinaca y jengibre.", price: 3, icon: "cup-soda" },
      { id: "j-zana", name: "Jugo de zanahoria y naranja", desc: "Natural · 350 ml.", price: 2.5, icon: "cup-soda" }] }] },
  { id: "granier", kind: "local", name: "Granier", icon: "croissant", place: "Feria Central", eta: "5 min", hours: "7:00–17:00",
    tagline: "Panadería: panes, hojaldres y café.", pref: "GR", cats: [
    { name: "Hojaldres", items: [
      { id: "croissant", name: "Croissant", desc: "De mantequilla, horneado del día.", price: 1.8, icon: "croissant", tag: "Más pedido" },
      { id: "croissant-ch", name: "Croissant de chocolate", desc: "Relleno de chocolate.", price: 2.3, icon: "croissant" },
      { id: "napolitana", name: "Napolitana de chocolate", desc: "Hojaldre con chocolate.", price: 2.2, icon: "croissant" }] },
    { name: "Salados", items: [
      { id: "cachito", name: "Cachito de jamón", desc: "Horneado en la mañana.", price: 2.2, icon: "croissant" },
      { id: "pandequeso", name: "Pan de queso", desc: "Tibio y esponjoso.", price: 1.5, icon: "croissant" }] },
    { name: "Café", items: [
      { id: "conleche", name: "Café con leche", desc: "Recién hecho.", price: 1.8, icon: "coffee", opts: [TAMANO] },
      { id: "capuchino", name: "Capuchino", desc: "Espresso, leche y espuma.", price: 2.8, icon: "coffee", opts: [TAMANO] }] }] },
  { id: "pepperonis", kind: "local", name: "Pepperonis", icon: "pizza", place: "Feria Central", eta: "15–20 min", hours: "11:00–18:00",
    tagline: "Pizzas por porción y enteras.", pref: "PZ", cats: [
    { name: "Pizzas", items: [
      { id: "pz-pepperoni", name: "Pizza de pepperoni", desc: "Salsa de tomate, mozzarella y pepperoni.", price: 3, icon: "pizza", tag: "Más pedido", opts: [
        foodOpt("Tamaño", "Elige uno · Obligatorio", ["Porción", ["Personal", 4], ["Familiar", 11]])] },
      { id: "pz-margarita", name: "Pizza margarita", desc: "Tomate, mozzarella y albahaca.", price: 2.5, icon: "pizza", opts: [
        foodOpt("Tamaño", "Elige uno · Obligatorio", ["Porción", ["Personal", 3.5], ["Familiar", 9.5]])] },
      { id: "pz-hawaiana", name: "Pizza hawaiana", desc: "Jamón y piña.", price: 3, icon: "pizza", opts: [
        foodOpt("Tamaño", "Elige uno · Obligatorio", ["Porción", ["Personal", 4], ["Familiar", 11]])] }] },
    { name: "Otros", items: [
      { id: "calzone", name: "Calzone de jamón y queso", desc: "Horneado al momento.", price: 5, icon: "pizza" }] },
    { name: "Bebidas", items: [
      { id: "refresco", name: "Refresco 355 ml", desc: "Lata, varios sabores.", price: 1.5, icon: "cup-soda" }] }] },
  { id: "juicebar", kind: "local", name: "Juice Bar", icon: "citrus", place: "Feria Central", eta: "5–10 min", hours: "7:30–16:30",
    tagline: "Jugos naturales, batidos y merengadas.", pref: "JB", cats: [
    { name: "Jugos", items: [
      { id: "j-naranja", name: "Jugo de naranja", desc: "Recién exprimido.", price: 2.5, icon: "citrus", tag: "Más pedido", opts: [
        foodOpt("Tamaño", "Elige uno", ["Mediano · 350 ml", ["Grande · 500 ml", 1]])] },
      { id: "j-fresa", name: "Jugo de fresa", desc: "Con agua o con leche.", price: 2.5, icon: "cup-soda", opts: [
        foodOpt("Preparado", "Elige uno", ["Con agua", ["Con leche", 0.5]])] },
      { id: "j-mango", name: "Jugo de mango", desc: "Mango de temporada.", price: 2.5, icon: "cup-soda" }] },
    { name: "Batidos y merengadas", items: [
      { id: "batido", name: "Batido verde", desc: "Piña, espinaca y jengibre.", price: 3, icon: "cup-soda" },
      { id: "merengada", name: "Merengada de fresa", desc: "Fresa, leche y helado.", price: 3.5, icon: "cup-soda" },
      { id: "limococo", name: "Limonada de coco", desc: "Cremosa y bien fría.", price: 3, icon: "cup-soda" }] }] },
  { id: "deydonuts", kind: "local", name: "Dey Donuts", icon: "donut", place: "Feria Central", eta: "5 min", hours: "7:00–15:00",
    tagline: "Donuts recién hechas y café.", pref: "DD", cats: [
    { name: "Donuts", items: [
      { id: "dn-glaseada", name: "Donut glaseada", desc: "La clásica.", price: 1.5, icon: "donut", tag: "Más pedido" },
      { id: "dn-chocolate", name: "Donut de chocolate", desc: "Cubierta de chocolate.", price: 1.8, icon: "donut" },
      { id: "dn-fresa", name: "Donut de fresa con chispas", desc: "Glaseado rosado y chispas de colores.", price: 1.8, icon: "donut" },
      { id: "dn-rellena", name: "Donut rellena de crema", desc: "Crema pastelera y azúcar.", price: 2.2, icon: "donut" },
      { id: "dn-caja", name: "Caja de 6 donuts", desc: "Surtidas.", price: 9, icon: "donut" }] },
    { name: "Café", items: [
      { id: "negro", name: "Café negro", desc: "Recién colado.", price: 1.2, icon: "coffee" },
      { id: "conleche", name: "Café con leche", desc: "Recién hecho.", price: 1.8, icon: "coffee", opts: [TAMANO] }] }] },
  { id: "tienditaa1", kind: "kiosco", name: "La Tiendita Unimetana A1", icon: "store", place: "Campus Central", eta: "5 min", hours: "7:00–17:00",
    tagline: "Café, bebidas y meriendas para llevar.", pref: "A1", cats: [
    { name: "Café", items: [
      { id: "negro", name: "Café negro", desc: "Recién colado.", price: 1.5, icon: "coffee", opts: [TAMANO] },
      { id: "conleche", name: "Café con leche", desc: "Leche completa.", price: 1.8, icon: "coffee", opts: [TAMANO] }] },
    { name: "Meriendas", items: [
      { id: "tequenos", name: "Tequeños (3)", desc: "Con salsa de ajo.", price: 2.5, icon: "cookie" },
      { id: "galletas", name: "Galletas", desc: "Paquete individual.", price: 1.2, icon: "cookie" }] },
    { name: "Bebidas", items: [
      { id: "agua", name: "Agua 600 ml", desc: "Sin gas.", price: 1, icon: "glass-water" },
      { id: "refresco", name: "Refresco 355 ml", desc: "Lata, varios sabores.", price: 1.5, icon: "cup-soda" }] }] },
  { id: "tienditaa2", kind: "kiosco", name: "La Tiendita Unimetana A2", icon: "store", place: "Campus Central", eta: "5 min", hours: "7:00–17:00",
    tagline: "Café, bebidas y meriendas.", pref: "A2", cats: [
    { name: "Café", items: [
      { id: "negro", name: "Café negro", desc: "Recién colado.", price: 1.5, icon: "coffee", opts: [TAMANO] },
      { id: "marron", name: "Marrón", desc: "Café con leche al estilo venezolano.", price: 2, icon: "coffee", opts: [TAMANO] }] },
    { name: "Meriendas", items: [
      { id: "cachito", name: "Cachito de jamón", desc: "Horneado en la mañana.", price: 2.2, icon: "croissant" },
      { id: "pastelito", name: "Pastelito de queso", desc: "Hojaldre con queso blanco.", price: 1.8, icon: "croissant" }] },
    { name: "Bebidas", items: [
      { id: "jugo", name: "Jugo pasteurizado", desc: "Durazno o naranja · 250 ml.", price: 1.5, icon: "cup-soda" },
      { id: "agua", name: "Agua 600 ml", desc: "Sin gas.", price: 1, icon: "glass-water" }] }] },
  { id: "believe", kind: "kiosco", name: "Kiosco Believe", icon: "cup-soda", place: "Campus Central", eta: "5 min", hours: "7:30–16:30",
    tagline: "Bebidas y snacks.", pref: "KB", cats: [
    { name: "Bebidas", items: [
      { id: "refresco", name: "Refresco 355 ml", desc: "Lata, varios sabores.", price: 1.5, icon: "cup-soda" },
      { id: "tefrio", name: "Té frío", desc: "Limón o durazno · 500 ml.", price: 1.8, icon: "cup-soda" },
      { id: "energizante", name: "Bebida energizante", desc: "Lata de 250 ml.", price: 3, icon: "zap" },
      { id: "agua", name: "Agua 600 ml", desc: "Sin gas.", price: 1, icon: "glass-water" }] },
    { name: "Snacks", items: [
      { id: "papitas", name: "Papitas", desc: "Bolsa individual.", price: 1.5, icon: "cookie" },
      { id: "chocolate", name: "Chocolate", desc: "Barra de 40 g.", price: 1.8, icon: "candy" },
      { id: "mani", name: "Maní salado", desc: "Bolsa de 50 g.", price: 1.2, icon: "cookie" }] }] }
];
LOCALES.forEach(l => l.cats.forEach(c => c.items.forEach(it => { PROD_BY_NAME[it.name] = it.id; })));
const localById = id => LOCALES.find(l => l.id === id);
/* Estado que maneja cada comercio: pedidos en pausa y productos agotados (global: lo ven todas las cuentas) */
let localState = {};
const loadLocalState = () => { try { localState = JSON.parse(localStorage.getItem("nexo-localstate") || "{}") || {}; } catch (err) { localState = {}; } };
loadLocalState();
const saveLocalState = () => { try { localStorage.setItem("nexo-localstate", JSON.stringify(localState)); } catch (err) {} };
const lstate = id => localState[id] || (localState[id] = { paused: false, soldout: [] });
const isPaused = id => !!(localState[id] && localState[id].paused);
const isSoldOut = (lid, iid) => !!(localState[lid] && localState[lid].soldout.includes(iid));
const itemsOf = l => l.cats.flatMap(c => c.items);
const itemById = (l, id) => itemsOf(l).find(i => i.id === id);
const normTxt = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function setFrame(secId, title, crumb) {
  const sec = document.getElementById(secId);
  const t = sec.querySelector(".mbar .title");
  if (t) t.lastChild.textContent = title;
  const c = sec.querySelector(".deskbar .crumbs span");
  if (c) c.innerHTML = (sec.dataset.staff ? "" : "Mi campus&nbsp;&nbsp;/&nbsp;&nbsp;") + crumb.map(esc).join("&nbsp;&nbsp;/&nbsp;&nbsp;");
}
const icons = () => { try { lucide.createIcons(); } catch (err) {} };

// Estado: local abierto, producto abierto, carrito y pedidos (por cuenta)
let curLocal = "pinchopan", curItem = null, curCat = "Todos", curOrder = null, editLine = null;
try { const s = JSON.parse(sessionStorage.getItem("nexo-food") || "null"); if (s) { if (localById(s.l)) curLocal = s.l; curItem = s.i || null; editLine = s.e ?? null; } } catch (err) {}
const saveFoodNav = () => { try { sessionStorage.setItem("nexo-food", JSON.stringify({ l: curLocal, i: curItem, e: editLine })); } catch (err) {} };
const CART0 = isDemo ? { local: "pinchopan", lines: [{ item: "almuerzo", sel: [0, 0], qty: 1, note: "" }] } : { local: null, lines: [] };
let cart = null, orders = [];
try { cart = JSON.parse(localStorage.getItem(K("nexo-cart")) || "null"); orders = JSON.parse(localStorage.getItem(K("nexo-orders")) || "[]") || []; } catch (err) {}
if (!cart || !Array.isArray(cart.lines)) cart = JSON.parse(JSON.stringify(CART0));
const saveCart = () => { try { localStorage.setItem(K("nexo-cart"), JSON.stringify(cart)); } catch (err) {} };
const saveOrders = () => { try { localStorage.setItem(K("nexo-orders"), JSON.stringify(orders)); } catch (err) {} try { sbSyncOrders(); } catch (err) {} };

// Precio y descripción de una línea del carrito
function lineInfo(l, line) {
  const it = itemById(l, line.item);
  if (!it) return null;
  const chosen = (it.opts || []).map((g, gi) => g.choices[line.sel[gi] || 0] || g.choices[0]);
  const unit = it.price + chosen.reduce((a, c) => a + c.p, 0);
  return { it, unit, total: unit * line.qty, opts: (it.opts || []).map((g, gi) => `${g.name}: ${chosen[gi].l}`) };
}
const cartLocal = () => cart.local && localById(cart.local);
const cartCount = () => cart.lines.reduce((a, x) => a + x.qty, 0);
const cartTotal = () => { const l = cartLocal(); return l ? cart.lines.reduce((a, x) => a + ((lineInfo(l, x) || { total: 0 }).total), 0) : 0; };
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

/* Lista de locales y kioscos */
/* Filtros de Comida: abiertos ahora, precio máximo, tiempo de retiro, tipo de comida y orden (sessionStorage "nexo-ff") */
const FF0 = { open: false, price: 0, eta: 0, type: "", sort: "rec" };
let ff = { ...FF0 };
try { ff = { ...FF0, ...(JSON.parse(sessionStorage.getItem("nexo-ff") || "null") || {}) }; } catch (err) {}
const saveFF = () => { try { sessionStorage.setItem("nexo-ff", JSON.stringify(ff)); } catch (err) {} };
const FF_PRICES = [[0, "Cualquiera"], [2, "Hasta $2"], [5, "Hasta $5"], [8, "Hasta $8"]];
const FF_ETAS = [[0, "Cualquiera"], [5, "5 min o menos"], [10, "10 min o menos"], [15, "15 min o menos"]];
const FF_TYPES = [["", "Todo"], ["cafe", "Café"], ["almuerzo", "Almuerzos"], ["bebida", "Bebidas"], ["merienda", "Meriendas y snacks"], ["saludable", "Saludable"]];
const FF_SORTS = [["rec", "Recomendados"], ["price", "Menor precio"], ["eta", "Retiro más rápido"]];
const ffActiveCount = () => (ff.open ? 1 : 0) + (ff.price ? 1 : 0) + (ff.eta ? 1 : 0) + (ff.type ? 1 : 0) + (ff.sort !== "rec" ? 1 : 0);
// Tipo de comida de un producto, según su categoría, nombre e ícono
function itemTypes(l, cat, it) {
  const c = normTxt(cat.name), t = normTxt(it.name + " " + it.desc), out = new Set();
  if (/cafe/.test(c) || it.icon === "coffee") out.add("cafe");
  if (/almuerzo|plato|bowl|hamburguesa|poke|pizza|ensalada|wrap|comida rapida/.test(c)) out.add("almuerzo");
  if (/bebida|jugo|batido|merengada/.test(c) || ["cup-soda", "glass-water", "zap", "citrus"].includes(it.icon)) out.add("bebida");
  if (/merienda|snack|dulce|desayuno/.test(c)) out.add("merienda");
  if (["sanahoria", "molokai"].includes(l.id) || /ensalada|bowl|poke/.test(c) || /^(ensalada|bowl|batido|poke|jugo)/.test(normTxt(it.name))) out.add("saludable");
  if (/empanada|fritura|comida rapida|pizza|donut|hojaldre|salado|otros/.test(c)) out.add("merienda");
  return out;
}
const etaMax = l => Math.max(...(l.eta.match(/\d+/g) || ["0"]).map(Number));
const toMin = hm => { const [h, m] = hm.split(":").map(Number); return h * 60 + (m || 0); };
/* Horario semanal de cada local (índice = getDay(): 0 domingo … 6 sábado). Por defecto: lunes a viernes el horario
   de LOCALES, sábado en la mañana solo La Pausa y los kioscos, domingo cerrado. El comercio lo cambia en Menú y horario
   (localState[id].week, global). */
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const SAT_HOURS = { lapausa: ["08:00", "12:00"], granier: ["08:00", "13:00"], deydonuts: ["08:00", "12:00"], juicebar: ["08:00", "12:00"], tienditaa1: ["08:00", "12:00"], tienditaa2: ["08:00", "12:00"], believe: ["09:00", "13:00"] };
const pad5 = hm => hm.length === 4 ? "0" + hm : hm;
function defaultWeek(l) {
  const [a, b] = l.hours.split("–").map(pad5);
  return DIAS.map((_, d) => d === 0 ? { open: false, from: a, to: b } : d === 6 ? (SAT_HOURS[l.id] ? { open: true, from: SAT_HOURS[l.id][0], to: SAT_HOURS[l.id][1] } : { open: false, from: a, to: b }) : { open: true, from: a, to: b });
}
function weekOf(l) { const w = localState[l.id] && localState[l.id].week; return Array.isArray(w) && w.length === 7 ? w : defaultWeek(l); }
const hoursOn = (l, date) => { const w = weekOf(l)[date.getDay()]; return w && w.open ? w : null; };
const shortHM = hm => hm.replace(/^0(\d)/, "$1");
const hoursTxt = h => h ? `${shortHM(h.from)}–${shortHM(h.to)}` : "Cerrado";
const todayHours = l => hoursTxt(hoursOn(l, new Date()));
function nextOpen(l, from) {
  for (let k = 0; k < 8; k++) {
    const d = new Date(from); d.setDate(d.getDate() + k); const h = hoursOn(l, d); if (!h) continue;
    const [hh, mm] = h.from.split(":").map(Number); d.setHours(hh, mm, 0, 0); if (d > from) return d;
  }
  return null;
}
function dayWord(d) { const t = day0(new Date()).getTime(), x = day0(d).getTime(); return x === t ? "hoy" : x - t === 864e5 ? "mañana" : `el ${DIAS[d.getDay()].toLowerCase()}`; }
function openState(l) {
  if (isPaused(l.id)) return { open: false, label: "Pausado", cls: "warn" };
  const now = new Date(), m = now.getHours() * 60 + now.getMinutes(), h = hoursOn(l, now);
  if (h && m >= toMin(h.from) && m < toMin(h.to)) return { open: true, label: "Abierto", cls: "ok" };
  const nx = nextOpen(l, now);
  const hm = nx ? `${nx.getHours()}:${String(nx.getMinutes()).padStart(2, "0")}` : ""; // no usar hhmm(): se define más abajo y esto corre al arrancar
  return { open: false, label: !nx ? "Cerrado" : dayWord(nx) === "hoy" ? `Abre a las ${hm}` : `Abre ${dayWord(nx)} a las ${hm}`, cls: "neutral" };
}
function weekTable(l) {
  const today = new Date().getDay(), order = [1, 2, 3, 4, 5, 6, 0];
  return `<div class="weektable">${order.map(d => `<div class="row${d === today ? " today" : ""}"><span>${DIAS[d]}${d === today ? " · hoy" : ""}</span><b>${hoursTxt(weekOf(l)[d].open ? weekOf(l)[d] : null)}</b></div>`).join("")}</div>`;
}
/* Retiro programado: franjas de 15 min dentro del horario del local, en los próximos días en que abre */
const dayLabel = day => { if (day === 0) return "Hoy"; if (day === 1) return "Mañana"; const d = new Date(); d.setDate(d.getDate() + day); return `${DIAS[d.getDay()]} ${d.getDate()}`; };
function pickupSlots(l, day) {
  const date = new Date(); date.setDate(date.getDate() + day); const h = hoursOn(l, date); if (!h) return [];
  const a = h.from, b = h.to, prep = etaMax(l), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
  let start = toMin(a) + prep; if (day === 0) start = Math.max(start, nowM + prep);
  start = Math.ceil(start / 15) * 15;
  const out = []; for (let m = start; m <= toMin(b); m += 15) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return out;
}
function slotTime(day, hm) { const d = new Date(); d.setDate(d.getDate() + day); const [h, m] = hm.split(":").map(Number); d.setHours(h, m, 0, 0); return d.getTime(); }
const whenTxt = t => { const d = new Date(t); return `${dayWord(d)}${dayWord(d).startsWith("el ") ? " " + d.getDate() : ""} a las ${hhmm(t)}`; };
function cartPickup(l) {
  // devuelve el retiro elegido y corrige lo que ya no sea válido (local cerrado, franja pasada)
  const open = openState(l).open, p = cart.pickup || { mode: open ? "asap" : "sched" };
  if (!open) p.mode = "sched";
  if (p.mode === "sched") {
    let day = p.day ?? 0; if (!pickupSlots(l, day).length) day = [0, 1, 2, 3, 4, 5, 6].find(d => pickupSlots(l, d).length) ?? 0;
    const slots = pickupSlots(l, day); if (!slots.includes(p.time)) p.time = slots[0];
    p.day = day;
  }
  cart.pickup = p; return p;
}
function foodMatches(l, q) {
  // productos que cumplen la búsqueda, el precio y el tipo
  const items = l.cats.flatMap(c => c.items.filter(it => !isSoldOut(l.id, it.id)
    && (!ff.price || it.price <= ff.price) && (!ff.type || itemTypes(l, c, it).has(ff.type))
    && (!q || normTxt(it.name + " " + it.desc).includes(q) || normTxt(l.name + " " + l.tagline).includes(q))));
  if (!items.length) return null;
  if (ff.open && !openState(l).open) return null;
  if (ff.eta && etaMax(l) > ff.eta) return null;
  return items;
}
function renderFoodFilters() {
  const n = ffActiveCount(), badge = document.getElementById("ffCount");
  badge.hidden = !n; badge.textContent = n;
  const panel = document.getElementById("foodFilters");
  const grp = (key, opts, label) => `<div class="ffgroup"><span class="small" style="font-weight:600">${label}</span><div class="chips" role="radiogroup" aria-label="${label}">${opts.map(([v, t]) => `<button class="pill ${ff[key] === v ? "ok" : "neutral"}" type="button" role="radio" aria-checked="${ff[key] === v}" data-ff="${key}" data-ffv="${v}">${t}</button>`).join("")}</div></div>`;
  if (!panel.hidden) panel.innerHTML = `
    <div class="row"><h2 class="h3">Filtrar y ordenar</h2><button class="link b" type="button" data-ff-clear${n ? "" : " hidden"}>Limpiar filtros</button></div>
    <div class="row ffopen"><div><b style="font-size:13px">Solo abiertos ahora</b><p class="tiny">Según el horario de hoy y si el local pausó los pedidos.</p></div><button class="switch" type="button" role="switch" aria-checked="${ff.open}" aria-label="Solo abiertos ahora" data-ff-open></button></div>
    ${grp("price", FF_PRICES, "Precio")}${grp("eta", FF_ETAS, "Tiempo de retiro")}${grp("type", FF_TYPES, "Tipo de comida")}${grp("sort", FF_SORTS, "Ordenar por")}
    <button class="btn" type="button" data-ff-close>Ver ${plural(document.querySelectorAll("#foodLocales [data-open-local], #foodKioscos [data-open-local]").length, "resultado", "resultados")}</button>`;
  const act = document.getElementById("ffActive"), tags = [];
  if (ff.open) tags.push(["open", "Abiertos ahora"]);
  if (ff.price) tags.push(["price", FF_PRICES.find(x => x[0] === ff.price)[1]]);
  if (ff.eta) tags.push(["eta", "Retiro " + FF_ETAS.find(x => x[0] === ff.eta)[1]]);
  if (ff.type) tags.push(["type", FF_TYPES.find(x => x[0] === ff.type)[1]]);
  if (ff.sort !== "rec") tags.push(["sort", FF_SORTS.find(x => x[0] === ff.sort)[1]]);
  act.hidden = !tags.length;
  act.innerHTML = tags.map(([k, t]) => `<button class="pill ok fftag" type="button" data-ff-rm="${k}" aria-label="Quitar filtro ${t}">${t}<i data-lucide="x"></i></button>`).join("") + (tags.length > 1 ? `<button class="link b" type="button" data-ff-clear style="font-size:12px">Limpiar todo</button>` : "");
  icons();
}
function renderFoodList() {
  const q = normTxt((document.getElementById("c-search") || {}).value || "").trim();
  const filtering = !!(q || ff.price || ff.type);
  const card = (l, items) => {
    const st = openState(l);
    const hit = q && items.find(i => normTxt(i.name + " " + i.desc).includes(q));
    const cheapest = items.slice().sort((a, b) => a.price - b.price)[0];
    const star = hit || (filtering ? cheapest : (itemsOf(l).find(i => i.tag && items.includes(i)) || items[0]));
    return `<button class="card svc tap" type="button" data-kind="${l.kind}" data-open-local="${l.id}" aria-label="${l.kind === "local" ? "Ver menú de" : "Ver kiosco"} ${esc(l.name)}">
      <span class="head svc-head">${foodArt(l.id, "sm")}<span class="svc-id"><b class="h3">${esc(l.name)}</b><span class="small">${l.place} · Retiro en ${l.eta}</span><span class="pill ${st.cls}">${st.label}</span></span></span>
      <span class="svc-feat"><span class="grow"><span class="tiny" style="display:block">${hit ? "Coincide con tu búsqueda" : filtering && items.length > 1 ? `${items.length} opciones · desde` : "Destacado"}</span><b>${esc(star.name)}</b></span><b class="svc-price">${money(star.price)}</b></span>
      <span class="small" style="font-size:13px">${esc(l.tagline)}</span>
      <span class="svc-foot"><span class="small">Hoy · ${todayHours(l)}</span><span class="svc-go">${l.kind === "local" ? "Ver menú" : "Ver kiosco"}<i data-lucide="arrow-right"></i></span></span>
    </button>`;
  };
  const res = LOCALES.map(l => ({ l, items: foodMatches(l, q) })).filter(x => x.items);
  const minP = x => Math.min(...x.items.map(i => i.price));
  if (ff.sort === "price") res.sort((a, b) => minP(a) - minP(b));
  if (ff.sort === "eta") res.sort((a, b) => etaMax(a.l) - etaMax(b.l) || minP(a) - minP(b));
  const locs = res.filter(x => x.l.kind === "local"), kios = res.filter(x => x.l.kind === "kiosco");
  document.getElementById("foodLocales").innerHTML = locs.map(x => card(x.l, x.items)).join("");
  document.getElementById("foodKioscos").innerHTML = kios.map(x => card(x.l, x.items)).join("");
  document.getElementById("foodLocalCount").textContent = `${plural(locs.length, "local", "locales")} · Feria Central`;
  document.getElementById("foodKioscoCount").textContent = `${plural(kios.length, "kiosco", "kioscos")} · Campus Central`;
  const nums = { all: res.length, local: locs.length, kiosco: kios.length }, names = { all: "Todos", local: "Locales de comida", kiosco: "Kioscos" };
  document.querySelectorAll("[data-ffn]").forEach(b => { b.textContent = `${names[b.dataset.ffn]} · ${nums[b.dataset.ffn]}`; });
  document.getElementById("foodLocales").closest("[data-group]").classList.toggle("q-empty", !locs.length);
  document.getElementById("foodKioscos").closest("[data-group]").classList.toggle("q-empty", !kios.length);
  const empty = document.getElementById("foodEmpty");
  empty.hidden = res.length > 0;
  empty.innerHTML = ffActiveCount() ? emptyState("filter-x", "Nada coincide con estos filtros", "Prueba quitando alguno.", `<button class="btn ghost sm" type="button" data-ff-clear>Limpiar filtros</button>`) : emptyState("search-x", "No encontramos productos ni locales", "Revisa cómo lo escribiste o busca algo más general, como \"café\" o \"almuerzo\".");
  const cc = document.getElementById("foodCartCard"), cl = cartLocal();
  cc.hidden = !cl || !cart.lines.length;
  if (!cc.hidden) cc.innerHTML = `<h3 class="h3">Tu carrito</h3><p class="small" style="font-size:13px">${plural(cartCount(), "producto", "productos")} · ${esc(cl.name)}</p>
    <button class="btn ghost" type="button" data-go="carrito"><i data-lucide="shopping-bag"></i>Ver carrito · ${money(cartTotal())}</button>`;
  renderFoodFilters();
  icons();
}
document.addEventListener("click", e => {
  if (e.target.closest("#ffToggle")) {
    const p = document.getElementById("foodFilters"), t = document.getElementById("ffToggle");
    p.hidden = !p.hidden; t.setAttribute("aria-expanded", String(!p.hidden)); renderFoodFilters();
    if (!p.hidden) { const f = p.querySelector("button"); if (f) f.focus(); }
    return;
  }
  const o = e.target.closest("[data-ff]");
  if (o) { const k = o.dataset.ff, raw = o.dataset.ffv; ff[k] = ["price", "eta"].includes(k) ? +raw : raw; saveFF(); renderFoodList(); document.querySelector(`[data-ff="${k}"][data-ffv="${raw}"]`)?.focus(); return; }
  if (e.target.closest("[data-ff-open]")) { ff.open = !ff.open; saveFF(); renderFoodList(); document.querySelector("[data-ff-open]")?.focus(); return; }
  const rm = e.target.closest("[data-ff-rm]");
  if (rm) { const k = rm.dataset.ffRm; ff[k] = FF0[k]; saveFF(); renderFoodList(); return; }
  if (e.target.closest("[data-ff-clear]")) { ff = { ...FF0 }; saveFF(); renderFoodList(); toast("Quitamos los filtros."); return; }
  if (e.target.closest("[data-ff-close]")) { const p = document.getElementById("foodFilters"); p.hidden = true; document.getElementById("ffToggle").setAttribute("aria-expanded", "false"); document.getElementById("ffToggle").focus(); }
});

/* Menú de un local */
function renderLocal() {
  const l = localById(curLocal);
  setFrame("local", l.name, ["Comida y kioscos", l.name]);
  document.getElementById("localHead").innerHTML = `<div class="local-hero">${foodArt(l.id, "lg")}<div><h1 class="h1">${esc(l.name)}</h1><p class="lead">${l.place} · ${esc(l.tagline)}</p></div></div>
    <div class="chips" style="margin-top:12px">${isPaused(l.id) ? `<span class="pill warn">Pedidos en pausa</span>` : `<span class="pill ${openState(l).cls}">${openState(l).label}</span>`}<span class="pill neutral">Retiro en ${l.eta}</span><span class="pill neutral">Hoy ${todayHours(l)}</span></div>
    ${isPaused(l.id) ? `<div class="notice warn" style="margin-top:12px"><i data-lucide="circle-pause"></i><p>${esc(l.name)} no está recibiendo pedidos en este momento. Puedes ver el menú y volver más tarde.</p></div>` : !openState(l).open ? `<div class="notice" style="margin-top:12px"><i data-lucide="clock"></i><p>${esc(l.name)} ${hoursOn(l, new Date()) ? `atiende hoy de ${todayHours(l)}` : "no abre hoy"} (${openState(l).label.toLowerCase()}). Puedes armar tu pedido y programar el retiro para cuando abra.</p></div>` : ""}`;
  const cats = ["Todos", ...l.cats.map(c => c.name)];
  if (!cats.includes(curCat)) curCat = "Todos";
  document.getElementById("localChips").innerHTML = cats.map(c => `<button class="pill ${c === curCat ? "ok" : "neutral"}" type="button" data-food-cat="${esc(c)}">${esc(c)}</button>`).join("");
  document.getElementById("localMenu").innerHTML = l.cats.filter(c => curCat === "Todos" || c.name === curCat).map(c => `<h2 class="h2">${esc(c.name)}</h2>` + c.items.map(it =>
    `<div class="favwrap">${favBtn(l.id, it)}<button class="card row${isSoldOut(l.id, it.id) ? " soldout" : ""}" type="button" data-open-item="${it.id}" style="text-align:left;flex-direction:row"${isSoldOut(l.id, it.id) ? ` aria-disabled="true"` : ""}>
      ${prodArt(it.id, it.icon, "sm")}
      <div style="flex:1;min-width:0"><b class="h3">${esc(it.name)}</b><p class="small">${esc(it.desc)}</p><div class="row start" style="gap:4px 8px;margin-top:4px;flex-wrap:wrap"><b style="font-size:17px;font-weight:600">${money(it.price)}</b><span class="bsv inline">${bsOf(it.price)}</span>${isSoldOut(l.id, it.id) ? `<span class="pill neutral">Agotado</span>` : it.tag ? `<span class="pill ok">${it.tag}</span>` : ""}${it.opts ? `<span class="tiny">Con opciones</span>` : ""}</div></div>
      <span class="ico"><i data-lucide="chevron-right"></i></span>
    </button></div>`).join("")).join("");
  const cl = cartLocal(), mine = cl && cl.id === l.id && cart.lines.length;
  document.getElementById("localSide").innerHTML = `
    <div class="card"><i data-lucide="map-pin" style="color:var(--brand);font-size:22px"></i><h3 class="sec" style="font-weight:600">Pide y retira</h3>
      <p class="small" style="font-size:13px">${esc(l.name)} · ${l.place}</p><div class="sep"></div>
      <p style="font-size:13px">Hoy · ${todayHours(l)}</p><p style="font-size:13px">Preparación en ${l.eta}</p>
      <details class="weekdet"><summary class="link b">Horario de la semana</summary>${weekTable(l)}</details>
      <p style="color:var(--brand);font-weight:600;font-size:13px">Sin cargos extra</p></div>
    ${mine ? `<div class="card"><h3 class="h3">Tu carrito</h3><p class="small" style="font-size:13px">${plural(cartCount(), "producto", "productos")} · ${money(cartTotal())}</p>
      <button class="btn" type="button" data-go="carrito"><i data-lucide="shopping-bag"></i>Ir al carrito · ${money(cartTotal())}</button></div>`
      : `<div class="card"><h3 class="h3">A tu gusto</h3><p class="small" style="font-size:13px">Elige las opciones de cada producto antes de añadirlo al carrito.</p><p class="small">¿Tienes alguna alergia? Consulta con el local antes de pedir.</p></div>`}`;
  icons();
}

/* Detalle de un producto */
let detSel = [], detQty = 1;
function openItem(itemId, line = null) {
  curItem = itemId; editLine = line;
  const l = localById(curLocal), it = itemById(l, itemId);
  const src = line !== null && cart.lines[line];
  detSel = (it.opts || []).map((g, gi) => src ? (src.sel[gi] || 0) : 0);
  detQty = src ? src.qty : 1;
  saveFoodNav();
  renderDetalle(src ? src.note : "");
}
function detUnit(it) { return it.price + (it.opts || []).reduce((a, g, gi) => a + g.choices[detSel[gi]].p, 0); }
function renderDetalle(note) {
  const l = localById(curLocal), it = curItem && itemById(l, curItem);
  if (!it) { go("local"); return; }
  if (detSel.length !== (it.opts || []).length) detSel = (it.opts || []).map(() => 0);
  setFrame("detalle", it.name, [l.name, it.name]);
  document.getElementById("detBack").lastChild.textContent = "Volver al menú de " + l.name;
  const other = cartLocal() && cart.local !== l.id && cart.lines.length ? cartLocal() : null;
  const editing = editLine !== null;
  document.getElementById("detBody").innerHTML = `
    <div class="stack s14">
      ${prodArt(it.id, it.icon, "xl")}
      <div class="chips"><span class="pill ok">Disponible hoy</span><span class="pill neutral">${l.eta}</span></div>
      <div><h1 class="h1">${esc(it.name)}</h1><p class="lead">${esc(it.desc)}</p></div>
      <p style="font-size:30px" class="mono">${money(it.price)}</p>
      <p class="small" style="font-size:13px">${esc(l.name)} · ${l.place}</p>
      <div class="notice" style="background:var(--surface);border:1px solid var(--line);color:var(--muted)"><i data-lucide="info" style="color:var(--brand)"></i><p>Preparado al momento. Si tienes alergias o restricciones alimentarias, consulta con el local antes de comprar.</p></div>
    </div>
    <div class="stack s14">
      ${it.opts ? `<h2 class="h2" style="font-size:20px">Elige tus opciones</h2>` + it.opts.map((g, gi) => `<div class="card">
        <div><b class="h3">${esc(g.name)}</b><p class="small">${esc(g.note)}</p></div>
        ${g.choices.map((c, ci) => `<button class="opt${detSel[gi] === ci ? " on" : ""}" type="button" data-det-opt="${gi}:${ci}"><span class="dot"></span><span class="grow">${esc(c.l)}</span><span class="small">+${money(c.p)}</span></button>`).join("")}
      </div>`).join("") : ""}
      <div class="card">
        <label for="d-note" style="font-weight:600">Indicaciones · Opcional</label>
        <div class="input" style="flex-direction:column;align-items:stretch;padding:12px"><textarea id="d-note" rows="2" maxlength="120" placeholder="Ej.: aderezo aparte">${esc(note || "")}</textarea><span class="tiny" style="text-align:right" id="d-note-count">${(note || "").length} / 120 caracteres</span></div>
      </div>
      <div class="card">
        ${other ? `<div class="notice" style="font-size:13px"><i data-lucide="info"></i><p>Tu carrito tiene productos de <b>${esc(other.name)}</b>. Cada pedido se retira en un solo local, así que al añadir este producto se vaciará tu carrito.</p></div>` : ""}
        <div class="row">
          <div class="stack s14" style="gap:6px"><span class="small">Cantidad</span><span class="qty"><button type="button" aria-label="Quitar uno" data-det-qty="-1"><i data-lucide="minus"></i></button><span id="detQty">${detQty}</span><button type="button" aria-label="Agregar uno" data-det-qty="1"><i data-lucide="plus"></i></button></span></div>
          <div style="text-align:right"><span class="small">Total del producto</span><p style="font-size:25px;font-weight:600" class="mono" id="detTotal">${money(detUnit(it) * detQty)}</p><span class="bsv" id="detBs">${bsOf(detUnit(it) * detQty)}</span></div>
        </div>
        ${isPaused(l.id) || isSoldOut(l.id, it.id) ? `<div class="notice warn"><i data-lucide="circle-pause"></i><p>${isPaused(l.id) ? `${esc(l.name)} no está recibiendo pedidos ahora.` : "Este producto se agotó por hoy."}</p></div>` : ""}
        <button class="btn" type="button" id="detAdd"${isPaused(l.id) || isSoldOut(l.id, it.id) ? " disabled" : ""}><i data-lucide="shopping-bag"></i>${editing ? "Guardar cambios" : other ? "Vaciar carrito y añadir" : "Añadir al carrito"} · <span id="detAddAmt">${money(detUnit(it) * detQty)}</span></button>
      </div>
    </div>`;
  icons();
}
function refreshDetTotal() {
  const it = itemById(localById(curLocal), curItem), t = money(detUnit(it) * detQty);
  document.getElementById("detQty").textContent = detQty;
  document.getElementById("detTotal").textContent = t;
  document.getElementById("detAddAmt").textContent = t;
  document.getElementById("detBs").textContent = bsOf(detUnit(it) * detQty);
}
function addFromDetalle() {
  const note = document.getElementById("d-note").value.trim();
  const line = { item: curItem, sel: detSel.slice(), qty: detQty, note };
  const name = itemById(localById(curLocal), curItem).name;
  if (editLine !== null && cart.local === curLocal && cart.lines[editLine]) {
    cart.lines[editLine] = line;
    toast("Actualizamos tu carrito.");
  } else {
    let prevCart = null;
    if (cart.local !== curLocal) { if (cart.lines.length) prevCart = JSON.parse(JSON.stringify(cart)); cart = { local: curLocal, lines: [] }; }
    const same = cart.lines.find(x => x.item === line.item && x.note === line.note && x.sel.join() === line.sel.join());
    if (same) same.qty = Math.min(20, same.qty + line.qty); else cart.lines.push(line);
    if (prevCart) {
      const pl = localById(prevCart.local);
      toast(`Añadimos ${name}. Vaciamos el carrito de ${pl ? pl.name : "el otro local"}: cada pedido es de un solo local.`, { action: "Deshacer", onAction: () => { cart = prevCart; saveCart(); toast("Recuperamos tu carrito anterior."); if (current === "carrito") renderCarrito(); else go("carrito"); } });
    } else toast(`Añadimos ${name} a tu carrito.`);
  }
  editLine = null; saveFoodNav(); saveCart(); go("carrito");
}

/* Carrito y pago */
function undoCartToast(snap) {
  const ln = snap.lines.find((x, k) => !cart.lines[k] || JSON.stringify(cart.lines[k]) !== JSON.stringify(x));
  const it = ln && itemById(localById(snap.local), ln.item);
  toast(`Quitamos ${it ? it.name : "el producto"} de tu carrito.`, { action: "Deshacer", onAction: () => { cart = snap; saveCart(); if (current === "carrito") renderCarrito(); toast("Lo devolvimos a tu carrito."); } });
}
let payMethod = "card";
function renderCarrito() {
  const l = cartLocal(), body = document.getElementById("cartBody");
  const back = document.getElementById("cartBack");
  if (!l || !cart.lines.length) {
    setFrame("carrito", "Carrito y pago", ["Comida y kioscos", "Carrito y pago"]);
    back.dataset.go = "comida"; back.lastChild.textContent = "Volver a comida y kioscos";
    body.innerHTML = `<div class="card" style="align-items:flex-start"><span class="ico lg"><i data-lucide="shopping-bag"></i></span><h2 class="h2">Tu carrito está vacío</h2>
      <p class="small" style="font-size:13px">Elige un local o kiosco y añade lo que quieras pedir.</p>
      <button class="btn" type="button" data-go="comida" style="max-width:320px"><i data-lucide="utensils"></i>Ver comida y kioscos</button></div>`;
    icons(); return;
  }
  setFrame("carrito", "Carrito y pago", ["Comida y kioscos", l.name, "Carrito y pago"]);
  back.dataset.go = "local"; back.lastChild.textContent = "Volver al menú de " + l.name;
  curLocal = l.id; saveFoodNav();
  const total = cartTotal(), n = cartCount();
  const soldNames = cart.lines.filter(x => isSoldOut(l.id, x.item)).map(x => (itemById(l, x.item) || {}).name);
  const blocked = isPaused(l.id) || soldNames.length > 0;
  const st = openState(l), pk = cartPickup(l); saveCart();
  const defCard = cards.length ? cardLabel(cards[0]) : "Tarjeta de crédito o débito";
  body.innerHTML = `
    <div class="stack">
      <div class="card">
        <div class="row start">${foodArt(l.id, "xs")}<b class="h3">${esc(l.name)}</b></div>
        <p class="small" style="margin-top:-8px">${l.place} · ${plural(n, "producto", "productos")}</p>
        ${cart.lines.map((x, i) => { const li = lineInfo(l, x); if (!li) return ""; return `<div class="sep"></div>
          <div class="row start" style="align-items:flex-start">${prodArt(li.it.id, li.it.icon, "xs")}
            <div><b style="font-size:15px;font-weight:600">${esc(li.it.name)}</b>${li.opts.map(o => `<p class="small">${esc(o)}</p>`).join("")}${x.note ? `<p class="small">Nota: ${esc(x.note)}</p>` : ""}<p class="mono" style="font-weight:600;margin-top:2px">${money(li.total)}</p></div></div>
          <div class="row"><span class="qty"><button type="button" aria-label="Quitar uno" data-cart-qty="${i}:-1"><i data-lucide="minus"></i></button>${x.qty}<button type="button" aria-label="Agregar uno" data-cart-qty="${i}:1"><i data-lucide="plus"></i></button></span>
            <div class="row" style="gap:16px"><button class="link b" type="button" data-cart-edit="${i}" style="font-size:12px">Editar</button><button class="link" type="button" style="color:var(--muted);font-size:12px" data-cart-del="${i}">Eliminar</button></div></div>`; }).join("")}
        <button class="link" type="button" data-go="local">+ Seguir comprando en ${esc(l.name)}</button>
      </div>
      <div class="card">
        <div class="row start"><i data-lucide="map-pin" style="color:var(--brand);font-size:20px"></i><b class="h3">Retiro en el local</b></div>
        <div><p style="font-size:13px">${esc(l.name)} · ${l.place}</p><p class="small">Campus Central · Planta baja</p></div>
        <div class="stack s14" style="gap:8px" role="radiogroup" aria-label="Cuándo retiras">
          <button class="opt${pk.mode === "asap" ? " on" : ""}" type="button" role="radio" aria-checked="${pk.mode === "asap"}" data-pk-mode="asap"${st.open ? "" : " disabled"}><span class="dot"></span><span class="grow">Lo antes posible · ${l.eta}<br><span class="small" style="font-weight:400">${st.open ? "Empiezan a prepararlo al confirmar tu pago." : `No disponible: ${esc(l.name)} ${closedTxt(st)}.`}</span></span></button>
          <button class="opt${pk.mode === "sched" ? " on" : ""}" type="button" role="radio" aria-checked="${pk.mode === "sched"}" data-pk-mode="sched"><span class="dot"></span><span class="grow">Programar el retiro<br><span class="small" style="font-weight:400">Elige el día y la hora; lo tendrán listo para entonces.</span></span></button>
        </div>
        ${pk.mode === "sched" ? `<div class="grid2">
          <div class="field"><label for="pk-day">Día</label><div class="input sel"><select id="pk-day">${[0, 1, 2, 3, 4, 5, 6].filter(d => pickupSlots(l, d).length).map(d => `<option value="${d}"${pk.day === d ? " selected" : ""}>${dayLabel(d)}</option>`).join("")}</select><i data-lucide="chevron-down"></i></div></div>
          <div class="field"><label for="pk-time">Hora de retiro</label><div class="input sel"><select id="pk-time">${pickupSlots(l, pk.day).map(t => `<option${pk.time === t ? " selected" : ""}>${t}</option>`).join("")}</select><i data-lucide="chevron-down"></i></div></div>
        </div>
        <p class="small">Lo retiras ${whenTxt(slotTime(pk.day, pk.time))}. Empezarán a prepararlo ${etaMax(l)} min antes; te avisamos cuando esté listo.</p>` : ""}
      </div>
      <div class="card">
        <div><h3 class="h2">¿Cómo quieres pagar?</h3><p class="small" style="font-size:13px">Elige un método para continuar.</p></div>
        <button class="card${payMethod === "card" ? " sel" : ""}" type="button" data-pay-method="card" style="text-align:left;${payMethod === "card" ? "border-color:var(--brand)" : ""}">
          <div class="row start"><span class="opt${payMethod === "card" ? " on" : ""}" style="padding:0;border:0;background:none;width:auto"><span class="dot"></span></span><i data-lucide="credit-card" style="color:var(--brand)"></i><b>Tarjeta</b></div>
          <p style="font-size:13px">${esc(defCard)}</p><p class="small">Pago simulado: no se hará ningún cobro real.</p>
        </button>
        <button class="card${payMethod === "transfer" ? " sel" : ""}" type="button" data-pay-method="transfer" style="text-align:left;${payMethod === "transfer" ? "border-color:var(--brand)" : ""}">
          <div class="row start"><span class="opt${payMethod === "transfer" ? " on" : ""}" style="padding:0;border:0;background:none;width:auto"><span class="dot"></span></span><i data-lucide="landmark" style="color:var(--brand)"></i><b>Transferencia bancaria</b></div>
          <p class="small">Consulta los datos bancarios y carga tu comprobante. El pedido se confirma al validar el pago.</p>
        </button>
      </div>
    </div>
    <div class="card">
      <div><h3 class="h2">Resumen del pedido</h3><p class="small">${plural(n, "producto", "productos")} · ${esc(l.name)}</p></div>
      <div class="sep"></div>
      <div class="kv"><span>Subtotal · ${plural(n, "producto", "productos")}</span><b>${money(total)}</b></div>
      <div class="kv"><span>Cargos adicionales</span><b>$0,00</b></div>
      <div class="kv"><span>Retiro en el local</span><b class="pos">Gratis</b></div>
      <div class="sep"></div>
      <div class="kv total" style="font-size:18px"><span>Total a pagar</span><b style="font-size:27px">${money(total)}</b></div>
      <div class="kv"><span>En bolívares · tasa BCV ${bcvDateTxt()}</span><b>${bsOf(total)}</b></div>
      <p class="small">Precios finales · Sin cargos extra</p>
      ${blocked ? `<div class="notice warn"><i data-lucide="circle-pause"></i><p>${isPaused(l.id) ? `${esc(l.name)} pausó los pedidos por ahora. Inténtalo más tarde.` : `Se agotó: ${soldNames.join(", ")}. Quítalo del carrito para continuar.`}</p></div>` : ""}
      <button class="btn" type="button" id="cartPay"${blocked ? " disabled" : ""}><i data-lucide="${pk.mode === "sched" ? "calendar-clock" : "arrow-right"}"></i>${pk.mode === "sched" ? (payMethod === "card" ? "Programar y pagar" : "Programar y transferir") : payMethod === "card" ? "Pagar con tarjeta" : "Continuar con transferencia"} · ${money(total)}</button>
      <p class="tiny center"><i data-lucide="lock-keyhole"></i> ${payMethod === "card" ? "Prototipo: el cobro es simulado." : "Aún no se realizará ningún cobro."}</p>
    </div>`;
  icons();
}

/* Pedidos: se crean al pagar y se muestran en comprobante y factura */
document.addEventListener("change", e => {
  if (e.target.id === "pk-day") { cart.pickup = { ...cart.pickup, day: +e.target.value, time: null }; saveCart(); renderCarrito(); }
  if (e.target.id === "pk-time") { cart.pickup = { ...cart.pickup, time: e.target.value }; saveCart(); renderCarrito(); }
});
function newOrder(method) {
  const l = cartLocal(), now = new Date(), d = day0(simDate);
  const num = `${l.pref}-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(orders.length + 1).padStart(4, "0")}`;
  return { id: "o" + now.getTime(), num, local: l.id, method, date: fmtD(d), time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    lines: cart.lines.map(x => { const li = lineInfo(l, x); return { item: x.item, sel: x.sel.slice(), name: li.it.name, icon: li.it.icon, opts: li.opts, note: x.note, qty: x.qty, total: li.total }; }).filter(Boolean),
    total: cartTotal(), card: method === "card" ? (cards.length ? cardLabel(cards[0]) : "Tarjeta") : null };
}
let draftOrder = null;
function confirmOrder(o) {
  const lo = localById(o.local), pk = cart.pickup && cart.local === o.local ? cartPickup(lo) : { mode: "asap" };
  o.paidAt = Date.now(); o.code = pickupCode(o); o.studentName = user.full;
  if (pk.mode === "sched") { o.scheduledFor = slotTime(pk.day, pk.time); o.readyAt = o.scheduledFor; o.prepStart = o.scheduledFor - etaMax(lo) * MIN; }
  else o.readyAt = o.paidAt + prepMinutes(lo) * MIN;
  orders.push(o); saveOrders();
  cart = { local: null, lines: [] }; saveCart();
  curOrder = o.id;
  const l = localById(o.local), n = o.lines.reduce((a, x) => a + x.qty, 0);
  addMovement(o.lines.length === 1 ? o.lines[0].name : `Pedido · ${plural(n, "producto", "productos")}`, `${l.name} · ${l.place}`, "−" + money(o.total), "Pagado", "ok",
    { icon: "utensils", go: "pedido", goLabel: "Ver pedido →", order: o.id, date: `${o.date} · ${o.time}` });
  trackId = o.id; toast(o.scheduledFor ? `Pago confirmado. Tu pedido quedó programado para ${whenTxt(o.scheduledFor)}.` : "Pago confirmado. Ya están preparando tu pedido.");
  go("pedido");
}
const orderLines = o => o.lines.map(x => `<div class="row start" style="align-items:flex-start">${prodArt(x.item, x.icon, "xs", x.name)}<div><b style="font-size:13px">${esc(x.name)}</b>${x.opts.map(t => `<p class="small">${esc(t)}</p>`).join("")}${x.note ? `<p class="small">Nota: ${esc(x.note)}</p>` : ""}<p class="small">Cantidad ${x.qty} · ${money(x.total)}</p></div></div>`).join("");
const orderTotals = o => `<div class="kv"><span>Subtotal</span><b>${money(o.total)}</b></div><div class="kv"><span>Cargos adicionales</span><b>$0,00</b></div><div class="kv"><span>Retiro en el local</span><b>Gratis</b></div>
  <div class="sep"></div><div class="kv total"><span>Total</span><b>${money(o.total)}</b></div>`;
function renderComprobante() {
  if (!draftOrder) { if (cartLocal() && cart.lines.length) draftOrder = newOrder("transfer"); else return; }
  const o = draftOrder, l = localById(o.local);
  document.getElementById("cpLead").textContent = `Pedido de ${l.name} · ${o.date}`;
  document.querySelectorAll("#comprobante [data-ord=place]").forEach(e => e.textContent = `${l.name} · ${l.place}`);
  document.querySelectorAll("#comprobante [data-ord=total]").forEach(e => e.textContent = money(o.total));
  document.querySelectorAll("#comprobante [data-ord=num]").forEach(e => e.textContent = o.num);
  document.querySelectorAll("#comprobante [data-ord-val=total]").forEach(e => e.value = money(o.total));
  if (!document.getElementById("cp-f").value) cpReset();
  cpRenderCurrency();
  document.getElementById("cpOrder").innerHTML = `<h3 class="h2">Tu pedido</h3><b style="font-size:13px">${esc(l.name)} · ${l.place}</b>${orderLines(o)}
    <div class="sep"></div>${orderTotals(o)}<p class="tiny">Pedido ${o.num} · Desde tu carrito</p><span class="pill warn">Sin confirmar</span>`;
  icons();
}
const FC_SAMPLE = ["fcLead", "fcNotice", "fcCard", "fcPickup"].map(id => [id, document.getElementById(id).innerHTML]);
function renderFactura() {
  const o = (curOrder && orders.find(x => x.id === curOrder)) || (!isDemo ? orders.filter(x => !x.cancelledAt).sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0))[0] : null);
  ["fcNotice", "fcPickup"].forEach(id => { document.getElementById(id).hidden = false; });
  document.getElementById("fcPickup").parentElement.hidden = !o && !isDemo;
  document.querySelector("#factura .h1").textContent = !o && !isDemo ? "Tus facturas de comida" : "Tu pago está confirmado";
  if (!o && !isDemo) { // cuenta sin pedidos: nada que facturar (la factura de ejemplo es de la cuenta demo)
    document.getElementById("fcLead").textContent = "Aquí verás la factura de cada pedido de comida que pagues.";
    ["fcNotice", "fcPickup"].forEach(id => { document.getElementById(id).hidden = true; });
    document.getElementById("fcCard").innerHTML = `<div class="row start"><span class="ico lg"><i data-lucide="receipt-text"></i></span><div><h2 class="h2">Aún no tienes facturas de comida</h2><p class="small" style="font-size:13px">Cuando pagues un pedido, su factura aparecerá aquí y en Actividad.</p></div></div><button class="btn" type="button" data-go="comida" style="max-width:320px"><i data-lucide="utensils"></i>Ver comida y kioscos</button>`;
    setFrame("factura", "Factura de comida", ["Actividad", "Factura"]); icons(); return;
  }
  if (!o) { // cuenta demo sin pedido elegido: factura de ejemplo
    FC_SAMPLE.forEach(([id, h]) => { document.getElementById(id).innerHTML = h; });
    setFrame("factura", "Factura de comida", ["Actividad", "Factura"]); icons(); return;
  }
  const l = localById(o.local), card = o.method === "card";
  document.getElementById("fcLead").textContent = card ? "El pago con tarjeta fue aprobado. Aquí está el detalle de tu pedido." : "La transferencia fue aprobada. Aquí está el detalle de tu pedido.";
  document.getElementById("fcNotice").innerHTML = `<i data-lucide="shield-check"></i><div><b>Confirmado · ${o.date} · ${o.time}</b>${card ? `Pagaste el pedido ${o.num} con tu tarjeta. Ya puedes retirarlo en el local.` : `El comercio validó el comprobante del pedido ${o.num}.`}</div>`;
  document.getElementById("fcCard").innerHTML = `<h2 class="h2">Factura de comida</h2>
    <div class="row start">${foodArt(l.id, "xs")}<div><b style="font-size:17px;font-weight:600">${esc(l.name)}</b><p class="small" style="font-size:13px">${l.place} · Campus Central</p></div></div>
    <span class="pill ok">Pagado · Confirmado</span><div class="sep"></div>
    <b style="font-size:13px">${esc(user.full)} · ${esc(user.carnet || user.email)}</b>
    <div class="kv"><span>Fecha de emisión</span><b>${o.date} · ${o.time}</b></div>
    <p class="small">Factura F${o.num}</p><p class="small" style="margin-top:-10px">Pedido ${o.num}</p>
    <div class="sep"></div>${orderLines(o)}<div class="sep"></div>${orderTotals(o)}
    <p class="tiny">Precios finales en USD · Sin cargos extra</p><div class="sep"></div>
    <div class="kv"><span>Método de pago</span><b>${card ? esc(o.card) : "Transferencia"}</b></div>${o.ref ? `<div class="kv"><span>Referencia</span><b>${esc(o.ref)}</b></div>` : ""}${o.bank ? `<div class="kv"><span>Banco de origen</span><b>${esc(o.bank)}</b></div>` : ""}${o.currency === "bs" ? `<div class="kv"><span>Pagado en bolívares</span><b>${bsAmt(o.paidAmount)}</b></div><p class="tiny">Tasa BCV aplicada: ${bsAmt(o.bcvRate)} por US$.</p>` : ""}`;
  document.getElementById("fcPickup").innerHTML = `<h3 class="h2">Retira en ${esc(l.name)}</h3><p style="font-size:13px">${l.place} · Planta baja</p>
    <p class="small" style="font-size:13px">Preparación estimada: ${l.eta} desde la confirmación del pago.</p>
    <p class="small">Muestra el número de pedido ${o.num} en el mostrador.</p>
    <button class="btn ghost" type="button" data-go="actividad">Ver pedido en Actividad</button>`;
  setFrame("factura", "Factura de comida", ["Actividad", "Factura " + o.num]);
  icons();
}

document.getElementById("c-search").addEventListener("input", renderFoodList);
document.addEventListener("input", e => {
  if (e.target.id === "d-note") document.getElementById("d-note-count").textContent = `${e.target.value.length} / 120 caracteres`;
});
document.addEventListener("click", e => {
  const ol = e.target.closest("[data-open-local]");
  if (ol) { curLocal = ol.dataset.openLocal; curCat = "Todos"; saveFoodNav(); go("local"); return; }
  const fc = e.target.closest("[data-food-cat]");
  if (fc) { curCat = fc.dataset.foodCat; renderLocal(); return; }
  const oi = e.target.closest("[data-open-item]");
  if (oi) { if (isSoldOut(curLocal, oi.dataset.openItem)) { toast("Este producto se agotó por hoy."); return; } openItem(oi.dataset.openItem); go("detalle"); return; }
  const dopt = e.target.closest("[data-det-opt]");
  if (dopt) { const [g, c] = dopt.dataset.detOpt.split(":").map(Number); detSel[g] = c; dopt.parentElement.querySelectorAll("[data-det-opt]").forEach(b => b.classList.toggle("on", b === dopt)); refreshDetTotal(); return; }
  const dq = e.target.closest("[data-det-qty]");
  if (dq) { detQty = Math.max(1, Math.min(20, detQty + +dq.dataset.detQty)); refreshDetTotal(); return; }
  if (e.target.closest("#detAdd")) { addFromDetalle(); return; }
  const cq = e.target.closest("[data-cart-qty]");
  if (cq) {
    const [i, d] = cq.dataset.cartQty.split(":").map(Number);
    const snap = JSON.parse(JSON.stringify(cart));
    cart.lines[i].qty += d;
    if (cart.lines[i].qty < 1) { cart.lines.splice(i, 1); undoCartToast(snap); }
    cart.lines[i] && (cart.lines[i].qty = Math.min(20, cart.lines[i].qty));
    if (!cart.lines.length) cart.local = null;
    saveCart(); renderCarrito(); return;
  }
  const cd = e.target.closest("[data-cart-del]");
  if (cd) { const snap = JSON.parse(JSON.stringify(cart)); cart.lines.splice(+cd.dataset.cartDel, 1); if (!cart.lines.length) cart.local = null; saveCart(); undoCartToast(snap); renderCarrito(); return; }
  const ce = e.target.closest("[data-cart-edit]");
  if (ce) { const i = +ce.dataset.cartEdit; curLocal = cart.local; openItem(cart.lines[i].item, i); go("detalle"); return; }
  const pm = e.target.closest("[data-pay-method]");
  if (pm) { payMethod = pm.dataset.payMethod; renderCarrito(); return; }
  const pkm = e.target.closest("[data-pk-mode]");
  if (pkm && !pkm.disabled) { cart.pickup = { ...(cart.pickup || {}), mode: pkm.dataset.pkMode }; saveCart(); renderCarrito(); return; }
  if (e.target.closest("#cartPay")) {
    if (payMethod === "card") confirmOrder(newOrder("card"));
    else { draftOrder = newOrder("transfer"); go("comprobante"); }
    return;
  }
  const fg = e.target.closest('[data-go="factura"]');
  if (fg) curOrder = fg.dataset.order || null; // el data-go del mismo botón navega a la factura
  const pg = e.target.closest('[data-go="pedido"]');
  if (pg) trackId = pg.dataset.order || null;
});
/* Validación del comprobante de transferencia (pedidos de comida). Moneda USD (monto exacto) o Bs. a tasa BCV (−1 %/+5 %). */
let cpCur = "usd", cpFile = null;
const CP_ACC = { usd: ["Cuenta corriente en divisas (USD)", "0105 0000 00 0000000000"], bs: ["Cuenta corriente en bolívares", "0105 0000 00 1111111111"] };
const CP_FIELDS = ["cp-f", "cp-b", "cp-r", "cp-m", "cp-file"];
const cpExpected = () => { const o = draftOrder; if (!o) return 0; return cpCur === "usd" ? o.total : Math.round(o.total * bcvRate() * 100) / 100; };
const cpFmt = n => cpCur === "usd" ? money(n) : bsAmt(n);
function cpRenderCurrency() {
  if (!draftOrder) return;
  document.querySelectorAll("[data-cp-cur]").forEach(b => { const on = b.dataset.cpCur === cpCur; b.classList.toggle("ok", on); b.classList.toggle("neutral", !on); b.setAttribute("aria-checked", String(on)); });
  const [t, acc] = CP_ACC[cpCur], exp = cpExpected();
  document.querySelector('[data-cp="acctype"]').textContent = t;
  document.querySelector('[data-cp="acc"]').textContent = acc;
  document.querySelector('[data-cp="expect"]').textContent = cpFmt(exp);
  document.querySelector('[data-cp="ratenote"]').textContent = cpCur === "bs" ? `${money(draftOrder.total)} a la tasa BCV del ${bcvDateTxt()} (${bsAmt(bcvRate())} por US$).` : `En bolívares serían ${bsOf(draftOrder.total)} a la tasa BCV del ${bcvDateTxt()}.`;
  document.querySelector('[data-cp="mlabel"]').textContent = `Monto transferido · ${cpCur === "usd" ? "USD" : "Bs."}`;
  document.querySelector('[data-cp="mprefix"]').textContent = cpCur === "usd" ? "$" : "Bs.";
  document.querySelector('[data-cp="mhint"]').innerHTML = `Debe ser ${cpFmt(exp)}. <button class="link b" type="button" data-cp-fill style="font-size:11px">Usar este monto</button>`;
  document.querySelector('[data-cp="cta"]').textContent = cpFmt(exp);
}
function cpCheck(id) {
  const el = document.getElementById(id), v = (el.value || "").trim();
  if (id === "cp-f") {
    if (!v) return "Indica la fecha de la transferencia.";
    const days = Math.round((day0(new Date()) - day0(new Date(v + "T12:00"))) / 864e5);
    if (days < 0) return "La fecha no puede ser posterior a hoy.";
    if (days > PM_MAX_DAYS) return `Solo puedes registrar transferencias de los últimos ${PM_MAX_DAYS} días. Para una más antigua, escríbenos en Soporte.`;
    return "";
  }
  if (id === "cp-b") return v ? "" : "Elige el banco desde el que transferiste.";
  if (id === "cp-r") {
    if (!v) return "Escribe el número de referencia de tu comprobante.";
    if (v.length < 6) return "La referencia tiene al menos 6 dígitos. Cópiala completa de tu comprobante.";
    const dup = orders.find(o => o.ref && o.ref === v);
    return dup ? `Ya usaste esa referencia en el pedido ${dup.num}. Si es otra transferencia, revisa el número.` : "";
  }
  if (id === "cp-m") {
    const n = parseAmt(v), exp = cpExpected();
    if (!(n > 0)) return "Escribe el monto que transferiste.";
    if (cpCur === "usd") return Math.abs(n - exp) < 0.005 ? "" : n < exp ? `Transferiste ${money(n)}, pero el pedido es de ${money(exp)} (faltan ${money(exp - n)}).` : `Transferiste ${money(n - exp)} de más. El pedido es de ${money(exp)}: escribe el monto exacto de tu comprobante.`;
    if (n < exp * PM_TOL_LOW) return `Ese monto equivale a ${money(n / bcvRate())}. El pedido es de ${bsAmt(exp)} a tasa BCV (faltan ${bsAmt(exp - n)}).`;
    if (n > exp * PM_TOL_HIGH) return `Transferiste ${bsAmt(n - exp)} de más. Escribe el monto exacto de tu comprobante.`;
    return "";
  }
  if (id === "cp-file") {
    if (!cpFile) return "Adjunta el comprobante de tu banco (PDF, JPG o PNG).";
    if (!/\.(pdf|jpe?g|png)$/i.test(cpFile.name)) return "El comprobante debe ser PDF, JPG o PNG.";
    if (cpFile.size > 5 * 1024 * 1024) return `El archivo pesa ${(cpFile.size / 1048576).toFixed(1).replace(".", ",")} MB. El máximo es 5 MB.`;
    return "";
  }
  return "";
}
function cpShow(id, msg) {
  const field = document.getElementById(id).closest(".field");
  let hint = field.querySelector("[data-cp-err]");
  if (!hint) { hint = document.createElement("p"); hint.className = "tiny pm-err"; hint.dataset.cpErr = id; hint.setAttribute("role", "alert"); field.append(hint); }
  field.classList.toggle("bad", !!msg); hint.hidden = !msg; hint.textContent = msg || "";
  if (id !== "cp-file") document.getElementById(id).setAttribute("aria-invalid", msg ? "true" : "false");
}
function cpReset() {
  cpFile = null; document.getElementById("cpForm").reset();
  const t = new Date(); document.getElementById("cp-f").value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  document.getElementById("cpFileChip").hidden = true; CP_FIELDS.forEach(id => cpShow(id, "")); document.getElementById("cpError").hidden = true;
}
(() => { const src = document.getElementById("pm-bank"), dst = document.getElementById("cp-b"); [...src.options].slice(1).forEach(o => dst.add(new Option(o.text, o.value || o.text))); })();
document.getElementById("cp-r").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, ""); });
document.getElementById("cp-m").addEventListener("input", e => { e.target.value = e.target.value.replace(/[^\d,.]/g, ""); });
document.getElementById("cpForm").addEventListener("input", e => { if (CP_FIELDS.includes(e.target.id)) cpShow(e.target.id, ""); document.getElementById("cpError").hidden = true; });
document.getElementById("cpForm").addEventListener("change", e => {
  if (e.target.id === "cp-file") {
    cpFile = e.target.files[0] || null;
    const chip = document.getElementById("cpFileChip"); chip.hidden = !cpFile;
    if (cpFile) { document.querySelector('[data-cp="fname"]').textContent = cpFile.name; document.querySelector('[data-cp="fsize"]').textContent = `${cpFile.size < 1048576 ? Math.max(1, Math.round(cpFile.size / 1024)) + " KB" : (cpFile.size / 1048576).toFixed(1).replace(".", ",") + " MB"}`; }
    cpShow("cp-file", cpCheck("cp-file")); return;
  }
  if (e.target.id === "cp-b" || e.target.id === "cp-f") cpShow(e.target.id, cpCheck(e.target.id));
});
document.getElementById("cpForm").addEventListener("focusout", e => { const id = e.target.id; if (["cp-r", "cp-m"].includes(id) && e.target.value.trim()) cpShow(id, cpCheck(id)); });
document.getElementById("cpForm").addEventListener("keydown", e => { if (e.target.matches("label.upload") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); document.getElementById("cp-file").click(); } });
document.getElementById("comprobante").addEventListener("click", e => {
  const c = e.target.closest("[data-cp-cur]");
  if (c) { cpCur = c.dataset.cpCur; cpRenderCurrency(); const m = document.getElementById("cp-m"); if (m.value) cpShow("cp-m", cpCheck("cp-m")); return; }
  if (e.target.closest("[data-cp-fill]")) { const m = document.getElementById("cp-m"); m.value = (cpCur === "usd" ? money(cpExpected()) : bsAmt(cpExpected())).replace(/^\$|^Bs\. /, ""); cpShow("cp-m", ""); m.focus(); return; }
  if (e.target.closest("[data-cp-rmfile]")) { cpFile = null; document.getElementById("cp-file").value = ""; document.getElementById("cpFileChip").hidden = true; return; }
  if (e.target.closest("[data-cp-copyacc]")) { const acc = CP_ACC[cpCur][1]; try { navigator.clipboard.writeText(acc).then(() => toast("Número de cuenta copiado"), () => toast(acc)); } catch (err) { toast(acc); } }
});
document.getElementById("cpForm").addEventListener("submit", e => {
  e.preventDefault();
  if (!draftOrder) { toast("Tu carrito está vacío. Elige productos antes de pagar."); go("comida"); return; }
  const errs = CP_FIELDS.map(id => [id, cpCheck(id)]);
  errs.forEach(([id, m]) => cpShow(id, m));
  const bad = errs.filter(x => x[1]);
  if (bad.length) {
    const box = document.getElementById("cpError");
    box.querySelector('[data-cp="err"]').textContent = bad.length === 1 ? bad[0][1] : `Revisa los ${bad.length} datos marcados en rojo antes de enviar tu comprobante.`;
    box.hidden = false; (bad[0][0] === "cp-file" ? document.querySelector("label.upload") : document.getElementById(bad[0][0])).focus(); return;
  }
  const o = draftOrder, v = id => document.getElementById(id).value.trim();
  Object.assign(o, { ref: v("cp-r"), bank: v("cp-b"), currency: cpCur, paidAmount: parseAmt(v("cp-m")), receipt: cpFile.name, receiptPath: sbUploadReceipt(cpFile, "pedido") || undefined, bcvRate: cpCur === "bs" ? bcvRate() : undefined });
  draftOrder = null; cpReset();
  confirmOrder(o);
});
renderFoodList();

/* ---------- Soporte: tickets compartidos entre estudiantes, moderadores y administración ----------
   Los tickets viven en localStorage["nexo-tickets"] (no por cuenta), así que en este navegador
   lo que crea un estudiante lo ve la administración y lo atiende moderación. */
const TK_STATE = { abierto: ["Abierto", "neutral"], revision: ["En revisión", "warn"], espera: ["En espera", "neutral"], resuelto: ["Resuelto", "ok"] };
const TK_PRIO = { alta: "Alta", media: "Media", baja: "Baja" };
const SERVICES = ["Comida", "Estacionamiento", "Materias", "Canchas", "Acceso", "Otro"];
const MIN = 60000, HOUR = 60 * MIN;
const myRole = () => roleOf(account);
const stPill = st => `<span class="pill ${TK_STATE[st][1]}">${TK_STATE[st][0]}</span>`;
const hhmm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const fullDate = t => `${fmtD(new Date(t))}, ${hhmm(t)}`;
function ago(t) {
  const m = Math.max(0, Math.round((Date.now() - t) / MIN));
  if (m < 1) return "Ahora";
  if (m < 60) return `Hace ${m} min`;
  if (m < 24 * 60) return `Hace ${Math.round(m / 60)} h`;
  const d = new Date(t); return `${d.getDate()} ${MES_CORTO[d.getMonth()]} · ${hhmm(t)}`;
}
const accByEmail = e => accounts.find(a => a.email === e);
const nameOf = e => (accByEmail(e) || {}).full || e;
const firstName = n => String(n).split(" ")[0];
const initialsOf = n => String(n).split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toLocaleUpperCase("es");

function seedTickets() {
  const n = Date.now(), ana = DEMO_EMAIL, lucia = "lucia.rojas@unimet.edu.ve", carlos = "carlos.gil@unimet.edu.ve";
  const msg = (from, name, text, t) => ({ from, name, text, t });
  return [
    { id: "TK-1048", created: n - 31 * MIN, student: { email: ana, name: "Ana Torres" }, subject: "Cobro duplicado de almuerzo", service: "Comida", status: "revision", mod: lucia, prio: "alta",
      purchase: { item: "Almuerzo del día", place: "Pincho Pan · Feria Central", num: "NX-261112-0791", amount: 8.5, method: "Visa ···· 4242" },
      note: "Segundo cargo detectado: $8,50. No existe un segundo pedido.", attach: "comprobante-0791.pdf · 248 KB", actions: [],
      messages: [msg("student", "Ana Torres", "Hola, compré un almuerzo en Pincho Pan y aparecen dos cargos de $8,50 en mi tarjeta. Solo retiré un pedido. Adjunto el comprobante.", n - 31 * MIN),
        msg("mod", "Lucía Rojas", "Hola, Ana. Ya localicé tu compra y estoy validando el segundo cargo. Si confirmamos el duplicado, devolveremos $8,50 a tu tarjeta.", n - 19 * MIN),
        msg("student", "Ana Torres", "¡Gracias! Ambos cargos aparecen como completados.", n - 13 * MIN)] },
    { id: "TK-1047", created: n - 46 * MIN, student: { email: "luis.perez@correo.unimet.edu.ve", name: "Luis Pérez" }, subject: "QR de reserva no disponible", service: "Canchas", status: "abierto", mod: null, prio: "alta", actions: [],
      purchase: { item: "Cancha de fútbol sala · 1 h", place: "Canchas · Polideportivo", num: "RS-261111-0412", amount: 15, method: "Mastercard ···· 8812" },
      messages: [msg("student", "Luis Pérez", "Pagué la reserva de la cancha para hoy a las 4 p. m., pero no me aparece el QR para entrar.", n - 46 * MIN)] },
    { id: "TK-1045", created: n - HOUR, student: { email: "sofia.diaz@correo.unimet.edu.ve", name: "Sofía Díaz" }, subject: "Pago de materia sin actualizar", service: "Materias", status: "revision", mod: carlos, prio: "media", actions: [],
      messages: [msg("student", "Sofía Díaz", "Pagué la cuota de noviembre por transferencia hace dos días y sigue apareciendo como pendiente.", n - HOUR),
        msg("mod", "Carlos Gil", "Hola, Sofía. Ya pedí a Caja que valide tu referencia. Te aviso apenas se actualice.", n - 40 * MIN)] },
    { id: "TK-1043", created: n - 2 * HOUR, student: { email: "diego.leon@correo.unimet.edu.ve", name: "Diego León" }, subject: "Cancelar pedido en kiosco", service: "Comida", status: "abierto", mod: null, prio: "media", actions: [],
      purchase: { item: "Café con leche y tequeños", place: "La Tiendita Unimetana A1", num: "A1-261111-0033", amount: 4.3, method: "Visa ···· 1190" },
      messages: [msg("student", "Diego León", "Hice un pedido por error y todavía no lo retiro. ¿Lo pueden cancelar?", n - 2 * HOUR)] },
    { id: "TK-1040", created: n - 3 * HOUR, student: { email: "valeria.ruiz@correo.unimet.edu.ve", name: "Valeria Ruiz" }, subject: "Consulta de factura", service: "Materias", status: "espera", mod: lucia, prio: "baja", actions: [],
      messages: [msg("student", "Valeria Ruiz", "Necesito la factura de septiembre a nombre de mi representante.", n - 3 * HOUR),
        msg("mod", "Lucía Rojas", "Hola, Valeria. ¿Me indicas el nombre y la cédula o RIF de tu representante?", n - 2.5 * HOUR)] },
    { id: "TK-1036", created: n - 21 * HOUR, student: { email: ana, name: "Ana Torres" }, subject: "No puedo renovar mi plan", service: "Estacionamiento", status: "abierto", mod: carlos, prio: "media", actions: [],
      messages: [msg("student", "Ana Torres", "Intento renovar el plan mensual y el código de verificación nunca me llega.", n - 21 * HOUR)] },
    { id: "TK-1029", created: n - 30 * HOUR, student: { email: "mateo.silva@correo.unimet.edu.ve", name: "Mateo Silva" }, subject: "Problema de acceso", service: "Acceso", status: "resuelto", mod: lucia, prio: "media", actions: [], resolved: n - 26 * HOUR,
      messages: [msg("student", "Mateo Silva", "No puedo entrar a mi cuenta, dice que el carnet no existe.", n - 30 * HOUR),
        msg("mod", "Lucía Rojas", "Listo, Mateo: tu cuenta estaba registrada con un dígito de más. Ya lo corregimos.", n - 26 * HOUR)] },
    { id: "TK-1012", created: n - 12 * 24 * HOUR, student: { email: ana, name: "Ana Torres" }, subject: "Cancelación de cancha", service: "Canchas", status: "resuelto", mod: carlos, prio: "baja", resolved: n - 11 * 24 * HOUR,
      purchase: { item: "Cancha de tenis · 1 h", place: "Canchas · Polideportivo", num: "RS-261030-0207", amount: 12.6, method: "Visa ···· 4242" },
      actions: [{ type: "refund", amount: 12.6, by: "Carlos Gil", t: n - 11 * 24 * HOUR }],
      messages: [msg("student", "Ana Torres", "Llovió y cerraron las canchas. ¿Me pueden devolver el pago?", n - 12 * 24 * HOUR),
        msg("mod", "Carlos Gil", "Hecho, Ana: reembolsamos $12,60 a tu Visa. Llega en 3 a 5 días hábiles.", n - 11 * 24 * HOUR)] }
  ];
}
let tickets = null;
try { tickets = JSON.parse(localStorage.getItem("nexo-tickets") || "null"); } catch (err) {}
if (!Array.isArray(tickets)) { tickets = seedTickets(); try { localStorage.setItem("nexo-tickets", JSON.stringify(tickets)); } catch (err) {} }
if (sbShared()) tickets = []; // cuenta real: los tickets llegan de Supabase (sbSharedInit)
const saveTickets = () => { if (sbShared()) return sbSyncTickets(); try { localStorage.setItem("nexo-tickets", JSON.stringify(tickets)); } catch (err) {} };
/* Registro de auditoría (global): cambios de roles, asignaciones, respuestas y soluciones */
let audit = [];
try { audit = JSON.parse(localStorage.getItem("nexo-audit") || "[]") || []; } catch (err) {}
if (!audit.length) {
  const n = Date.now();
  audit = [
    { t: n - 9 * 24 * HOUR, who: "Diego Méndez", role: "creator", type: "rol", text: "Asignó a María Vera como administradora." },
    { t: n - 8 * 24 * HOUR, who: "María Vera", role: "admin", type: "rol", text: "Invitó a Lucía Rojas como moderadora." },
    { t: n - 8 * 24 * HOUR + HOUR, who: "María Vera", role: "admin", type: "rol", text: "Invitó a Carlos Gil como moderador." },
    { t: n - 11 * 24 * HOUR, who: "Carlos Gil", role: "mod", type: "reembolso", text: "Reembolsó $12,60 en TK-1012 (Ana Torres)." },
    { t: n - 26 * HOUR, who: "Lucía Rojas", role: "mod", type: "soporte", text: "Marcó TK-1029 como resuelto." }
  ];
  try { localStorage.setItem("nexo-audit", JSON.stringify(audit)); } catch (err) {}
}
function logAudit(type, text) {
  audit.push({ t: Date.now(), who: user.full, role: roleOf(account), type, text });
  try { localStorage.setItem("nexo-audit", JSON.stringify(audit)); } catch (err) {}
}
const tkById = id => tickets.find(t => t.id === id);
const nextTkId = () => sbShared() ? "TK-" + (Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 4)).toUpperCase() : "TK-" + (Math.max(1000, ...tickets.map(t => +t.id.slice(3) || 0)) + 1);
const isOpen = t => t.status !== "resuelto";
const mods = () => accounts.filter(a => a.role === "mod");
const lastActivity = t => Math.max(t.created, ...t.messages.map(m => m.t), ...(t.actions || []).map(a => a.t));

/* Movimiento en la Actividad del estudiante (sus datos se guardan por cuenta) */
function pushStudentMove(email, m) {
  // personal o comercio con cuenta real: el movimiento va a Supabase (push_move valida el permiso)
  if (sbShared()) { sb.rpc("push_move", { target: email, p_move: { id: "m" + Date.now(), ...m }, p_order: m.order || null }).then(({ error }) => { if (error) console.warn("Nexo: movimiento sin anotar", error.message); }); return; }
  if (/^[0-9a-f-]{36}$/.test(email)) return;
  const key = "nexo-moves:" + email;
  try { const list = JSON.parse(localStorage.getItem(key) || "[]") || []; list.push({ id: "m" + Date.now(), ...m }); localStorage.setItem(key, JSON.stringify(list)); } catch (err) {}
}

/* Conversación (compartida por moderación, administración y estudiante) */
function convHTML(t, viewer) {
  return `<div class="chat">` + t.messages.filter(m => viewer !== "student" || m.from !== "note").map(m => {
    if (m.from === "note") return `<div class="msg note"><div class="row"><b><i data-lucide="lock"></i> Nota interna · ${esc(m.name)}</b><span class="tiny">${hhmm(m.t)}</span></div><p>${esc(m.text)}</p></div>`;
    const mine = viewer === "student" ? m.from === "student" : m.from === "mod";
    const who = m.from === "student" ? (viewer === "student" ? "Tú" : `${esc(m.name)} · Estudiante`) : `${esc(m.name)} · ${m.role === "creator" ? "Creador" : "Moderación"}`;
    // burbuja de chat: lo propio a la derecha; cada quien con sus iniciales (estudiante gris, equipo con el color de su rol)
    return `<div class="msg-row${mine ? " mine" : ""}"><span class="avatar xs ${m.from === "student" ? "role-estudiante" : `role-${m.role === "creator" ? "creator" : "mod"}`}" aria-hidden="true">${esc(initialsOf(m.name || "?"))}</span>
      <div class="msg${m.from === "mod" ? " staff" : ""}${mine ? " mine" : ""}"><div class="row"><b>${who}</b><span class="tiny">${hhmm(m.t)}</span></div><p>${esc(m.text)}</p></div></div>`;
  }).join("") + `</div>` + (t.attach && viewer !== "student" ? `<div class="attach"><i data-lucide="file-text"></i><span class="grow">${esc(t.attach)}</span><button class="link" type="button" data-toast="La descarga no está disponible en el prototipo." aria-label="Descargar adjunto"><i data-lucide="download"></i></button></div>` : "");
}
const actionLabel = a => a.type === "refund" ? `Reembolso de ${money(a.amount)}` : `Compra cancelada (${money(a.amount)})`;
function purchaseCard(t) {
  if (!t.purchase) return `<div class="card"><h3 class="sec">Compra relacionada</h3><p class="small" style="font-size:13px">Este ticket no está asociado a una compra.</p></div>`;
  const p = t.purchase, done = (t.actions || []).length;
  return `<div class="card"><h3 class="sec">Compra relacionada</h3>
    <span class="pill ${done ? "neutral" : "ok"}">${done ? actionLabel(t.actions[0]) : "Pago completado"}</span>
    <div><b style="font-size:14px">${esc(p.item)}</b><p class="small">${esc(p.place)}</p></div>
    <div class="kv"><span>Compra</span><b>${esc(p.num)}</b></div><div class="kv"><span>Importe</span><b>${money(p.amount)}</b></div>
    <div class="kv"><span>Método</span><b>${esc(p.method)}</b></div><div class="kv"><span>Estudiante</span><b>${esc(t.student.name)}</b></div>
    ${t.note ? `<div class="sep"></div><p class="small">${esc(t.note)}</p>` : ""}</div>`;
}
function assignSelect(t, attrs = "") {
  return `<div class="input sel sm"><select data-assign="${t.id}" aria-label="Moderador de ${t.id}" ${attrs}><option value="">Sin asignar</option>${mods().filter(m => !m.disabled || m.email === t.mod).map(m => `<option value="${m.email}"${t.mod === m.email ? " selected" : ""}>${esc(m.full)}</option>`).join("")}</select><i data-lucide="chevron-down"></i></div>`;
}

/* ===== Administración ===== */
function inviteCard() {
  return `<form class="card" data-invite novalidate>
    <h3 class="sec">Asignar moderador</h3>
    <p class="small" style="font-size:12px">Invita a una persona para responder tickets y ofrecer soluciones.</p>
    <div class="field"><label>Correo institucional</label><div class="input"><input type="email" name="email" placeholder="nombre@unimet.edu.ve" autocomplete="off" aria-label="Correo institucional de la persona invitada"></div><p class="tiny" data-inv-hint hidden></p></div>
    <div class="row"><span style="font-size:12px">Rol de acceso</span><span class="pill ok">Moderador</span></div>
    <button class="btn" type="submit"><i data-lucide="user-plus"></i>Enviar invitación</button>
    <p class="tiny">La persona recibirá un enlace por correo (simulado): al crear su cuenta con ese correo, entra como moderador.</p>
  </form>`;
}
function teamRows() {
  return [...mods().map(m => ({ name: m.full, email: m.email, kind: m.disabled ? "off" : "on" })), ...invites.filter(i => i.role === "mod").map(i => ({ name: i.email, email: i.email, kind: "inv" }))];
}
function teamCard() {
  return `<div class="card"><h3 class="sec">Equipo de soporte</h3>${teamRows().map(r => {
    const n = tickets.filter(t => t.mod === r.email && isOpen(t)).length;
    return `<div><b style="font-size:13px">${esc(r.name)}</b><p class="small">${r.kind === "inv" ? "Invitación pendiente" : r.kind === "off" ? "Desactivado" : `${n} ${n === 1 ? "ticket" : "tickets"} · Disponible`}</p></div>`;
  }).join("") || `<p class="small">Aún no hay moderadores.</p>`}
  <button class="link b" type="button" data-go="equipo">Gestionar equipo →</button></div>`;
}
const ADMIN_NOTE = `<div class="notice"><i data-lucide="shield-check"></i><p>Tu acceso: asignar moderadores y consultar tickets. Las respuestas y soluciones las gestiona moderación.</p></div>`;
function filteredTickets() {
  const q = normTxt(document.getElementById("gsSearch").value.trim()), st = document.getElementById("gsState").value, sv = document.getElementById("gsService").value;
  return tickets.filter(t => (st === "all" || (st === "open" ? isOpen(t) : t.status === st)) && (sv === "all" || t.service === sv)
    && (!q || normTxt([t.id, t.subject, t.student.name, t.service, t.purchase ? t.purchase.num : ""].join(" ")).includes(q)))
    .sort((a, b) => (isOpen(b) - isOpen(a)) || (({ alta: 0, media: 1, baja: 2 })[a.prio] - ({ alta: 0, media: 1, baja: 2 })[b.prio]) || b.created - a.created);
}
function renderGestion() {
  const open = tickets.filter(isOpen), prio = open.filter(t => t.prio === "alta").length, unassigned = open.filter(t => !t.mod).length;
  const active = mods().filter(m => !m.disabled).length, team = teamRows().length;
  const firsts = tickets.map(t => { const r = t.messages.find(m => m.from === "mod"); return r ? r.t - t.created : null; }).filter(x => x !== null);
  const avg = firsts.length ? Math.round(firsts.reduce((a, b) => a + b, 0) / firsts.length / MIN) : null;
  const now = new Date();
  document.getElementById("gsUpdated").textContent = `Actualizado · ${now.getDate()} ${MES_CORTO[now.getMonth()]}, ${hhmm(now)}`;
  const kpi = (label, val, pill, cls, sub, go, ic) => `<button class="card kpi sk" type="button" ${go}><div class="row"><span class="row start" style="gap:10px">${skIc(ic)}<span class="small">${label}</span></span><i data-lucide="arrow-up-right"></i></div><b class="kv-big">${val}</b><div class="row start" style="gap:8px"><span class="pill ${cls}">${pill}</span><span class="tiny">${sub}</span></div></button>`;
  document.getElementById("gsKpis").innerHTML =
    kpi("Tickets abiertos", open.length, `${prio} ${prio === 1 ? "prioritario" : "prioritarios"}`, prio ? "bad" : "ok", unassigned ? `${unassigned} sin asignar` : "todos asignados", `data-gs-state="open"`, "inbox") +
    kpi("Moderadores activos", active, active ? "Equipo disponible" : "Sin equipo", active ? "ok" : "warn", `de ${team} ${team === 1 ? "integrante" : "integrantes"}`, `data-go="equipo"`, "users") +
    kpi("Tiempo de primera respuesta", avg === null ? "—" : avg < 60 ? `${avg} min` : `${(avg / 60).toFixed(1).replace(".", ",")} h`, "Promedio", "ok", `de ${firsts.length} tickets respondidos`, `data-gs-state="all"`, "timer");
  const svc = document.getElementById("gsService");
  if (svc.options.length === 1) svc.insertAdjacentHTML("beforeend", SERVICES.map(s => `<option>${s}</option>`).join(""));
  const list = filteredTickets();
  document.getElementById("gsTable").innerHTML = `<div class="tk-row tk-head"><span>Ticket</span><span>Estudiante / Motivo</span><span>Estado</span><span>Moderador</span><span>Prioridad</span></div>`
    + (list.map(t => `<div class="tk-row">
      <div class="row start" style="gap:8px;align-items:flex-start">${isOpen(t) ? `<input type="checkbox" class="vl-check" data-gs-sel="${t.id}" aria-label="Seleccionar ${t.id}" ${gsSel.has(t.id) ? "checked" : ""}>` : ""}<div><button class="link b" type="button" data-case="${t.id}">${t.id}</button><p class="tiny">${ago(t.created)}</p></div></div>
      <div class="tk-main row start" style="gap:10px;align-items:flex-start">${svcChip(t.service)}<div style="min-width:0"><button class="tk-subj" type="button" data-case="${t.id}">${esc(t.subject)}</button><p class="tiny">${esc(t.student.name)} · ${t.service}</p></div></div>
      <div>${stPill(t.status)}</div>
      <div>${isOpen(t) ? assignSelect(t) : `<span class="small">${esc(t.mod ? nameOf(t.mod) : "—")}</span>`}</div>
      <div><span class="prio ${t.prio}">${TK_PRIO[t.prio]}</span></div>
    </div>`).join("") || emptyState("inbox", "No hay tickets con esos filtros", "Prueba con otro estado o servicio."))
    + `<div class="tk-foot"><span class="small">${list.length} de ${tickets.length} tickets</span></div>`;
  renderGsBulk(list);
  document.getElementById("gsSide").innerHTML = inviteCard() + teamCard() + ADMIN_NOTE;
  icons();
}
function renderEquipo() {
  const rows = teamRows();
  document.getElementById("eqTable").innerHTML = `<div class="tk-row tk-head eq"><span>Persona</span><span>Abiertos</span><span>Resueltos</span><span>Estado</span><span></span></div>` + (rows.map(r => {
    const open = tickets.filter(t => t.mod === r.email && isOpen(t)).length, done = tickets.filter(t => t.mod === r.email && !isOpen(t)).length;
    const st = r.kind === "inv" ? (invExpired(invByEmail(r.email)) ? `<span class="pill bad">Invitación vencida</span>` : `<span class="pill warn">Invitación pendiente</span>`) : r.kind === "off" ? `<span class="pill neutral">Desactivado</span>` : `<span class="pill ok">Activo</span>`;
    const act = r.kind === "inv" ? `<div class="stack" style="gap:6px"><button class="link b" type="button" data-inv-copy="${r.email}">Copiar enlace</button><button class="link" type="button" data-inv-cancel="${r.email}">Cancelar invitación</button></div>`
      : r.kind === "off" ? `<button class="link b" type="button" data-mod-on="${r.email}">Reactivar</button>`
      : `<button class="link" type="button" style="color:var(--danger)" data-mod-off="${r.email}">Desactivar</button>`;
    return `<div class="tk-row eq"><div class="row start"><span class="avatar sm role-${r.role || "mod"}">${r.kind === "inv" ? `<i data-lucide="mail"></i>` : initialsOf(r.name)}</span><div style="min-width:0"><b style="font-size:13px">${esc(r.name)}</b><p class="tiny" title="${esc(r.email)}">${r.kind === "inv" ? `Invitado como moderador · ${invNote(invByEmail(r.email))}` : esc(r.email)}</p></div></div>
      <div><span class="tk-lbl">Abiertos</span>${r.kind === "inv" ? "—" : open}</div><div><span class="tk-lbl">Resueltos</span>${r.kind === "inv" ? "—" : done}${r.kind === "inv" ? "" : rateSummary(r.email)}</div><div>${st}</div><div>${act}</div></div>`;
  }).join("") || emptyState("users", "Aún no hay moderadores", "Invita al primero para que responda los tickets de los estudiantes."));
  document.getElementById("eqSide").innerHTML = inviteCard() + `<div class="notice"><i data-lucide="info"></i><p>Al desactivar a un moderador pierde el acceso a la moderación, pero puede seguir usando Nexo como usuario. Sus tickets abiertos quedan sin asignar para que los repartas.</p></div>`;
  icons();
}
let caseId = null;
function renderCaso() {
  const t = caseId && tkById(caseId);
  if (!t) { go("gestion"); return; }
  setFrame("caso", t.id, ["Gestión", "Administrador", "Tickets", t.id]);
  document.getElementById("csBody").innerHTML = `
    <div class="card">
      <div class="row" style="align-items:flex-start"><h1 class="h2" style="font-size:19px">${esc(t.subject)}</h1>${stPill(t.status)}</div>
      <p class="tiny">${t.id} · Creado el ${fullDate(t.created)} · ${esc(t.student.name)} · ${t.service}</p><div class="sep"></div>
      ${convHTML(t, "admin")}
      ${(t.actions || []).map(a => `<div class="notice"><i data-lucide="rotate-ccw"></i><p>${actionLabel(a)} · por ${esc(a.by)} · ${fullDate(a.t)}</p></div>`).join("")}
      <p class="tiny">Última actividad: ${ago(lastActivity(t)).toLowerCase()}</p>
    </div>
    <div class="stack">
      <div class="card"><h3 class="sec">Asignación</h3>
        <div class="kv"><span>Prioridad</span><span class="prio ${t.prio}">${TK_PRIO[t.prio]}</span></div>
        ${isOpen(t) ? `<div class="field"><label>Moderador</label>${assignSelect(t)}</div>` : `<div class="kv"><span>Resuelto por</span><b>${esc(t.mod ? nameOf(t.mod) : "—")}</b></div>`}
      </div>
      ${purchaseCard(t)}${ADMIN_NOTE}
    </div>`;
  icons();
}
/* Asignar en lote: casillas en los tickets abiertos + barra con el moderador */
const gsSel = new Set();
function renderGsBulk(list) {
  let bar = document.getElementById("gsBulk");
  if (!bar) { document.getElementById("gsTable").insertAdjacentHTML("beforebegin", `<div class="bulkbar" id="gsBulk" hidden></div>`); bar = document.getElementById("gsBulk"); }
  const open = list.filter(isOpen), ids = open.map(t => t.id);
  [...gsSel].forEach(id => { if (!ids.includes(id)) gsSel.delete(id); });
  bar.hidden = open.length < 2;
  const n = gsSel.size;
  bar.innerHTML = `<label class="remember" style="margin:0"><input type="checkbox" data-gs-all ${n && n === open.length ? "checked" : ""}>${n ? `${n} ticket${n === 1 ? "" : "s"} seleccionado${n === 1 ? "" : "s"}` : "Seleccionar todos"}</label>
    ${n ? `<div class="row start" style="gap:8px;flex-wrap:wrap"><div class="input sel sm"><select id="gsBulkMod" aria-label="Moderador para los tickets seleccionados">${mods().filter(m => !m.disabled).map(m => `<option value="${m.email}">${esc(m.full)}</option>`).join("")}<option value="">Sin asignar</option></select><i data-lucide="chevron-down"></i></div><button class="btn sm" type="button" data-gs-bulk>Asignar ${n}</button></div>` : `<span class="tiny">Marca varios tickets para asignarlos juntos.</span>`}`;
}
function assignTicket(id, email, quiet = false) {
  const t = tkById(id); if (!t) return;
  t.mod = email || null;
  if (email && t.status === "abierto" && t.messages.some(m => m.from === "mod")) t.status = "revision";
  saveTickets();
  logAudit("soporte", email ? `Asignó ${id} a ${nameOf(email)}.` : `Dejó ${id} sin asignar.`);
  if (quiet) return;
  toast(email ? `${id} asignado a ${nameOf(email)}.` : `${id} quedó sin asignar.`);
  if (current === "gestion") renderGestion(); else if (current === "caso") renderCaso(); else if (current === "creador-equipo") renderCreadorEquipo();
}
function sendInvite(form) {
  const input = form.querySelector("input[name=email]"), hint = form.querySelector("[data-inv-hint]"), field = input.closest(".field");
  const email = normEmail(input.value);
  const role = (form.querySelector("[name=role]:checked") || { value: "mod" }).value, rl = role === "admin" ? "administrador" : "moderador";
  const fail = msg => { field.classList.add("bad"); hint.hidden = false; hint.textContent = msg; input.focus(); };
  field.classList.remove("bad"); hint.hidden = true;
  if (!/^[^\s@]+@(correo\.)?unimet\.edu\.ve$/.test(email)) return fail("Usa un correo institucional, por ejemplo nombre@unimet.edu.ve.");
  const acc = accByEmail(email);
  if (acc && acc.role === "creator") return fail("Esa persona es el creador de Nexo.");
  if (acc && (acc.role === "mod" || acc.role === "admin")) return fail(acc.disabled ? "Esa persona ya es moderadora, pero está desactivada. Reactívala desde Moderadores." : "Esa persona ya forma parte del equipo de gestión.");
  if (invites.some(i => i.email === email)) return fail("Ya enviaste una invitación a ese correo.");
  if (acc) { acc.role = role; saveAccounts(); toast(`${acc.full} ya tenía cuenta: ahora es ${rl}.`); logAudit("rol", `Asignó a ${acc.full} como ${rl}.`); }
  else { invites.push(newInvite(email, role)); saveInvites(); toast(`Invitación enviada a ${email}. También puedes copiar el enlace desde el equipo.`); logAudit("rol", `Invitó a ${email} como ${rl}.`); }
  if (current === "equipo") renderEquipo(); else if (current === "creador-equipo") renderCreadorEquipo(); else renderGestion();
}

/* ===== Moderación ===== */
/* Moderación: bandeja con Mis tickets / Sin asignar / Todos los abiertos. Cualquier moderador puede responder
   cualquier ticket abierto; si no tiene responsable, al responder se le asigna. Notas internas solo para el equipo. */
let mdSel = null, mdConfirm = null, mdTab = "mine", mdQuery = "", mdSvc = "all", mdMode = "reply";
const myTickets = () => tickets.filter(t => t.mod === sessionEmail).sort((a, b) => (isOpen(b) - isOpen(a)) || b.created - a.created);
const PRIO_ORD = { alta: 0, media: 1, baja: 2 };
const MD_TEMPLATES = [
  ["saludo", "Saludo y revisión", "Hola, {nombre}. Ya estoy revisando tu caso y te escribo en cuanto tenga una respuesta."],
  ["datos", "Pedir datos", "Hola, {nombre}. Para ayudarte, ¿me confirmas el número de referencia y la fecha del pago?"],
  ["comprobante", "Pedir comprobante", "Hola, {nombre}. ¿Puedes enviarme una captura del comprobante de tu banco? Así lo valido más rápido."],
  ["reembolso", "Confirmar reembolso", "Listo, {nombre}: procesamos el reembolso a tu método de pago. Llega en 3 a 5 días hábiles."],
  ["cierre", "Cierre", "¿Hay algo más en lo que te pueda ayudar, {nombre}? Si no, cerraré este ticket."]
];
function mdQueue() {
  const q = normTxt(mdQuery.trim());
  return tickets.filter(t => (mdTab === "mine" ? t.mod === sessionEmail && isOpen(t) : mdTab === "unassigned" ? !t.mod && isOpen(t) : isOpen(t))
      && (mdSvc === "all" || t.service === mdSvc)
      && (!q || normTxt([t.id, t.subject, t.student.name, t.service, t.purchase ? t.purchase.num : ""].join(" ")).includes(q)))
    .sort((a, b) => PRIO_ORD[a.prio] - PRIO_ORD[b.prio] || lastActivity(b) - lastActivity(a));
}
const waitingReply = t => isOpen(t) && t.status !== "espera" && t.messages.length && t.messages.filter(m => m.from !== "note").slice(-1)[0].from === "student";
function renderModeracion() {
  const body = document.getElementById("mdBody"), open = tickets.filter(isOpen);
  const counts = { mine: open.filter(t => t.mod === sessionEmail).length, unassigned: open.filter(t => !t.mod).length, all: open.length };
  const list = mdQueue();
  if (!mdSel || !tkById(mdSel)) mdSel = (list[0] || {}).id || null;
  const t = mdSel && tkById(mdSel), prio = document.getElementById("mdPrio");
  document.getElementById("mdLead").textContent = t ? `${t.id} · ${t.mod === sessionEmail ? "Asignado a ti" : t.mod ? `Responsable: ${nameOf(t.mod)}` : "Sin asignar"}` : "Bandeja de soporte";
  prio.hidden = !t || !isOpen(t);
  if (t) { prio.className = "pill " + (t.prio === "alta" ? "bad" : t.prio === "media" ? "warn" : "neutral"); prio.textContent = "Prioridad " + TK_PRIO[t.prio].toLowerCase(); }
  const kpi = (n, l, tab) => `<button class="md-kpi${mdTab === tab ? " on" : ""}" type="button" data-md-tab="${tab}"><b>${n}</b><span>${l}</span></button>`;
  const svcOpts = ["all", ...SERVICES].map(sv => `<option value="${sv}"${mdSvc === sv ? " selected" : ""}>${sv === "all" ? "Todos los servicios" : sv}</option>`).join("");
  const queue = `<div class="stack s14 md-queue">
    <div class="md-kpis" role="tablist" aria-label="Bandejas">${kpi(counts.mine, "Mis tickets", "mine")}${kpi(counts.unassigned, "Sin asignar", "unassigned")}${kpi(counts.all, "Todos abiertos", "all")}</div>
    <div class="input"><i data-lucide="search"></i><input id="mdSearch" type="search" placeholder="Buscar ticket o estudiante" aria-label="Buscar tickets" value="${esc(mdQuery)}"></div>
    <div class="input sel sm"><select id="mdSvc" aria-label="Filtrar por servicio">${svcOpts}</select><i data-lucide="chevron-down"></i></div>
    ${list.map(x => `<button class="card tk-card ${svcTone(x.service)}${x.id === mdSel ? " sel" : ""}" type="button" data-md="${x.id}">
      <div class="row"><span class="tk-ref">${x.id}</span><span class="prio ${x.prio}">${TK_PRIO[x.prio]}</span></div>
      <b>${esc(x.subject)}</b><span class="small">${esc(x.student.name)} · ${x.service}</span>
      <div class="row start" style="gap:6px;flex-wrap:wrap">${stPill(x.status)}${waitingReply(x) ? `<span class="pill bad">Por responder</span>` : ""}<span class="tiny">${x.mod ? (x.mod === sessionEmail ? "Tuyo" : esc(firstName(nameOf(x.mod)))) : "Sin asignar"} · ${ago(lastActivity(x)).toLowerCase()}</span></div>
    </button>`).join("") || `<p class="small">${mdTab === "mine" ? "No tienes tickets abiertos. Mira los que están sin asignar." : "No hay tickets en esta bandeja."}</p>`}
    <div class="notice"><i data-lucide="shield-check"></i><p>Puedes responder cualquier ticket abierto, tomar los que no tengan responsable y ofrecer reembolsos o cancelaciones.</p></div></div>`;
  if (!t) { body.innerHTML = queue + `<div class="card" style="align-items:flex-start"><span class="ico lg"><i data-lucide="inbox"></i></span><h2 class="h2">Todo al día</h2><p class="small" style="font-size:13px">No hay tickets para atender en esta bandeja.</p></div>`; icons(); return; }
  const isOpenT = isOpen(t), p = t.purchase, acted = (t.actions || []).length, mineT = t.mod === sessionEmail;
  const confirmBox = mdConfirm ? `<div class="confirm"><p>${mdConfirm === "refund" ? `¿Reembolsar ${money(p.amount)} a ${esc(p.method)}?` : `¿Cancelar la compra ${esc(p.num)} y devolver ${money(p.amount)}?`} Avisaremos a ${esc(firstName(t.student.name))}.</p><div class="row"><button class="btn ghost" type="button" data-md-no>Volver</button><button class="btn" type="button" data-md-yes>Confirmar</button></div></div>` : "";
  const owner = !isOpenT ? "" : mineT ? `<div class="notice"><i data-lucide="user-check"></i><p>Este ticket es tuyo.</p></div>`
    : t.mod ? `<div class="notice warn"><i data-lucide="users"></i><p>El responsable es <strong>${esc(nameOf(t.mod))}</strong>. Puedes responder igual; tu mensaje sale a nombre del equipo de moderación. <button class="link b" type="button" data-md-take style="font-size:12px;color:inherit;text-decoration:underline">Tomar este ticket</button></p></div>`
    : `<div class="notice"><i data-lucide="inbox"></i><p>Este ticket no tiene responsable. Si respondes, te lo asignamos. <button class="link b" type="button" data-md-take style="font-size:12px">Tomarlo ahora</button></p></div>`;
  body.innerHTML = queue + `
    <div class="stack s14">
      <div class="card">
        <div class="row" style="align-items:flex-start"><h2 class="h2" style="font-size:19px">${esc(t.subject)}</h2>${stPill(t.status)}</div>
        <p class="tiny">${t.id} · ${esc(t.student.name)} · ${t.service} · Creado el ${fullDate(t.created)}</p>${owner}<div class="sep"></div>
        ${convHTML(t, "mod")}
        ${(t.actions || []).map(a => `<div class="notice"><i data-lucide="rotate-ccw"></i><p>${actionLabel(a)} · por ${esc(a.by)} · ${fullDate(a.t)}</p></div>`).join("")}
        <p class="tiny">Última actividad: ${ago(lastActivity(t)).toLowerCase()}</p>
      </div>
      ${isOpenT ? `<form class="card" id="mdReply">
        <div class="chips" role="radiogroup" aria-label="Tipo de mensaje"><button class="pill ${mdMode === "reply" ? "ok" : "neutral"}" type="button" role="radio" aria-checked="${mdMode === "reply"}" data-md-mode="reply">Responder a ${esc(firstName(t.student.name))}</button><button class="pill ${mdMode === "note" ? "warn" : "neutral"}" type="button" role="radio" aria-checked="${mdMode === "note"}" data-md-mode="note"><i data-lucide="lock"></i>&nbsp;Nota interna</button></div>
        ${mdMode === "reply" ? `<div class="input sel sm"><select id="mdTpl" aria-label="Respuesta rápida"><option value="">Respuestas rápidas…</option>${MD_TEMPLATES.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select><i data-lucide="chevron-down"></i></div>` : `<p class="tiny">Las notas internas solo las ve el equipo (moderación, administración y creador). El estudiante no las recibe.</p>`}
        <div class="input${mdMode === "note" ? " note-in" : ""}" style="padding:12px"><textarea id="mdText" rows="3" maxlength="600" placeholder="${mdMode === "reply" ? "Escribe tu respuesta…" : "Escribe una nota para el equipo…"}" aria-label="${mdMode === "reply" ? "Respuesta" : "Nota interna"}"></textarea></div>
        <div class="row"><button class="btn ghost" type="button" style="width:auto;padding:0 18px" data-toast="Adjuntar archivos no está disponible en el prototipo."><i data-lucide="paperclip"></i>Adjuntar</button><button class="btn" type="submit"><i data-lucide="${mdMode === "reply" ? "send" : "sticky-note"}"></i>${mdMode === "reply" ? "Enviar respuesta" : "Guardar nota"}</button></div></form>` : ""}
    </div>
    <div class="stack s14">
      <div class="card"><h3 class="sec">Detalles</h3>
        <div class="kv"><span>Estado</span>${stPill(t.status)}</div>
        <div class="kv"><span>Responsable</span><b>${t.mod ? esc(mineT ? "Tú" : nameOf(t.mod)) : "Sin asignar"}</b></div>
        ${isOpenT ? `<div class="field"><label for="mdPrioSel">Prioridad</label><div class="input sel sm"><select id="mdPrioSel">${["alta", "media", "baja"].map(pr => `<option value="${pr}"${t.prio === pr ? " selected" : ""}>${TK_PRIO[pr]}</option>`).join("")}</select><i data-lucide="chevron-down"></i></div></div>` : `<div class="kv"><span>Prioridad</span><b>${TK_PRIO[t.prio]}</b></div>`}
        ${isOpenT && !mineT ? `<button class="btn ghost" type="button" data-md-take><i data-lucide="user-plus"></i>Tomar este ticket</button>` : ""}
        ${isOpenT && mineT ? `<button class="link" type="button" data-md-release style="font-size:12px">Liberar ticket (dejarlo sin asignar)</button>` : ""}
      </div>
      ${purchaseCard(t)}
      ${isOpenT && p && !acted ? `<div class="card"><h3 class="sec">Ofrecer una solución</h3><p class="small" style="font-size:12px">Selecciona una acción y confírmala con ${esc(firstName(t.student.name))} antes de ejecutarla.</p>
        ${confirmBox || `<button class="btn" type="button" data-md-act="refund"><i data-lucide="rotate-ccw"></i>Reembolsar ${money(p.amount)}</button><button class="btn ghost" type="button" data-md-act="cancel"><i data-lucide="circle-x"></i>Cancelar compra</button>`}
        <p class="tiny">Reembolso al medio original en 3–5 días hábiles. Toda acción queda registrada.</p></div>` : ""}
      ${isOpenT ? `${t.status !== "espera" ? `<button class="btn ghost" type="button" data-md-wait><i data-lucide="hourglass"></i>Esperar respuesta del estudiante</button>` : ""}<button class="btn ghost" type="button" data-md-resolve><i data-lucide="check"></i>Marcar como resuelto</button>` : `<button class="btn ghost" type="button" data-md-reopen><i data-lucide="rotate-ccw"></i>Reabrir caso</button>`}
    </div>`;
  icons();
}
function mdTake(t, silent) {
  const prev = t.mod; t.mod = sessionEmail; if (t.status === "abierto" && t.messages.some(m => m.from === "mod")) t.status = "revision";
  saveTickets(); logAudit("soporte", prev ? `Tomó ${t.id} (antes: ${nameOf(prev)}).` : `Tomó ${t.id}.`);
  if (!silent) toast(`${t.id} ahora es tuyo.`);
}
function modAction(type) { ticketAction(tkById(mdSel), type); mdConfirm = null; renderModeracion(); }
function ticketAction(t, type) {
  const p = t.purchase, now = Date.now(), me = user.full;
  t.actions = [...(t.actions || []), { type, amount: p.amount, by: me, t: now }];
  t.messages.push({ from: "mod", name: me, t: now, role: roleOf(account), text: type === "refund"
    ? `Confirmamos el cargo duplicado. Reembolsamos ${money(p.amount)} a tu ${p.method}; llega en 3 a 5 días hábiles.`
    : `Cancelamos tu compra ${p.num} y devolvimos ${money(p.amount)} a tu ${p.method}.` });
  if (t.status === "abierto") t.status = "revision";
  saveTickets();
  pushStudentMove(t.student.email, { title: type === "refund" ? `Reembolso · ${t.id}` : `Compra cancelada · ${t.id}`, detail: p.place, amount: "+" + money(p.amount), pill: "Reembolsado", pillCls: "ok", date: fmtD(new Date(now)), icon: "rotate-ccw", go: "soporte", goLabel: "Ver solicitud →" });
  logAudit("reembolso", type === "refund" ? `Reembolsó ${money(p.amount)} en ${t.id} (${t.student.name}).` : `Canceló la compra ${p.num} en ${t.id} (${t.student.name}).`);
  toast(type === "refund" ? `Reembolso de ${money(p.amount)} registrado.` : "Compra cancelada y reembolsada.");
}
function ticketReply(t, txt) {
  t.messages.push({ from: "mod", name: user.full, text: txt, t: Date.now(), role: roleOf(account) });
  if (t.status === "abierto" || t.status === "espera") t.status = "revision";
  saveTickets(); logAudit("soporte", `Respondió en ${t.id}.`);
  toast(`Respuesta enviada a ${firstName(t.student.name)}.`);
}
function ticketResolve(t, done) {
  if (done) { t.status = "resuelto"; t.resolved = Date.now(); } else { t.status = "revision"; delete t.resolved; }
  saveTickets(); logAudit("soporte", done ? `Marcó ${t.id} como resuelto.` : `Reabrió ${t.id}.`);
  toast(done ? `${t.id} marcado como resuelto.` : `${t.id} reabierto.`);
}
function renderResueltos() {
  const done = myTickets().filter(t => !isOpen(t));
  document.getElementById("rsTable").innerHTML = `<div class="tk-row tk-head rs"><span>Ticket</span><span>Estudiante / Motivo</span><span>Solución</span><span>Resuelto</span><span></span></div>` + (done.map(t => `<div class="tk-row rs">
    <div><span class="tk-ref">${t.id}</span></div>
    <div class="tk-main"><b style="font-size:12px">${esc(t.subject)}</b><p class="tiny">${esc(t.student.name)} · ${t.service}</p></div>
    <div><span class="small">${(t.actions || []).length ? t.actions.map(actionLabel).join(", ") : "Respuesta"}</span></div>
    <div><span class="tiny">${t.resolved ? ago(t.resolved) : "—"}</span></div>
    <div><button class="link b" type="button" data-md-open="${t.id}">Ver caso</button></div></div>`).join("") || emptyState("check-check", "Aún no has resuelto tickets", "Los que resuelvas aparecerán aquí.", `<button class="btn ghost sm" type="button" data-go="moderacion">Ir a mis tickets</button>`));
  icons();
}

/* ===== Estudiante: Mis solicitudes ===== */
let supFilter = "all", supOpen = null;
function renderSoporte() {
  const mine = tickets.filter(t => t.student.email === sessionEmail).sort((a, b) => lastActivity(b) - lastActivity(a));
  const nOpen = mine.filter(isOpen).length;
  const chips = [["all", `Todas · ${mine.length}`], ["open", `Abiertas · ${nOpen}`], ["done", `Resueltas · ${mine.length - nOpen}`]];
  document.getElementById("supChips").innerHTML = mine.length ? chips.map(([k, l]) => `<button class="pill ${k === supFilter ? "ok" : "neutral"}" type="button" data-sup-f="${k}">${l}</button>`).join("") : "";
  const list = mine.filter(t => supFilter === "all" || (supFilter === "open" ? isOpen(t) : !isOpen(t)));
  document.getElementById("supList").innerHTML = !mine.length
    ? `<div class="card" style="align-items:flex-start"><span class="ico lg"><i data-lucide="inbox"></i></span><b class="h3">Aún no tienes solicitudes</b><p class="small" style="font-size:13px">Si algo sale mal con un pago, una reserva o tu acceso, crea una solicitud y te ayudamos.</p></div>`
    : list.map(t => {
      const last = [...t.messages].reverse().find(m => m.from === "mod");
      const expanded = supOpen === t.id;
      const step = t.status === "resuelto" ? 2 : t.status === "abierto" && !t.mod ? 0 : 1;
      return `<div class="card sup-card ${svcTone(t.service)}">
        <div class="row" style="align-items:flex-start"><div class="row start" style="gap:12px;align-items:flex-start">${svcChip(t.service)}<div><b>${esc(t.subject)}</b><p class="tiny">${t.id} · ${t.service}${t.purchase ? " · Compra " + esc(t.purchase.num) : ""} · ${ago(t.created)}</p></div></div>${stPill(t.status)}</div>
        <ol class="sup-steps" aria-label="Avance de la solicitud">${["Recibida", t.status === "espera" ? "Esperando tu respuesta" : "En revisión", "Resuelta"].map((x, i) => `<li class="${i < step ? "done" : i === step ? "now" : ""}"${i === step ? ' aria-current="step"' : ""}><span class="st-dot">${i < step ? '<i data-lucide="check"></i>' : ""}</span>${x}</li>`).join("")}</ol>
        <p style="font-size:12px">${last ? `<b>${esc(firstName(last.name))}:</b> ${esc(last.text)}` : t.mod ? `${esc(firstName(nameOf(t.mod)))} está revisando tu solicitud.` : "Recibimos tu solicitud. Te responderemos pronto."}</p>
        ${(t.actions || []).map(a => `<span class="pill ok">${actionLabel(a)}</span>`).join("")}
        ${rateHTML(t)}
        <button class="link b" type="button" style="font-size:12px" data-sup-open="${t.id}">${expanded ? "Ocultar conversación" : "Ver conversación →"}</button>
        ${expanded ? `<div class="sep"></div>${convHTML(t, "student")}${isOpen(t) ? `<form class="stack s14" data-sup-reply="${t.id}"><div class="input" style="padding:12px"><textarea rows="2" maxlength="600" placeholder="Escribe tu respuesta…" aria-label="Tu respuesta"></textarea></div><button class="btn" type="submit"><i data-lucide="send"></i>Enviar</button></form>` : `<p class="tiny">Esta solicitud está resuelta. Si el problema sigue, crea una nueva.</p>`}` : ""}
      </div>`;
    }).join("") || emptyState("inbox", supFilter === "open" ? "No tienes solicitudes abiertas" : "No tienes solicitudes resueltas", "", `<button class="btn ghost sm" type="button" data-sup-f="all">Ver todas</button>`);
  icons();
}
function openSupForm(show) {
  const f = document.getElementById("supForm");
  f.hidden = !show;
  if (show) {
    const buys = orders.slice().reverse();
    document.getElementById("sp-buy").innerHTML = `<option value="">Ninguna</option>` + buys.map(o => `<option value="${o.id}">${esc(localById(o.local).name)} · ${o.num} · ${money(o.total)}</option>`).join("");
    document.getElementById("sp-buy-f").hidden = !buys.length;
    f.scrollIntoView({ block: "nearest" }); document.getElementById("sp-subj").focus();
  }
}

/* Eventos */
document.addEventListener("click", e => {
  const c = e.target.closest("[data-case]"); if (c) { caseId = c.dataset.case; go("caso"); return; }
  const gs = e.target.closest("[data-gs-state]"); if (gs) { document.getElementById("gsState").value = gs.dataset.gsState; renderGestion(); return; }
  const off = e.target.closest("[data-mod-off]");
  if (off) {
    const a = accByEmail(off.dataset.modOff); a.disabled = true; saveAccounts();
    const freed = tickets.filter(t => t.mod === a.email && isOpen(t)); freed.forEach(t => { t.mod = null; }); saveTickets();
    logAudit("rol", `Desactivó a ${a.full}.`);
    toast(`${a.full} ya no tiene acceso de gestión; puede seguir usando Nexo como usuario${freed.length ? `. ${freed.length} ${freed.length === 1 ? "ticket quedó" : "tickets quedaron"} sin asignar` : ""}.`); current === "creador-equipo" ? renderCreadorEquipo() : renderEquipo(); return;
  }
  const on = e.target.closest("[data-mod-on]"); if (on) { const a = accByEmail(on.dataset.modOn); delete a.disabled; saveAccounts(); logAudit("rol", `Reactivó a ${a.full}.`); toast(`${a.full} recuperó su acceso de ${ROLE_LABEL[a.role].toLowerCase()}.`); current === "creador-equipo" ? renderCreadorEquipo() : renderEquipo(); return; }
  const ic = e.target.closest("[data-inv-cancel]"); if (ic) { invites = invites.filter(i => i.email !== ic.dataset.invCancel); saveInvites(); logAudit("rol", `Canceló la invitación de ${ic.dataset.invCancel}.`); toast("Invitación cancelada."); current === "creador-equipo" ? renderCreadorEquipo() : renderEquipo(); return; }
  const md = e.target.closest("[data-md]"); if (md) { mdSel = md.dataset.md; mdConfirm = null; mdMode = "reply"; renderModeracion(); if (innerWidth < 1100) document.querySelector("#mdBody > .stack:nth-child(2)")?.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0); return; }
  const mt = e.target.closest("[data-md-tab]"); if (mt) { mdTab = mt.dataset.mdTab; mdSel = null; renderModeracion(); return; }
  const mm = e.target.closest("[data-md-mode]"); if (mm) { const txt = document.getElementById("mdText")?.value || ""; mdMode = mm.dataset.mdMode; renderModeracion(); const ta = document.getElementById("mdText"); ta.value = txt; ta.focus(); return; }
  if (e.target.closest("[data-md-take]")) { mdTake(tkById(mdSel)); renderModeracion(); return; }
  if (e.target.closest("[data-md-release]")) { const t = tkById(mdSel); t.mod = null; saveTickets(); logAudit("soporte", `Liberó ${t.id}.`); toast(`${t.id} quedó sin asignar.`); renderModeracion(); return; }
  if (e.target.closest("[data-md-wait]")) { const t = tkById(mdSel); t.status = "espera"; saveTickets(); logAudit("soporte", `Puso ${t.id} en espera de respuesta del estudiante.`); toast(`${t.id} queda en espera hasta que ${firstName(t.student.name)} responda.`); renderModeracion(); return; }
  const mo = e.target.closest("[data-md-open]"); if (mo) { mdSel = mo.dataset.mdOpen; mdConfirm = null; go("moderacion"); return; }
  const ma = e.target.closest("[data-md-act]"); if (ma) { mdConfirm = ma.dataset.mdAct; renderModeracion(); return; }
  if (e.target.closest("[data-md-no]")) { mdConfirm = null; renderModeracion(); return; }
  if (e.target.closest("[data-md-yes]")) { modAction(mdConfirm); return; }
  if (e.target.closest("[data-md-resolve]")) { ticketResolve(tkById(mdSel), true); renderModeracion(); return; }
  if (e.target.closest("[data-md-reopen]")) { ticketResolve(tkById(mdSel), false); renderModeracion(); return; }
  const sf = e.target.closest("[data-sup-f]"); if (sf) { supFilter = sf.dataset.supF; renderSoporte(); return; }
  const so = e.target.closest("[data-sup-open]"); if (so) { supOpen = supOpen === so.dataset.supOpen ? null : so.dataset.supOpen; renderSoporte(); return; }
  if (e.target.closest("#supNew")) { openSupForm(true); return; }
  if (e.target.closest("#supCancel")) { document.getElementById("supForm").reset(); openSupForm(false); return; }
  if (e.target.closest("#gsExport")) {
    const rows = [["Ticket", "Creado", "Estudiante", "Servicio", "Motivo", "Estado", "Moderador", "Prioridad"], ...filteredTickets().map(t => [t.id, fullDate(t.created), t.student.name, t.service, t.subject, TK_STATE[t.status][0], t.mod ? nameOf(t.mod) : "Sin asignar", TK_PRIO[t.prio]])];
    const csv = "﻿" + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "tickets-nexo.csv"; a.click(); toast("Descargamos el listado en CSV."); } catch (err) { toast("No se pudo descargar el listado."); }
  }
});
document.addEventListener("click", e => {
  if (!e.target.closest("[data-gs-bulk]")) return;
  const email = document.getElementById("gsBulkMod").value, ids = [...gsSel];
  ids.forEach(id => assignTicket(id, email, true)); gsSel.clear();
  toast(email ? `Asignamos ${ids.length} tickets a ${nameOf(email)}.` : `${ids.length} tickets quedaron sin asignar.`);
  renderGestion();
});
document.addEventListener("change", e => {
  const a = e.target.closest("[data-assign]"); if (a) { assignTicket(a.dataset.assign, a.value); return; }
  const gs = e.target.closest("[data-gs-sel]"); if (gs) { gs.checked ? gsSel.add(gs.dataset.gsSel) : gsSel.delete(gs.dataset.gsSel); renderGsBulk(filteredTickets()); icons(); return; }
  const ga = e.target.closest("[data-gs-all]"); if (ga) { filteredTickets().filter(isOpen).forEach(t => ga.checked ? gsSel.add(t.id) : gsSel.delete(t.id)); renderGestion(); return; }
  if (e.target.id === "gsState" || e.target.id === "gsService") renderGestion();
});
document.getElementById("gsSearch").addEventListener("input", renderGestion);
document.addEventListener("input", e => { if (e.target.id === "mdSearch") { mdQuery = e.target.value; mdSel = null; renderModeracion(); const s = document.getElementById("mdSearch"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); } });
document.addEventListener("change", e => {
  if (e.target.id === "mdSvc") { mdSvc = e.target.value; mdSel = null; renderModeracion(); return; }
  if (e.target.id === "mdTpl" && e.target.value) { const t = tkById(mdSel), tpl = MD_TEMPLATES.find(x => x[0] === e.target.value); const ta = document.getElementById("mdText"); ta.value = tpl[2].replace("{nombre}", firstName(t.student.name)); ta.focus(); e.target.value = ""; return; }
  if (e.target.id === "mdPrioSel") { const t = tkById(mdSel); t.prio = e.target.value; saveTickets(); logAudit("soporte", `Cambió la prioridad de ${t.id} a ${TK_PRIO[t.prio].toLowerCase()}.`); toast(`Prioridad de ${t.id}: ${TK_PRIO[t.prio].toLowerCase()}.`); renderModeracion(); }
});
document.addEventListener("submit", e => {
  const f = e.target;
  if (f.matches("[data-invite]")) { e.preventDefault(); sendInvite(f); return; }
  if (f.id === "mdReply") {
    e.preventDefault();
    const txt = document.getElementById("mdText").value.trim();
    if (!txt) { document.getElementById("mdText").focus(); toast("Escribe una respuesta antes de enviarla."); return; }
    const t = tkById(mdSel);
    if (mdMode === "note") { t.messages.push({ from: "note", name: user.full, text: txt, t: Date.now(), role: roleOf(account) }); saveTickets(); logAudit("soporte", `Agregó una nota interna en ${t.id}.`); toast("Guardamos la nota interna."); renderModeracion(); return; }
    const auto = !t.mod; if (auto) mdTake(t, true);
    ticketReply(t, txt); if (auto) toast(`Respuesta enviada a ${firstName(t.student.name)}. Te asignamos ${t.id}.`);
    renderModeracion(); return;
  }
  if (f.matches("[data-sup-reply]")) {
    e.preventDefault();
    const ta = f.querySelector("textarea"), txt = ta.value.trim();
    if (!txt) { ta.focus(); return; }
    const t = tkById(f.dataset.supReply); t.messages.push({ from: "student", name: user.full, text: txt, t: Date.now() });
    if (t.status === "espera") t.status = "revision";
    saveTickets(); toast("Enviamos tu mensaje."); renderSoporte(); return;
  }
  if (f.id === "supForm") {
    e.preventDefault();
    const subj = document.getElementById("sp-subj"), msg = document.getElementById("sp-msg");
    if (!subj.value.trim()) { subj.focus(); toast("Escribe un asunto."); return; }
    if (msg.value.trim().length < 10) { msg.focus(); toast("Cuéntanos un poco más del problema."); return; }
    const o = orders.find(x => x.id === document.getElementById("sp-buy").value);
    const now = Date.now(), svc = document.getElementById("sp-svc").value;
    const t = { id: nextTkId(), created: now, student: { email: sessionEmail, name: user.full }, subject: subj.value.trim(), service: svc, status: "abierto", mod: null,
      prio: o ? "alta" : "media", actions: [], messages: [{ from: "student", name: user.full, text: msg.value.trim(), t: now }] };
    if (o) { const l = localById(o.local); t.purchase = { item: o.lines.length === 1 ? o.lines[0].name : `${o.lines.length} productos`, place: `${l.name} · ${l.place}`, num: o.num, amount: o.total, method: o.card || "Transferencia" }; }
    tickets.push(t); saveTickets();
    f.reset(); openSupForm(false); supFilter = "all"; supOpen = t.id;
    toast(`Creamos la solicitud ${t.id}. Te responderemos en menos de 24 horas hábiles.`);
    renderSoporte();
  }
});

/* ---------- Creador: métricas de la plataforma, equipo, soporte total, movimientos y configuración ---------- */
const int0 = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const money0 = n => (n < 0 ? "−$" : "$") + int0(Math.abs(n));
const pctTxt = (x, d = 1) => (x * 100).toFixed(d).replace(".", ",") + " %";
const signPct = x => (x >= 0 ? "+" : "−") + pctTxt(Math.abs(x));
const SVC4 = ["Comida", "Estacionamiento", "Materias", "Canchas"];
const SVC_LABEL = { Comida: "Comida y kioscos", Estacionamiento: "Estacionamiento", Materias: "Materias", Canchas: "Canchas" };
// Datos de ejemplo por mes (volumen en USD y cantidad de compras por servicio); los ingresos salen de las comisiones de Configuración
const PERIODS_DEMO = {
  "2026-08": { label: "01 – 31 ago 2026", name: "Agosto", mau: 6900, users: 10830, newUsers: 780, vol: { Comida: 66000, Estacionamiento: 47000, Materias: 92000, Canchas: 22000 }, buys: { Comida: 6795, Estacionamiento: 4530, Materias: 2265, Canchas: 1510 }, w: [60, 80, 75, 98, 110, 128, 140, 150], days: [1, 5, 9, 13, 17, 21, 25, 31], mon: "ago" },
  "2026-09": { label: "01 – 30 sep 2026", name: "Septiembre", prev: "2026-08", mau: 7331, users: 11670, newUsers: 840, vol: { Comida: 70980, Estacionamiento: 50300, Materias: 98900, Canchas: 23600 }, buys: { Comida: 7590, Estacionamiento: 5060, Materias: 2530, Canchas: 1688 }, w: [70, 89, 83, 112, 128, 150, 164, 178], days: [1, 5, 9, 13, 17, 21, 25, 30], mon: "sep" },
  "2026-10": { label: "01 – 31 oct 2026", name: "Octubre", prev: "2026-09", mau: 8240, users: 12580, newUsers: 910, vol: { Comida: 85920, Estacionamiento: 57280, Materias: 114560, Canchas: 28640 }, buys: { Comida: 8289, Estacionamiento: 5526, Materias: 2763, Canchas: 1842 }, w: [86, 108, 101, 132, 156, 179, 195, 224], days: [1, 5, 9, 13, 17, 21, 25, 31], mon: "oct" },
  "2026-11": { label: "01 – 11 nov 2026 · parcial", name: "Noviembre", prev: "2026-10", partial: 11 / 31, mau: 7960, users: 12840, newUsers: 260, vol: { Comida: 32800, Estacionamiento: 21900, Materias: 41200, Canchas: 10300 }, buys: { Comida: 3141, Estacionamiento: 2094, Materias: 1047, Canchas: 698 }, w: [190, 205, 214], days: [1, 5, 9], mon: "nov" }
};
let PERIODS = PERIODS_DEMO, crReal = false;
const MES_NOMBRE = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
/* Resumen real del creador: con cuenta real de creador/admin/dueño los meses se arman con los pagos de Supabase
   (sbMoves). Volumen y compras = pagos confirmados de comida, estacionamiento, materias y canchas (las recargas
   no son compras); "personas que pagaron" = cuentas distintas con algún pago en el mes. El mes en curso se compara
   con el mismo tramo de días del mes anterior, contado de verdad (no estimado). */
function realPeriods(rows) {
  const now = new Date(), out = {}, key = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  const month = (y, m, capDay) => {
    const dim = new Date(y, m + 1, 0).getDate(), last = Math.min(capDay || dim, dim);
    const days = [1, 5, 9, 13, 17, 21, 25, 29].filter(d => d <= last);
    const p = { y, m, name: MES_NOMBRE[m], mon: MES_CORTO[m], days, mau: 0, vol: { Comida: 0, Estacionamiento: 0, Materias: 0, Canchas: 0 }, buys: { Comida: 0, Estacionamiento: 0, Materias: 0, Canchas: 0 }, w: days.map(() => 0), real: true,
      label: capDay && capDay < dim ? `01 – ${pad2(last)} ${MES_CORTO[m]} ${y} · parcial` : `01 – ${pad2(dim)} ${MES_CORTO[m]} ${y}` };
    const payers = new Set();
    rows.forEach(r => {
      const d = new Date(r.t); if (d.getFullYear() !== y || d.getMonth() !== m || d.getDate() > last) return;
      if (r.status !== "Reembolsado" && r.status !== "Rechazado") payers.add(r.uid);
      const svc = PAY_SVC[r.service]; if (!svc || r.fee === null) return;
      p.vol[svc] += r.amount; p.buys[svc] += 1;
      let i = days.length - 1; while (i > 0 && d.getDate() < days[i]) i--;
      p.w[i] += r.amount * (rates[svc] || 0) / 100;
    });
    p.mau = payers.size;
    return p;
  };
  for (let back = 0; back < 3; back++) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1), pd = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const cap = back === 0 ? now.getDate() : null, k = key(d);
    out[k] = month(d.getFullYear(), d.getMonth(), cap);
    out[k + "~prev"] = month(pd.getFullYear(), pd.getMonth(), cap);
    out[k].prev = k + "~prev"; if (cap) out[k].partial = 1;
  }
  return out;
}
const RATES0 = { Comida: 6, Estacionamiento: 4, Materias: 2.25, Canchas: 5 };
let rates = { ...RATES0 };
try { const c = JSON.parse(localStorage.getItem("nexo-config") || "null"); if (c && c.rates) rates = { ...RATES0, ...c.rates }; } catch (err) {}
const saveConfig = () => { try { localStorage.setItem("nexo-config", JSON.stringify({ rates })); } catch (err) {} };
const sumObj = o => Object.values(o).reduce((a, b) => a + b, 0);
const revenueOf = p => SVC4.reduce((a, s) => a + p.vol[s] * rates[s] / 100, 0);
function periodStats(id) {
  const p = PERIODS[id];
  return { p, mau: p.mau, buys: sumObj(p.buys), vol: sumObj(p.vol), rev: revenueOf(p) };
}
function firstResponseMin() {
  const f = tickets.map(t => { const r = t.messages.find(m => m.from === "mod"); return r ? r.t - t.created : null; }).filter(x => x !== null);
  return f.length ? Math.round(f.reduce((a, b) => a + b, 0) / f.length / MIN) : null;
}
const durTxt = m => m === null ? "—" : m < 60 ? `${m} min` : `${(m / 60).toFixed(1).replace(".", ",")} h`;

/* Resumen */
let crPeriod = "2026-10", crTable = false;
function renderCreador() {
  const sel = document.getElementById("crPeriod");
  const real = sbMovesOn();
  if (real && !sbMoves) {
    // con cuenta real nunca se muestran números de ejemplo: se espera a los pagos reales
    sbLoadMoves();
    document.getElementById("crKpis").innerHTML = `<p class="small">Cargando los datos reales…</p>`;
    document.getElementById("crCompare").textContent = "Datos reales";
    ["crChart", "crMix"].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ""; });
    return;
  }
  if (real) {
    PERIODS = realPeriods(sbMoves);
    if (!crReal) { crPeriod = Object.keys(PERIODS)[0]; sel.innerHTML = ""; }
    crReal = true;
  } else if (crReal) { PERIODS = PERIODS_DEMO; crPeriod = "2026-10"; sel.innerHTML = ""; crReal = false; }
  if (!sel.options.length) sel.innerHTML = Object.keys(PERIODS).filter(k => PERIODS[k].prev).map(k => `<option value="${k}">${PERIODS[k].label}</option>`).join("");
  if (!PERIODS[crPeriod]) crPeriod = Object.keys(PERIODS)[0];
  sel.value = crPeriod;
  const cur = periodStats(crPeriod), p = cur.p, prevS = periodStats(p.prev), k = p.real ? 1 : p.partial || 1, fm = p.real ? money : money0;
  const prev = { mau: prevS.mau, buys: prevS.buys * k, vol: prevS.vol * k, rev: prevS.rev * k };
  const vsTxt = p.partial ? `vs. mismo tramo de ${PERIODS[p.prev].mon}` : `vs. ${PERIODS[p.prev].mon}`;
  document.getElementById("crCompare").textContent = (p.real ? "Datos reales · " : "") + (p.real ? (p.partial ? `comparado con el 1 al ${new Date().getDate()} de ${PERIODS[p.prev].mon}` : `comparado con ${PERIODS[p.prev].name.toLowerCase()} de ${PERIODS[p.prev].y}`) : p.partial ? `Comparado con el 1 al 11 de ${PERIODS[p.prev].mon}` : `Comparado con ${PERIODS[p.prev].name.toLowerCase()} de 2026`);
  const kpi = (label, val, ch, ic) => `<div class="card kpi static sk"><div class="row"><span class="row start" style="gap:10px">${skIc(ic)}<span class="small">${label}</span></span></div><b class="kv-big">${val}</b><div class="row start" style="gap:8px">${isFinite(ch) ? `<span class="pill ${ch >= 0 ? "ok" : "bad"}">${signPct(ch)}</span>` : `<span class="pill neutral">${ch > 0 ? "Nuevo" : "Sin datos"}</span>`}<span class="tiny">${vsTxt}</span></div></div>`;
  document.getElementById("crKpis").innerHTML =
    kpi(p.real ? "Personas que pagaron" : "Usuarios activos mensuales", int0(cur.mau), cur.mau / prev.mau - 1, "users") +
    kpi("Compras completadas", int0(cur.buys), cur.buys / prev.buys - 1, "shopping-bag") +
    kpi("Volumen de compras", fm(cur.vol), cur.vol / prev.vol - 1, "banknote") +
    kpi("Ingresos de Nexo", fm(cur.rev), cur.rev / prev.rev - 1, "trending-up");
  // Gráfico: ingresos por intervalo, período actual vs. anterior
  const n = p.w.length, sw = sumObj(p.w) || 1, pw = PERIODS[p.prev].w.slice(0, n), spw = sumObj(PERIODS[p.prev].w) || 1;
  const curV = p.w.map(x => cur.rev * x / sw), prevV = pw.map(x => prevS.rev * x / spw);
  const max = Math.max(...curV, ...prevV), step = p.real ? [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find(x => x * 2 >= max) || 10000 : max > 1500 ? 1000 : 500, top = Math.max(step, Math.ceil(max / step) * step);
  const lbl = i => `${String(p.days[i]).padStart(2, "0")} ${p.mon}`, plbl = i => `${String(PERIODS[p.prev].days[i]).padStart(2, "0")} ${PERIODS[p.prev].mon}`;
  const kTxt = v => v === 0 ? "$0" : p.real && top < 2000 ? `$${int0(v)}` : `$${String(v / 1000).replace(".", ",")} mil`;
  document.getElementById("crChart").innerHTML = `
    <div class="row"><h2 class="sec">Ingresos por comisiones</h2><span class="pill neutral">USD</span></div>
    <p class="small" style="font-size:12px">Ingresos brutos de la app · Por intervalo de 4 días</p>
    <div class="row" style="flex-wrap:wrap"><div class="chips legend"><span class="pill ok"><i class="sw cur"></i>${p.name} · ${fm(cur.rev)}</span><span class="pill neutral"><i class="sw prev"></i>${PERIODS[p.prev].name}${p.partial ? " (mismo tramo)" : ""} · ${fm(sumObj(prevV))}</span></div>
      <button class="link b" type="button" data-cr-table>${crTable ? "Ver gráfico" : "Ver tabla"}</button></div>
    ${crTable ? `<div class="chart-table"><div class="tk-row tk-head ct"><span>Intervalo</span><span>${p.name}</span><span>${PERIODS[p.prev].name}</span></div>${curV.map((v, i) => `<div class="tk-row ct"><span>${lbl(i)}</span><span>${fm(v)}</span><span>${fm(prevV[i])}</span></div>`).join("")}</div>`
    : `<div class="chart" role="img" aria-label="Ingresos por intervalo de ${p.name.toLowerCase()} comparados con ${PERIODS[p.prev].name.toLowerCase()}">
      <div class="axis"><span>${kTxt(top)}</span><span>${kTxt(top / 2)}</span><span>$0</span></div>
      <div class="plot"><div class="grid"><i></i><i></i><i></i></div>
        ${curV.map((v, i) => `<button class="grp" type="button" aria-label="${lbl(i)}: ${fm(v)}; ${plbl(i)}: ${fm(prevV[i])}">
          <span class="bars"><span class="bar prev" style="height:${prevV[i] / top * 100}%"></span><span class="bar cur" style="height:${v / top * 100}%"></span></span>
          <span class="tick">${lbl(i)}</span>
          <span class="tip"><b>${lbl(i)}</b><span><i class="sw cur"></i>${fm(v)}</span><span><i class="sw prev"></i>${fm(prevV[i])} · ${plbl(i)}</span></span>
        </button>`).join("")}
      </div></div>`}
    <div class="sep"></div>
    <div class="row start" style="gap:30px;align-items:flex-start;flex-wrap:wrap">
      <div><b class="big brand">${pctTxt(cur.vol ? cur.rev / cur.vol : 0, 2)}</b><p class="small">Comisión efectiva sobre el volumen</p></div>
      <div><b class="big">${fm(cur.vol - cur.rev)}</b><p class="small">${cur.vol ? Math.round((1 - cur.rev / cur.vol) * 100) : 0} % destinado a comercios y campus</p></div>
    </div>`;
  const tb = cur.buys || 1;
  document.getElementById("crMix").innerHTML = `<h2 class="sec">Compras por servicio</h2><p class="small" style="font-size:12px">Participación del total de ${int0(tb)} compras</p>
    ${SVC4.map(s => `<div class="mix ${svcTone(s)}"><div class="row"><span class="row start" style="gap:8px">${svcChip(s)}${SVC_LABEL[s]}</span><b>${Math.round(p.buys[s] / tb * 100)} %</b></div><div class="track"><i style="width:${p.buys[s] / tb * 100}%"></i></div><span class="tiny">${int0(p.buys[s])} compras · comisión ${String(rates[s]).replace(".", ",")} %</span></div>`).join("")}
    <div class="sep"></div><p class="tiny">Las comisiones varían por servicio. El ${pctTxt(cur.rev / cur.vol, 2)} es la tasa efectiva agregada, no una tarifa única. <button class="link b" type="button" data-go="config" style="font-size:11px">Ajustar comisiones</button></p>`;
  const open = tickets.filter(isOpen), alta = open.filter(t => t.prio === "alta").length;
  document.getElementById("crHealth").innerHTML = `
    <div class="card hl"><i data-lucide="activity"></i><div><b>La comunidad sigue creciendo</b><p class="small">${int0(p.users)} usuarios registrados · ${pctTxt(p.mau / p.users)} activos este mes</p></div><span class="pill ok">+${int0(p.newUsers)} nuevos</span></div>
    <button class="card hl" type="button" data-go="creador-equipo"><i data-lucide="messages-square"></i><div><b>${open.length} ${open.length === 1 ? "ticket abierto" : "tickets abiertos"} ahora</b><p class="small">${alta} de prioridad alta · ${durTxt(firstResponseMin())} de primera respuesta</p></div><span class="pill ok">Ver tickets →</span></button>`;
  const last = p.partial ? "11 nov 2026" : `${p.days[p.days.length - 1]} ${p.mon} 2026`;
  document.getElementById("crFoot").textContent = `Datos de ejemplo · Corte de métricas: ${last}, 23:59 VET. Usuarios activos: al menos una sesión en el período. Ingresos brutos antes de gastos e impuestos. El soporte se muestra en tiempo real.`;
  icons();
}

/* Equipo y tickets */
let ceTab = "open", ceSel = null, ceMenu = null, ceConfirm = null, ceFull = false, ceRole = "admin";
const staffRows = () => [
  ...accounts.filter(a => a.role === "admin" || a.role === "mod").map(a => ({ name: a.full, email: a.email, role: a.role, kind: a.disabled ? "off" : "on" })),
  ...invites.map(i => ({ name: i.email, email: i.email, role: i.role, kind: "inv" }))
];
function creatorInvite() {
  const admin = ceRole === "admin";
  return `<form class="card" data-invite novalidate>
    <h2 class="sec">Invitar al equipo</h2>
    <p class="small" style="font-size:12px">Solo el creador puede asignar administradores y moderadores.</p>
    <div class="field"><label>Correo institucional</label><div class="input"><input type="email" name="email" placeholder="nombre@unimet.edu.ve" autocomplete="off" aria-label="Correo institucional de la persona invitada"></div><p class="tiny" data-inv-hint hidden></p></div>
    <fieldset class="roles"><legend>Selecciona un rol</legend>
      <label class="pill ${admin ? "ok" : "neutral"}"><input type="radio" name="role" value="admin"${admin ? " checked" : ""}>Administrador</label>
      <label class="pill ${admin ? "neutral" : "ok"}"><input type="radio" name="role" value="mod"${admin ? "" : " checked"}>Moderador</label></fieldset>
    <p class="tiny">${admin ? "Podrá asignar moderadores y consultar todos los tickets abiertos." : "Podrá responder tickets y ofrecer reembolsos o cancelaciones."}</p>
    <button class="btn" type="submit"><i data-lucide="user-plus"></i>Asignar ${admin ? "administrador" : "moderador"}</button>
  </form>`;
}
function ceFiltered() {
  const q = normTxt(document.getElementById("ceSearch").value.trim()), st = document.getElementById("ceState").value, sv = document.getElementById("ceService").value;
  return tickets.filter(t => (ceTab === "all" || (ceTab === "open" ? isOpen(t) : !isOpen(t))) && (st === "all" || t.status === st) && (sv === "all" || t.service === sv)
    && (!q || normTxt([t.id, t.subject, t.student.name, t.service, t.purchase ? t.purchase.num : ""].join(" ")).includes(q)))
    .sort((a, b) => (isOpen(b) - isOpen(a)) || (({ alta: 0, media: 1, baja: 2 })[a.prio] - ({ alta: 0, media: 1, baja: 2 })[b.prio]) || b.created - a.created);
}
function renderCreadorEquipo() {
  const rows = staffRows();
  document.getElementById("ceTeam").innerHTML = `<div class="row"><h2 class="sec">Equipo de gestión</h2><button class="link b" type="button" data-mv-tab="audit">Ver registro de cambios ↗</button></div>`
    + (rows.map(r => {
      const st = r.kind === "inv" ? (invExpired(invByEmail(r.email)) ? `<span class="pill bad">Vencida</span>` : `<span class="pill warn">Invitado</span>`) : r.kind === "off" ? `<span class="pill neutral">Desactivado</span>` : `<span class="pill ok">Activo</span>`;
      const menu = ceMenu === r.email ? `<div class="menu">${r.kind === "inv"
        ? `<button class="link b" type="button" data-inv-copy="${r.email}">Copiar enlace de invitación</button><button class="link b" type="button" data-inv-renew="${r.email}">Reenviar (7 días más)</button><button class="link" type="button" data-inv-cancel="${r.email}">Cancelar invitación</button>`
        : `<button class="link b" type="button" data-ce-role="${r.email}">Cambiar a ${r.role === "admin" ? "moderador" : "administrador"}</button>${r.kind === "off" ? `<button class="link b" type="button" data-mod-on="${r.email}">Reactivar</button>` : `<button class="link" type="button" style="color:var(--danger)" data-mod-off="${r.email}">Desactivar</button>`}`}</div>` : "";
      return `<div class="member"><span class="avatar sm role-${r.role}">${initialsOf(r.kind === "inv" ? r.email.split("@")[0].replace(/[._]/g, " ") : r.name)}</span>
        <div class="who"><b>${esc(r.kind === "inv" ? r.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : r.name)}</b><span class="tiny">${esc(r.email)}${r.kind === "inv" ? ` · ${invNote(invByEmail(r.email))}` : ""}</span></div>
        <span class="role-tag role-${r.role}">${ROLE_LABEL[r.role]}</span>${st}
        <button class="dots" type="button" aria-label="Opciones de ${esc(r.name)}" aria-expanded="${ceMenu === r.email}" data-ce-menu="${r.email}"><i data-lucide="ellipsis"></i></button></div>${menu}`;
    }).join("") || `<p class="small">Aún no hay equipo de gestión. Invita a la primera persona.</p>`);
  document.getElementById("ceInvite").innerHTML = creatorInvite();
  const all = tickets.length, nOpen = tickets.filter(isOpen).length;
  document.getElementById("ceChips").innerHTML = [["open", `Abiertos · ${nOpen}`], ["done", `Resueltos · ${all - nOpen}`], ["all", `Todos · ${all}`]]
    .map(([k, l]) => `<button class="pill ${k === ceTab ? "ok" : "neutral"}" type="button" data-ce-tab="${k}">${l}</button>`).join("");
  const svc = document.getElementById("ceService");
  if (svc.options.length === 1) svc.insertAdjacentHTML("beforeend", SERVICES.map(s => `<option>${s}</option>`).join(""));
  const list = ceFiltered();
  if (!ceSel || !tkById(ceSel)) ceSel = (list[0] || {}).id || null;
  document.getElementById("ceTable").innerHTML = `<div class="tk-row tk-head ce"><span>Ticket</span><span>Estudiante / Motivo</span><span>Estado</span><span>Prioridad</span></div>`
    + (list.map(t => `<button class="tk-row ce${t.id === ceSel ? " on" : ""}" type="button" data-ce="${t.id}">
      <span><span class="tk-ref">${t.id}</span><span class="tiny" style="display:block">${ago(t.created)}</span></span>
      <span class="tk-main"><b style="font-size:12px">${esc(t.subject)}</b><span class="tiny" style="display:block">${esc(t.student.name)} · ${t.service}</span></span>
      <span>${stPill(t.status)}</span><span class="prio ${t.prio}">${TK_PRIO[t.prio]}</span></button>`).join("") || emptyState("inbox", "No hay tickets con esos filtros", "Prueba con otro estado o servicio."))
    + `<div class="tk-foot"><span class="small">${list.length} de ${all} tickets</span></div>`;
  renderCeTicket();
  icons();
}
function renderCeTicket() {
  const box = document.getElementById("ceTicket"), t = ceSel && tkById(ceSel);
  if (!t) { box.innerHTML = `<p class="small">Selecciona un ticket para verlo aquí.</p>`; return; }
  const lastS = [...t.messages].reverse().find(m => m.from === "student"), lastM = [...t.messages].reverse().find(m => m.from === "mod");
  const open = isOpen(t), p = t.purchase, acted = (t.actions || []).length;
  box.innerHTML = `
    <div class="row" style="align-items:flex-start"><b style="font-size:12px">${t.id} · ${esc(t.student.name)}</b>${stPill(t.status)}</div>
    <h3 class="h3" style="font-size:17px">${esc(t.subject)}</h3>
    <p class="tiny">${p ? `Compra ${esc(p.num)} · ${esc(p.place)} · ${money(p.amount)}` : `${t.service} · Sin compra relacionada`}</p>
    <div class="sep"></div>
    ${ceFull ? convHTML(t, "admin") : `${lastS ? `<div class="msg"><div class="row"><b>${esc(firstName(lastS.name))} · ${hhmm(lastS.t)}</b></div><p>${esc(lastS.text)}</p></div>` : ""}
    ${lastM ? `<p class="tiny">${esc(firstName(lastM.name))} · ${hhmm(lastM.t)}: ${esc(lastM.text)}</p>` : ""}`}
    <button class="link b" type="button" data-ce-full>${ceFull ? "Ver resumen" : `Ver conversación completa (${t.messages.length})`}</button>
    ${(t.actions || []).map(a => `<span class="pill ok">${actionLabel(a)} · ${esc(a.by)}</span>`).join("")}
    <div class="field"><label>Responsable actual</label>${open ? assignSelect(t) : `<b style="font-size:13px">${esc(t.mod ? nameOf(t.mod) : "—")}</b>`}</div>
    <div class="sep"></div>
    ${open ? `<form class="stack s14" id="ceReply"><label for="ceText" style="font-weight:600;font-size:13px">Responder como creador</label>
      <div class="input" style="padding:12px"><textarea id="ceText" rows="3" maxlength="600" placeholder="Escribe una respuesta para ${esc(firstName(t.student.name))}…"></textarea></div>
      <button class="btn" type="submit"><i data-lucide="send"></i>Enviar respuesta</button></form>
      ${p && !acted ? (ceConfirm ? `<div class="confirm"><p>${ceConfirm === "refund" ? `¿Reembolsar ${money(p.amount)} a ${esc(p.method)}?` : `¿Cancelar la compra ${esc(p.num)} y devolver ${money(p.amount)}?`}</p><div class="row"><button class="btn ghost" type="button" data-ce-no>Volver</button><button class="btn" type="button" data-ce-yes>Confirmar</button></div></div>`
        : `<div class="row"><button class="btn ghost" type="button" data-ce-act="refund">Reembolsar</button><button class="btn ghost" type="button" data-ce-act="cancel">Cancelar</button></div>`) : ""}
      <button class="btn ghost" type="button" data-ce-resolve><i data-lucide="check"></i>Marcar como resuelto</button>`
    : `<button class="btn ghost" type="button" data-ce-reopen><i data-lucide="rotate-ccw"></i>Reabrir caso</button>`}`;
  icons();
}

/* Movimientos: transacciones de este navegador y registro de cambios */
let mvTab = "tx";
const AUDIT_ICON = { caja: "badge-check", rol: "users", soporte: "message-circle", reembolso: "rotate-ccw", config: "settings" };
const AUDIT_TYPE = { caja: ["Caja", "warn"], rol: ["Roles", "ok"], soporte: ["Soporte", "neutral"], reembolso: ["Reembolso", "warn"], config: ["Configuración", "neutral"] };
/* Movimientos reales: con cuenta real de creador/admin/dueño, las transacciones salen de public.payments
   (todas las personas, con su nombre de profiles); se pintan con lo guardado y se refrescan al abrir la pantalla. */
let sbMoves = null, sbMovesBusy = false;
const PAY_SVC = { comida: "Comida", estacionamiento: "Estacionamiento", materias: "Materias", canchas: "Canchas" };
const sbMovesOn = () => sbShared() && ["creator", "admin", "owner"].includes(roleOf(account));
async function sbLoadMoves() {
  if (sbMovesBusy) return; sbMovesBusy = true;
  try {
    const { data, error } = await sb.from("payments").select("id,user_id,service,amount,status,method,detail,created_at").order("created_at", { ascending: false }).limit(2000);
    if (error) throw error;
    const ids = [...new Set(data.map(r => r.user_id))];
    const names = {};
    if (ids.length) { const pr = await sb.from("profiles").select("id,full_name,email").in("id", ids); (pr.data || []).forEach(u => { names[u.id] = u.full_name || u.email; }); }
    sbMoves = data.map(r => {
      const ok = ["Pagado", "Acreditada", "Aprobado"].includes(r.status), svc = PAY_SVC[r.service], amt = +r.amount;
      return { t: new Date(r.created_at).getTime(), uid: r.user_id, who: names[r.user_id] || "Estudiante", concept: r.detail || (svc || "Recarga de wallet"), method: MT_LBL[r.method] || "Otro",
        amount: r.status === "Reembolsado" ? -amt : amt, fee: ok && svc ? amt * (rates[svc] || 0) / 100 : null, service: r.service, status: r.status };
    });
  } catch (err) { console.warn("Nexo: no se cargaron los movimientos reales", err && err.message); }
  sbMovesBusy = false;
  if (current === "movimientos") renderMovimientos(true);
  if (current === "creador") try { renderCreador(); } catch (err) {}
}
function allTransactions() {
  if (sbMovesOn()) return sbMoves || [];
  const out = [];
  try {
    Object.keys(localStorage).filter(k => k.startsWith("nexo-orders:")).forEach(k => {
      const email = k.slice("nexo-orders:".length);
      (JSON.parse(localStorage.getItem(k) || "[]") || []).forEach(o => {
        const l = localById(o.local);
        out.push({ t: +o.id.slice(1) || 0, who: o.studentName || nameOf(email), concept: `Pedido ${o.num} · ${l ? l.name : ""}`, method: o.card || "Transferencia", amount: o.total, fee: o.total * rates.Comida / 100 });
        if (o.cancelledAt) out.push({ t: o.cancelledAt, who: o.studentName || nameOf(email), concept: `Pedido cancelado por el local · ${o.num}`, method: o.card || "Transferencia", amount: -o.total, fee: null });
      });
    });
  } catch (err) {}
  tickets.forEach(t => (t.actions || []).forEach(a => out.push({ t: a.t, who: t.student.name, concept: `${actionLabel(a)} · ${t.id}`, method: t.purchase ? t.purchase.method : "", amount: -a.amount, fee: null })));
  return out.sort((a, b) => b.t - a.t);
}
function renderMovimientos(fromLoad) {
  if (sbMovesOn() && !fromLoad) sbLoadMoves();
  document.getElementById("mvTabs").innerHTML = [["tx", "Transacciones"], ["audit", "Registro de cambios"]].map(([k, l]) => `<button class="pill ${k === mvTab ? "ok" : "neutral"}" type="button" data-mv-tab="${k}">${l}</button>`).join("");
  const box = document.getElementById("mvList");
  if (mvTab === "tx") {
    const tx = allTransactions();
    box.innerHTML = `<div class="tk-row tk-head mv"><span>Fecha</span><span>Concepto</span><span>Método</span><span>Monto</span><span>Comisión</span></div>`
      + (tx.map(x => `<div class="tk-row mv"><span class="tiny">${x.t ? fullDate(x.t) : "—"}</span><span class="tk-main row start" style="gap:10px">${x.amount < 0 ? `<span class="svc-chip t-refund" aria-hidden="true"><i data-lucide="rotate-ccw"></i></span>` : x.service === "recarga" ? `<span class="svc-chip t-brand" aria-hidden="true"><i data-lucide="wallet"></i></span>` : svcChip(x.service ? PAY_SVC[x.service] : "Comida")}<span style="min-width:0"><b style="font-size:12px">${esc(x.concept)}</b><span class="tiny" style="display:block">${esc(x.who)}</span></span></span><span class="small">${esc(x.method)}</span><span><b class="${x.amount < 0 ? "neg" : ""}" style="font-size:13px">${x.amount < 0 ? "−" + money(-x.amount) : money(x.amount)}</b>${x.status && !["Pagado", "Acreditada", "Aprobado"].includes(x.status) ? `<span class="pill ${x.status === "En revisión" ? "warn" : x.status === "Rechazado" ? "bad" : "neutral"} mv-st">${x.status}</span>` : ""}</span><span class="small">${x.fee === null ? "—" : money(x.fee)}</span></div>`).join("")
        || (sbMovesOn() && !sbMoves ? `<p class="small" style="padding:18px">Cargando los movimientos reales…</p>` : emptyState("receipt-text", "Aún no hay compras", sbMovesOn() ? "Cuando alguien pague con su cuenta en la app publicada, aparecerá aquí al instante." : "Cuando un estudiante pague un pedido de comida, aparecerá aquí. Los totales del Resumen son datos de ejemplo.")));
    if (sbMovesOn() && sbMoves) {
      const ok = tx.filter(x => x.fee !== null), vol = ok.reduce((a, x) => a + x.amount, 0), fee = ok.reduce((a, x) => a + x.fee, 0), rev = tx.filter(x => x.status === "En revisión").length;
      box.insertAdjacentHTML("afterbegin", `<div class="mv-sum"><span class="pill ok"><i data-lucide="database"></i>&nbsp;Datos reales</span><span class="small">${ok.length} ${ok.length === 1 ? "pago confirmado" : "pagos confirmados"} · <b>${money(vol)}</b> · comisión de Nexo <b>${money(fee)}</b>${rev ? ` · ${rev} en revisión` : ""}</span></div>`);
    }
  } else {
    box.innerHTML = `<div class="tk-row tk-head au"><span>Cuándo</span><span>Quién</span><span>Cambio</span><span>Tipo</span></div>`
      + (audit.slice().sort((a, b) => b.t - a.t).map(a => `<div class="tk-row au"><span class="tiny">${ago(a.t)}</span><span class="row start" style="gap:10px;align-items:flex-start"><span class="svc-chip au-${AUDIT_TYPE[a.type] ? a.type : "soporte"}" aria-hidden="true"><i data-lucide="${AUDIT_ICON[a.type] || "message-circle"}"></i></span><span><b style="font-size:12px">${esc(a.who)}</b><span class="tiny" style="display:block">${ROLE_LABEL[a.role] || ""}</span></span></span><span style="font-size:12px">${esc(a.text)}</span><span><span class="pill ${(AUDIT_TYPE[a.type] || AUDIT_TYPE.soporte)[1]}">${(AUDIT_TYPE[a.type] || AUDIT_TYPE.soporte)[0]}</span></span></div>`).join(""));
  }
  icons();
}

/* Configuración */
let cfConfirm = false;
function renderConfig() {
  document.getElementById("cfForm").innerHTML = `<div><h2 class="h2">Comisiones por servicio</h2><p class="small" style="font-size:13px">Porcentaje que Nexo cobra sobre cada compra. El resto va al comercio o a la universidad.</p></div>
    ${SVC4.map(s => `<div class="field"><label for="cf-${s}" class="row start cf-lbl" style="gap:10px">${svcChip(s)}${SVC_LABEL[s]}</label><div class="input"><input id="cf-${s}" data-rate="${s}" type="number" inputmode="decimal" min="0" max="15" step="0.25" value="${rates[s]}"><span class="small">%</span></div></div>`).join("")}
    <div class="notice" id="cfPreview"></div>
    <div class="row"><button class="btn ghost" type="button" data-cf-default>Valores por defecto</button><button class="btn" type="submit"><i data-lucide="check"></i>Guardar cambios</button></div>`;
  document.getElementById("cfSide").innerHTML = `<form class="card" id="bcvForm" novalidate><div class="row"><h2 class="h2">Dólar BCV</h2><span class="pill ${bcvStale() ? "warn" : "ok"}">${bcvStale() ? "Desactualizada" : "Al día"}</span></div>
    <p class="small" style="font-size:13px">Tasa oficial con la que Nexo muestra los precios en bolívares y valida los Pago Móvil. Cópiala de <b>bcv.org.ve</b> (o de alcambio.app, que la toma del BCV).</p>
    <div class="grid2">
      <div class="field"><label for="bcv-rate">Bs. por US$</label><div class="input"><input id="bcv-rate" inputmode="decimal" autocomplete="off" value="${money(BCV.rate).slice(1)}"></div></div>
      <div class="field"><label for="bcv-date">Fecha valor</label><div class="input sel"><select id="bcv-date">${recentDayOpts(14, BCV.date)}</select><i data-lucide="chevron-down"></i></div></div>
    </div>
    <p class="tiny">Vigente: ${bsAmt(BCV.rate)} del ${bcvDateTxt()} · ${esc(BCV.source)}${BCV.by ? ` · actualizada por ${esc(BCV.by)}` : ""}.</p>
    <button class="btn" type="submit"><i data-lucide="refresh-cw"></i>Actualizar tasa</button></form>
    <div class="card"><h2 class="h2">Datos del prototipo</h2>
    <p class="small" style="font-size:13px">Vuelve a los tickets, invitaciones, equipo y comisiones de ejemplo. Solo afecta a este navegador; las cuentas de estudiantes y sus compras se conservan.</p>
    ${cfConfirm ? `<div class="confirm"><p>¿Restablecer los datos de gestión? Se perderán los tickets y cambios hechos en este navegador.</p><div class="row"><button class="btn ghost" type="button" data-cf-no>Volver</button><button class="btn" type="button" data-cf-yes>Restablecer</button></div></div>`
      : `<button class="btn ghost" type="button" data-cf-reset><i data-lucide="rotate-ccw"></i>Restablecer datos de ejemplo</button>`}</div>
    <div class="notice"><i data-lucide="shield-check"></i><p>Los cambios de comisiones quedan en el registro de cambios.</p></div>`;
  updateCfPreview(); icons();
}
function readRates() {
  const r = {}; let bad = null;
  document.querySelectorAll("[data-rate]").forEach(i => { const v = parseFloat(String(i.value).replace(",", ".")); i.closest(".field").classList.toggle("bad", !(v >= 0 && v <= 15)); if (!(v >= 0 && v <= 15)) bad = bad || i; r[i.dataset.rate] = v; });
  return { r, bad };
}
function updateCfPreview() {
  const { r, bad } = readRates(), p = PERIODS_DEMO["2026-10"], el = document.getElementById("cfPreview");
  if (bad) { el.className = "notice warn"; el.innerHTML = `<i data-lucide="info"></i><p>Cada comisión debe estar entre 0 % y 15 %.</p>`; icons(); return; }
  const vol = sumObj(p.vol), rev = SVC4.reduce((a, s) => a + p.vol[s] * r[s] / 100, 0);
  el.className = "notice"; el.innerHTML = `<i data-lucide="percent"></i><p>Con estas comisiones, octubre habría dado <strong>${money0(rev)}</strong> de ingresos · comisión efectiva <strong>${pctTxt(rev / vol, 2)}</strong>.</p>`; icons();
}
function resetDemoData() {
  ["nexo-tickets", "nexo-invites", "nexo-audit", "nexo-config", "nexo-bcv"].forEach(k => { try { localStorage.removeItem(k); } catch (err) {} });
  STAFF0.forEach(s => { const a = accByEmail(s.email); if (a) { a.role = s.role; delete a.disabled; } });
  accounts.filter(a => (a.role === "admin" || a.role === "mod") && !STAFF0.some(s => s.email === a.email)).forEach(a => { delete a.role; delete a.disabled; });
  saveAccounts();
  try { sessionStorage.setItem("nexo-flash", "Restablecimos los datos de ejemplo."); } catch (err) {}
  location.reload();
}

document.addEventListener("click", e => {
  if (e.target.closest("[data-cr-table]")) { crTable = !crTable; renderCreador(); return; }
  const mt = e.target.closest("[data-mv-tab]"); if (mt) { mvTab = mt.dataset.mvTab; if (current === "movimientos") renderMovimientos(); else go("movimientos"); return; }
  const cm = e.target.closest("[data-ce-menu]"); if (cm) { ceMenu = ceMenu === cm.dataset.ceMenu ? null : cm.dataset.ceMenu; renderCreadorEquipo(); return; }
  const cr = e.target.closest("[data-ce-role]");
  if (cr) {
    const a = accByEmail(cr.dataset.ceRole), to = a.role === "admin" ? "mod" : "admin";
    a.role = to; saveAccounts();
    let freed = 0;
    if (to === "admin") tickets.forEach(t => { if (t.mod === a.email && isOpen(t)) { t.mod = null; freed++; } });
    saveTickets(); ceMenu = null;
    logAudit("rol", `Cambió a ${a.full} a ${to === "admin" ? "administrador" : "moderador"}.`);
    toast(`${a.full} ahora es ${to === "admin" ? "administrador" : "moderador"}${freed ? `; ${freed} ${freed === 1 ? "ticket quedó" : "tickets quedaron"} sin asignar` : ""}.`);
    renderCreadorEquipo(); return;
  }
  const ct = e.target.closest("[data-ce-tab]"); if (ct) { ceTab = ct.dataset.ceTab; ceSel = null; renderCreadorEquipo(); return; }
  const cs = e.target.closest("[data-ce]"); if (cs) { ceSel = cs.dataset.ce; ceConfirm = null; ceFull = false; renderCreadorEquipo(); if (innerWidth < 1100) document.getElementById("ceTicket").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (e.target.closest("[data-ce-full]")) { ceFull = !ceFull; renderCeTicket(); return; }
  const ca = e.target.closest("[data-ce-act]"); if (ca) { ceConfirm = ca.dataset.ceAct; renderCeTicket(); return; }
  if (e.target.closest("[data-ce-no]")) { ceConfirm = null; renderCeTicket(); return; }
  if (e.target.closest("[data-ce-yes]")) { ticketAction(tkById(ceSel), ceConfirm); ceConfirm = null; renderCreadorEquipo(); return; }
  if (e.target.closest("[data-ce-resolve]")) { ticketResolve(tkById(ceSel), true); renderCreadorEquipo(); return; }
  if (e.target.closest("[data-ce-reopen]")) { ticketResolve(tkById(ceSel), false); renderCreadorEquipo(); return; }
  if (e.target.closest("[data-cf-default]")) { document.querySelectorAll("[data-rate]").forEach(i => { i.value = RATES0[i.dataset.rate]; }); updateCfPreview(); return; }
  if (e.target.closest("[data-cf-reset]")) { cfConfirm = true; renderConfig(); return; }
  if (e.target.closest("[data-cf-no]")) { cfConfirm = false; renderConfig(); return; }
  if (e.target.closest("[data-cf-yes]")) { resetDemoData(); return; }
});
document.addEventListener("change", e => {
  if (e.target.id === "crPeriod") { crPeriod = e.target.value; renderCreador(); return; }
  if (e.target.id === "ceState" || e.target.id === "ceService") { ceSel = null; renderCreadorEquipo(); return; }
  if (e.target.name === "role" && e.target.closest("#ceInvite")) { ceRole = e.target.value; const v = e.target.closest("form").querySelector("[name=email]").value; renderCreadorEquipo(); document.querySelector("#ceInvite [name=email]").value = v; }
});
document.addEventListener("input", e => {
  if (e.target.id === "ceSearch") { ceSel = null; renderCreadorEquipo(); return; }
  if (e.target.matches && e.target.matches("[data-rate]")) updateCfPreview();
});
document.addEventListener("submit", e => {
  const f = e.target;
  if (f.id === "ceReply") {
    e.preventDefault();
    const ta = document.getElementById("ceText"), txt = ta.value.trim();
    if (!txt) { ta.focus(); toast("Escribe una respuesta antes de enviarla."); return; }
    ticketReply(tkById(ceSel), txt); renderCreadorEquipo(); return;
  }
  if (f.id === "bcvForm") {
    e.preventDefault();
    const rate = parseAmt(document.getElementById("bcv-rate").value), date = document.getElementById("bcv-date").value;
    const t = new Date(), today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    if (!(rate > 0) || rate > 1000000) { document.getElementById("bcv-rate").focus(); toast("Escribe la tasa en bolívares por dólar, por ejemplo 901,62."); return; }
    if (!date || date > today) { document.getElementById("bcv-date").focus(); toast("La fecha valor no puede ser posterior a hoy."); return; }
    if (rate === BCV.rate && date === BCV.date) { toast("La tasa ya está al día."); return; }
    const before = BCV.rate;
    BCV = { rate, date, source: "cargada en Configuración", by: user.full }; saveBCV();
    logAudit("config", `Actualizó la tasa BCV: ${bsAmt(before)} → ${bsAmt(rate)} (fecha valor ${bcvDateTxt()}).`);
    refreshBcvUI(); toast(`Tasa BCV actualizada: ${bsAmt(rate)} por US$.`); renderConfig(); return;
  }
  if (f.id === "cfForm") {
    e.preventDefault();
    const { r, bad } = readRates();
    if (bad) { bad.focus(); toast("Revisa las comisiones: deben estar entre 0 % y 15 %."); return; }
    const changed = SVC4.filter(s => r[s] !== rates[s]);
    if (!changed.length) { toast("No hay cambios que guardar."); return; }
    logAudit("config", `Cambió comisiones: ${changed.map(s => `${SVC_LABEL[s]} ${String(rates[s]).replace(".", ",")} % → ${String(r[s]).replace(".", ",")} %`).join("; ")}.`);
    rates = r; saveConfig(); toast("Guardamos las nuevas comisiones."); renderConfig();
  }
});

/* ---------- Seguimiento del pedido: en preparación → listo para retirar → retirado ----------
   El pedido queda listo cuando pasa el tiempo de preparación del local (punto medio de su "eta").
   Los pedidos guardados antes de esta función no tienen readyAt y se dan por retirados. */
let trackId = null;
function prepMinutes(l) { const n = ((l && l.eta) || "10").match(/\d+/g).map(Number); return Math.round(n.reduce((a, b) => a + b, 0) / n.length); }
function pickupCode(o) { return String(1000 + ((+String(o.id).slice(1) || 0) * 7919) % 9000); }
function orderStatus(o) { return o.cancelledAt ? "cancelado" : !o.readyAt || o.pickedAt ? "retirado" : Date.now() >= o.readyAt ? "listo" : o.prepStart && Date.now() < o.prepStart ? "programado" : "preparando"; }
const activeOrders = () => orders.filter(o => ["programado", "preparando", "listo"].includes(orderStatus(o))).sort((a, b) => b.paidAt - a.paidAt);
const ORDER_STATE = { programado: ["Programado", "neutral"], preparando: ["En preparación", "warn"], listo: ["Listo para retirar", "ok"], retirado: ["Retirado", "neutral"], cancelado: ["Cancelado", "bad"] };
function foodNotifs(t) {
  return orders.filter(o => orderStatus(o) === "listo").map(o => {
    const l = localById(o.local);
    return { id: `order-ready-${o.id}`, cat: "comida", alert: true, when: t, title: `Tu pedido de ${l.name} está listo`, body: `Muestra el código ${o.code} en el mostrador · ${l.place}.`, go: "pedido", order: o.id };
  }).concat(orders.filter(o => o.cancelledAt && Date.now() - o.cancelledAt < 24 * 60 * MIN).map(o => {
    const l = localById(o.local);
    return { id: `order-cancel-${o.id}`, cat: "comida", alert: true, when: t, title: `${l.name} canceló tu pedido ${o.num}`, body: `Te devolvimos ${money(o.total)} a tu método de pago.`, go: "pedido", order: o.id };
  }));
}
function renderPedido() {
  const body = document.getElementById("pdBody");
  const o = (trackId && orders.find(x => x.id === trackId)) || activeOrders()[0] || orders.slice().sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0))[0];
  if (!o) {
    body.innerHTML = `<div class="card" style="align-items:flex-start"><span class="ico lg"><i data-lucide="shopping-bag"></i></span><h1 class="h2">Aún no tienes pedidos</h1><p class="small" style="font-size:13px">Cuando pagues un pedido de comida, aquí verás cómo va.</p><button class="btn" type="button" data-go="comida" style="max-width:320px"><i data-lucide="utensils"></i>Ver comida y kioscos</button></div>`;
    icons(); return;
  }
  trackId = o.id;
  const l = localById(o.local), st = orderStatus(o), now = Date.now();
  body.classList.toggle("ready", st === "listo");
  setFrame("pedido", "Tu pedido", ["Comida y kioscos", l.name, o.num]);
  const total = (o.readyAt || now) - (o.paidAt || now), left = Math.max(0, Math.ceil(((o.readyAt || now) - now) / MIN));
  const from = o.prepStart || o.paidAt, prog = st === "preparando" ? Math.min(96, Math.max(4, (now - from) / ((o.readyAt || now) - from) * 100)) : 100;
  const title = st === "programado" ? "Tu pedido está programado" : st === "preparando" ? "Estamos preparando tu pedido" : st === "listo" ? "¡Tu pedido está listo!" : st === "cancelado" ? `${l.name} canceló tu pedido` : "Pedido retirado";
  const lead = st === "programado" ? `Lo retiras ${whenTxt(o.readyAt)}. Empezarán a prepararlo a las ${hhmm(o.prepStart)}.`
    : st === "preparando" ? `Listo aprox. a las ${hhmm(o.readyAt)} · ${left <= 1 ? "falta 1 min" : `faltan ${left} min`}${o.delayMin ? ` · el local avisó una demora de ${o.delayMin} min` : ""}`
    : st === "listo" ? `Retíralo en el mostrador de ${l.name} · ${l.place}`
    : st === "cancelado" ? `Te devolvimos ${money(o.total)} a ${o.card || "tu método de pago"}. Llega en 3 a 5 días hábiles.`
    : o.pickedAt ? `Lo retiraste a las ${hhmm(o.pickedAt)}. ¡Buen provecho!` : "Este pedido ya fue entregado.";
  const step = (done, on, label, time) => `<li class="${done ? "done" : ""}${on ? " on" : ""}"><span class="dot"></span><div><b>${label}</b>${time ? `<span class="tiny">${time}</span>` : ""}</div></li>`;
  const n = o.lines.reduce((a, x) => a + x.qty, 0);
  body.innerHTML = `
    <div class="stack s14">
      <div class="card">
        <div class="row" style="align-items:flex-start"><span class="small">Pedido ${o.num} · ${esc(l.name)}</span><span class="pill ${ORDER_STATE[st][1]}">${ORDER_STATE[st][0]}</span></div>
        <div class="row start" style="gap:14px;align-items:center">${["preparando", "programado"].includes(st) && o.paidAt && now - o.paidAt < 90000 ? successMark("sm") : ""}<div><h1 class="h1">${title}</h1><p class="lead">${lead}</p></div></div>
        ${st === "preparando" ? `<div class="track" role="progressbar" aria-label="Progreso de la preparación" aria-valuenow="${Math.round(prog)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${prog}%"></i></div>` : ""}
        <ol class="steps-v"${st === "cancelado" ? " hidden" : ""}>
          ${o.paidAt ? step(true, false, "Pago confirmado", hhmm(o.paidAt)) : ""}
          ${o.scheduledFor ? step(st !== "programado", st === "programado", "Programado", `Retiro ${whenTxt(o.scheduledFor)}`) : ""}
          ${step(!["programado", "preparando"].includes(st), st === "preparando", "En preparación", o.prepStart ? (st === "programado" ? `Desde las ${hhmm(o.prepStart)}` : `Desde las ${hhmm(o.prepStart)} · ${l.eta}`) : o.paidAt ? `Desde las ${hhmm(o.paidAt)} · ${l.eta}` : "")}
          ${step(st === "retirado", st === "listo", "Listo para retirar", o.readyAt ? (["programado", "preparando"].includes(st) ? `Estimado: ${hhmm(o.readyAt)}` : hhmm(o.readyAt)) : "")}
          ${step(st === "retirado", false, "Retirado", o.pickedAt ? hhmm(o.pickedAt) : "")}
        </ol>
        ${st === "listo" ? `<button class="btn" type="button" data-picked="${o.id}"><i data-lucide="check"></i>Ya lo retiré</button>` : ""}
      </div>
      <div class="card">
        <div class="row"><h2 class="h2">Tu pedido</h2><span class="small">${n} ${n === 1 ? "producto" : "productos"} · ${money(o.total)} · ${bsOf(o.total)}</span></div>
        ${o.lines.map(x => `<div class="row start" style="align-items:flex-start">${prodArt(x.item, x.icon, "xs", x.name)}<div><b style="font-size:13px">${x.qty} × ${esc(x.name)}</b>${x.opts.map(t => `<p class="small">${esc(t)}</p>`).join("")}${x.note ? `<p class="small">Nota: ${esc(x.note)}</p>` : ""}</div></div>`).join("")}
        <div class="row" style="gap:8px;flex-wrap:wrap">${["retirado", "cancelado", "listo"].includes(st) ? `<button class="btn" type="button" data-reorder="${o.id}" style="flex:1"><i data-lucide="rotate-cw"></i>Pedir de nuevo</button>` : ""}<button class="btn ghost" type="button" data-go="factura" data-order="${o.id}" style="flex:1"><i data-lucide="receipt-text"></i>Ver factura</button></div>
      </div>
    </div>
    <div class="stack">
      <div class="card pickup${st === "listo" ? "" : " dim"}"${st === "cancelado" ? " hidden" : ""}>
        <h2 class="h2">Código de retiro</h2>
        ${st === "listo" ? `<div class="qr"><canvas width="29" height="29" data-qr="${o.num}" role="img" aria-label="Código QR del pedido ${o.num}"></canvas></div>` : ""}
        <b class="pcode" aria-label="Código ${o.code.split("").join(" ")}">${o.code}</b>
        <p class="small" style="font-size:13px">${st === "listo" ? `Muéstralo en el mostrador de ${esc(l.name)}. Solo sirve para este pedido.` : ["programado", "preparando"].includes(st) ? "Te avisaremos cuando esté listo. El código QR aparece en ese momento." : "Este código ya se usó."}</p>
      </div>
      <div class="card"><div class="row start">${foodArt(l.id, "xs")}<b class="h3">${esc(l.name)}</b></div><p class="small" style="font-size:13px">${l.place} · Campus Central · Planta baja · Hoy ${todayHours(l)}</p></div>
      ${st === "cancelado" ? `<div class="notice warn"><i data-lucide="ban"></i><p>Si tienes dudas sobre la cancelación, escríbenos desde <button class="link b" type="button" data-go="soporte" style="font-size:12px">Soporte</button>.</p></div>` : ""}
      ${["programado", "preparando"].includes(st) ? `<div class="notice demo-only"><i data-lucide="flask-conical"></i><p>Prototipo: <button class="link b" type="button" data-sim-ready="${o.id}" style="font-size:12px">simular que el pedido ya está listo</button> para no esperar ${l.eta}.</p></div>` : ""}
      ${orders.length > 1 ? `<button class="link b" type="button" data-go="actividad">Ver todos mis pedidos en Actividad →</button>` : ""}
    </div>`;
  body.querySelectorAll("canvas[data-qr]").forEach(drawQR);
  icons();
}
function renderFoodOrders() {
  const box = document.getElementById("foodOrders"), act = activeOrders();
  box.hidden = !act.length;
  box.innerHTML = act.map(o => {
    const l = localById(o.local), st = orderStatus(o);
    return `<div class="card${st === "listo" ? " sel" : ""}"><div class="row"><h3 class="h3">${st === "listo" ? "Tu pedido está listo" : st === "programado" ? "Tu pedido programado" : "Tu pedido en curso"}</h3><span class="pill ${ORDER_STATE[st][1]}">${ORDER_STATE[st][0]}</span></div>
      <p class="small" style="font-size:13px">${esc(l.name)} · ${st === "listo" ? `Código ${o.code}` : st === "programado" ? `Retiro ${whenTxt(o.readyAt)}` : `Listo aprox. a las ${hhmm(o.readyAt)}`}</p>
      <button class="btn${st === "listo" ? "" : " ghost"}" type="button" data-go="pedido" data-order="${o.id}"><i data-lucide="${st === "listo" ? "qr-code" : "clock"}"></i>${st === "listo" ? "Ver código de retiro" : "Ver pedido"}</button></div>`;
  }).join("");
  icons();
}
// Revisa cada 15 s si algún pedido ya está listo: aviso, notificación y pantallas al día
function checkOrders() {
  let changed = false;
  orders.forEach(o => {
    const open = () => { trackId = o.id; go("pedido"); };
    if (o.prepStart && orderStatus(o) === "preparando" && !o.prepNotified) { o.prepNotified = true; changed = true; toast(`${localById(o.local).name} empezó a preparar tu pedido programado.`, { action: "Ver pedido", onAction: open }); }
    if (orderStatus(o) === "listo" && !o.readyNotified) { o.readyNotified = true; changed = true; toast(`Tu pedido de ${localById(o.local).name} está listo. Código ${o.code}.`, { persist: true, action: "Ver código", onAction: open }); }
    if (o.cancelledAt && !o.cancelNotified) { o.cancelNotified = true; changed = true; toast(`${localById(o.local).name} canceló tu pedido. Te devolvimos ${money(o.total)}.`, { persist: true, action: "Ver detalle", onAction: open }); }
  });
  if (changed) { saveOrders(); try { renderNotifs(); } catch (err) {} }
  if (current === "pedido") renderPedido();
  if (current === "comida") renderFoodOrders();
  if (current === "local-pedidos" && typeof renderLocalPedidos === "function") renderLocalPedidos();
}
document.addEventListener("click", e => {
  const pk = e.target.closest("[data-picked]");
  if (pk) { const o = orders.find(x => x.id === pk.dataset.picked); o.pickedAt = Date.now(); o.readyNotified = true; saveOrders(); toast("¡Buen provecho! Marcamos tu pedido como retirado."); try { renderNotifs(); } catch (err) {} renderPedido(); return; }
  const sr = e.target.closest("[data-sim-ready]");
  if (sr) { const o = orders.find(x => x.id === sr.dataset.simReady); o.readyAt = Date.now(); if (o.prepStart) { o.prepStart = Date.now() - MIN; o.prepNotified = true; } saveOrders(); checkOrders(); }
});
setInterval(checkOrders, 15000);
setTimeout(checkOrders, 1200);

/* ---------- Comercio: cada local recibe sus pedidos, los marca listos y los entrega con el código ----------
   Los pedidos viven en la cuenta de cada estudiante (nexo-orders:<correo>); el local los lee y escribe ahí.
   Si el local no hace nada, el pedido igual pasa a "listo" por tiempo (para que la vista del estudiante funcione sola). */
const myLocal = () => account && account.local ? localById(account.local) : null;
function allOrders() {
  if (sbMerchant()) return sbLocalOrders.map(r => ({ o: r.data, email: r.user_id }));
  const out = [];
  try {
    Object.keys(localStorage).filter(k => k.startsWith("nexo-orders:")).forEach(k => {
      const email = k.slice("nexo-orders:".length);
      (JSON.parse(localStorage.getItem(k) || "[]") || []).forEach(o => out.push({ o, email }));
    });
  } catch (err) {}
  return out;
}
function updateOrder(email, id, fn) {
  if (sbMerchant()) {
    const r = sbLocalOrders.find(x => x.data.id === id); if (!r) return null;
    fn(r.data); sbPush("o" + id, () => sb.from("orders").update({ data: (sbLocalOrders.find(x => x.data.id === id) || r).data }).eq("id", id), () => toast("No pudimos guardar el cambio del pedido. Revisa tu conexión."));
    return r.data;
  }
  const key = "nexo-orders:" + email;
  try {
    const list = JSON.parse(localStorage.getItem(key) || "[]") || [], o = list.find(x => x.id === id);
    if (!o) return null;
    fn(o); localStorage.setItem(key, JSON.stringify(list));
    if (email === sessionEmail) orders = list;
    return o;
  } catch (err) { return null; }
}
// Pedidos de ejemplo para que el tablero del local no arranque vacío (una sola vez por local)
function seedLocalOrders(l) {
  if (sbMerchant()) return; // un comercio real no ve pedidos de ejemplo
  const flag = "nexo-localseed:" + l.id;
  try { if (localStorage.getItem(flag)) return; localStorage.setItem(flag, "1"); } catch (err) { return; }
  const n = Date.now(), items = itemsOf(l), d = day0(simDate);
  const mk = (email, name, idx, qty, paidAgo, extra) => {
    const it = items[idx % items.length], id = "o" + (n - paidAgo * MIN), paidAt = n - paidAgo * MIN;
    const o = { id, num: `${l.pref}-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(900 + idx).padStart(4, "0")}`, local: l.id, method: "card",
      date: fmtD(d), time: hhmm(paidAt), lines: [{ name: it.name, icon: it.icon, opts: (it.opts || []).map(g => `${g.name}: ${g.choices[0].l}`), note: idx === 1 ? "Sin cebolla, por favor" : "", qty, total: it.price * qty }],
      total: it.price * qty, card: "Visa ···· 1190", paidAt, readyAt: paidAt + prepMinutes(l) * MIN, studentName: name, readyNotified: true, ...extra };
    o.code = pickupCode(o);
    const key = "nexo-orders:" + email;
    try { const list = JSON.parse(localStorage.getItem(key) || "[]") || []; list.push(o); localStorage.setItem(key, JSON.stringify(list)); } catch (err) {}
  };
  mk("luis.perez@correo.unimet.edu.ve", "Luis Pérez", 0, 1, 3);
  mk("valeria.ruiz@correo.unimet.edu.ve", "Valeria Ruiz", 1, 2, 6);
  mk("sofia.diaz@correo.unimet.edu.ve", "Sofía Díaz", 2, 1, 18, { readyAt: n - 4 * MIN });
  mk("mateo.silva@correo.unimet.edu.ve", "Mateo Silva", 3, 1, 50, { readyAt: n - 38 * MIN, pickedAt: n - 33 * MIN });
}
let lpConfirm = null, lpDeliver = null;
function renderLocalPedidos() {
  const l = myLocal(); if (!l) return;
  seedLocalOrders(l);
  const mine = allOrders().filter(x => x.o.local === l.id && x.o.readyAt), today = day0(new Date()).getTime();
  const by = st => mine.filter(x => orderStatus(x.o) === st);
  const prep = [...by("preparando"), ...by("programado")].sort((a, b) => a.o.readyAt - b.o.readyAt), ready = by("listo").sort((a, b) => a.o.readyAt - b.o.readyAt);
  const done = mine.filter(x => ["retirado", "cancelado"].includes(orderStatus(x.o)) && (x.o.pickedAt || x.o.cancelledAt || 0) >= today).sort((a, b) => (b.o.pickedAt || b.o.cancelledAt) - (a.o.pickedAt || a.o.cancelledAt));
  const sales = mine.filter(x => x.o.paidAt >= today && !x.o.cancelledAt).reduce((a, x) => a + x.o.total, 0);
  document.getElementById("lpTitle").textContent = isPaused(l.id) ? "Pedidos en pausa" : "Pedidos de hoy";
  document.getElementById("lpLead").textContent = `${l.name} · ${l.place} · Hoy ${todayHours(l)}`;
  document.getElementById("lpArt").innerHTML = foodArt(l.id, "sm");
  document.getElementById("lpPause").innerHTML = isPaused(l.id)
    ? `<button class="btn" type="button" data-lp-pause="0"><i data-lucide="circle-play"></i>Reanudar pedidos</button>`
    : `<button class="btn ghost" type="button" data-lp-pause="1"><i data-lucide="circle-pause"></i>Pausar pedidos</button>`;
  const k = (label, val, sub, ic) => `<div class="card kpi static sk"><div class="row start" style="gap:10px">${skIc(ic)}<span class="small">${label}</span></div><b class="kv-big">${val}</b><span class="tiny">${sub}</span></div>`;
  document.getElementById("lpKpis").innerHTML = k("En preparación", prep.length, prep.length ? `El próximo a las ${hhmm(prep[0].o.readyAt)}` : "Nada en cocina", "chef-hat")
    + k("Listos para retirar", ready.length, ready.length ? "Esperando al estudiante" : "Ninguno esperando", "package-check")
    + k("Ventas de hoy", money(sales), `${mine.filter(x => x.o.paidAt >= today && !x.o.cancelledAt).length} pedidos pagados`, "banknote");
  const lines = o => o.lines.map(x => `<div class="lp-line">${prodArt(x.item, x.icon || "utensils", "xs", x.name)}<p style="font-size:13px"><b>${x.qty} ×</b> ${esc(x.name)}${(x.opts || []).length ? `<span class="tiny" style="display:block">${x.opts.map(esc).join(" · ")}</span>` : ""}${x.note ? `<span class="note">Nota: ${esc(x.note)}</span>` : ""}</p></div>`).join("");
  const who = x => esc(x.o.studentName || nameOf(x.email));
  const card = (x, st) => {
    const o = x.o, left = Math.max(0, Math.ceil((o.readyAt - Date.now()) / MIN)), key = `${x.email}|${o.id}`;
    const head = `<div class="row"><span class="tk-ref">${o.num}</span><span class="tiny">${who(x)} · ${o.time}</span></div>`;
    const confirm = lpConfirm === key ? `<div class="confirm"><p>¿Cancelar el pedido y devolver ${money(o.total)} a ${esc(o.card || "su método de pago")}? Le avisaremos al estudiante.</p><div class="row"><button class="btn ghost" type="button" data-lp-no>Volver</button><button class="btn" type="button" data-lp-cancel-yes="${key}">Cancelar pedido</button></div></div>` : "";
    if (st === "preparando" && orderStatus(o) === "programado") return `<div class="card lp-card st-sched">${head}${lines(o)}
      <div class="row"><span class="pill neutral"><i data-lucide="calendar-clock"></i>&nbsp;Programado · retiro ${whenTxt(o.readyAt)}</span><b>${money(o.total)}</b></div>
      <p class="tiny">Empieza a prepararlo a las ${hhmm(o.prepStart)}.</p>
      ${confirm || `<div class="row"><button class="link b" type="button" data-lp-ready="${key}">Ya está listo</button><button class="link" type="button" style="color:var(--danger)" data-lp-cancel="${key}">Cancelar pedido</button></div>`}</div>`;
    const start = o.prepStart || o.paidAt || o.readyAt, pct = Math.max(4, Math.min(100, Math.round((Date.now() - start) / Math.max(1, o.readyAt - start) * 100)));
    if (st === "preparando") return `<div class="card lp-card st-prep${left <= 0 ? " late" : ""}">${head}${lines(o)}
      <div class="lp-bar" role="progressbar" aria-label="Tiempo de preparación" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <div class="row"><span class="pill ${left <= 0 ? "bad" : left <= 2 ? "warn" : "neutral"}"><i data-lucide="timer"></i>&nbsp;${left <= 0 ? "Atrasado · ya debería estar listo" : `Listo en ${left} min · ${hhmm(o.readyAt)}`}</span><b>${money(o.total)}</b></div>
      ${o.delayMin ? `<p class="tiny">Avisaste una demora de ${o.delayMin} min.</p>` : ""}
      ${confirm || `<button class="btn" type="button" data-lp-ready="${key}"><i data-lucide="package-check"></i>Marcar como listo</button>
      <div class="row"><button class="link b" type="button" data-lp-delay="${key}">Avisar demora +5 min</button><button class="link" type="button" style="color:var(--danger)" data-lp-cancel="${key}">Cancelar pedido</button></div>`}</div>`;
    if (st === "listo") return `<div class="card lp-card ready st-ready">${head}${lines(o)}
      <div class="row"><span class="pill ok">Listo desde las ${hhmm(o.readyAt)}</span><b>${money(o.total)}</b></div>
      ${lpDeliver === key ? `<form class="stack s14" data-lp-code="${key}"><label class="small" style="font-weight:600">Pide el código de 4 dígitos al estudiante</label><div class="row"><div class="input" style="flex:1"><input inputmode="numeric" maxlength="4" autocomplete="off" placeholder="0000" aria-label="Código de retiro"></div><button class="btn" type="submit" style="width:auto;padding:0 18px">Entregar</button></div><button class="link" type="button" data-lp-deliver="">Cerrar</button></form>`
        : `<button class="btn" type="button" data-lp-deliver="${key}"><i data-lucide="hand-platter"></i>Entregar pedido</button>`}</div>`;
    return `<div class="row lp-done"><div><span class="tk-ref">${o.num}</span> <span class="tiny">${who(x)}</span></div><span class="tiny">${o.cancelledAt ? `Cancelado · ${hhmm(o.cancelledAt)}` : `Entregado · ${hhmm(o.pickedAt)}`}</span><b class="${o.cancelledAt ? "neg" : ""}" style="font-size:12px">${o.cancelledAt ? "−" : ""}${money(o.total)}</b></div>`;
  };
  const col = (title, icon, list, st, empty) => `<div class="stack s14 lp-col st-${st === "listo" ? "ready" : "prep"}"><div class="row"><h2 class="sec lp-colh"><span class="lp-ic"><i data-lucide="${icon}"></i></span>${title}</h2><span class="pill neutral">${list.length}</span></div>${list.map(x => card(x, st)).join("") || `<p class="small lp-empty">${empty}</p>`}</div>`;
  document.getElementById("lpBoard").innerHTML = col("En preparación", "chef-hat", prep, "preparando", "No hay pedidos en cocina.") + col("Listos para retirar", "package-check", ready, "listo", "Nada esperando retiro.")
    + `<div class="stack s14 lp-col st-done"><div class="row"><h2 class="sec lp-colh"><span class="lp-ic"><i data-lucide="check"></i></span>Entregados hoy</h2><span class="pill neutral">${done.length}</span></div><div class="card" style="gap:0">${done.map(x => card(x, "done")).join("") || `<p class="small">Todavía no entregas pedidos hoy.</p>`}</div></div>`;
  icons();
}
let lhDraft = null;
function renderLocalMenu() {
  const l = myLocal(); if (!l) return;
  if (!lhDraft) lhDraft = weekOf(l).map(x => ({ ...x }));
  const st = lstate(l.id), n = st.soldout.length;
  document.getElementById("lmLead").textContent = `${l.name} · ${l.tagline}`;
  document.getElementById("lmArt").innerHTML = foodArt(l.id, "sm");
  document.getElementById("lmBody").innerHTML = `
    <div class="card">
      <div class="row"><h2 class="h2">Productos</h2><span class="small">${n ? `${n} agotado${n === 1 ? "" : "s"}` : "Todo disponible"}</span></div>
      <p class="small" style="font-size:13px">Marca lo que se terminó hoy. Los estudiantes lo verán como agotado y no podrán pedirlo.</p>
      ${l.cats.map(c => `<h3 class="h3" style="margin-top:6px">${esc(c.name)}</h3>` + c.items.map(it => {
        const off = st.soldout.includes(it.id);
        return `<div class="lm-item${off ? " off" : ""}">${prodArt(it.id, it.icon, "xs")}<span class="grow"><b>${esc(it.name)}</b><span class="tiny" style="display:block">${money(it.price)}${off ? " · Agotado" : ""}</span></span><button class="switch" type="button" role="switch" aria-checked="${!off}" aria-label="${esc(it.name)} disponible" data-lm-item="${it.id}"></button></div>`;
      }).join("")).join("")}
    </div>
    <div class="stack">
      <div class="card"><h2 class="h2">Recepción de pedidos</h2>
        <p class="small" style="font-size:13px">${isPaused(l.id) ? "Los pedidos están en pausa: los estudiantes ven tu menú, pero no pueden pagar." : (hoursOn(l, new Date()) ? `Estás recibiendo pedidos. Horario de hoy: ${todayHours(l)}.` : "Hoy no abres. Los estudiantes pueden programar retiros para tu próximo día abierto.")}</p>
        <span class="pill ${openState(l).cls}">${isPaused(l.id) ? "En pausa" : openState(l).label}</span>
        ${isPaused(l.id) ? `<button class="btn" type="button" data-lp-pause="0"><i data-lucide="circle-play"></i>Reanudar pedidos</button>` : `<button class="btn ghost" type="button" data-lp-pause="1"><i data-lucide="circle-pause"></i>Pausar pedidos</button>`}
        <p class="tiny">Úsalo si se acumulan pedidos o cierras antes de tiempo. Los pedidos ya pagados siguen en tu tablero.</p></div>
      <form class="card" id="lhForm" novalidate>
        <div class="row"><h2 class="h2">Horario de la semana</h2><button class="link b" type="button" data-lh-default>Restablecer</button></div>
        <p class="small" style="font-size:13px">Los estudiantes ven si estás abierto y solo pueden programar retiros dentro de este horario.</p>
        ${[1, 2, 3, 4, 5, 6, 0].map(d => { const w = lhDraft[d]; return `<div class="lh-row${w.open ? "" : " off"}">
          <button class="switch" type="button" role="switch" aria-checked="${w.open}" aria-label="Abrir el ${DIAS[d].toLowerCase()}" data-lh-day="${d}"></button>
          <b>${DIAS[d]}</b>
          ${w.open ? `<div class="lh-times"><div class="input sm sel"><select data-lh-from="${d}" aria-label="${DIAS[d]}: abre a las">${timeOpts(w.from)}</select><i data-lucide="chevron-down"></i></div><span class="tiny">a</span><div class="input sm sel"><select data-lh-to="${d}" aria-label="${DIAS[d]}: cierra a las">${timeOpts(w.to)}</select><i data-lucide="chevron-down"></i></div></div>` : `<span class="small">Cerrado</span>`}
        </div>`; }).join("")}
        <p class="tiny" id="lhErr" hidden></p>
        <button class="btn" type="submit"><i data-lucide="check"></i>Guardar horario</button>
      </form>
      <div class="notice"><i data-lucide="info"></i><p>Tiempo de preparación que ven los estudiantes: ${l.eta}. Los precios y el menú los ajusta la administración de Nexo.</p></div>
    </div>`;
  icons();
}
function lpFind(key) { const i = key.indexOf("|"); return { email: key.slice(0, i), id: key.slice(i + 1) }; }
document.addEventListener("click", e => {
  const pz = e.target.closest("[data-lp-pause]");
  if (pz) { const l = myLocal(), on = pz.dataset.lpPause === "1"; lstate(l.id).paused = on; saveLocalState(); toast(on ? "Pausaste los pedidos. Los estudiantes no podrán pagar hasta que los reanudes." : "Volviste a recibir pedidos."); current === "local-menu" ? renderLocalMenu() : renderLocalPedidos(); return; }
  const rd = e.target.closest("[data-lp-ready]");
  if (rd) { const { email, id } = lpFind(rd.dataset.lpReady); const o = updateOrder(email, id, o => { o.readyAt = Date.now(); o.readyMarked = true; }); if (o) toast(`${o.num} está listo. Le avisamos al estudiante.`); renderLocalPedidos(); return; }
  const dl = e.target.closest("[data-lp-delay]");
  if (dl) { const { email, id } = lpFind(dl.dataset.lpDelay); const o = updateOrder(email, id, o => { o.readyAt = Math.max(o.readyAt, Date.now()) + 5 * MIN; o.delayMin = (o.delayMin || 0) + 5; }); if (o) toast(`Avisamos una demora: ${o.num} queda para las ${hhmm(o.readyAt)}.`); renderLocalPedidos(); return; }
  const cc = e.target.closest("[data-lp-cancel]"); if (cc) { lpConfirm = cc.dataset.lpCancel; renderLocalPedidos(); return; }
  if (e.target.closest("[data-lp-no]")) { lpConfirm = null; renderLocalPedidos(); return; }
  const cy = e.target.closest("[data-lp-cancel-yes]");
  if (cy) {
    const { email, id } = lpFind(cy.dataset.lpCancelYes), l = myLocal();
    const o = updateOrder(email, id, o => { o.cancelledAt = Date.now(); });
    if (o) {
      pushStudentMove(email, { title: `Pedido cancelado · ${o.num}`, detail: `${l.name} · ${l.place}`, amount: "+" + money(o.total), pill: "Reembolsado", pillCls: "ok", date: fmtD(new Date()), icon: "rotate-ccw", go: "pedido", goLabel: "Ver pedido →", order: o.id });
      toast(`Cancelaste ${o.num} y devolvimos ${money(o.total)}.`);
    }
    lpConfirm = null; renderLocalPedidos(); return;
  }
  const dv = e.target.closest("[data-lp-deliver]");
  if (dv) { lpDeliver = dv.dataset.lpDeliver || null; renderLocalPedidos(); const inp = document.querySelector("[data-lp-code] input"); if (inp) inp.focus(); return; }
});
document.addEventListener("click", e => {
  const it = e.target.closest("[data-lm-item]");
  if (it) {
    const l = myLocal(), st = lstate(l.id), id = it.dataset.lmItem, name = itemById(l, id).name, avail = st.soldout.includes(id);
    st.soldout = avail ? st.soldout.filter(x => x !== id) : [...st.soldout, id];
    saveLocalState(); toast(avail ? `${name} vuelve a estar disponible.` : `${name} quedó como agotado.`); renderLocalMenu();
  }
});
function deliverByCode(code, onlyKey) {
  const l = myLocal();
  const x = allOrders().find(x => x.o.local === l.id && orderStatus(x.o) === "listo" && x.o.code === code && (!onlyKey || `${x.email}|${x.o.id}` === onlyKey));
  if (!x) return null;
  return updateOrder(x.email, x.o.id, o => { o.pickedAt = Date.now(); o.readyNotified = true; });
}
document.addEventListener("submit", e => {
  const f = e.target;
  if (f.matches("[data-lp-code]") || f.id === "lpCodeForm") {
    e.preventDefault();
    const inp = f.querySelector("input"), code = inp.value.replace(/\D/g, "");
    if (code.length !== 4) { inp.focus(); toast("El código tiene 4 dígitos."); return; }
    const o = deliverByCode(code, f.dataset.lpCode || null);
    if (!o) { inp.closest(".input").classList.add("bad-input"); inp.select(); toast(f.dataset.lpCode ? "Ese código no corresponde a este pedido." : "No hay ningún pedido listo con ese código."); return; }
    lpDeliver = null; if (f.id === "lpCodeForm") f.reset();
    toast(`Entregaste ${o.num}. ¡Listo!`); renderLocalPedidos();
  }
});
document.addEventListener("input", e => { if (e.target.closest && e.target.closest(".bad-input")) e.target.closest(".bad-input").classList.remove("bad-input"); });
/* Entre pestañas: si otra cuenta cambia pedidos o el estado de un local, esta pantalla se actualiza sola */
window.addEventListener("storage", e => {
  if (!e.key) return;
  if (e.key === "nexo-localstate") loadLocalState();
  if (e.key === K("nexo-orders")) { try { orders = JSON.parse(e.newValue || "[]") || []; } catch (err) {} }
  if (e.key === "nexo-tickets") { try { tickets = JSON.parse(e.newValue || "[]") || tickets; } catch (err) {} }
  if (!(e.key.startsWith("nexo-orders:") || e.key === "nexo-localstate" || e.key === "nexo-tickets")) return;
  const r = { comida: () => { renderFoodList(); renderFoodOrders(); }, local: renderLocal, carrito: renderCarrito, pedido: renderPedido, soporte: renderSoporte, "local-pedidos": renderLocalPedidos, "local-menu": renderLocalMenu, gestion: renderGestion, moderacion: renderModeracion, "creador-equipo": renderCreadorEquipo }[current];
  try { checkOrders(); } catch (err) {}
  if (r && current !== "pedido" && current !== "comida") try { r(); } catch (err) {}
});

/* ---------- Invitaciones del equipo: enlace personal (#invitacion-TOKEN), vencen a los 7 días ----------
   La persona invitada activa su cuenta sin carnet en #invitacion. También puede buscar su invitación por correo. */
const INV_DAYS = 7;
const genToken = () => Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
function newInvite(email, role) { const t = Date.now(); return { email, role, by: user.email, byName: user.full, t, exp: t + INV_DAYS * 24 * HOUR, token: genToken() }; }
// Invitaciones guardadas antes de esta función: se les da enlace y vencimiento
if (invites.some(i => !i.token || !i.exp)) { invites.forEach(i => { if (!i.token) i.token = genToken(); if (!i.exp) i.exp = (i.t || Date.now()) + INV_DAYS * 24 * HOUR; }); saveInvites(); }
const invExpired = i => Date.now() > i.exp;
const inviteLink = i => location.href.split("#")[0] + "#invitacion-" + i.token;
const invByEmail = e => invites.find(i => i.email === e);
const invNote = i => !i ? "" : invExpired(i) ? `Venció el ${fmtD(new Date(i.exp))}` : `Vence el ${fmtD(new Date(i.exp))}`;
const ROLE_CAN = { mod: "Responder tickets de estudiantes y ofrecer reembolsos o cancelaciones.", admin: "Asignar moderadores y consultar todos los tickets de soporte." };
let ivToken = null, ivEmail = "", ivError = "";
function renderInvitacion() {
  const box = document.getElementById("ivBody");
  const inv = ivToken ? invites.find(i => i.token === ivToken) : ivEmail ? invByEmail(ivEmail) : null;
  const err = ivError ? `<div class="notice warn" role="alert"><i data-lucide="circle-alert"></i><p>${ivError}</p></div>` : "";
  if (!inv) {
    box.innerHTML = `<div><h1 class="h1">Activa tu cuenta del equipo</h1><p class="lead">${ivToken ? "Ese enlace de invitación ya no es válido: puede que se haya usado o cancelado." : "Escribe el correo al que te llegó la invitación."}</p></div>
      <form class="card" id="ivFind" novalidate>
        <div class="field"><label for="iv-find">Correo institucional</label><div class="input"><input id="iv-find" type="email" placeholder="nombre@unimet.edu.ve" autocomplete="email" value="${esc(ivEmail)}"><i data-lucide="mail"></i></div></div>
        ${err}<button class="btn" type="submit"><i data-lucide="search"></i>Buscar mi invitación</button>
      </form>
      <p class="center small">¿Eres estudiante? <button class="link b" type="button" data-go="registro">Crea tu cuenta con tu carnet</button></p>`;
    icons(); return;
  }
  const rl = ROLE_LABEL[inv.role];
  if (invExpired(inv)) {
    box.innerHTML = `<div><h1 class="h1">Tu invitación venció</h1><p class="lead">La invitación para ${esc(inv.email)} venció el ${fmtD(new Date(inv.exp))}.</p></div>
      <div class="card"><p style="font-size:13px">Pídele a ${esc(inv.byName || "la administración de Nexo")} que te la reenvíe desde el equipo de gestión. Te llegará un enlace nuevo, válido por ${INV_DAYS} días.</p>
      <button class="btn ghost" type="button" data-iv-other><i data-lucide="mail"></i>Buscar con otro correo</button></div>`;
    icons(); return;
  }
  box.innerHTML = `<div><h1 class="h1">Activa tu cuenta</h1><p class="lead">${esc(inv.byName || "La administración de Nexo")} te invitó como <b>${rl.toLowerCase()}</b> de Nexo.</p></div>
    <div class="notice"><i data-lucide="${inv.role === "admin" ? "shield-check" : "messages-square"}"></i><div><b>Acceso: ${rl}</b> ${ROLE_CAN[inv.role] || ""}</div></div>
    <form class="card" id="ivForm" novalidate>
      <div class="field"><label for="iv-mail">Correo institucional</label><div class="input"><input id="iv-mail" type="email" value="${esc(inv.email)}" readonly aria-readonly="true"><i data-lucide="lock"></i></div><p class="tiny">Es el correo de tu invitación. ${invNote(inv)}.</p></div>
      <div class="field"><label for="iv-name">Nombre completo</label><div class="input"><input id="iv-name" type="text" placeholder="Ej.: Andrea Soto" autocomplete="name"><i data-lucide="user"></i></div></div>
      <div class="field"><label for="iv-pass">Contraseña</label><div class="input"><input id="iv-pass" type="password" minlength="8" placeholder="Crea una contraseña" autocomplete="new-password"><button class="eye" type="button" data-eye="iv-pass" aria-label="Mostrar contraseña" aria-pressed="false"><i data-lucide="eye-off"></i></button></div><p class="tiny">Mínimo 8 caracteres, con al menos un número.</p></div>
      <div class="field"><label for="iv-pass2">Repite la contraseña</label><div class="input"><input id="iv-pass2" type="password" autocomplete="new-password"></div></div>
      <label class="remember" for="iv-terms"><input id="iv-terms" type="checkbox">Acepto los términos de uso y la política de privacidad del equipo de Nexo.</label>
      ${err}
      <button class="btn" type="submit"><i data-lucide="user-check"></i>Activar cuenta</button>
    </form>
    <p class="center small">¿No eres tú? <button class="link b" type="button" data-iv-other>Buscar con otro correo</button></p>`;
  icons();
}
document.addEventListener("submit", e => {
  const f = e.target;
  if (f.id === "ivFind") {
    e.preventDefault();
    const email = normEmail(document.getElementById("iv-find").value);
    ivEmail = email; ivToken = null; ivError = "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ivError = "Escribe un correo válido.";
    else if (accounts.some(a => a.email === email)) ivError = `Ese correo ya tiene una cuenta. <button class="link b" type="button" data-go="login" style="font-size:12px;color:inherit;text-decoration:underline">Inicia sesión</button>.`;
    else if (!invByEmail(email)) ivError = "No hay una invitación pendiente para ese correo. Pide a la administración de Nexo que te invite.";
    renderInvitacion(); return;
  }
  if (f.id === "ivForm") {
    e.preventDefault();
    const inv = ivToken ? invites.find(i => i.token === ivToken) : invByEmail(ivEmail);
    if (!inv || invExpired(inv)) { renderInvitacion(); return; }
    const name = document.getElementById("iv-name"), p1 = document.getElementById("iv-pass"), p2 = document.getElementById("iv-pass2");
    const fail = (msg, el) => { ivError = msg; const keep = { n: name.value, a: p1.value, b: p2.value, t: document.getElementById("iv-terms").checked }; renderInvitacion();
      document.getElementById("iv-name").value = keep.n; document.getElementById("iv-pass").value = keep.a; document.getElementById("iv-pass2").value = keep.b; document.getElementById("iv-terms").checked = keep.t;
      if (el) { const x = document.getElementById(el); x.closest(".field").classList.add("bad"); x.focus(); } };
    if (!name.value.trim()) return fail("Escribe tu nombre completo.", "iv-name");
    if (p1.value.length < 8 || !/\d/.test(p1.value)) return fail("La contraseña debe tener al menos 8 caracteres y un número.", "iv-pass");
    if (p1.value !== p2.value) return fail("Las contraseñas no coinciden.", "iv-pass2");
    if (!document.getElementById("iv-terms").checked) return fail("Acepta los términos de uso para continuar.", null);
    if (accounts.some(a => a.email === inv.email)) return fail("Ese correo ya tiene una cuenta. Inicia sesión.", null);
    const full = cleanName(name.value), now = new Date();
    accounts.push({ full, carnet: "", email: inv.email, pass: passKey(p1.value), role: inv.role, created: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` });
    saveAccounts();
    invites = invites.filter(i => i !== inv); saveInvites();
    audit.push({ t: Date.now(), who: full, role: inv.role, type: "rol", text: `Activó su cuenta de ${ROLE_LABEL[inv.role].toLowerCase()} (invitación de ${inv.byName || "la administración"}).` });
    try { localStorage.setItem("nexo-audit", JSON.stringify(audit)); } catch (err) {}
    ivError = ""; ivToken = null; ivEmail = "";
    enterApp(inv.email, true, `Cuenta activada. Te damos la bienvenida al equipo, ${full.split(" ")[0]}.`);
  }
});
document.addEventListener("input", e => { if (e.target.closest && e.target.closest("#ivForm .field.bad")) e.target.closest(".field").classList.remove("bad"); });
document.addEventListener("click", e => {
  if (e.target.closest("[data-iv-other]")) { ivToken = null; ivEmail = ""; ivError = ""; renderInvitacion(); return; }
  if (e.target.closest('[data-go="invitacion"]')) { ivToken = null; ivError = ""; }
  const cp = e.target.closest("[data-inv-copy]");
  if (cp) {
    const i = invByEmail(cp.dataset.invCopy); if (!i) return;
    if (invExpired(i)) { toast("Esa invitación venció. Reenvíala para generar un enlace nuevo."); return; }
    const link = inviteLink(i);
    try { navigator.clipboard.writeText(link).then(() => toast(`Copiamos el enlace de ${i.email}. Envíaselo por correo.`), () => toast(link)); } catch (err) { toast(link); }
    return;
  }
  const rn = e.target.closest("[data-inv-renew]");
  if (rn) {
    const i = invByEmail(rn.dataset.invRenew); if (!i) return;
    i.exp = Date.now() + INV_DAYS * 24 * HOUR; i.token = genToken(); saveInvites();
    logAudit("rol", `Reenvió la invitación de ${i.email}.`);
    toast(`Reenviamos la invitación a ${i.email}. Vence el ${fmtD(new Date(i.exp))}.`);
    ceMenu = null; if (current === "creador-equipo") renderCreadorEquipo(); else renderEquipo();
  }
});

/* ---------- Menú de usuario y cambio de modo ----------
   El avatar (barra móvil, barra de escritorio y menú lateral) abre este menú. Administración, moderación y el creador
   pueden pasar de su espacio de gestión a usar Nexo como cualquier usuario (pedir comida, estacionamiento, canchas). */
const DUAL = ["owner", "creator", "admin", "mod"].includes(roleOf(account));
const inStaffScreen = () => !!STAFF_SCREENS[current];
const HOME_LABEL = { owner: "Datos reales", creator: "Resumen de Nexo", admin: "Tickets abiertos", mod: "Bandeja de tickets", local: "Pedidos del local" };
function userMenuHTML() {
  const role = roleOf(account), staffNow = inStaffScreen();
  const item = (attrs, icon, label, sub = "") => `<button class="um-item" type="button" role="menuitem" ${attrs}><i data-lucide="${icon}"></i><span class="grow">${label}${sub ? `<span class="tiny">${sub}</span>` : ""}</span></button>`;
  const roleTxt = role === "estudiante" ? (user.carnet ? `Carnet ${user.carnet}` : "Estudiante") : role === "local" ? "Comercio" : ROLE_LABEL[role];
  return `<div class="um-head"><span class="avatar">${esc(initialsOf(user.full))}</span><div style="min-width:0"><b>${esc(user.full)}</b><span class="tiny">${esc(user.email)}</span><span class="pill ${role === "estudiante" ? "neutral" : "ok"}" style="margin-top:6px">${roleTxt}</span></div></div>
    ${DUAL ? `<div class="um-modes" role="group" aria-label="Modo de uso">
      <button type="button" class="${staffNow ? "on" : ""}" data-um-mode="gestion" aria-pressed="${staffNow}"><i data-lucide="shield-check"></i><span><b>Modo gestión</b><span class="tiny">${HOME_LABEL[role]}</span></span></button>
      <button type="button" class="${staffNow ? "" : "on"}" data-um-mode="usuario" aria-pressed="${!staffNow}"><i data-lucide="user-round"></i><span><b>Modo usuario</b><span class="tiny">Usar Nexo con tu cuenta</span></span></button>
    </div>` : ""}
    <div class="um-list">
      ${role !== "local" ? item(`data-um-go="perfil"`, "user-round", "Mi cuenta", "Datos personales y seguridad") : ""}
      ${role === "estudiante" || (DUAL && !staffNow) ? item(`data-um-go="notificaciones"`, "bell", "Notificaciones") + item(`data-um-go="actividad"`, "receipt-text", "Mi actividad") : ""}
      ${role === "estudiante" || (DUAL && !staffNow) ? item(`data-um-go="soporte"`, "message-circle", "Ayuda y soporte") : ""}
    </div>
    <div class="um-theme"><span class="tiny">Apariencia</span><div data-theme-seg>${themeSeg()}</div></div>
    ${(() => { try { return installable() ? `<div class="um-list">${item(`data-install`, "download", "Instalar la app", "En tu pantalla de inicio")}</div>` : ""; } catch (err) { return ""; } })()}
    <div class="um-list">${item(`data-logout`, "log-out", "Cerrar sesión")}</div>`;
}
let umOpen = null;
function openUserMenu(btn) {
  closeUserMenu();
  const m = document.createElement("div");
  m.className = "usermenu"; m.setAttribute("role", "menu"); m.setAttribute("aria-label", "Menú de usuario");
  m.innerHTML = userMenuHTML();
  document.body.append(m);
  const r = btn.getBoundingClientRect(), mobile = innerWidth < 700;
  if (mobile) m.classList.add("sheet");
  else {
    const w = 300, left = Math.min(Math.max(12, r.right - w), innerWidth - w - 12);
    const below = r.bottom + 8, up = r.top > innerHeight / 2;
    m.style.left = (r.left < 260 ? Math.max(12, r.left) : left) + "px";
    if (up) m.style.bottom = (innerHeight - r.top + 8) + "px"; else m.style.top = below + "px";
  }
  const shade = document.createElement("div"); shade.className = "um-shade"; document.body.append(shade);
  umOpen = { m, shade, btn }; btn.setAttribute("aria-expanded", "true");
  icons();
  const first = m.querySelector("button"); if (first) first.focus();
}
function closeUserMenu() {
  if (!umOpen) return;
  umOpen.m.remove(); umOpen.shade.remove(); umOpen.btn.setAttribute("aria-expanded", "false");
  const b = umOpen.btn; umOpen = null; if (document.body.contains(b)) b.focus({ preventScroll: true });
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-usermenu]");
  if (t) { e.preventDefault(); umOpen && umOpen.btn === t ? closeUserMenu() : openUserMenu(t); return; }
  if (umOpen && e.target.closest(".um-shade")) { closeUserMenu(); return; }
  const g = e.target.closest("[data-um-go]");
  if (g) { closeUserMenu(); go(g.dataset.umGo); return; }
  const md = e.target.closest("[data-um-mode], [data-mode-switch]");
  if (md) {
    const to = md.dataset.umMode || md.dataset.modeSwitch;
    closeUserMenu();
    if (to === "gestion") { go(ROLE_HOME[roleOf(account)]); toast("Volviste al modo gestión."); }
    else { go("inicio"); toast("Estás en modo usuario: usa Nexo con tu cuenta. Vuelve a gestión desde tu avatar."); }
  }
});
document.addEventListener("keydown", e => {
  if (!umOpen) return;
  if (e.key === "Escape") { closeUserMenu(); return; }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const b = [...umOpen.m.querySelectorAll("button")], i = b.indexOf(document.activeElement);
    b[(i + (e.key === "ArrowDown" ? 1 : -1) + b.length) % b.length].focus(); e.preventDefault();
  }
});
window.addEventListener("hashchange", closeUserMenu);
/* En modo usuario, el personal ve un acceso directo de vuelta a gestión; las cuentas sin carnet no ven el estado de cuenta universitario */
if (DUAL) {
  document.querySelectorAll("section.app:not([data-staff])").forEach(sec => {
    const acts = sec.querySelector(".deskbar .acts");
    if (acts) acts.insertAdjacentHTML("afterbegin", `<button class="pill ok modebtn" type="button" data-mode-switch="gestion"><i data-lucide="shield-check"></i>Ir a gestión</button>`);
    const tag = sec.querySelector("[data-space-tag]"); if (tag) tag.textContent = "MODO USUARIO";
    const nav = sec.querySelector(".side .nav");
    if (nav) nav.insertAdjacentHTML("beforeend", `<button type="button" class="mode-nav" data-mode-switch="gestion"><i data-lucide="shield-check"></i>Volver a gestión</button>`);
  });
  document.querySelectorAll("section.app[data-staff]").forEach(sec => {
    const nav = sec.querySelector(".side .nav");
    if (nav) nav.insertAdjacentHTML("beforeend", `<button type="button" class="mode-nav" data-mode-switch="usuario"><i data-lucide="user-round"></i>Usar Nexo como usuario</button>`);
  });
}
if (account && !account.carnet) {
  document.querySelectorAll('section.app:not([data-staff]) .side .nav [data-go="materias"]').forEach(b => b.remove());
  document.querySelectorAll("section.app:not([data-staff]) [data-trim-pill]").forEach(p => p.remove());
  document.querySelectorAll('#inicio [data-go="materias"], #inicio [data-go="caja"]').forEach(el => { (el.closest(".card") || el).hidden = true; });
}

/* Tasa BCV en pantallas estáticas: Inicio y lista de planes */
function refreshBcvUI() {
  document.querySelectorAll("[data-bcv-pill]").forEach(p => { p.textContent = `Dólar BCV · ${bsAmt(BCV.rate)} · ${bcvDateTxt()}`; p.classList.toggle("neutral", bcvStale()); p.classList.toggle("ok", !bcvStale()); p.classList.remove("warn"); });
  document.querySelectorAll("#planList .opt.plan").forEach(b => { const pr = b.querySelector(".plan-price"); if (!pr) return; pr.querySelector(".bsv")?.remove(); pr.insertAdjacentHTML("beforeend", bsTag(parseFloat(b.dataset.price.replace(",", ".")))); });
  try { renderRecarga(); } catch (err) {}
}
refreshBcvUI();
window.addEventListener("storage", e => { if (e.key === "nexo-bcv") { try { BCV = { ...BCV0, ...JSON.parse(e.newValue || "{}") }; } catch (err) {} refreshBcvUI(); } });
/* ---------- Pago universitario por transferencia (Caja): USD exacto o Bs. a tasa BCV (−1 %/+5 %) ----------
   Mismas reglas que el comprobante de comida; los datos se guardan en pagos[id] al quedar "En revisión". */
let utCur = "usd", utFile = null;
const UT_ACC = { usd: ["Cuenta corriente en divisas (USD)", "0105 0000 00 0000000000"], bs: ["Cuenta corriente en bolívares", "0105 0000 00 2222222222"] };
const UT_FIELDS = ["ut-f", "ut-b", "ut-r", "ut-m", "ut-file"];
const utSel = () => activeInvoices().filter(iv => paySel.includes(iv.id) && payableInv().includes(iv));
const utUsd = () => utSel().reduce((a, iv) => a + amountOf(iv), 0);
const utExpected = () => utCur === "usd" ? utUsd() : Math.round(utUsd() * bcvRate() * 100) / 100;
const utFmt = n => utCur === "usd" ? money(n) : bsAmt(n);
function utRefresh() {
  document.querySelectorAll("[data-ut-cur]").forEach(b => { const on = b.dataset.utCur === utCur; b.classList.toggle("ok", on); b.classList.toggle("neutral", !on); b.setAttribute("aria-checked", String(on)); });
  const [t, acc] = UT_ACC[utCur], exp = utExpected(), usd = utUsd();
  const q = k => document.querySelector(`[data-ut="${k}"]`);
  q("acctype").textContent = t; q("acc").textContent = acc; q("expect").textContent = utFmt(exp); q("cta").textContent = utFmt(exp);
  q("ratenote").textContent = usd ? (utCur === "bs" ? `${money(usd)} a la tasa BCV del ${bcvDateTxt()} (${bsAmt(bcvRate())} por US$).` : `En bolívares serían ${bsOf(usd)} a la tasa BCV del ${bcvDateTxt()}.`) : "Elige arriba qué facturas vas a pagar.";
  q("mlabel").textContent = `Monto transferido · ${utCur === "usd" ? "USD" : "Bs."}`;
  q("mprefix").textContent = utCur === "usd" ? "$" : "Bs.";
  q("mhint").innerHTML = `Debe ser ${utFmt(exp)}. <button class="link b" type="button" data-ut-fill style="font-size:11px">Usar este monto</button>`;
}
function utCheck(id) {
  const v = (document.getElementById(id).value || "").trim();
  if (id === "ut-f") {
    if (!v) return "Indica la fecha de la transferencia.";
    const days = Math.round((day0(new Date()) - day0(new Date(v + "T12:00"))) / 864e5);
    if (days < 0) return "La fecha no puede ser posterior a hoy.";
    if (days > PM_MAX_DAYS) return `Solo puedes registrar transferencias de los últimos ${PM_MAX_DAYS} días. Para una más antigua, escríbenos en Soporte.`;
    return "";
  }
  if (id === "ut-b") return v ? "" : "Elige el banco desde el que transferiste.";
  if (id === "ut-r") {
    if (!v) return "Escribe el número de referencia de tu comprobante.";
    if (v.length < 6) return "La referencia tiene al menos 6 dígitos. Cópiala completa de tu comprobante.";
    const dup = Object.entries(pagos).find(([, p]) => p && p.ref === v);
    return dup ? `Ya usaste esa referencia en la factura de ${(MONTHS.find(m => m.id === dup[0]) || { mes: dup[0] }).mes}. Si es otra transferencia, revisa el número.` : "";
  }
  if (id === "ut-m") {
    const n = parseAmt(v), exp = utExpected();
    if (!(n > 0)) return "Escribe el monto que transferiste.";
    if (utCur === "usd") return Math.abs(n - exp) < 0.005 ? "" : n < exp ? `Transferiste ${money(n)}, pero el total es ${money(exp)} (faltan ${money(exp - n)}).` : `Transferiste ${money(n - exp)} de más. El total es ${money(exp)}: escribe el monto exacto de tu comprobante.`;
    if (n < exp * PM_TOL_LOW) return `Ese monto equivale a ${money(n / bcvRate())}. El total es ${bsAmt(exp)} a tasa BCV (faltan ${bsAmt(exp - n)}).`;
    if (n > exp * PM_TOL_HIGH) return `Transferiste ${bsAmt(n - exp)} de más. Escribe el monto exacto de tu comprobante.`;
    return "";
  }
  if (id === "ut-file") {
    if (!utFile) return "Adjunta el comprobante de tu banco (PDF, JPG o PNG).";
    if (!/\.(pdf|jpe?g|png)$/i.test(utFile.name)) return "El comprobante debe ser PDF, JPG o PNG.";
    if (utFile.size > 5 * 1024 * 1024) return `El archivo pesa ${(utFile.size / 1048576).toFixed(1).replace(".", ",")} MB. El máximo es 5 MB.`;
    return "";
  }
  return "";
}
function utShow(id, msg) {
  const field = document.getElementById(id).closest(".field");
  let hint = field.querySelector("[data-ut-err]");
  if (!hint) { hint = document.createElement("p"); hint.className = "tiny pm-err"; hint.dataset.utErr = id; hint.setAttribute("role", "alert"); field.append(hint); }
  field.classList.toggle("bad", !!msg); hint.hidden = !msg; hint.textContent = msg || "";
  if (id !== "ut-file") document.getElementById(id).setAttribute("aria-invalid", msg ? "true" : "false");
}
function utReset() {
  utFile = null; document.getElementById("utForm").reset();
  const t = new Date(); document.getElementById("ut-f").value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  document.getElementById("utFileChip").hidden = true; UT_FIELDS.forEach(id => utShow(id, "")); document.getElementById("utError").hidden = true;
}
(() => { const src = document.getElementById("pm-bank"), dst = document.getElementById("ut-b"); [...src.options].slice(1).forEach(o => dst.add(new Option(o.text, o.value || o.text))); })();
utReset(); utRefresh();
document.getElementById("ut-r").addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, ""); });
document.getElementById("ut-m").addEventListener("input", e => { e.target.value = e.target.value.replace(/[^\d,.]/g, ""); });
document.getElementById("utForm").addEventListener("input", e => { if (UT_FIELDS.includes(e.target.id)) utShow(e.target.id, ""); document.getElementById("utError").hidden = true; });
document.getElementById("utForm").addEventListener("change", e => {
  if (e.target.id === "ut-file") {
    utFile = e.target.files[0] || null; document.getElementById("utFileChip").hidden = !utFile;
    if (utFile) { document.querySelector('[data-ut="fname"]').textContent = utFile.name; document.querySelector('[data-ut="fsize"]').textContent = utFile.size < 1048576 ? Math.max(1, Math.round(utFile.size / 1024)) + " KB" : (utFile.size / 1048576).toFixed(1).replace(".", ",") + " MB"; }
    utShow("ut-file", utCheck("ut-file")); return;
  }
  if (e.target.id === "ut-b" || e.target.id === "ut-f") utShow(e.target.id, utCheck(e.target.id));
});
document.getElementById("utForm").addEventListener("focusout", e => { if (["ut-r", "ut-m"].includes(e.target.id) && e.target.value.trim()) utShow(e.target.id, utCheck(e.target.id)); });
document.getElementById("utForm").addEventListener("keydown", e => { if (e.target.matches("label.upload") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); document.getElementById("ut-file").click(); } });
document.getElementById("caja").addEventListener("click", e => {
  const c = e.target.closest("[data-ut-cur]");
  if (c) { utCur = c.dataset.utCur; utRefresh(); const m = document.getElementById("ut-m"); if (m.value) utShow("ut-m", utCheck("ut-m")); return; }
  if (e.target.closest("[data-ut-open]")) { const f = document.getElementById("utForm"); f.hidden = false; e.target.closest("[data-ut-open]").hidden = true; utRefresh(); document.getElementById("ut-b").focus(); return; }
  if (e.target.closest("[data-ut-fill]")) { const m = document.getElementById("ut-m"); m.value = utFmt(utExpected()).replace(/^\$|^Bs\. /, ""); utShow("ut-m", ""); m.focus(); return; }
  if (e.target.closest("[data-ut-rmfile]")) { utFile = null; document.getElementById("ut-file").value = ""; document.getElementById("utFileChip").hidden = true; return; }
  if (e.target.closest("[data-ut-copyacc]")) { const acc = UT_ACC[utCur][1]; try { navigator.clipboard.writeText(acc).then(() => toast("Número de cuenta copiado"), () => toast(acc)); } catch (err) { toast(acc); } }
});
document.getElementById("utForm").addEventListener("submit", e => {
  e.preventDefault();
  const sel = utSel();
  if (!sel.length) { toast("Elige qué facturas vas a pagar."); return; }
  const errs = UT_FIELDS.map(id => [id, utCheck(id)]); errs.forEach(([id, m]) => utShow(id, m));
  const bad = errs.filter(x => x[1]);
  if (bad.length) {
    const box = document.getElementById("utError");
    box.querySelector('[data-ut="err"]').textContent = bad.length === 1 ? bad[0][1] : `Revisa los ${bad.length} datos marcados en rojo antes de enviar tu comprobante.`;
    box.hidden = false; (bad[0][0] === "ut-file" ? document.querySelector("#utForm label.upload") : document.getElementById(bad[0][0])).focus(); return;
  }
  const v = id => document.getElementById(id).value.trim(), paid = parseAmt(v("ut-m")), usdTotal = utUsd(), rPath = sbUploadReceipt(utFile, "factura");
  sel.forEach(iv => { const m = amountOf(iv); pagos[iv.id] = { estado: "revision", ...(rPath ? { receiptPath: rPath, studentName: user.full } : {}), monto: m, pp: statusOf(iv) === "pronto", ref: v("ut-r"), bank: v("ut-b"), currency: utCur, paidAmount: utCur === "bs" ? Math.round(paid * m / usdTotal * 100) / 100 : m, bcvRate: utCur === "bs" ? bcvRate() : undefined, receipt: utFile.name, date: v("ut-f"), sentAt: Date.now() }; });
  savePagos();
  addMovement(sel.map(iv => `Factura de ${iv.mes}`).join(" + "), `Universidad · Transferencia${utCur === "bs" ? ` en Bs. (${bsAmt(paid)})` : ""} · Ref. ${v("ut-r").slice(-6)}`, money(usdTotal), "En revisión", "neutral");
  utReset(); document.getElementById("utForm").hidden = true; document.querySelector("[data-ut-open]").hidden = false;
  defaultSel(); renderDebt();
  showDebtNotice("Comprobante enviado.", "La factura queda en revisión y tu saldo se actualiza cuando la universidad valide la transferencia.");
  go("materias");
});
/* ---------- Caja: validar pagos en revisión (administración y creador) ----------
   Lee de todas las cuentas: facturas universitarias (nexo-pagos:<correo>, estado "revision") y recargas de wallet
   por Pago Móvil (nexo-pendrec:<correo>). Aprobar o rechazar actualiza los datos, el movimiento y el saldo del estudiante. */
const VL_REASONS = ["El monto no coincide con el comprobante", "No encontramos la referencia en el banco", "El comprobante no se lee bien", "La transferencia llegó a otra cuenta"];
const MES_DE = id => (MONTHS.find(m => m.id === id) || { mes: id }).mes;
function seedCaja() {
  if (sbShared()) return; // con cuenta real, Caja solo muestra pagos reales
  try { if (localStorage.getItem("nexo-cajaseed")) return; localStorage.setItem("nexo-cajaseed", "1"); } catch (err) { return; }
  const n = Date.now(), d = k => { const x = new Date(n - k * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  const put = (key, fn) => { try { const v = fn(JSON.parse(localStorage.getItem(key) || "null")); localStorage.setItem(key, JSON.stringify(v)); } catch (err) {} };
  put("nexo-pagos:sofia.diaz@correo.unimet.edu.ve", p => ({ ...(p || {}), nov: { estado: "revision", monto: 480, pp: false, ref: "0045671234", bank: "Banesco · 0134", currency: "usd", paidAmount: 480, receipt: "transferencia_noviembre.pdf", date: d(2), sentAt: n - 2 * 864e5, studentName: "Sofía Díaz" } }));
  put("nexo-pagos:valeria.ruiz@correo.unimet.edu.ve", p => ({ ...(p || {}), nov: { estado: "revision", monto: 300, pp: true, ref: "7788123400", bank: "Banco de Venezuela · 0102", currency: "bs", paidAmount: Math.round(300 * bcvRate() * 100) / 100, bcvRate: bcvRate(), receipt: "pago_nov.jpg", date: d(1), sentAt: n - 864e5, studentName: "Valeria Ruiz" } }));
  put("nexo-pendrec:luis.perez@correo.unimet.edu.ve", r => [...(r || []), { id: "r" + (n - 5 * 36e5), amount: 20, ref: "0098765432", bank: "Mercantil · 0105", date: d(0), bs: Math.round(20 * bcvRate() * 100) / 100, estado: "revision", sentAt: n - 5 * 36e5, studentName: "Luis Pérez" }]);
}
function cajaItems() {
  if (sbShared()) return sbCajaItems();
  const out = [];
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith("nexo-pagos:")) {
        const email = k.slice(11), pg = JSON.parse(localStorage.getItem(k) || "{}") || {};
        Object.entries(pg).forEach(([id, p]) => { if (p && ["revision", "pagada", "rechazada"].includes(p.estado) && (p.estado === "revision" || p.validatedAt || p.rejectedAt)) out.push({ kind: "factura", key: k, email, id, p, who: p.studentName || nameOf(email), usd: p.monto, title: `Factura de ${MES_DE(id)}`, sent: p.sentAt || (p.date ? new Date(p.date + "T12:00").getTime() : 0), done: p.estado !== "revision" }); });
      }
      if (k.startsWith("nexo-pendrec:")) {
        const email = k.slice(13), list = JSON.parse(localStorage.getItem(k) || "[]") || [];
        list.forEach(r => out.push({ kind: "recarga", key: k, email, id: r.id, p: { ...r, currency: "bs", paidAmount: r.bs, receipt: null }, who: r.studentName || nameOf(email), usd: r.amount, title: "Recarga de wallet · Pago Móvil", sent: r.sentAt || +String(r.id).slice(1) || 0, done: r.estado !== "revision" }));
      }
    });
  } catch (err) {}
  return out.sort((a, b) => b.sent - a.sent);
}
let vlTab = "pend", vlReject = null;
function renderValidar() {
  if (["creator", "owner"].includes(roleOf(account))) relabelForCreator(roleOf(account));
  seedCaja();
  const all = cajaItems(), pend = all.filter(x => !x.done), today = day0(new Date()).getTime();
  const doneToday = all.filter(x => x.done && ((x.p.validatedAt || x.p.rejectedAt || 0) >= today));
  const k = (label, val, sub, ic) => `<div class="card kpi static sk"><div class="row start" style="gap:10px">${skIc(ic)}<span class="small">${label}</span></div><b class="kv-big">${val}</b><span class="tiny">${sub}</span></div>`;
  document.getElementById("vlKpis").innerHTML = k("Por validar", pend.length, pend.length ? `El más antiguo: ${ago(Math.min(...pend.map(x => x.sent)))}` : "Todo al día", "hourglass")
    + k("Monto por validar", money(pend.reduce((a, x) => a + x.usd, 0)), `${pend.filter(x => x.p.currency === "bs").length} en bolívares`, "banknote")
    + k("Revisados hoy", doneToday.length, `${doneToday.filter(x => x.p.estado === "pagada" || x.p.estado === "aprobada").length} aprobados · ${doneToday.filter(x => x.p.estado === "rechazada").length} rechazados`, "badge-check");
  const tabs = [["pend", `Por validar · ${pend.length}`], ["factura", "Facturas"], ["recarga", "Recargas"], ["done", "Revisados"]];
  document.getElementById("vlTabs").innerHTML = tabs.map(([t, l]) => `<button class="pill ${t === vlTab ? "ok" : "neutral"}" type="button" data-vl-tab="${t}">${l}</button>`).join("");
  const list = all.filter(x => vlTab === "pend" ? !x.done : vlTab === "done" ? x.done : !x.done && x.kind === vlTab);
  renderVlBulk(list);
  document.getElementById("vlList").innerHTML = list.map(x => {
    const p = x.p, key = `${x.key}|${x.id}`, bs = p.currency === "bs";
    const state = !x.done ? `<span class="pill warn">En revisión</span>` : p.estado === "rechazada" ? `<span class="pill bad">Rechazado</span>` : `<span class="pill ok">Aprobado</span>`;
    const actions = x.done
      ? `<p class="tiny">${p.estado === "rechazada" ? `Rechazado: ${esc(p.motivo)}` : "Aprobado"} · por ${esc(p.validatedBy || p.rejectedBy || "Caja")} · ${ago(p.validatedAt || p.rejectedAt)}</p>`
      : vlReject === key
        ? `<form class="stack s14 vl-rej" data-vl-reject-form="${key}"><label class="small" style="font-weight:600" for="vl-motivo">Motivo del rechazo</label><div class="input sel"><select id="vl-motivo">${VL_REASONS.map(r => `<option>${r}</option>`).join("")}<option value="otro">Otro motivo…</option></select><i data-lucide="chevron-down"></i></div>
           <div class="input" id="vl-otro-wrap" hidden><input id="vl-otro" maxlength="120" placeholder="Escribe el motivo" aria-label="Otro motivo"></div>
           <p class="tiny">El estudiante verá este motivo y podrá registrar el pago de nuevo.</p>
           <div class="row"><button class="btn ghost" type="button" data-vl-no>Volver</button><button class="btn" type="submit" style="background:var(--danger);border-color:var(--danger)">Rechazar pago</button></div></form>`
        : `<div class="row"><button class="btn ghost" type="button" data-vl-rej="${key}"><i data-lucide="circle-x"></i>Rechazar</button><button class="btn" type="button" data-vl-ok="${key}"><i data-lucide="badge-check"></i>Aprobar ${money(x.usd)}</button></div>`;
    return `<div class="card vl-item ${x.kind === "recarga" ? "t-car" : "t-uni"}">
      <div class="row" style="align-items:flex-start"><div class="row start" style="align-items:flex-start;gap:10px">${x.done ? "" : `<input type="checkbox" class="vl-check" data-vl-sel="${key}" aria-label="Seleccionar el pago de ${esc(x.who)}" ${vlSel.has(key) ? "checked" : ""}>`}<span class="svc-chip"><i data-lucide="${x.kind === "recarga" ? "wallet" : "graduation-cap"}"></i></span><div><b class="h3">${esc(x.who)}</b><p class="small">${esc(x.title)}${p.pp ? " · con pronto pago" : ""}</p></div></div>${state}</div>
      <div class="vl-grid">
        <div><span class="tiny">Monto</span><b>${money(x.usd)}</b>${bs ? `<span class="tiny">${bsAmt(p.paidAmount)}${p.bcvRate ? ` · tasa ${bsAmt(p.bcvRate)}` : ""}</span>` : ""}</div>
        <div><span class="tiny">Método</span><b>${x.kind === "recarga" ? "Pago Móvil" : bs ? "Transferencia en Bs." : "Transferencia en USD"}</b><span class="tiny">${esc(p.bank || "—")}</span></div>
        <div><span class="tiny">Referencia</span><b class="mono">${esc(p.ref || "—")}</b><span class="tiny">${p.date ? `Pagado el ${fmtD(new Date(p.date + "T12:00"))}` : ""}</span></div>
        <div><span class="tiny">Comprobante</span>${p.receipt && p.receiptPath ? `<button class="link b" type="button" data-vl-receipt="${esc(p.receiptPath)}" style="font-size:12px"><i data-lucide="file-text"></i> ${esc(p.receipt)}</button>` : p.receipt ? `<button class="link b" type="button" data-toast="Vista previa de ${esc(p.receipt)} no disponible en el prototipo." style="font-size:12px"><i data-lucide="file-text"></i> ${esc(p.receipt)}</button>` : `<b style="font-size:12px">Datos del Pago Móvil</b>`}<span class="tiny">Enviado ${ago(x.sent).toLowerCase()}</span></div>
      </div>
      ${actions}
    </div>`;
  }).join("") || `<div class="card" style="align-items:flex-start"><span class="ico lg"><i data-lucide="badge-check"></i></span><h2 class="h2">${vlTab === "done" ? "Aún no hay pagos revisados" : "No hay pagos por validar"}</h2><p class="small" style="font-size:13px">${vlTab === "done" ? "Los pagos que apruebes o rechaces aparecerán aquí." : "Cuando un estudiante registre una transferencia o un Pago Móvil, aparecerá aquí."}</p></div>`;
  icons();
}
function relabelForCreator(role = "creator") {
  // la sección usa el menú de administración; para el creador (o el dueño) se reemplaza por el suyo
  const sec = document.getElementById("validar");
  if (sec.dataset.navFor === role) return;
  const nav = STAFF_NAV[role], RL = role === "owner" ? "Dueño" : "Creador", mk = n => `<button type="button" data-go="${n[3]}" class="${n[0] === "validar" ? "on" : ""}"><i data-lucide="${n[1]}"></i>${n[2]}</button>`;
  const sideNav = sec.querySelector(".side .nav"); if (sideNav) sideNav.innerHTML = nav.map(mk).join("") + `<button type="button" class="mode-nav" data-mode-switch="usuario"><i data-lucide="user-round"></i>Usar Nexo como usuario</button>`;
  const bar = sec.querySelector(".tabbar"); if (bar) bar.innerHTML = nav.map(mk).join("") + `<button type="button" data-logout><i data-lucide="log-out"></i>Salir</button>`;
  sec.querySelectorAll(".side .user span:last-child").forEach(el => el.textContent = RL + " · Menú");
  sec.querySelectorAll(".mbar .pill, .deskbar .acts .pill:not(.modebtn)").forEach(el => el.textContent = el.textContent.includes("Acceso") ? "Acceso: " + RL : RL);
  const c = sec.querySelector(".deskbar .crumbs span"); if (c) c.innerHTML = `Gestión&nbsp;&nbsp;/&nbsp;&nbsp;${RL}&nbsp;&nbsp;/&nbsp;&nbsp;Pagos por validar`;
  sec.dataset.navFor = role;
}
function vlUpdateMove(email, match, pill, cls) {
  try { const k = "nexo-moves:" + email, mv = JSON.parse(localStorage.getItem(k) || "[]") || []; const m = mv.slice().reverse().find(x => x.pill === "En revisión" && match(x)); if (m) { m.pill = pill; m.pillCls = cls; localStorage.setItem(k, JSON.stringify(mv)); } } catch (err) {}
}
function vlDecide(key, ok, motivo, quiet = false) {
  if (key.startsWith("sb:")) return sbCajaDecide(key, ok, motivo, quiet);
  const i = key.lastIndexOf("|"), sk = key.slice(0, i), id = key.slice(i + 1), now = Date.now(), me = user.full;
  const item = cajaItems().find(x => x.key === sk && x.id === id); if (!item) return;
  const ref6 = (item.p.ref || "").slice(-6);
  if (item.kind === "factura") {
    const pg = JSON.parse(localStorage.getItem(sk) || "{}"), p = pg[id];
    pg[id] = ok ? { ...p, estado: "pagada", fecha: fmtD(new Date(now)), via: p.currency === "bs" ? "Transferencia en Bs." : "Transferencia", validatedAt: now, validatedBy: me }
                : { ...p, estado: "rechazada", motivo, rejectedAt: now, rejectedBy: me };
    localStorage.setItem(sk, JSON.stringify(pg));
    vlUpdateMove(item.email, m => m.title.includes(`Factura de ${MES_DE(id)}`) && (!ref6 || (m.detail || "").includes(ref6)), ok ? "Pagado" : "Rechazado", ok ? "ok" : "warn");
    if (item.email === sessionEmail) { pagos = { ...pagos, [id]: pg[id] }; }
  } else {
    const list = JSON.parse(localStorage.getItem(sk) || "[]"), r = list.find(x => x.id === id);
    Object.assign(r, ok ? { estado: "aprobada", validatedAt: now, validatedBy: me } : { estado: "rechazada", motivo, rejectedAt: now, rejectedBy: me });
    localStorage.setItem(sk, JSON.stringify(list));
    if (ok) {
      const wk = "nexo-wallet:" + item.email; let w = parseFloat(localStorage.getItem(wk)); if (isNaN(w)) w = item.email === DEMO_EMAIL ? 40 : 0;
      localStorage.setItem(wk, String(Math.round((w + item.usd) * 100) / 100));
    }
    vlUpdateMove(item.email, m => m.title === "Recarga de wallet" && (m.detail || "").includes(ref6), ok ? "Acreditada" : "Rechazada", ok ? "ok" : "warn");
  }
  logAudit("caja", ok ? `Aprobó ${item.title.toLowerCase()} de ${item.who} (${money(item.usd)}, ref. ${item.p.ref}).` : `Rechazó ${item.title.toLowerCase()} de ${item.who}: ${motivo}.`);
  vlReject = null; vlSel.delete(key);
  if (quiet) return item;
  toast(ok ? `Aprobaste el pago de ${item.who} por ${money(item.usd)}.` : `Rechazaste el pago de ${item.who}. Le avisaremos el motivo.`);
  renderValidar();
}
/* Aprobar en lote: casillas en cada pago por validar + barra con el total */
const vlSel = new Set();
function renderVlBulk(list) {
  let bar = document.getElementById("vlBulk");
  if (!bar) { document.getElementById("vlList").insertAdjacentHTML("beforebegin", `<div class="bulkbar" id="vlBulk" hidden></div>`); bar = document.getElementById("vlBulk"); }
  const pend = list.filter(x => !x.done), keys = pend.map(x => `${x.key}|${x.id}`);
  [...vlSel].forEach(k => { if (!keys.includes(k)) vlSel.delete(k); });
  bar.hidden = pend.length < 2;
  const sel = pend.filter(x => vlSel.has(`${x.key}|${x.id}`)), all = sel.length === pend.length;
  bar.innerHTML = `<label class="remember" style="margin:0"><input type="checkbox" data-vl-all ${all && sel.length ? "checked" : ""}>${sel.length ? `${sel.length} seleccionado${sel.length === 1 ? "" : "s"} · ${money(sel.reduce((a, x) => a + x.usd, 0))}` : "Seleccionar todos"}</label>
    ${sel.length ? `<button class="btn sm" type="button" data-vl-bulk><i data-lucide="badge-check"></i>Aprobar ${sel.length}</button>` : `<span class="tiny">Marca varios pagos para aprobarlos juntos.</span>`}`;
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-vl-tab]"); if (t) { vlTab = t.dataset.vlTab; vlReject = null; renderValidar(); return; }
  const ok = e.target.closest("[data-vl-ok]"); if (ok) { vlDecide(ok.dataset.vlOk, true); return; }
  const cs = e.target.closest("[data-vl-sel]"); if (cs) { cs.checked ? vlSel.add(cs.dataset.vlSel) : vlSel.delete(cs.dataset.vlSel); renderVlBulk(cajaItems().filter(x => vlTab === "pend" ? !x.done : !x.done && x.kind === vlTab)); icons(); return; }
  const ca = e.target.closest("[data-vl-all]");
  if (ca) { const l = cajaItems().filter(x => !x.done && (vlTab === "pend" || x.kind === vlTab)); l.forEach(x => ca.checked ? vlSel.add(`${x.key}|${x.id}`) : vlSel.delete(`${x.key}|${x.id}`)); renderValidar(); return; }
  if (e.target.closest("[data-vl-bulk]")) {
    const sel = cajaItems().filter(x => !x.done && vlSel.has(`${x.key}|${x.id}`)), tot = sel.reduce((a, x) => a + x.usd, 0);
    askConfirm({ icon: "badge-check", title: `¿Aprobar ${sel.length} pagos?`, text: `Suman ${money(tot)}. Revisaste que cada referencia y monto coincidan con el banco. Avisaremos a cada estudiante.`, ok: `Aprobar ${sel.length}`, cancel: "Volver",
      onOk: () => { const n = sel.filter(x => vlDecide(`${x.key}|${x.id}`, true, null, true)).length; vlSel.clear(); toast(`Aprobaste ${n} pagos por ${money(tot)}.`); renderValidar(); } });
    return;
  }
  const rj = e.target.closest("[data-vl-rej]"); if (rj) { vlReject = rj.dataset.vlRej; renderValidar(); document.getElementById("vl-motivo")?.focus(); return; }
  if (e.target.closest("[data-vl-no]")) { vlReject = null; renderValidar(); }
});
document.addEventListener("change", e => { if (e.target.id === "vl-motivo") { const w = document.getElementById("vl-otro-wrap"); w.hidden = e.target.value !== "otro"; if (!w.hidden) document.getElementById("vl-otro").focus(); } });
document.addEventListener("submit", e => {
  const f = e.target; if (!f.matches("[data-vl-reject-form]")) return;
  e.preventDefault();
  const sel = document.getElementById("vl-motivo").value, otro = document.getElementById("vl-otro").value.trim();
  if (sel === "otro" && otro.length < 5) { document.getElementById("vl-otro").focus(); toast("Escribe el motivo del rechazo."); return; }
  vlDecide(f.dataset.vlRejectForm, false, sel === "otro" ? otro : sel);
});
try { renderNotifs(); } catch (err) {} // ya con todos los datos cargados (recargas, pedidos, pagos)
/* Editor del horario semanal (comercio) */
document.addEventListener("click", e => {
  const d = e.target.closest("[data-lh-day]");
  if (d) { const i = +d.dataset.lhDay; lhDraft[i].open = !lhDraft[i].open; renderLocalMenu(); document.querySelector(`[data-lh-day="${i}"]`)?.focus(); return; }
  if (e.target.closest("[data-lh-default]")) { lhDraft = defaultWeek(myLocal()).map(x => ({ ...x })); renderLocalMenu(); toast("Volviste al horario por defecto. Guarda para aplicarlo."); }
});
["input", "change"].forEach(ev => document.addEventListener(ev, e => {
  const f = e.target.closest && e.target.closest("[data-lh-from], [data-lh-to]"); if (!f) return;
  const i = +(f.dataset.lhFrom ?? f.dataset.lhTo); lhDraft[i][f.dataset.lhFrom !== undefined ? "from" : "to"] = f.value;
}));
document.addEventListener("submit", e => {
  if (e.target.id !== "lhForm") return;
  e.preventDefault();
  const err = document.getElementById("lhErr"), bad = lhDraft.findIndex(w => w.open && (!w.from || !w.to || toMin(w.from) + 30 > toMin(w.to)));
  if (bad >= 0) { err.hidden = false; err.className = "tiny pm-err"; err.textContent = `Revisa el ${DIAS[bad].toLowerCase()}: la hora de cierre debe ser al menos 30 minutos después de la de apertura.`; document.querySelector(`[data-lh-to="${bad}"]`)?.focus(); return; }
  if (!lhDraft.some(w => w.open)) { err.hidden = false; err.className = "tiny pm-err"; err.textContent = "Abre al menos un día de la semana."; return; }
  const l = myLocal(); lstate(l.id).week = lhDraft.map(x => ({ open: x.open, from: pad5(x.from), to: pad5(x.to) })); saveLocalState();
  toast(`Guardamos el horario. Hoy: ${todayHours(l)}.`); lhDraft = null; renderLocalMenu();
});
/* ---------- Recuperar contraseña: correo o carnet → código de 6 dígitos (simulado) → contraseña nueva ----------
   El código vence a los 10 min, se puede reenviar a los 30 s y admite 3 intentos. Estado en memoria (rp). */
let rp = { step: 1, email: null, code: null, exp: 0, sent: 0, tries: 3, err: "", ident: "" }, rpTimer = null;
const maskMail = e => { const [u, d] = e.split("@"); return `${u.slice(0, 2)}${"•".repeat(Math.max(1, u.length - 2))}@${d}`; };
function rpSend() { rp.code = String(Math.floor(100000 + Math.random() * 900000)); rp.exp = Date.now() + 10 * MIN; rp.sent = Date.now(); rp.tries = 3; }
function renderRecuperar() {
  const box = document.getElementById("rpBody"), err = rp.err ? `<div class="notice warn" role="alert"><i data-lucide="circle-alert"></i><p>${esc(rp.err)}</p></div>` : "";
  clearInterval(rpTimer);
  const steps = `<p class="small" style="font-weight:600;margin:6px 0 8px"><span${rp.step === 1 ? ' style="color:var(--brand)"' : ""}>1. Tu cuenta</span> &nbsp;›&nbsp; <span${rp.step === 2 ? ' style="color:var(--brand)"' : ""}>2. Código</span> &nbsp;›&nbsp; <span${rp.step === 3 ? ' style="color:var(--brand)"' : ""}>3. Contraseña nueva</span></p>`;
  if (rp.step === "sbsent") {
    box.innerHTML = `<div><h1 class="h1">Revisa tu correo</h1><p class="lead">Si <b>${esc(maskMail(rp.email))}</b> tiene una cuenta en Nexo, te llegará un enlace para crear una contraseña nueva. Vence en 1 hora.</p></div>
      <div class="card" style="align-items:flex-start;gap:12px">${illu("inbox")}<p class="small" style="font-size:14px">Ábrelo en este mismo dispositivo. Si no lo ves en unos minutos, revisa la carpeta de spam.</p><div class="row start" style="gap:10px;flex-wrap:wrap"><button class="btn ghost sm" type="button" data-rp-back>Usar otro correo</button><button class="btn ghost sm" type="button" data-go="login">Volver a iniciar sesión</button></div></div>`;
    icons(); return;
  }
  if (rp.step === "sbnew") {
    box.innerHTML = `<div><h1 class="h1">Crea tu contraseña nueva</h1><p class="lead">Para ${esc(maskMail(rp.email))}.</p></div>
      <form class="card" id="rpFormSb" novalidate>
        <div class="field"><label for="rp-p1">Contraseña nueva</label><div class="input"><input id="rp-p1" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres y un número"><button class="eye" type="button" data-eye="rp-p1" aria-label="Mostrar contraseña" aria-pressed="false"><i data-lucide="eye-off"></i></button></div></div>
        <div class="field"><label for="rp-p2">Repítela</label><div class="input"><input id="rp-p2" type="password" autocomplete="new-password"></div></div>
        ${err}<button class="btn" type="submit"><i data-lucide="check"></i>Guardar y entrar</button></form>`;
    icons(); const f0 = box.querySelector("input"); if (f0) f0.focus(); return;
  }
  if (rp.step === 1) {
    if (!rp.ident) { const li = document.getElementById("l-mail"); if (li && li.value.trim()) rp.ident = li.value.trim(); }
    box.innerHTML = `<div><h1 class="h1">¿Olvidaste tu contraseña?</h1><p class="lead">Escribe tu correo institucional o tu carnet y te enviamos un código.</p></div>${steps}
      <form class="card" id="rpForm1" novalidate><div class="field"><label for="rp-id">Correo institucional o carnet</label><div class="input"><input id="rp-id" autocomplete="username" placeholder="nombre@correo.unimet.edu.ve" value="${esc(rp.ident)}"><i data-lucide="mail"></i></div></div>
      ${err}<button class="btn" type="submit"><i data-lucide="send"></i>Enviarme el código</button></form>`;
  } else if (rp.step === 2) {
    const left = () => Math.max(0, 30 - Math.floor((Date.now() - rp.sent) / 1000));
    box.innerHTML = `<div><h1 class="h1">Revisa tu correo</h1><p class="lead">Te enviamos un código de 6 dígitos a <b>${esc(maskMail(rp.email))}</b>. Vence en 10 minutos.</p></div>${steps}
      <div class="notice"><i data-lucide="flask-conical"></i><p>Prototipo: no se envían correos reales. Tu código es <strong class="mono">${rp.code}</strong>.</p></div>
      <form class="card" id="rpForm2" novalidate><div class="field"><label for="rp-code">Código de verificación</label><div class="input"><input id="rp-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" style="letter-spacing:6px;font-size:18px"></div><p class="tiny">${rp.tries} ${rp.tries === 1 ? "intento" : "intentos"} disponibles.</p></div>
      ${err}<button class="btn" type="submit"><i data-lucide="check"></i>Verificar código</button>
      <div class="row"><button class="link b" type="button" data-rp-resend id="rpResend"></button><button class="link" type="button" data-rp-back>Usar otra cuenta</button></div></form>`;
    const tick = () => { const b = document.getElementById("rpResend"); if (!b) return clearInterval(rpTimer); const l = left(); b.disabled = l > 0; b.textContent = l > 0 ? `Reenviar código en ${l} s` : "Reenviar código"; };
    tick(); rpTimer = setInterval(tick, 1000);
  } else {
    box.innerHTML = `<div><h1 class="h1">Crea tu contraseña nueva</h1><p class="lead">Para ${esc(maskMail(rp.email))}.</p></div>${steps}
      <form class="card" id="rpForm3" novalidate>
        <div class="field"><label for="rp-p1">Contraseña nueva</label><div class="input"><input id="rp-p1" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres y un número"><button class="eye" type="button" data-eye="rp-p1" aria-label="Mostrar contraseña" aria-pressed="false"><i data-lucide="eye-off"></i></button></div></div>
        <div class="field"><label for="rp-p2">Repítela</label><div class="input"><input id="rp-p2" type="password" autocomplete="new-password"></div></div>
        ${err}<button class="btn" type="submit"><i data-lucide="check"></i>Guardar contraseña</button></form>`;
  }
  icons();
  const f = box.querySelector("input"); if (f) f.focus();
}
document.addEventListener("submit", e => {
  const f = e.target; if (!/^rpForm[123]$/.test(f.id)) return;
  e.preventDefault(); rp.err = "";
  if (f.id === "rpForm1") {
    const ident = document.getElementById("rp-id").value.trim(); rp.ident = ident;
    const byDigits = /^\d+$/.test(ident), acc = accounts.find(a => byDigits ? a.carnet === ident : a.email === normEmail(ident));
    if (!ident) rp.err = "Escribe tu correo institucional o tu carnet.";
    else if (sb && !isTestAccount(normEmail(ident))) {
      if (byDigits) rp.err = "Escribe el correo con el que te registraste.";
      else { const email = normEmail(ident); sbSendReset(email).then(err => { if (err) rp.err = sbMsg(err).join(" "); else { rp.email = email; rp.step = "sbsent"; rp.sent = Date.now(); } renderRecuperar(); }); return; }
    }
    else if (!acc) rp.err = byDigits ? `No hay ninguna cuenta con el carnet ${ident}.` : `No hay ninguna cuenta con el correo ${normEmail(ident)}. ¿Quieres crear una?`;
    else { rp.email = acc.email; rpSend(); rp.step = 2; }
  } else if (f.id === "rpForm2") {
    const c = document.getElementById("rp-code").value.replace(/\D/g, "");
    if (Date.now() > rp.exp) rp.err = "El código venció. Pide uno nuevo.";
    else if (c !== rp.code) { rp.tries--; rp.err = rp.tries > 0 ? `El código no es correcto. Te ${rp.tries === 1 ? "queda 1 intento" : `quedan ${rp.tries} intentos`}.` : "Agotaste los intentos. Pide un código nuevo."; if (rp.tries <= 0) { rp.step = 1; rp.code = null; } }
    else rp.step = 3;
  } else {
    const p1 = document.getElementById("rp-p1").value, p2 = document.getElementById("rp-p2").value, acc = accounts.find(a => a.email === rp.email);
    if (p1.length < 8 || !/\d/.test(p1)) rp.err = "Usa al menos 8 caracteres y un número.";
    else if (p1 !== p2) rp.err = "Las contraseñas no coinciden.";
    else if (acc && acc.pass === passKey(p1)) rp.err = "Esa es tu contraseña actual. Elige una distinta.";
    else {
      acc.pass = passKey(p1); saveAccounts();
      const email = rp.email; rp = { step: 1, email: null, code: null, exp: 0, sent: 0, tries: 3, err: "", ident: "" };
      go("login"); setTimeout(() => { const li = document.getElementById("l-mail"); li.value = email; document.getElementById("l-pass").value = ""; document.getElementById("l-pass").focus(); toast("Listo: cambiamos tu contraseña. Inicia sesión con la nueva."); }, 50);
      return;
    }
  }
  renderRecuperar();
});
document.addEventListener("click", e => {
  if (e.target.closest("[data-rp-resend]")) { rpSend(); rp.err = ""; toast(`Te enviamos un código nuevo a ${maskMail(rp.email)}.`); renderRecuperar(); return; }
  if (e.target.closest("[data-rp-back]")) { rp = { step: 1, email: null, code: null, exp: 0, sent: 0, tries: 3, err: "", ident: "" }; renderRecuperar(); return; }
  if (e.target.closest('[data-go="recuperar"]')) { rp.err = ""; if (rp.step !== 1 && !rp.email) rp.step = 1; }
});
document.addEventListener("submit", async e => {
  if (e.target.id !== "rpFormSb") return;
  e.preventDefault();
  const p1 = document.getElementById("rp-p1").value, p2 = document.getElementById("rp-p2").value;
  rp.err = p1.length < 8 || !/\d/.test(p1) ? "Usa al menos 8 caracteres y un número." : p1 !== p2 ? "Las contraseñas no coinciden." : "";
  if (rp.err) return renderRecuperar();
  sbBusy("rpFormSb", true);
  const { data, error } = await sb.auth.updateUser({ password: p1 }).catch(er => ({ error: er }));
  sbBusy("rpFormSb", false);
  if (error) { rp.err = /different|same/i.test(error.message) ? "Esa es tu contraseña actual. Elige una distinta." : sbMsg(error).join(" "); return renderRecuperar(); }
  rp = { step: 1, email: null, code: null, exp: 0, sent: 0, tries: 3, err: "", ident: "" };
  sbAdopt(data.user, p1, true, "Listo: cambiamos tu contraseña.");
});
/* ---------- Inicio inteligente: "Para ti ahora" ----------
   Junta lo urgente de la cuenta (pedido listo o en curso, facturas por pagar o vencidas, plan por vencer,
   respuestas de soporte, pagos rechazados) y lo ordena por prioridad (pr: 0 = lo más urgente). */
function homeItems() {
  const out = [], t = day0(simDate);
  try {
    activeOrders().forEach(o => {
      const s = orderStatus(o), l = localById(o.local), ln = l ? l.name : "el local";
      out.push(s === "listo"
        ? { pr: 0, tone: "ok", icon: "package-check", title: `Tu pedido de ${ln} está listo`, body: `Código de retiro ${o.code}. Muéstralo al retirar.`, cta: "Ver código", attrs: `data-home-order="${o.id}"` }
        : { pr: 3, icon: s === "programado" ? "calendar-clock" : "chef-hat", title: s === "programado" ? `Pedido programado en ${ln}` : `Están preparando tu pedido de ${ln}`, body: s === "programado" ? `Retíralo ${whenTxt(o.scheduledFor)}.` : `Estará listo cerca de las ${hhmm(o.readyAt)}.`, cta: "Ver pedido", attrs: `data-home-order="${o.id}"` });
    });
  } catch (err) {}
  try {
    if (account && account.carnet) activeInvoices().forEach(iv => {
      const s = statusOf(iv), p = pagos[iv.id], amt = money(amountOf(iv));
      const rej = p && p.estado === "rechazada" && ["pronto", "pendiente", "vencida"].includes(s);
      if (rej) out.push({ pr: 1, tone: "bad", icon: "circle-x", title: `Rechazamos tu transferencia de ${iv.mes}`, body: `${p.motivo}. Vuelve a pagarla por ${amt}.`, cta: "Pagar", go: "caja" });
      else if (s === "vencida") out.push({ pr: 1, tone: "warn", icon: "receipt-text", title: `Tu factura de ${iv.mes} está vencida`, body: `Venció el ${fmtDW(iv.due)}. Págala por ${amt} para quedar al día.`, cta: "Pagar", go: "caja" });
      else if (s === "pronto") { const d = Math.round((day0(iv.ppEnd) - t) / 864e5); out.push({ pr: d <= 1 ? 2 : 4, tone: d <= 1 ? "warn" : "", icon: "badge-percent", title: d === 0 ? "El pronto pago termina hoy" : d === 1 ? "El pronto pago termina mañana" : `Pronto pago de ${iv.mes} hasta el ${fmtDW(iv.ppEnd)}`, body: `Paga ${amt} y ahorra ${money((PRICE_REG - PRICE_PP) * MATERIAS.length)}.`, cta: "Pagar", go: "caja" }); }
      else if (s === "pendiente") { const d = Math.round((day0(iv.due) - t) / 864e5); out.push({ pr: d <= 3 ? 2 : 4, tone: d <= 3 ? "warn" : "", icon: "receipt-text", title: d === 0 ? `Tu factura de ${iv.mes} vence hoy` : `Tu factura de ${iv.mes} vence ${d === 1 ? "mañana" : `en ${d} días`}`, body: `${amt} · vence el ${fmtDW(iv.due)}.`, cta: "Pagar", go: "caja" }); }
    });
  } catch (err) {}
  try {
    if (plan) {
      const left = Math.round((day0(new Date(plan.end + "T12:00")) - t) / 864e5), pn = plan.name.toLowerCase();
      if (left < 0) out.push({ pr: 2, tone: "warn", icon: "car-front", title: `Tu plan ${pn} venció`, body: "Renuévalo para seguir entrando al campus sin hacer fila.", cta: "Renovar", go: "planes" });
      else if (left <= 7) out.push({ pr: left <= 2 ? 2 : 4, tone: left <= 2 ? "warn" : "", icon: "car-front", title: left === 0 ? `Tu plan ${pn} vence hoy` : `Tu plan ${pn} vence en ${left} ${left === 1 ? "día" : "días"}`, body: `Renuévalo con tu wallet Nexo (saldo ${money(WALLET)}).`, cta: "Renovar", go: "planes" });
    }
  } catch (err) {}
  try {
    pendRec.filter(r => r.estado === "rechazada" && !nRead[`rec-rej-${r.id}`]).forEach(r => out.push({ pr: 1, tone: "bad", icon: "wallet", title: `Rechazamos tu recarga de ${money(r.amount)}`, body: `${r.motivo}. Revisa los datos y regístrala de nuevo.`, cta: "Revisar", go: "recarga", seen: `rec-rej-${r.id}` }));
  } catch (err) {}
  try {
    tickets.filter(tk => tk.student.email === sessionEmail && isOpen(tk)).forEach(tk => {
      const last = [...tk.messages].reverse().find(m => m.from !== "note");
      if (last && last.from === "mod") out.push({ pr: tk.status === "espera" ? 2 : 3, icon: "message-circle", title: `${firstName(last.name)} respondió tu solicitud ${tk.id}`, body: tk.status === "espera" ? "Esperan tu respuesta para continuar." : esc(last.text.length > 90 ? last.text.slice(0, 88) + "…" : last.text), cta: "Responder", attrs: `data-home-ticket="${tk.id}"` });
    });
  } catch (err) {}
  return out.sort((a, b) => a.pr - b.pr);
}
/* Resumen de la cuenta en la cabecera de Inicio (tarjetas de vidrio sobre el degradado) */
function renderHomeStats() {
  const box = document.getElementById("homeStats"); if (!box) return;
  const tiles = [];
  try {
    if (account && account.carnet && MATERIAS.length) {
      const pay = payableInv(), debt = pay.reduce((a, iv) => a + amountOf(iv), 0), late = pay.some(iv => statusOf(iv) === "vencida");
      tiles.push(`<button class="hh-tile${late ? " alert" : ""}" type="button" data-go="materias"><span class="hh-ic"><i data-lucide="graduation-cap"></i></span><span class="hh-lbl">Cuenta universitaria</span><b>${debt ? money(debt) : "Al día"}</b><span class="hh-sub">${debt ? (late ? "Tienes una factura vencida" : `Vence el ${fmtDW(pay[0].due)}`) : "No debes nada este mes"}</span></button>`);
    }
  } catch (err) {}
  try { tiles.push(`<button class="hh-tile" type="button" data-go="estacionamiento"><span class="hh-ic"><i data-lucide="wallet"></i></span><span class="hh-lbl">Wallet Nexo</span><b>${money(WALLET)}</b><span class="hh-sub">Saldo para estacionamiento</span></button>`); } catch (err) {}
  try {
    if (planActive()) {
      const left = Math.max(0, Math.round((dOf(plan.end) - todayNoon()) / 864e5)), pct = Math.min(100, Math.round(left / 30 * 100));
      tiles.push(`<button class="hh-tile" type="button" data-go="acceso"><span class="hh-ring" style="--p:${pct}"><i data-lucide="car-front"></i></span><span class="hh-lbl">Plan ${esc(plan.name.toLowerCase())}</span><b>${left} ${left === 1 ? "día" : "días"}</b><span class="hh-sub">Vence el ${fmtD(dOf(plan.end))}</span></button>`);
    } else tiles.push(`<button class="hh-tile" type="button" data-go="planes"><span class="hh-ic"><i data-lucide="car-front"></i></span><span class="hh-lbl">Estacionamiento</span><b>Sin plan</b><span class="hh-sub">Elige uno y entra sin fila</span></button>`);
  } catch (err) {}
  box.innerHTML = tiles.join("");
}
/* Gastos del mes por servicio: barra apilada + leyenda con montos (paleta validada, orden fijo) */
const SPEND_CATS = [["comida", "Comida", "utensils"], ["estac", "Estacionamiento", "car-front"], ["uni", "Materias", "graduation-cap"], ["canchas", "Canchas", "dribbble"]];
function spendOfMonth() {
  const d = day0(simDate), tag = `${MES_CORTO[d.getMonth()]} ${d.getFullYear()}`, sum = { comida: 0, estac: 0, uni: 0, canchas: 0 };
  if (isDemo && d.getMonth() === 10) { sum.estac += 28; sum.comida += 8.5; } // movimientos de ejemplo de la cuenta demo (1 y 2 de noviembre)
  moves.forEach(m => {
    const a = String(m.amount || ""); if (!/^[−-]/.test(a) || !String(m.date || "").includes(tag)) return;
    const v = parseFloat(a.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
    const c = m.icon === "utensils" ? "comida" : m.icon === "car-front" ? "estac" : m.icon === "dribbble" ? "canchas" : String(m.detail || "").startsWith("Universidad") ? "uni" : null;
    if (c) sum[c] += v;
  });
  return { sum, total: Object.values(sum).reduce((a, b) => a + b, 0), month: MESES_LARGO[d.getMonth()] };
}
const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function renderSpend() {
  const box = document.getElementById("homeSpend"); if (!box) return;
  const { sum, total, month } = spendOfMonth();
  if (!total) { box.innerHTML = `<h2 class="sec">Tus gastos de ${month}</h2>` + emptyState("receipt-text", "Aún no hay gastos este mes", "Cuando pagues comida, estacionamiento o tu cuota, verás aquí en qué se te va el dinero."); icons(); return; }
  const cats = SPEND_CATS.filter(([k]) => sum[k] > 0);
  box.innerHTML = `<div class="row" style="align-items:flex-start"><div><h2 class="sec">Tus gastos de ${month}</h2><p class="small">Pagado en Nexo este mes</p></div><button class="link b" type="button" data-go="actividad" style="font-size:12px">Detalle</button></div>
    <div class="spend-hero"><b>${money(total)}</b><span class="bsv inline">${bsOf(total)}</span></div>
    <div class="spend-bar" role="img" aria-label="${cats.map(([k, l]) => `${l} ${money(sum[k])}`).join(", ")}">${cats.map(([k, l]) => `<span class="sp-${k}" style="flex:${sum[k]}" data-tip="${l} · ${money(sum[k])} · ${Math.round(sum[k] / total * 100)} %"></span>`).join("")}</div>
    <ul class="spend-legend">${cats.map(([k, l, ic]) => `<li data-sp="${k}"><span class="sp-dot sp-${k}"></span><i data-lucide="${ic}"></i><span class="grow">${l}</span><b>${money(sum[k])}</b><span class="tiny">${Math.round(sum[k] / total * 100)} %</span></li>`).join("")}</ul>`;
  icons();
}
let homeAll = false;
function renderHome() {
  try { renderHomeStats(); } catch (err) {}
  try { renderSpend(); } catch (err) {}
  const box = document.getElementById("homeNow"); if (!box) return;
  const items = homeItems();
  if (!items.length) { box.hidden = true; return; }
  box.hidden = false;
  const shown = homeAll ? items : items.slice(0, 3);
  box.innerHTML = `<div class="row"><h2 class="sec">Para ti ahora</h2>${items.length > 3 ? `<button class="link b" type="button" data-home-all style="font-size:12px">${homeAll ? "Ver menos" : `Ver todo (${items.length})`}</button>` : ""}</div>
    <div class="homenow-list">${shown.map(x => `<button type="button" class="hn-item${x.tone ? " " + x.tone : ""}" ${x.attrs || `data-go="${x.go}"`}${x.seen ? ` data-home-seen="${x.seen}"` : ""}>
      <span class="ico"><i data-lucide="${x.icon}"></i></span><span class="info"><b>${x.title}</b><span>${x.body}</span></span><span class="hn-cta">${x.cta}<i data-lucide="chevron-right"></i></span></button>`).join("")}</div>`;
  try { lucide.createIcons(); } catch (err) {}
}
document.addEventListener("click", e => {
  if (e.target.closest("[data-home-all]")) { homeAll = !homeAll; renderHome(); return; }
  const sn = e.target.closest("[data-home-seen]"); if (sn) { nRead[sn.dataset.homeSeen] = true; saveN(); }
  const o = e.target.closest("[data-home-order]"); if (o) { trackId = o.dataset.homeOrder; go("pedido"); return; }
  const tk = e.target.closest("[data-home-ticket]"); if (tk) { supOpen = tk.dataset.homeTicket; go("soporte"); }
});
setInterval(() => { if (current === "inicio") try { renderHome(); } catch (err) {} }, 15000);
if (current === "inicio") try { renderHome(); } catch (err) {}

/* ---------- Pedir de nuevo y favoritos ----------
   Los pedidos guardan item y sel en cada línea; los anteriores a este cambio se reconstruyen por nombre.
   Favoritos por cuenta en nexo-favs como "local:item". */
let favs = [];
try { favs = JSON.parse(localStorage.getItem(K("nexo-favs")) || "[]"); if (!Array.isArray(favs)) favs = []; } catch (err) { favs = []; }
const saveFavs = () => { try { localStorage.setItem(K("nexo-favs"), JSON.stringify(favs)); } catch (err) {} };
const isFav = (lid, iid) => favs.includes(lid + ":" + iid);
function favBtn(lid, it) {
  let on = false; try { on = isFav(lid, it.id); } catch (err) {} // renderLocal puede correr al arrancar, antes de este módulo
  return `<button type="button" class="favbtn${on ? " on" : ""}" data-fav="${lid}:${it.id}" aria-pressed="${on}" aria-label="${on ? "Quitar de favoritos" : "Añadir a favoritos"}: ${esc(it.name)}"><i data-lucide="heart"></i></button>`;
}
function reorder(o) {
  const l = localById(o.local);
  if (!l) return;
  if (isPaused(l.id)) { toast(`${l.name} no está recibiendo pedidos en este momento.`); return; }
  const items = itemsOf(l), skipped = [];
  const lines = o.lines.map(x => {
    const it = (x.item && items.find(i => i.id === x.item)) || items.find(i => i.name === x.name);
    if (!it || isSoldOut(l.id, it.id)) { skipped.push(x.name); return null; }
    let sel = x.sel && x.sel.length === (it.opts || []).length ? x.sel.slice() : (it.opts || []).map(g => { const k = g.choices.findIndex(c => (x.opts || []).includes(`${g.name}: ${c.l}`)); return k < 0 ? 0 : k; });
    sel = sel.map((v, gi) => it.opts[gi].choices[v] ? v : 0);
    return { item: it.id, sel, qty: Math.min(20, x.qty), note: x.note || "" };
  }).filter(Boolean);
  if (!lines.length) { toast(`Ninguno de esos productos está disponible hoy en ${l.name}.`); return; }
  const prev = cart.lines.length ? JSON.parse(JSON.stringify(cart)) : null;
  cart = { local: l.id, lines }; curLocal = l.id; saveFoodNav(); saveCart();
  const msg = skipped.length ? `Armamos tu pedido de ${l.name}. Sin ${skipped.join(", ")}: no está disponible hoy.` : `Armamos tu pedido de ${l.name}. Revisa y paga.`;
  toast(msg, prev ? { action: "Deshacer", onAction: () => { cart = prev; saveCart(); if (current === "carrito") renderCarrito(); toast("Recuperamos tu carrito anterior."); } } : {});
  go("carrito");
}
function renderFoodAgain() {
  let box = document.getElementById("foodAgain");
  if (!box) { const fo = document.getElementById("foodOrders"); if (!fo) return; fo.insertAdjacentHTML("afterend", `<div class="stack s14" id="foodAgain" hidden></div>`); box = document.getElementById("foodAgain"); }
  const past = orders.filter(o => o.paidAt && ["retirado", "listo", "cancelado"].includes(orderStatus(o))).sort((a, b) => b.paidAt - a.paidAt);
  const seen = new Set(), recent = past.filter(o => { const k = o.local + o.lines.map(x => x.name + x.qty).join(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
  const fv = favs.map(f => { const [lid, iid] = f.split(":"), l = localById(lid), it = l && itemById(l, iid); return it ? { l, it } : null; }).filter(Boolean);
  box.hidden = !recent.length && !fv.length;
  const ago2 = o => relDay(day0(new Date(o.paidAt))).toLowerCase();
  box.innerHTML = (recent.length ? `<div class="card"><h3 class="h3">Pide de nuevo</h3>
    ${recent.map(o => { const l = localById(o.local), n = o.lines.reduce((a, x) => a + x.qty, 0);
      return `<div class="again-row">${foodArt(l.id, "xs")}<div style="min-width:0;flex:1"><b style="font-size:13px">${esc(l.name)} · ${money(o.total)}</b><p class="tiny">${esc(o.lines.map(x => (x.qty > 1 ? x.qty + " × " : "") + x.name).join(", "))}</p><p class="tiny">${ago2(o).startsWith("hace") || ["hoy", "ayer"].includes(ago2(o)) ? ago2(o)[0].toUpperCase() + ago2(o).slice(1) : "El " + ago2(o)} · ${plural(n, "producto", "productos")}</p></div><button class="btn ghost sm" type="button" data-reorder="${o.id}"><i data-lucide="rotate-cw"></i>Pedir</button></div>`; }).join("")}</div>` : "")
    + (fv.length ? `<div class="card"><h3 class="h3">Tus favoritos</h3>
    ${fv.map(({ l, it }) => `<div class="again-row"><button type="button" class="fav-open" data-fav-open="${l.id}:${it.id}">${prodArt(it.id, it.icon, "xs")}<span style="min-width:0"><b style="font-size:13px">${esc(it.name)}</b><span class="tiny" style="display:block">${esc(l.name)} · ${money(it.price)}${isSoldOut(l.id, it.id) ? " · Agotado" : ""}</span></span></button>${favBtn(l.id, it)}</div>`).join("")}</div>` : "");
  icons();
}
document.addEventListener("click", e => {
  const f = e.target.closest("[data-fav]");
  if (f) {
    const k = f.dataset.fav, [lid, iid] = k.split(":"), l = localById(lid), it = l && itemById(l, iid), was = favs.includes(k);
    favs = was ? favs.filter(x => x !== k) : [...favs, k]; saveFavs();
    const undo = () => { favs = was ? [...favs, k] : favs.filter(x => x !== k); saveFavs(); if (current === "local") renderLocal(); if (current === "comida") renderFoodAgain(); };
    toast(was ? `Quitamos ${it ? it.name : "el producto"} de tus favoritos.` : `Guardamos ${it ? it.name : "el producto"} en tus favoritos. Lo verás en Comida y kioscos.`, was ? { action: "Deshacer", onAction: undo } : {});
    if (current === "local") renderLocal(); if (current === "comida") renderFoodAgain();
    return;
  }
  const fo = e.target.closest("[data-fav-open]");
  if (fo) { const [lid, iid] = fo.dataset.favOpen.split(":"); curLocal = lid; if (isSoldOut(lid, iid)) { toast("Este producto se agotó por hoy."); curCat = "Todos"; saveFoodNav(); go("local"); return; } openItem(iid); go("detalle"); return; }
  const r = e.target.closest("[data-reorder]");
  if (r) { const o = orders.find(x => x.id === r.dataset.reorder); if (o) reorder(o); }
});
if (current === "local") try { renderLocal(); } catch (err) {}
if (current === "comida") try { renderFoodAgain(); } catch (err) {}

/* ---------- Formularios cómodos en móvil ----------
   Enter en un campo pasa al siguiente (el teclado muestra "Siguiente"); en el último, envía.
   Los formularios largos (4+ campos) dejan el botón de enviar fijo abajo en móvil (.longform). */
const formFields = f => [...f.querySelectorAll("input, select, textarea")].filter(x => !x.disabled && !x.readOnly && x.type !== "hidden" && x.type !== "checkbox" && x.type !== "radio" && x.type !== "file" && x.offsetParent !== null);
document.addEventListener("focusin", e => {
  const x = e.target, f = x.form; if (!f || !x.matches("input, select")) return;
  const fs = formFields(f), i = fs.indexOf(x); if (i < 0) return;
  if (x.tagName === "INPUT" && !x.hasAttribute("enterkeyhint")) x.setAttribute("enterkeyhint", i < fs.length - 1 ? "next" : x.type === "search" ? "search" : "go");
  f.classList.toggle("longform", fs.length >= 4 && !!f.querySelector('button[type="submit"], button:not([type])'));
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || e.isComposing) return;
  const x = e.target, f = x.form;
  if (!f || x.tagName !== "INPUT" || ["checkbox", "radio", "search", "submit", "button"].includes(x.type)) return;
  const fs = formFields(f), i = fs.indexOf(x);
  if (i > -1 && i < fs.length - 1) { e.preventDefault(); fs[i + 1].focus(); }
});

/* ---------- Modo demostración ----------
   Las herramientas de prueba (fecha simulada, simular pedido listo) solo se ven con este modo activo.
   Viene activo en la cuenta demo; las demás lo encienden en Mi cuenta. Al apagarlo, la fecha vuelve a hoy. */
let demoMode = isDemo;
try { const v = localStorage.getItem(K("nexo-demomode")); if (v !== null) demoMode = v === "1"; } catch (err) {}
function applyDemoMode() {
  document.body.classList.toggle("no-demo", !demoMode);
  document.querySelectorAll("[data-demo-mode]").forEach(b => b.setAttribute("aria-checked", demoMode));
}
applyDemoMode();
if (!demoMode && isoD(simDate) !== isoD(realToday())) { simDate = realToday(); try { localStorage.removeItem(K("nexo-sim")); } catch (err) {} }
document.addEventListener("click", e => {
  if (!e.target.closest("[data-demo-mode]")) return;
  demoMode = !demoMode;
  try { localStorage.setItem(K("nexo-demomode"), demoMode ? "1" : "0"); } catch (err) {}
  if (!demoMode) { try { setSim(realToday()); } catch (err) {} try { localStorage.removeItem(K("nexo-sim")); } catch (err) {} }
  applyDemoMode();
  toast(demoMode ? "Modo demostración activo: verás las herramientas de prueba." : "Modo demostración apagado. Todo usa la fecha de hoy.");
});

/* ---------- Apariencia: automático / claro / oscuro ----------
   Global (nexo-theme). Un script en <head> lo aplica antes de pintar para que no parpadee. */
const THEMES = [["auto", "Automático", "monitor-smartphone"], ["light", "Claro", "sun"], ["dark", "Oscuro", "moon"]];
const themeNow = () => { try { const t = localStorage.getItem("nexo-theme"); return t === "light" || t === "dark" ? t : "auto"; } catch (err) { return "auto"; } };
const themeSeg = () => `<div class="seg" role="radiogroup" aria-label="Apariencia">${THEMES.map(([k, l, ic]) => `<button type="button" role="radio" aria-checked="${themeNow() === k}" class="${themeNow() === k ? "on" : ""}" data-theme-set="${k}"><i data-lucide="${ic}"></i>${l}</button>`).join("")}</div>`;
function applyTheme(t) {
  if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
  try { if (t === "auto") localStorage.removeItem("nexo-theme"); else localStorage.setItem("nexo-theme", t); } catch (err) {}
  document.querySelectorAll("[data-theme-seg]").forEach(b => { b.innerHTML = themeSeg(); });
  try { lucide.createIcons(); } catch (err) {}
}
document.querySelectorAll("[data-theme-seg]").forEach(b => { b.innerHTML = themeSeg(); });
if (themeNow() !== "auto") document.documentElement.setAttribute("data-theme", themeNow());
document.addEventListener("click", e => {
  const b = e.target.closest("[data-theme-set]"); if (!b) return;
  applyTheme(b.dataset.themeSet);
  if (b.closest(".usermenu")) b.closest(".usermenu").querySelector("[data-theme-seg]").innerHTML = themeSeg();
  toast(b.dataset.themeSet === "dark" ? "Modo oscuro activado." : b.dataset.themeSet === "light" ? "Modo claro activado." : "Apariencia automática: sigue a tu dispositivo.");
});

/* ---------- Avisos en vivo para el personal ----------
   Sin backend, los cambios llegan de otras pestañas por el evento storage; lo que cambia en esta pestaña no se avisa.
   liveKeys() resume lo que le importa a cada rol; lo nuevo se avisa con toast + sonido corto,
   y el título de la pestaña muestra cuántos hay sin ver mientras la pestaña está en segundo plano. */
const LIVE_ROLE = roleOf(account);
function liveKeys() {
  const out = new Map(), me = sessionEmail;
  const add = (k, v) => out.set(k, v);
  try {
    if (["mod", "admin", "creator"].includes(LIVE_ROLE)) {
      tickets.filter(isOpen).forEach(t => {
        if (LIVE_ROLE !== "mod" || !t.mod) add("tk:" + t.id, { text: `Nuevo ticket ${t.id}: ${t.subject}`, go: LIVE_ROLE === "mod" ? "moderacion" : ROLE_HOME[LIVE_ROLE] === "creador" ? "creador-equipo" : "gestion", tk: t.id });
        const last = [...t.messages].reverse().find(m => m.from !== "note");
        if (LIVE_ROLE === "mod" && t.mod === me && last && last.from === "student") add(`tkr:${t.id}:${last.t}`, { text: `${firstName(t.student.name)} respondió en ${t.id}`, go: "moderacion", tk: t.id });
      });
    }
    if (["admin", "creator", "owner"].includes(LIVE_ROLE)) cajaItems().filter(x => !x.done).forEach(x => add(`cj:${x.kind}:${x.key}:${x.id}`, { text: `Pago por validar: ${x.title} de ${x.who} · ${money(x.usd)}`, go: "validar" }));
    if (LIVE_ROLE === "local" && account.local) allOrders().filter(({ o }) => o.local === account.local && o.paidAt && !o.cancelledAt && !o.pickedAt).forEach(({ o }) => add("lo:" + o.id, { text: `Pedido nuevo ${o.num} · ${money(o.total)}`, go: "local-pedidos" }));
  } catch (err) {}
  return out;
}
let liveSeen = liveKeys(), liveUnseen = 0;
const baseTitle = document.title;
function liveBeep() {
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = liveBeep.ctx || (liveBeep.ctx = new C()), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.36);
  } catch (err) {}
}
function liveCheck() {
  if (LIVE_ROLE === "estudiante") return;
  const now = liveKeys(), fresh = [...now.keys()].filter(k => !liveSeen.has(k));
  liveSeen = now;
  if (!fresh.length) return;
  const first = now.get(fresh[0]);
  const open = () => { if (first.tk) { try { mdSel = first.tk; } catch (err) {} } go(first.go); };
  toast(fresh.length === 1 ? first.text : `${first.text} y ${fresh.length - 1} más`, { persist: true, action: "Ver", onAction: open });
  liveBeep();
  if (document.hidden) { liveUnseen += fresh.length; document.title = `(${liveUnseen}) ${baseTitle}`; }
  const r = { moderacion: () => renderModeracion(), gestion: () => renderGestion(), validar: () => renderValidar(), "local-pedidos": () => renderLocalPedidos(), "creador-equipo": () => renderCreadorEquipo() }[current];
  if (r) try { r(); } catch (err) {}
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) { liveUnseen = 0; document.title = baseTitle; } });
window.addEventListener("storage", e => { if (e.key && e.key.startsWith("nexo-")) setTimeout(liveCheck, 50); });
if (LIVE_ROLE !== "estudiante") setInterval(() => { liveSeen = liveKeys(); }, 10000); // lo que cambia en esta pestaña lo hizo la propia persona: no se avisa

/* ---------- Satisfacción: el estudiante califica la atención al resolverse su ticket ----------
   t.rating = { score 1–5, t, by }; la administración ve el promedio por moderador en el equipo. */
function rateHTML(t) {
  if (isOpen(t) || !t.mod) return "";
  if (t.rating) return `<p class="small rate-done">Calificaste la atención: <span class="stars" aria-label="${t.rating.score} de 5">${"★".repeat(t.rating.score)}<span class="off">${"★".repeat(5 - t.rating.score)}</span></span></p>`;
  return `<div class="rate"><p class="small" style="font-weight:600">¿Cómo te atendió ${esc(firstName(nameOf(t.mod)))}?</p><div class="stars-in" role="group" aria-label="Califica de 1 a 5">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-rate="${t.id}:${n}" aria-label="${n} de 5${n === 1 ? ": muy mal" : n === 5 ? ": excelente" : ""}">★</button>`).join("")}</div></div>`;
}
function rateSummary(email) {
  const r = tickets.filter(t => t.mod === email && t.rating).map(t => t.rating.score);
  if (!r.length) return `<span class="tiny" style="display:block">Sin calificaciones</span>`;
  const avg = r.reduce((a, b) => a + b, 0) / r.length;
  return `<span class="tiny" style="display:block" title="Promedio de ${r.length} calificaciones"><span class="star1">★</span> ${avg.toFixed(1).replace(".", ",")} · ${r.length}</span>`;
}
// Calificaciones de ejemplo en los tickets resueltos sembrados (una sola vez)
try {
  if (!localStorage.getItem("nexo-rateseed")) {
    const sc = [5, 4, 5, 3, 4, 5, 4];
    tickets.filter(t => !isOpen(t) && t.mod && !t.rating && t.student.email !== sessionEmail).forEach((t, i) => { t.rating = { score: sc[i % sc.length], t: lastActivity(t) + 3600000, by: t.student.email }; });
    saveTickets(); localStorage.setItem("nexo-rateseed", "1");
  }
} catch (err) {}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-rate]"); if (!b) return;
  const [id, n] = b.dataset.rate.split(":"), t = tkById(id); if (!t || t.rating) return;
  t.rating = { score: +n, t: Date.now(), by: sessionEmail }; saveTickets();
  logAudit("soporte", `${firstName(t.student.name)} calificó con ${n}/5 la atención de ${nameOf(t.mod)} en ${id}.`);
  toast(+n >= 4 ? "¡Gracias! Le haremos llegar tu comentario al equipo." : "Gracias por contarnos. Lo usaremos para mejorar la atención.");
  renderSoporte();
});

/* ---------- App instalable (PWA) ----------
   sw.js guarda la app para abrir sin conexión (solo funciona servida por https o localhost, no como archivo suelto).
   "Instalar Nexo": en Android/Chrome/Edge usa el aviso nativo (beforeinstallprompt); en iPhone/iPad explica
   Compartir → Añadir a pantalla de inicio. Si ya se abre como app, no se ofrece. */
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: window-controls-overlay)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const canServeWorker = "serviceWorker" in navigator && /^https?:$/.test(location.protocol);
let installEvt = null;
const installable = () => !isStandalone() && (!!installEvt || (isIOS() && canServeWorker));
let installDismissed = false; try { installDismissed = localStorage.getItem("nexo-installdismiss") === "1"; } catch (err) {}
function renderInstallUI() {
  document.documentElement.classList.toggle("standalone", isStandalone());
  document.querySelectorAll("[data-install-card]").forEach(c => {
    c.hidden = !installable() && !isStandalone();
    if (c.hidden) return;
    c.innerHTML = isStandalone()
      ? `<div class="row start" style="gap:12px"><img src="icons/icon-192.png" alt="" class="inst-ic"><div><h2 class="h2">Estás usando la app de Nexo</h2><p class="small" style="font-size:13px">Nexo está instalada en este dispositivo y abre aunque no tengas conexión.</p></div></div>`
      : `<div class="row start" style="gap:12px"><img src="icons/icon-192.png" alt="" class="inst-ic"><div><h2 class="h2">Instala Nexo</h2><p class="small" style="font-size:13px">Tenla en tu pantalla de inicio, a pantalla completa y disponible sin conexión.</p></div></div><button class="btn" type="button" data-install><i data-lucide="download"></i>Instalar la app</button>`;
  });
  const banner = document.getElementById("installBanner");
  if (banner) {
    banner.hidden = !installable() || installDismissed;
    if (!banner.hidden) banner.innerHTML = `<img src="icons/icon-192.png" alt="" class="inst-ic"><div class="grow"><b>Instala Nexo</b><span>Más rápida y sin conexión.</span></div><button class="btn sm" type="button" data-install>Instalar</button><button class="inst-x" type="button" data-install-close aria-label="No mostrar más"><i data-lucide="x"></i></button>`;
  }
  try { lucide.createIcons(); } catch (err) {}
}
async function doInstall() {
  if (installEvt) {
    installEvt.prompt();
    const { outcome } = await installEvt.userChoice.catch(() => ({ outcome: "dismissed" }));
    installEvt = null;
    toast(outcome === "accepted" ? "¡Listo! Encontrarás Nexo en tu pantalla de inicio." : "Puedes instalarla cuando quieras desde Mi cuenta.");
    renderInstallUI(); return;
  }
  if (isIOS()) askConfirm({ icon: "share", title: "Instala Nexo en tu iPhone", text: "1. Toca el botón Compartir (el cuadrado con la flecha) en la barra de Safari.<br>2. Elige <strong>Añadir a pantalla de inicio</strong>.<br>3. Toca <strong>Añadir</strong>. Nexo aparecerá con su ícono.", ok: "Entendido", cancel: "Cerrar" });
}
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; renderInstallUI(); });
window.addEventListener("appinstalled", () => { installEvt = null; renderInstallUI(); });
document.addEventListener("click", e => {
  if (e.target.closest("[data-install]")) { try { closeUserMenu(); } catch (err) {} doInstall(); return; }
  if (e.target.closest("[data-install-close]")) { installDismissed = true; try { localStorage.setItem("nexo-installdismiss", "1"); } catch (err) {} renderInstallUI(); toast("Listo. Puedes instalarla cuando quieras desde Mi cuenta."); }
});
if (canServeWorker) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => {
      const offer = w => toast("Hay una versión nueva de Nexo.", { persist: true, action: "Actualizar", onAction: () => w.postMessage("skipWaiting") });
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener("updatefound", () => { const w = reg.installing; w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); }); });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
  });
}
window.addEventListener("online", () => toast("Volviste a tener conexión."));
window.addEventListener("offline", () => toast("Sin conexión: puedes seguir usando Nexo; los datos se guardan en este dispositivo.", { persist: true }));
renderInstallUI();

/* ---------- Tutorial: recorrido animado dentro de un teléfono ----------
   4 pasos (Explora, Pide, Paga, Entra) que avanzan solos cada 4,5 s; se pausan al pasar el mouse, al enfocar
   o con el botón; con prefers-reduced-motion no avanzan solos. */
const TOUR_MS = 4500;
let tourI = 0, tourTimer = null, tourPaused = matchMedia("(prefers-reduced-motion: reduce)").matches, tourHover = false;
function tourGo(i) {
  const t = document.getElementById("tour"); if (!t) return;
  tourI = (i + 4) % 4;
  t.querySelectorAll(".tslide").forEach(sl => { const on = +sl.dataset.ts === tourI; sl.classList.toggle("on", on); sl.classList.toggle("past", +sl.dataset.ts < tourI); });
  t.querySelectorAll("[data-tour]").forEach(b => { const on = +b.dataset.tour === tourI; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); b.classList.toggle("done", +b.dataset.tour < tourI); });
  t.style.setProperty("--tour-ms", TOUR_MS + "ms");
  tourArm();
}
function tourArm() {
  clearTimeout(tourTimer);
  const t = document.getElementById("tour"); if (!t) return;
  const run = !tourPaused && !tourHover && current === "tutorial" && !document.hidden;
  t.classList.toggle("paused", !run);
  const pp = t.querySelector("[data-tour-pp]");
  if (pp) { pp.innerHTML = `<i data-lucide="${tourPaused ? "play" : "pause"}"></i>`; pp.setAttribute("aria-label", tourPaused ? "Reanudar el recorrido" : "Pausar el recorrido"); try { lucide.createIcons(); } catch (err) {} }
  if (run) tourTimer = setTimeout(() => tourGo(tourI + 1), TOUR_MS);
}
(function tourInit() {
  const t = document.getElementById("tour"); if (!t) return;
  t.querySelectorAll("canvas[data-qr]").forEach(c => { try { drawQR(c); } catch (err) {} });
  t.addEventListener("mouseenter", () => { tourHover = true; tourArm(); });
  t.addEventListener("mouseleave", () => { tourHover = false; tourGo(tourI); });
  t.addEventListener("click", e => {
    const b = e.target.closest("[data-tour]"); if (b) { tourGo(+b.dataset.tour); return; }
    if (e.target.closest("[data-tour-pp]")) { tourPaused = !tourPaused; tourArm(); }
  });
  t.addEventListener("keydown", e => { if (e.target.closest("[data-tour]") && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { tourGo(tourI + (e.key === "ArrowRight" ? 1 : -1)); t.querySelector(`[data-tour="${tourI}"]`).focus(); e.preventDefault(); } });
  document.addEventListener("visibilitychange", tourArm);
  window.addEventListener("hashchange", () => { if (current === "tutorial") tourGo(0); else tourArm(); });
  tourGo(0);
})();
/* Login: las cuentas de prueba llenan el formulario al tocarlas */
document.addEventListener("click", e => {
  const d = e.target.closest("[data-demo-fill]"); if (!d) return;
  const [m, pw] = d.dataset.demoFill.split("|");
  const mail = document.getElementById("l-mail"), pass = document.getElementById("l-pass");
  if (!mail || !pass) return;
  mail.value = m; pass.value = pw; mail.dispatchEvent(new Event("input", { bubbles: true }));
  const btn = document.querySelector('#loginForm button[type="submit"]'); if (btn) btn.focus();
  toast("Listo: toca Iniciar sesión.");
});

/* ---------- Cuentas reales (Supabase), dueño y datos reales ----------
   Con la app servida por http(s) (SB_ON), las cuentas que no son de prueba viven en Supabase: registro con
   confirmación por correo (enlace PKCE de vuelta a index.html?confirmado=1), inicio de sesión, recuperar contraseña
   con enlace (?recuperar=1) y cierre de sesión. El perfil (nombre, carnet, rol, local) está en public.profiles y
   se copia a la cuenta local (`sb: id`) para que el resto de la app siga igual. Los pagos se anotan en public.payments.
   El rol "owner" lo asigna la base de datos solo al correo del dueño; su pantalla #dueno lee owner_stats() en vivo.
   Las cuentas de prueba (Ana, STAFF0, @comercio.nexo) siguen siendo locales. Migraciones: supabase/migrations/. */
const isTestAccount = email => !email || email === DEMO_EMAIL || /@comercio\.nexo$/.test(email) || STAFF0.some(a => a.email === email);
const sbBusy = (formId, on) => { const b = document.querySelector(`#${formId} button[type="submit"]`); if (b) { b.disabled = on; b.classList.toggle("loading", on); } };
const sbMsg = e => {
  const m = String((e && (e.message || e.error_description)) || "");
  if (/invalid login credentials/i.test(m)) return ["Correo o contraseña incorrectos.", "Revísalos e inténtalo de nuevo, o usa \"¿Olvidaste tu contraseña?\"."];
  if (/email not confirmed/i.test(m)) return ["Confirma tu correo primero.", "Te enviamos un enlace al registrarte. Ábrelo y vuelve a entrar."];
  if (/email address .* is invalid|invalid email|unable to validate email/i.test(m)) return ["Revisa tu correo.", "Ese correo no existe o no puede recibir mensajes. Usa tu correo de la Unimet o uno personal que revises."];
  if (/already registered|already exists/i.test(m)) return ["Ese correo ya tiene una cuenta.", "Inicia sesión con él o usa \"¿Olvidaste tu contraseña?\"."];
  if (/rate limit|too many/i.test(m)) return ["Demasiados intentos seguidos.", "Espera unos minutos e inténtalo de nuevo."];
  if (/sending|smtp|email/i.test(m) && /error/i.test(m)) return ["No pudimos enviar el correo.", "El servicio de correos de Nexo no está listo todavía. Inténtalo más tarde."];
  if (/password/i.test(m) && /(short|weak|least)/i.test(m)) return ["Contraseña muy débil.", "Usa al menos 8 caracteres y un número."];
  if (/fetch|network|failed/i.test(m)) return ["No pudimos conectarnos.", "Revisa tu conexión a internet e inténtalo otra vez."];
  return ["Algo salió mal.", m || "Inténtalo de nuevo en unos minutos."];
};
async function sbProfile(uid) { const { data, error } = await sb.from("profiles").select("*").eq("id", uid).single(); return error ? null : data; }
function sbToLocal(p, pass) {
  let acc = accounts.find(a => a.email === p.email);
  if (!acc) { acc = { email: p.email }; accounts.push(acc); }
  Object.assign(acc, { full: p.full_name || p.email.split("@")[0], carnet: p.carnet || "", created: String(p.created_at).slice(0, 10), sb: p.id, disabled: !!p.disabled });
  if (p.role === "estudiante") delete acc.role; else acc.role = p.role;
  if (p.local_id) acc.local = p.local_id; else delete acc.local;
  ["career", "ci", "phone", "birth", "addr"].forEach(k => { if (p[k]) acc[k] = p[k]; });
  if (pass) acc.pass = passKey(pass);
  saveAccounts();
  return acc;
}
async function sbAdopt(user, pass, remember, flash) {
  const p = await sbProfile(user.id);
  if (!p) { await sb.auth.signOut({ scope: "local" }).catch(() => {}); return loginError("No encontramos tu perfil.", "Inténtalo de nuevo en unos minutos o escríbenos a soporte.", false); }
  const acc = sbToLocal(p, pass);
  if (acc.role === "owner") try { localStorage.setItem("nexo-mode:" + acc.email, "gestion"); } catch (err) {}
  enterApp(acc.email, remember, flash || `Hola de nuevo, ${acc.full.split(" ")[0]}.`);
}
async function sbLogin(email, pass, remember) {
  sbBusy("loginForm", true);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass }).catch(e => ({ error: e }));
  sbBusy("loginForm", false);
  if (error) {
    const [t, x] = sbMsg(error);
    const old = accounts.find(a => a.email === email && !a.sb && !isTestAccount(a.email));
    loginError(t, old && /incorrectos/.test(t) ? "Nexo ahora usa cuentas reales: si te registraste antes de hoy, crea tu cuenta de nuevo con este correo." : x, false);
    document.getElementById("l-pass").closest(".field").classList.add("bad");
    if (/Confirma/.test(t)) sbOfferResend(email, "loginError");
    return;
  }
  await sbAdopt(data.user, pass, remember);
}
function sbOfferResend(email, boxId) {
  const box = document.getElementById(boxId); if (!box) return;
  const b = document.createElement("button"); b.type = "button"; b.className = "link b"; b.textContent = "Reenviar el enlace";
  b.addEventListener("click", async () => {
    const { error } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: location.origin + location.pathname + "?confirmado=1" } }).catch(e => ({ error: e }));
    toast(error ? sbMsg(error).join(" ") : `Te reenviamos el enlace a ${maskMail(email)}.`);
  });
  (box.querySelector("div") || box).append(" ", b);
}
async function sbRegister({ full, carnet, email, pass, carnetEl, mailEl }) {
  sbBusy("registerForm", true);
  const ok = await sb.rpc("carnet_available", { c: carnet }).then(r => r.error ? true : r.data).catch(() => true);
  if (!ok) { sbBusy("registerForm", false); return signupError("Ese carnet ya está registrado.", "Cada carnet solo puede tener una cuenta. Inicia sesión o revisa los dígitos.", carnetEl); }
  const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { full_name: full, carnet }, emailRedirectTo: location.origin + location.pathname + "?confirmado=1" } }).catch(e => ({ error: e }));
  sbBusy("registerForm", false);
  if (error) { const [t, x] = sbMsg(error); return signupError(t, x, /correo/i.test(t) ? null : mailEl); }
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return signupError("Ese correo ya tiene una cuenta.", "Inicia sesión con él o usa \"¿Olvidaste tu contraseña?\".", mailEl);
  if (data.session) return sbAdopt(data.user, pass, true, `Cuenta creada. Te damos la bienvenida a Nexo, ${full.split(" ")[0]}.`);
  const box = document.getElementById("sbCheckMail"), form = document.getElementById("registerForm");
  form.hidden = true; box.hidden = false;
  box.innerHTML = `<div class="card" style="align-items:flex-start;gap:12px">${illu("inbox")}<h2 class="h2">Revisa tu correo</h2><p class="small" style="font-size:14px">Te enviamos un enlace a <strong>${esc(maskMail(email))}</strong>. Ábrelo para activar tu cuenta y entrar a Nexo. Si no lo ves, revisa la carpeta de spam.</p>
    <div class="row start" style="gap:10px;flex-wrap:wrap"><button class="btn ghost sm" type="button" data-sb-resend="${esc(email)}"><i data-lucide="send"></i>Reenviar el enlace</button><button class="btn ghost sm" type="button" data-go="login"><i data-lucide="log-in"></i>Ir a iniciar sesión</button></div></div>`;
  icons();
}
document.addEventListener("click", async e => {
  const r = e.target.closest("[data-sb-resend]"); if (!r || !sb) return;
  const email = r.dataset.sbResend;
  const { error } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: location.origin + location.pathname + "?confirmado=1" } }).catch(er => ({ error: er }));
  toast(error ? sbMsg(error).join(" ") : `Te reenviamos el enlace a ${maskMail(email)}.`);
});
// Recuperar contraseña de una cuenta real: enlace por correo y luego "crea tu contraseña nueva"
async function sbSendReset(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + "?recuperar=1" }).catch(e => ({ error: e }));
  return error;
}
// Al volver de un enlace del correo (confirmar cuenta o recuperar contraseña)
if (sb) (async () => {
  const q = new URLSearchParams(location.search), confirm = q.has("confirmado"), reset = q.has("recuperar");
  const clean = () => history.replaceState(null, "", location.pathname + location.hash);
  if (!confirm && !reset && !q.has("code")) {
    // sesión de una cuenta real: si venció, se cierra; si el dueño cambió el rol, se actualiza
    if (account && account.sb) {
      const { data } = await sb.auth.getSession().catch(() => ({ data: {} }));
      if (!data || !data.session) { clearSession(); try { sessionStorage.setItem("nexo-flash", "Tu sesión venció. Inicia sesión de nuevo."); } catch (err) {} history.replaceState(null, "", "#login"); location.reload(); return; }
      const p = await sbProfile(account.sb);
      if (p && ((p.role === "estudiante" ? undefined : p.role) !== account.role || !!p.disabled !== !!account.disabled || (p.local_id || undefined) !== account.local)) {
        sbToLocal(p); toast("Tu acceso cambió. Actualizamos la app…"); setTimeout(() => location.reload(), 1200);
      }
    }
    return;
  }
  const { data } = await sb.auth.getSession().catch(() => ({ data: {} }));
  const session = data && data.session;
  clean();
  if (reset) {
    if (!session) { go("recuperar"); rp = { step: 1, email: null, code: null, exp: 0, sent: 0, tries: 3, err: "Ese enlace venció o ya se usó. Pide uno nuevo.", ident: "" }; renderRecuperar(); return; }
    rp = { step: "sbnew", email: session.user.email, err: "", ident: "" }; go("recuperar"); renderRecuperar(); return;
  }
  if (session && (!sessionEmail || sessionEmail !== normEmail(session.user.email))) return sbAdopt(session.user, null, true, "¡Correo confirmado! Te damos la bienvenida a Nexo.");
  if (!session && confirm) { go("login"); toast("Tu correo quedó confirmado. Inicia sesión con tu contraseña.", { persist: true }); }
})();
// Pagos reales → public.payments (sin datos de tarjeta)
function trackMove(title, detail, amount, pill, extra) {
  if (!sb || !account || !account.sb) return;
  const a = String(amount || ""), d = String(detail || ""), v = parseFloat(a.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
  if (!v || a.startsWith("+") && title !== "Recarga de wallet") return; // reembolsos y otros abonos no son pagos
  const service = title === "Recarga de wallet" ? "recarga" : d.startsWith("Universidad") ? "materias" : extra.icon === "car-front" ? "estacionamiento" : extra.icon === "dribbble" ? "canchas" : extra.order || extra.icon === "utensils" ? "comida" : null;
  if (!service || !["Pagado", "En revisión", "Acreditada", "Aprobado"].includes(pill)) return;
  const o = extra.order ? (orders || []).find(x => x.id === extra.order) : null;
  const method = /Pago Móvil/.test(d) ? "pago-movil" : /Wallet/.test(d) ? "wallet" : /Transferencia/.test(d) || (o && o.method === "transfer") ? "transferencia" : (o && o.method === "card") || /Visa|Mastercard|····/.test(d) || service === "canchas" ? "tarjeta" : "otro";
  sb.from("payments").insert({ service, amount: v, status: pill, method, detail: String(title).slice(0, 120) }).then(({ error }) => { if (error) console.warn("Nexo: no se anotó el pago", error.message); });
}
// Pago de canchas: antes no quedaba en Actividad ni en los gastos del mes
document.addEventListener("click", e => {
  if (!e.target.closest("[data-court-pay]")) return;
  const sp = SPORTS[res.sport], fee = Math.round(sp.price * 5) / 100, end = pad2(parseInt(res.slot) + 1) + ":00";
  addMovement(sp.court, `Canchas · ${res.dname} ${res.day} ${resMes()} · ${res.slot}–${end}`, "−" + money(sp.price + fee), "Pagado", "ok", { icon: "dribbble", go: "qr", goLabel: "Ver comprobante →" });
  rememberCourt({ id: "c" + Date.now(), sport: res.sport, iso: courtIso(), slot: res.slot, price: Math.round((sp.price + fee) * 100) / 100 });
});
// Mi cuenta: los cambios de una cuenta real se guardan también en Supabase
function sbSaveProfile(changes) {
  if (!sb || !account || !account.sb) return;
  const map = { full: "full_name", career: "career", ci: "ci", phone: "phone", birth: "birth", addr: "addr" }, row = {};
  Object.entries(changes).forEach(([k, v]) => { if (map[k]) row[map[k]] = v === "" ? null : v; });
  if (Object.keys(row).length) sb.from("profiles").update(row).eq("id", account.sb).then(({ error }) => { if (error) toast("No pudimos guardar el cambio en tu cuenta. Inténtalo de nuevo."); });
}
/* Etapa 2 · pedidos y tickets compartidos en vivo (Supabase: tablas orders y tickets, Realtime).
   Estudiante con cuenta real: sus pedidos se suben al guardarlos (`sbSyncOrders`) y los cambios del comercio llegan en vivo.
   Comercio con cuenta real (rol local + local_id): `allOrders`/`updateOrder` usan `sbLocalOrders` (pedidos de su local).
   Tickets: con cuenta real `tickets` viene de Supabase (el estudiante ve los suyos; moderación, admin, creador y dueño, todos)
   y `saveTickets` sube los que cambiaron. Las cuentas de prueba siguen con sus datos locales de ejemplo. */
function sbShared() { return !!(sb && account && account.sb); }
function sbMerchant() { return sbShared() && roleOf(account) === "local" && !!account.local; }
let sbLocalOrders = [], sbSynced = { o: {}, t: {} }, sbLastWrite = 0;
// lo que cambia esta misma pestaña no se anuncia como "nuevo" (Realtime también avisa los cambios propios)
const sbLive = () => { try { if (Date.now() - sbLastWrite < 4000) liveSeen = liveKeys(); else liveCheck(); } catch (err) {} };
// Cola por registro: los cambios de un mismo pedido o ticket se envían de uno en uno y siempre con la versión más
// reciente (si no, dos cambios seguidos pueden llegar en desorden y el viejo pisa al nuevo).
const sbQ = {};
function sbPush(key, send, onError) {
  const q = sbQ[key] || (sbQ[key] = { busy: false, again: false });
  if (q.busy) { q.again = true; return; }
  q.busy = true; sbLastWrite = Date.now();
  send().then(({ error }) => { if (error) onError(error); }, onError).finally(() => { q.busy = false; sbLastWrite = Date.now(); if (q.again) { q.again = false; sbPush(key, send, onError); } });
}
const sbPending = key => !!(sbQ[key] && sbQ[key].busy);
function sbSyncOrders() {
  if (!sbShared() || sbMerchant()) return;
  orders.forEach(o => {
    const js = JSON.stringify(o); if (sbSynced.o[o.id] === js) return; sbSynced.o[o.id] = js;
    sbPush("o" + o.id, () => sb.from("orders").upsert({ id: o.id, local_id: o.local, data: orders.find(x => x.id === o.id) || o }), err => { delete sbSynced.o[o.id]; console.warn("Nexo: pedido sin subir", err && err.message); });
  });
}
function sbSyncTickets() {
  if (!sbShared()) return;
  tickets.forEach(t => {
    const js = JSON.stringify(t); if (sbSynced.t[t.id] === js) return; sbSynced.t[t.id] = js;
    const id = t.id, cur = () => tickets.find(x => x.id === id) || t, mine = t.student && t.student.email === sessionEmail;
    sbPush("t" + id, () => (sbSynced.t["_" + id] || !mine ? sb.from("tickets").update({ data: cur() }).eq("id", id) : sb.from("tickets").upsert({ id, data: cur() })).then(r => { if (!r.error) sbSynced.t["_" + id] = 1; return r; }),
      () => { delete sbSynced.t[id]; toast("No pudimos guardar el ticket. Revisa tu conexión."); });
  });
}
function sbRefreshScreens() {
  const r = { inicio: renderHome, comida: () => { renderFoodList(); renderFoodOrders(); renderFoodAgain(); }, pedido: renderPedido, soporte: renderSoporte, "local-pedidos": renderLocalPedidos, gestion: renderGestion, moderacion: renderModeracion, "creador-equipo": renderCreadorEquipo, caso: renderCaso }[current];
  if (r) try { r(); } catch (err) {}
  try { checkOrders(); } catch (err) {}
}
async function sbLoadShared() {
  if (sbMerchant()) {
    const { data } = await sb.from("orders").select("id,user_id,data").eq("local_id", account.local).order("created_at", { ascending: false }).limit(300);
    sbLocalOrders = data || [];
  } else {
    const { data } = await sb.from("orders").select("id,data").eq("user_id", account.sb);
    if (data) {
      const server = new Map(data.map(r => [r.id, r.data]));
      orders.forEach(o => { if (!server.has(o.id)) server.set(o.id, o); }); // pedidos hechos antes en este navegador: se suben
      orders = [...server.values()].sort((a, b) => (a.paidAt || 0) - (b.paidAt || 0));
      data.forEach(r => { sbSynced.o[r.id] = JSON.stringify(r.data); });
      try { localStorage.setItem(K("nexo-orders"), JSON.stringify(orders)); } catch (err) {}
      sbSyncOrders();
    }
  }
  const { data: tk } = await sb.from("tickets").select("id,data").order("created_at", { ascending: true });
  if (tk) { tickets = tk.map(r => r.data); tk.forEach(r => { sbSynced.t[r.id] = JSON.stringify(r.data); sbSynced.t["_" + r.id] = 1; }); }
}
async function sbSharedInit() {
  if (!sbShared()) return;
  try { await sbLoadShared(); } catch (err) { console.warn("Nexo: no se cargaron los datos compartidos", err); }
  try { await sbStateInit(); } catch (err) { console.warn("Nexo: no se cargó el wallet", err); }
  if (sbIsCaja()) try { await sbLoadCaja(); } catch (err) {}
  try { await sbCourtsInit(); } catch (err) { console.warn("Nexo: no se cargaron las canchas", err); }
  try { liveSeen = liveKeys(); } catch (err) {}
  sbRefreshScreens();
  sb.channel("nexo-vivo")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, ({ new: row }) => {
      if (!row || !row.data || sbPending("o" + row.id)) return;
      if (sbMerchant()) {
        const i = sbLocalOrders.findIndex(x => x.id === row.id);
        if (i >= 0) sbLocalOrders[i] = row; else sbLocalOrders.unshift(row);
        sbLive();
      } else if (row.user_id === account.sb) {
        sbSynced.o[row.id] = JSON.stringify(row.data);
        const i = orders.findIndex(o => o.id === row.id);
        if (i >= 0) orders[i] = row.data; else orders.push(row.data);
        try { localStorage.setItem(K("nexo-orders"), JSON.stringify(orders)); } catch (err) {}
      }
      sbRefreshScreens();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, ({ new: row }) => {
      if (!row || !row.data || sbPending("t" + row.id)) return;
      sbSynced.t[row.id] = JSON.stringify(row.data); sbSynced.t["_" + row.id] = 1;
      const i = tickets.findIndex(t => t.id === row.id);
      if (i >= 0) tickets[i] = row.data; else tickets.push(row.data);
      sbLive();
      sbRefreshScreens();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "court_bookings" }, () => { sbLoadCourts(); })
    .on("postgres_changes", { event: "*", schema: "public", table: "student_state" }, ({ new: row }) => {
      if (!row || !row.user_id) return;
      if (row.user_id === account.sb && sbStateReady && !sbPending("state") && !sbPending("wallet")) sbApplyState(row);
      if (sbIsCaja()) {
        const i = sbCajaRows.findIndex(r => r.user_id === row.user_id), prev = sbCajaRows[i];
        if (prev) { sbCajaRows[i] = { ...prev, pagos: row.pagos, pendrec: row.pendrec, updated_at: row.updated_at }; sbLive(); if (current === "validar") renderValidar(); }
        else sbLoadCaja().then(() => { sbLive(); if (current === "validar") renderValidar(); });
      }
    })
    .subscribe();
}
/* Etapa 3 · wallet, facturas, recargas, comprobantes y Caja en vivo (Supabase: student_state, Storage "comprobantes").
   Cuenta real: pagos, pendRec, moves y MATERIAS se guardan con save_my_state (el servidor mezcla con lo que decidió Caja
   o anotó el personal); el saldo del wallet solo cambia por diferencias con wallet_add (nunca queda negativo).
   Caja (admin, creador, dueño) lee caja_state y decide con caja_decide, que actualiza factura/recarga, saldo, movimiento
   y el pago del dueño de una sola vez. Reembolsos y cancelaciones llegan con push_move. */
let sbStateReady = false, sbStateDirty = false, sbWalletKnown = 0, sbStateTimer = null, sbCajaRows = [];
const sbIsCaja = () => sbShared() && ["admin", "creator", "owner"].includes(roleOf(account));
const r2 = n => Math.round(n * 100) / 100;
function sbStateArgs() { return { p_pagos: pagos, p_pendrec: pendRec, p_moves: moves, p_materias: { trim: TRIM_ID, list: MATERIAS }, p_park: { plan: plan || null, vehicle: vehicle || null } }; }
function sbSaveState() {
  if (!sbShared()) return;
  if (!sbStateReady) { sbStateDirty = true; return; }
  clearTimeout(sbStateTimer);
  sbStateTimer = setTimeout(() => sbPush("state", () => sb.rpc("save_my_state", sbStateArgs()).then(r => {
    if (!r.error && r.data && !sbQ.state.again) sbApplyState(r.data, true);
    return r;
  }), err => { console.warn("Nexo: estado sin guardar", err && err.message); toast("No pudimos guardar tu pago en tu cuenta. Revisa tu conexión."); }), 250);
}
function sbSaveWallet() {
  if (!sbShared() || !sbStateReady) return;
  sbPush("wallet", () => {
    const d = r2(WALLET - sbWalletKnown);
    if (!d) return Promise.resolve({});
    sbWalletKnown = r2(sbWalletKnown + d);
    return sb.rpc("wallet_add", { delta: d }).then(r => {
      if (r.error) { sbWalletKnown = r2(sbWalletKnown - d); WALLET = r2(WALLET - d); sbWalletLocal(); toast(/insuficiente/i.test(r.error.message) ? "Tu saldo no alcanza para ese pago." : "No pudimos actualizar tu saldo. Revisa tu conexión."); return {}; }
      sbWalletKnown = +r.data; if (!sbQ.wallet.again) { WALLET = +r.data; sbWalletLocal(); }
      return r;
    });
  }, err => console.warn("Nexo: saldo sin guardar", err && err.message));
}
function sbWalletLocal() { try { localStorage.setItem(K("nexo-wallet"), String(WALLET)); } catch (err) {} try { renderWallet(); } catch (err) {} }
// Pone lo que dice el servidor en las variables de la app y repinta (sin volver a subirlo)
function sbApplyState(row, fromSave) {
  if (!sbPending("wallet") && !(sbQ.wallet && sbQ.wallet.again)) { sbWalletKnown = +row.wallet || 0; WALLET = sbWalletKnown; }
  const same = JSON.stringify([pagos, pendRec, moves]) === JSON.stringify([{ ...JSON.parse(JSON.stringify(PAGOS0)), ...(row.pagos || {}) }, row.pendrec || [], row.moves || []]);
  pagos = { ...JSON.parse(JSON.stringify(PAGOS0)), ...(row.pagos || {}) };
  pendRec = row.pendrec || []; moves = row.moves || [];
  if (row.materias && row.materias.trim === TRIM_ID && Array.isArray(row.materias.list)) MATERIAS = row.materias.list;
  const parkSame = JSON.stringify([plan || null, vehicle || null]) === JSON.stringify([row.plan || null, row.vehicle || null]);
  if ("plan" in row) { plan = row.plan || null; vehicle = row.vehicle || null; }
  try { localStorage.setItem(K("nexo-plan"), JSON.stringify(plan)); localStorage.setItem(K("nexo-vehicle"), JSON.stringify(vehicle)); } catch (err) {}
  try {
    localStorage.setItem(K("nexo-pagos"), JSON.stringify(pagos)); localStorage.setItem(K("nexo-pendrec"), JSON.stringify(pendRec));
    localStorage.setItem(K("nexo-moves"), JSON.stringify(moves)); localStorage.setItem(K("nexo-wallet"), String(WALLET));
    localStorage.setItem(K("nexo-materias"), JSON.stringify({ trim: TRIM_ID, list: MATERIAS }));
  } catch (err) {}
  try { renderWallet(); } catch (err) {}
  if (same && parkSame && fromSave) return;
  [renderPlanState, renderVehicle].forEach(f => { try { f(); } catch (err) {} });
  try { const card = document.getElementById("mvCount").closest(".card"); card.querySelectorAll(".move").forEach(el => el.remove()); moves.forEach(drawMovement); refreshActivity(); } catch (err) {}
  [renderDebt, renderRecarga, renderMatList, renderNotifs, renderHome].forEach(f => { try { f(); } catch (err) {} });
  try { if (current === "pedido") renderPedido(); } catch (err) {}
}
async function sbStateInit() {
  const { data, error } = await sb.from("student_state").select("*").eq("user_id", account.sb).maybeSingle();
  if (error) { console.warn("Nexo: no se cargó tu estado", error.message); return; }
  const localWallet = WALLET;
  if (data && data.plan == null && data.vehicle == null && (plan || vehicle)) sbStateDirty = true; // plan o vehículo de antes de la etapa 4
  if (!data || sbStateDirty) {
    // primera vez con esta cuenta (o cambios hechos mientras cargaba): se sube lo de este navegador y el servidor mezcla
    const r = await sb.rpc("save_my_state", sbStateArgs());
    if (r.error) { console.warn("Nexo: no se subió tu estado", r.error.message); return; }
    sbStateReady = true; sbApplyState(r.data);
    if (!data && localWallet > 0) { WALLET = localWallet; sbSaveWallet(); }
  } else { sbStateReady = true; sbApplyState(data); }
  sbStateDirty = false;
}
// Caja
async function sbLoadCaja() {
  const { data, error } = await sb.from("caja_state").select("user_id,full_name,email,pagos,pendrec,updated_at");
  if (!error && data) sbCajaRows = data;
}
function sbCajaItems() {
  const out = [];
  sbCajaRows.forEach(row => {
    const name = row.full_name || row.email || "Estudiante";
    Object.entries(row.pagos || {}).forEach(([id, p]) => {
      if (p && ["revision", "pagada", "rechazada"].includes(p.estado) && (p.estado === "revision" || p.validatedAt || p.rejectedAt))
        out.push({ kind: "factura", key: "sb:" + row.user_id, email: row.email, id, p, who: p.studentName || name, usd: p.monto, title: `Factura de ${MES_DE(id)}`, sent: p.sentAt || (p.date ? new Date(p.date + "T12:00").getTime() : 0), done: p.estado !== "revision" });
    });
    (row.pendrec || []).forEach(r => out.push({ kind: "recarga", key: "sb:" + row.user_id, email: row.email, id: r.id, p: { ...r, currency: "bs", paidAmount: r.bs, receipt: null }, who: name, usd: r.amount, title: "Recarga de wallet · Pago Móvil", sent: r.sentAt || 0, done: r.estado !== "revision" }));
  });
  return out.sort((a, b) => b.sent - a.sent);
}
function sbCajaDecide(key, ok, motivo, quiet) {
  const i = key.lastIndexOf("|"), sk = key.slice(0, i), id = key.slice(i + 1), uid = sk.slice(3);
  const item = sbCajaItems().find(x => x.key === sk && x.id === id); if (!item || item.done) return;
  const now = Date.now(), me = user.full;
  // se marca al instante; si el servidor lo rechaza, se recarga la lista
  Object.assign(item.p, ok ? { estado: item.kind === "factura" ? "pagada" : "aprobada", validatedAt: now, validatedBy: me } : { estado: "rechazada", motivo, rejectedAt: now, rejectedBy: me });
  const row = sbCajaRows.find(r => r.user_id === uid);
  if (row) { if (item.kind === "factura") row.pagos = { ...row.pagos, [id]: { ...row.pagos[id], ...item.p } }; else row.pendrec = row.pendrec.map(r => r.id === id ? { ...r, estado: item.p.estado, motivo: item.p.motivo, validatedAt: item.p.validatedAt, rejectedAt: item.p.rejectedAt, validatedBy: item.p.validatedBy, rejectedBy: item.p.rejectedBy } : r); }
  sbLastWrite = now;
  sb.rpc("caja_decide", { target: uid, kind: item.kind, item_id: id, ok, motivo: motivo || null, fecha: fmtD(new Date(now)), match: item.kind === "factura" ? `Factura de ${MES_DE(id)}` : "Recarga de wallet" }).then(({ error }) => {
    sbLastWrite = Date.now();
    if (error) { toast(/Ya revisado/.test(error.message) ? `Otra persona de Caja ya revisó el pago de ${item.who}.` : "No pudimos guardar la decisión. Inténtalo de nuevo."); sbLoadCaja().then(() => { if (current === "validar") renderValidar(); }); }
  });
  logAudit("caja", ok ? `Aprobó ${item.title.toLowerCase()} de ${item.who} (${money(item.usd)}, ref. ${item.p.ref}).` : `Rechazó ${item.title.toLowerCase()} de ${item.who}: ${motivo}.`);
  vlReject = null; vlSel.delete(key);
  if (quiet) return item;
  toast(ok ? `Aprobaste el pago de ${item.who} por ${money(item.usd)}.` : `Rechazaste el pago de ${item.who}. Le avisaremos el motivo.`);
  renderValidar();
  return item;
}
// Comprobantes: se suben a Storage en la carpeta de la persona; devuelve la ruta al instante
function sbUploadReceipt(file, kind) {
  if (!sbShared() || !file) return null;
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z]/g, "").slice(0, 4) || "pdf";
  const path = `${account.sb}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  sb.storage.from("comprobantes").upload(path, file, { contentType: file.type || undefined, upsert: false }).then(({ error }) => {
    if (error) { console.warn("Nexo: comprobante sin subir", error.message); toast("No pudimos subir tu comprobante. Si Caja te lo pide, envíalo por soporte."); }
  });
  return path;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-vl-receipt]"); if (!b || !sb) return;
  const w = window.open("", "_blank");
  sb.storage.from("comprobantes").createSignedUrl(b.dataset.vlReceipt, 300).then(({ data, error }) => {
    if (error || !data) { if (w) w.close(); toast("El comprobante no está disponible (puede que no se haya subido)."); return; }
    if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
  });
});
/* Etapa 4 · canchas compartidas (court_bookings: una reserva activa por cancha, día y hora; book_court valida y evita
   choques) y estacionamiento (plan y vehículo viajan en student_state con save_my_state). Con cuenta real el selector
   de días muestra hoy y los 6 días siguientes, y las horas ocupadas salen de las reservas reales (sin datos de ejemplo). */
let sbCourtRows = [];
const isoDay = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function sbCourtBusyFor(sport, iso) {
  try {
    const now = new Date(), past = iso === isoDay(now) ? ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00"].filter(t => parseInt(t) <= now.getHours()) : [];
    return [...new Set([...past, ...sbCourtRows.filter(r => r.sport === sport && r.day === iso).map(r => r.slot)])];
  } catch (err) { return []; }
}
function sbCourtDays() {
  const box = document.getElementById("dayPicker"); if (!box) return;
  const t = new Date(), days = [...Array(7)].map((_, i) => new Date(t.getFullYear(), t.getMonth(), t.getDate() + i, 12));
  const DN = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  if (!days.some(d => isoDay(d) === res.iso)) { const d = days[0]; Object.assign(res, { iso: isoDay(d), day: String(d.getDate()), dname: DN[d.getDay()], mon: d.getMonth(), yr: d.getFullYear() }); }
  box.innerHTML = days.map(d => `<button class="day${isoDay(d) === res.iso ? " on" : ""}" type="button" data-day="${d.getDate()}" data-dname="${DN[d.getDay()]}" data-iso="${isoDay(d)}"><small>${DN[d.getDay()][0]}</small>${d.getDate()}</button>`).join("");
}
async function sbLoadCourts() {
  const { data, error } = await sb.from("court_bookings").select("sport,day,slot").is("cancelled_at", null).gte("day", isoDay(new Date()));
  if (!error && data) sbCourtRows = data;
  const mine = await sb.from("court_bookings").select("id,sport,day,slot,price").eq("user_id", account.sb).is("cancelled_at", null).gte("day", isoDay(new Date()));
  if (!mine.error && mine.data) { myCourts = mine.data.map(r => ({ id: r.id, sport: r.sport, iso: r.day, slot: r.slot, price: +r.price })); saveMyCourts(); }
  if (["reserva", "revision"].includes(current)) renderReserva();
}
async function sbCourtsInit() {
  sbCourtDays(); renderReserva();
  await sbLoadCourts();
  // si el día cambia con la app abierta, el selector se rehace
  setInterval(() => { if (!document.querySelector(`#dayPicker [data-iso="${isoDay(new Date())}"]`)) { sbCourtDays(); renderReserva(); } }, 60000);
}
// Pagar la reserva: primero se aparta el horario en el servidor; si alguien se adelantó, se avisa y se vuelve a elegir
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-court-pay]"); if (!btn || !sbShared()) return;
  e.preventDefault(); e.stopPropagation();
  if (btn.classList.contains("loading")) return;
  const sp = SPORTS[res.sport], fee = Math.round(sp.price * 5) / 100, end = pad2(parseInt(res.slot) + 1) + ":00", total = r2(sp.price + fee);
  btn.classList.add("loading"); btn.disabled = true;
  sb.rpc("book_court", { p_sport: res.sport, p_day: res.iso, p_slot: res.slot, p_price: total }).then(({ data, error }) => {
    btn.classList.remove("loading"); btn.disabled = false;
    if (error) { toast(/reservado|pasó|Máximo|14 días/.test(error.message) ? error.message + "." : "No pudimos reservar. Revisa tu conexión."); sbLoadCourts(); go("reserva"); return; }
    sbCourtRows.push({ sport: res.sport, day: res.iso, slot: res.slot });
    if (data && data.id) rememberCourt({ id: data.id, sport: res.sport, iso: res.iso, slot: res.slot, price: total });
    addMovement(sp.court, `Canchas · ${res.dname} ${res.day} ${resMes()} · ${res.slot}–${end}`, "−" + money(total), "Pagado", "ok", { icon: "dribbble", go: "qr", goLabel: "Ver comprobante →" });
    go("qr");
  });
}, true);
sbSharedInit();
// Pantalla "Datos reales" del dueño
const SV_LBL = { comida: ["Comida", "utensils"], estacionamiento: ["Estacionamiento", "car-front"], materias: ["Materias", "graduation-cap"], canchas: ["Canchas", "dribbble"], recarga: ["Recargas de wallet", "wallet"] };
const MT_LBL = { tarjeta: "Tarjeta", transferencia: "Transferencia", "pago-movil": "Pago Móvil", wallet: "Wallet Nexo", otro: "Otro" };
const ROLE_OPTS = [["estudiante", "Estudiante"], ["local", "Comercio"], ["mod", "Moderador"], ["admin", "Administrador"], ["creator", "Creador"]];
const fullDT = t => { const d = new Date(t); return `${d.getDate()} ${MES_CORTO[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
let dnBusy = false, dnUsers = [], dnFilter = "", dnTable = false, dnLast = null;
const SV_TONE = { comida: "t-food", estacionamiento: "t-car", materias: "t-uni", canchas: "t-court", recarga: "t-brand" };
// Gráfico de barras horizontales: confirmado (verde) + en revisión (ámbar), con leyenda, valores y detalle al pasar
function dnChart(by) {
  const rows = Object.keys(SV_LBL).map(k => { const x = by[k] || { n: 0, usd: 0, rev: 0, revUsd: 0 }; return { k, n: +x.n, usd: +x.usd, rev: +x.rev, revUsd: +x.revUsd }; })
    .sort((a, b) => (b.usd + b.revUsd) - (a.usd + a.revUsd));
  const max = Math.max(1, ...rows.map(r => r.usd + r.revUsd));
  if (!rows.some(r => r.usd + r.revUsd)) return emptyState("chart-no-axes-column", "Aún no hay dinero que mostrar", "Cuando alguien pague con su cuenta, verás aquí cuánto mueve cada servicio.");
  return `<div class="dn-legend"><span><i class="sw ok"></i>Confirmado</span><span><i class="sw rev"></i>En revisión</span></div>
    <div class="dn-bars" role="list">${rows.map(r => `<div class="dn-bar" role="listitem" tabindex="0" aria-label="${SV_LBL[r.k][0]}: ${money(r.usd)} confirmados en ${r.n} pagos${r.rev ? `, ${money(r.revUsd)} en revisión` : ""}">
      <span class="dn-lbl"><i data-lucide="${SV_LBL[r.k][1]}"></i>${SV_LBL[r.k][0]}</span>
      <span class="dn-track">${r.usd ? `<i class="seg ok" style="width:${r.usd / max * 100}%"></i>` : ""}${r.revUsd ? `<i class="seg rev" style="width:${r.revUsd / max * 100}%"></i>` : ""}</span>
      <span class="dn-val"><b>${money(r.usd)}</b>${r.revUsd ? `<span class="tiny">+ ${money(r.revUsd)}</span>` : ""}</span>
      <span class="dn-tip" role="tooltip"><b>${SV_LBL[r.k][0]}</b><span>${r.n} ${r.n === 1 ? "pago confirmado" : "pagos confirmados"} · ${money(r.usd)}</span><span>${r.rev ? `${r.rev} en revisión · ${money(r.revUsd)}` : "Nada en revisión"}</span></span></div>`).join("")}</div>`;
}
async function renderDueno() {
  const body = document.getElementById("dnBody"), acts = document.getElementById("dnActs"); if (!body) return;
  if (!sb || !account || !account.sb) { acts.innerHTML = ""; body.innerHTML = `<div class="notice warn"><i data-lucide="globe"></i><p>Los datos reales solo se ven en la app publicada: abre la app publicada (<strong>pedroyasellipalomino-spec.github.io/NEXO</strong>) y entra con tu cuenta de dueño.</p></div>`; icons(); return; }
  if (dnBusy) return; dnBusy = true;
  acts.innerHTML = `<button class="btn ghost sm" type="button" data-dn-refresh><i data-lucide="refresh-cw"></i>Actualizar</button>`;
  if (!body.querySelector(".dn-kpis")) body.innerHTML = `<p class="small">Cargando datos reales…</p>`;
  icons();
  const [st, us, ex] = await Promise.all([sb.rpc("owner_stats"), sb.from("profiles").select("id,full_name,email,carnet,role,local_id,disabled,created_at").order("created_at", { ascending: false }), sb.rpc("owner_extra")]).catch(e => [{ error: e }, {}, {}]);
  dnBusy = false;
  const x4 = (ex && ex.data) || null;
  if (st.error || !st.data) { body.innerHTML = `<div class="notice warn"><i data-lucide="wifi-off"></i><p>No pudimos cargar los datos (${esc(sbMsg(st.error)[0])}). Toca Actualizar.</p></div>`; icons(); return; }
  const d = st.data; dnUsers = (us && us.data) || [];
  const lg = d.legacy;
  document.getElementById("dnLead").textContent = `Datos en vivo de la base de datos de Nexo. No incluye las cuentas de prueba ni los datos de ejemplo.${lg ? ` Antes de las cuentas reales, el contador temporal anotó ${lg.signups} ${lg.signups === 1 ? "registro" : "registros"} y ${lg.payments} ${lg.payments === 1 ? "pago" : "pagos"}.` : ""}`;
  const k = (lbl, val, sub, ic) => `<div class="card kpi static sk"><div class="row start" style="gap:10px">${skIc(ic)}<span class="small">${lbl}</span></div><b class="kv-big">${val}</b><span class="tiny">${sub}</span></div>`;
  const svRows = Object.keys(SV_LBL).map(key => { const x = d.byService[key] || { n: 0, usd: 0, rev: 0, revUsd: 0 };
    return `<div class="tk-row dn-row"><span class="row start" style="gap:10px"><span class="ico"><i data-lucide="${SV_LBL[key][1]}"></i></span><b style="font-size:13px">${SV_LBL[key][0]}</b></span><span><span class="tk-lbl">Confirmados</span>${x.n} · <b>${money(+x.usd)}</b></span><span><span class="tk-lbl">En revisión</span>${x.rev ? `${x.rev} · ${money(+x.revUsd)}` : "—"}</span></div>`; }).join("");
  const recent = d.recent.length ? `<ol class="dn-tl">${d.recent.map(e => `<li class="${SV_TONE[e.service] || "t-brand"}"><span class="dn-dot"><i data-lucide="${SV_LBL[e.service][1]}"></i></span>
      <div class="grow" style="min-width:0"><b style="font-size:13px">${SV_LBL[e.service][0]} · ${MT_LBL[e.method] || "Otro"}</b><span class="tiny" style="display:block">${esc(e.who || "Alguien")} · ${fullDT(e.t)}</span></div>
      <div class="dn-amt"><b>${money(+e.amount)}</b><span class="pill ${e.status === "En revisión" ? "warn" : e.status === "Rechazado" ? "bad" : e.status === "Reembolsado" ? "neutral" : "ok"}">${e.status}</span></div></li>`).join("")}</ol>`
    : emptyState("receipt-text", "Aún no hay pagos reales", "Cuando alguien pague en la app publicada con su cuenta, aparecerá aquí al instante.");
  const conf = d.users.confirmed;
  body.innerHTML = `<div class="kpis dn-kpis">${k("Usuarios registrados", d.users.total, `${conf} con correo confirmado · ${d.users.today} hoy · ${d.users.last7} en 7 días`, "users")}${k("Pagos confirmados", d.payments.count, `${money(+d.payments.usd)} en total · ${d.payments.payers} ${d.payments.payers === 1 ? "persona pagó" : "personas pagaron"}`, "badge-check")}${k("Pagos en revisión", d.payments.review, d.payments.review ? `${money(+d.payments.reviewUsd)} esperando validación` : "Nada pendiente", "hourglass")}${d.orders ? k("Pedidos de comida", d.orders.total, `${d.orders.active} en curso · ${d.orders.delivered} entregados${d.orders.cancelled ? ` · ${d.orders.cancelled} cancelados` : ""}`, "utensils") : ""}${d.tickets ? k("Tickets de soporte", d.tickets.open, `abiertos · ${d.tickets.unassigned} sin asignar · ${d.tickets.resolved} resueltos`, "message-circle") : ""}${x4 ? k("Reservas de canchas", x4.courts.total, `${x4.courts.upcoming} por jugar`, "dribbble") + k("Estacionamiento", x4.parking.plans, `planes vigentes · ${x4.parking.vehicles} ${x4.parking.vehicles === 1 ? "vehículo registrado" : "vehículos registrados"}`, "car-front") + k("Saldo en wallets", money(+x4.wallet), "suma de todos los wallets", "wallet") : ""}</div>
    <div class="card dn-chart"><div class="row" style="flex-wrap:wrap;gap:8px"><div><h2 class="sec">Dinero por servicio</h2><p class="small">Pagos reales en dólares, desde la primera cuenta.</p></div><button class="link b" type="button" data-dn-view>${dnTable ? "Ver gráfico" : "Ver tabla"}</button></div>
      ${dnTable ? `<div style="margin:0 -18px -18px"><div class="tk-row tk-head dn-row"><span>Servicio</span><span>Confirmados</span><span>En revisión</span></div>${svRows}</div>` : dnChart(d.byService)}</div>
    <div class="card"><div class="row"><h2 class="sec">Últimos pagos reales</h2><span class="tiny">Actualizado ${fullDT(d.now)}</span></div>${recent}</div>
    <div class="card" style="gap:12px"><div class="row" style="flex-wrap:wrap;gap:10px"><div><h2 class="sec">Usuarios</h2><p class="small">Cambia el rol de cada cuenta o desactívala. Los cambios se aplican la próxima vez que esa persona abra la app.</p></div>
      <div class="input" style="max-width:280px"><i data-lucide="search"></i><input id="dnSearch" type="search" placeholder="Buscar por nombre, correo o carnet" value="${esc(dnFilter)}" aria-label="Buscar usuarios"></div></div>
      <div id="dnUsers"></div></div>
    <div class="notice"><i data-lucide="shield-check"></i><p>Solo tu cuenta puede ver esta pantalla: la base de datos lo verifica en cada consulta. Los pagos "en revisión" son los que el estudiante reportó y Caja aún no valida.</p></div>`;
  renderDnUsers();
  icons();
}
function renderDnUsers() {
  const box = document.getElementById("dnUsers"); if (!box) return;
  const f = normTxt(dnFilter), list = dnUsers.filter(u => !f || normTxt(`${u.full_name} ${u.email} ${u.carnet || ""}`).includes(f));
  box.innerHTML = list.length ? list.map(u => `<div class="dn-user${u.disabled ? " off" : ""}"><span class="avatar sm role-${u.role}">${esc(initialsOf(u.full_name || u.email))}</span>
      <div class="grow" style="min-width:0"><b style="font-size:13px">${esc(u.full_name || "Sin nombre")} <span class="role-tag role-${u.role}">${u.role === "owner" ? "Dueño" : (ROLE_OPTS.find(r => r[0] === u.role) || [0, "Estudiante"])[1]}${u.disabled ? " · desactivada" : ""}</span></b><span class="tiny" style="display:block;overflow:hidden;text-overflow:ellipsis">${esc(u.email)}${u.carnet ? ` · ${esc(u.carnet)}` : ""} · desde ${fmtD(new Date(u.created_at))}</span></div>
      ${u.role === "owner" ? "" : `<div class="row start" style="gap:6px;flex-wrap:wrap"><div class="input sel sm"><select data-dn-role="${u.id}" aria-label="Rol de ${esc(u.full_name)}">${ROLE_OPTS.map(([v, l]) => `<option value="${v}"${u.role === v ? " selected" : ""}>${l}</option>`).join("")}</select><i data-lucide="chevron-down"></i></div>
        ${u.role === "local" ? `<div class="input sel sm"><select data-dn-local="${u.id}" aria-label="Local de ${esc(u.full_name)}">${LOCALES.map(l => `<option value="${l.id}"${u.local_id === l.id ? " selected" : ""}>${esc(l.name)}</option>`).join("")}</select><i data-lucide="chevron-down"></i></div>` : ""}
        <button class="btn ghost sm" type="button" data-dn-toggle="${u.id}">${u.disabled ? "Reactivar" : "Desactivar"}</button></div>`}</div>`).join("")
    : emptyState("users", dnUsers.length ? "Nadie coincide con la búsqueda" : "Aún no hay usuarios", dnUsers.length ? "Prueba con otro nombre, correo o carnet." : "Cuando alguien cree su cuenta en la app publicada aparecerá aquí.");
  icons();
}
async function dnSetRole(id, role, local, disabled) {
  const u = dnUsers.find(x => x.id === id); if (!u) return;
  if (role === "local" && !local) local = u.local_id || LOCALES[0].id;
  const { error } = await sb.rpc("set_user_role", { target: id, new_role: role, new_local: role === "local" ? local : null, new_disabled: !!disabled });
  if (error) { toast(`No se pudo cambiar: ${error.message}`); return renderDnUsers(); }
  Object.assign(u, { role, local_id: role === "local" ? local : null, disabled: !!disabled });
  toast(disabled ? `Desactivaste la cuenta de ${u.full_name}.` : `${u.full_name} ahora es ${ROLE_OPTS.find(r => r[0] === role)[1].toLowerCase()}${role === "local" ? ` de ${localById(local).name}` : ""}.`);
  renderDnUsers();
}
document.addEventListener("change", e => {
  const r = e.target.closest("[data-dn-role]"); if (r) { const u = dnUsers.find(x => x.id === r.dataset.dnRole); dnSetRole(u.id, r.value, u.local_id, u.disabled); return; }
  const l = e.target.closest("[data-dn-local]"); if (l) { const u = dnUsers.find(x => x.id === l.dataset.dnLocal); dnSetRole(u.id, "local", l.value, u.disabled); }
});
document.addEventListener("input", e => { if (e.target.id === "dnSearch") { dnFilter = e.target.value; renderDnUsers(); } });
document.addEventListener("click", e => {
  if (e.target.closest("[data-dn-refresh]")) { renderDueno(); return; }
  if (e.target.closest("[data-dn-view]")) { dnTable = !dnTable; renderDueno(); return; }
  const t = e.target.closest("[data-dn-toggle]"); if (t) { const u = dnUsers.find(x => x.id === t.dataset.dnToggle); if (!u) return;
    if (u.disabled) return dnSetRole(u.id, u.role, u.local_id, false);
    askConfirm({ icon: "user-x", title: `¿Desactivar a ${u.full_name}?`, text: "Podrá seguir entrando, pero como estudiante y sin acceso de gestión, hasta que lo reactives.", ok: "Desactivar", danger: true, onOk: () => dnSetRole(u.id, u.role, u.local_id, true) }); }
});
if (current === "dueno") try { renderDueno(); } catch (err) {}

/* ---------- Mis reservas de canchas ----------
   Próximas reservas de la cuenta (`nexo-courts`; con cuenta real vienen de court_bookings) y cancelar sin cargo
   hasta 2 horas antes del turno: con cuenta real lo valida cancel_court (el pago del dueño queda "Reembolsado");
   el reembolso entra a la Actividad. Con cuenta de prueba la hora se mide sobre la fecha simulada. */
var myCourts = [];
try { myCourts = JSON.parse(localStorage.getItem(K("nexo-courts")) || "[]") || []; } catch (err) {}
function saveMyCourts() { try { localStorage.setItem(K("nexo-courts"), JSON.stringify(myCourts)); } catch (err) {} }
function courtIso() { return res.iso || `${res.yr || 2026}-${pad2((res.mon ?? 10) + 1)}-${pad2(res.day)}`; }
function courtNow() { const n = new Date(); if (sbShared()) return n; const d = day0(simDate); d.setHours(n.getHours(), n.getMinutes()); return d; }
const courtStart = c => new Date(`${c.iso}T${c.slot}:00`);
const courtEnd = c => courtStart(c).getTime() + 3600e3;
const courtCanCancel = c => courtStart(c) - courtNow() >= 2 * 3600e3;
function upcomingCourts() { const now = courtNow().getTime(); return myCourts.filter(c => courtEnd(c) > now).sort((a, b) => courtStart(a) - courtStart(b)); }
function myCourtSlots(sport) { try { const iso = courtIso(); return myCourts.filter(c => c.sport === sport && c.iso === iso).map(c => c.slot); } catch (err) { return []; } }
function rememberCourt(c) { myCourts = [...myCourts.filter(x => x.id !== c.id), c]; saveMyCourts(); try { renderMyCourts(); } catch (err) {} }
const DN_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const courtDate = c => { const d = new Date(c.iso + "T12:00"); return `${DN_CORTO[d.getDay()]} ${d.getDate()} ${MES_CORTO[d.getMonth()]}`; };
const courtHours = c => `${c.slot}–${pad2(parseInt(c.slot) + 1)}:00`;
function renderMyCourts() {
  const box = document.getElementById("myCourts"); if (!box) return;
  const list = upcomingCourts();
  box.hidden = !list.length;
  if (!list.length) { box.innerHTML = ""; return; }
  const now = courtNow().getTime();
  box.innerHTML = `<div class="row"><h2 class="sec">Mis reservas</h2><span class="tiny">Cancela sin cargo hasta 2 horas antes</span></div>
    ${list.map(c => { const sp = SPORTS[c.sport] || { court: "Cancha" }, live = courtStart(c).getTime() <= now;
      return `<div class="mc-row"><span class="mc-ball">${ballArt(c.sport)}</span>
        <div class="grow" style="min-width:0"><b style="font-size:14px">${esc(sp.court)}</b><span class="tiny" style="display:block">${courtDate(c)} · ${courtHours(c)} · ${money(c.price)}</span></div>
        ${live ? `<span class="pill ok">En curso</span>` : courtCanCancel(c) ? `<button class="btn ghost sm" type="button" data-court-cancel="${esc(c.id)}"><i data-lucide="calendar-x"></i>Cancelar</button>` : `<span class="pill neutral" title="Faltan menos de 2 horas">Empieza pronto</span>`}</div>`; }).join("")}`;
  icons();
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-court-cancel]"); if (!b) return;
  const c = myCourts.find(x => String(x.id) === b.dataset.courtCancel); if (!c) return;
  const sp = SPORTS[c.sport] || { court: "Cancha" };
  if (!courtCanCancel(c)) { toast("Ya no se puede cancelar: faltan menos de 2 horas para tu turno."); renderMyCourts(); return; }
  askConfirm({ icon: "calendar-x", title: "¿Cancelar la reserva?", text: `${sp.court} · ${courtDate(c)} · ${courtHours(c)}. Te devolvemos ${money(c.price)} al mismo método de pago y la hora queda libre para otra persona.`, ok: "Cancelar reserva", cancel: "Volver", danger: true,
    onOk: async () => {
      if (sbShared()) {
        const { error } = await sb.rpc("cancel_court", { p_id: c.id });
        if (error) { toast(/2 horas/.test(error.message) ? "Ya no se puede cancelar: faltan menos de 2 horas para tu turno." : "No pudimos cancelar la reserva. Revisa tu conexión."); return; }
      }
      myCourts = myCourts.filter(x => x.id !== c.id); saveMyCourts();
      addMovement(`Reserva cancelada · ${sp.court}`, `Canchas · ${courtDate(c)} · ${courtHours(c)}`, "+" + money(c.price), "Reembolsado", "ok", { icon: "rotate-ccw", go: "reserva", goLabel: "Ver canchas →" });
      toast(`Cancelaste tu reserva. Te devolvemos ${money(c.price)}.`);
      if (sbShared()) { try { sbCourtRows = sbCourtRows.filter(r => !(r.sport === c.sport && r.day === c.iso && r.slot === c.slot)); sbLoadCourts(); } catch (err) {} }
      renderReserva();
    } });
});
renderMyCourts();

document.querySelectorAll("form[data-submit]").forEach(f => f.addEventListener("submit", e => {
  e.preventDefault();
  const carnet = f.querySelector("[data-digits]");
  if (carnet && !/^\d{11}$/.test(carnet.value)) {
    carnet.closest(".field").classList.add("bad");
    const hint = f.querySelector(`[data-hint="${carnet.id}"]`);
    if (hint) hint.textContent = `El carnet debe tener 11 dígitos seguidos. Llevas ${carnet.value.length}.`;
    carnet.focus();
    return;
  }
  const missing = [...f.querySelectorAll("[required]")].find(i => i.type === "checkbox" ? !i.checked : !i.value.trim());
  if (missing) { missing.focus(); toast("Completa todos los campos para continuar."); return; }
  go(f.dataset.submit);
}));
document.getElementById("ayudaForm").addEventListener("submit", e => {
  e.preventDefault();
  e.target.reset();
  toast("Ticket enviado. Te responderemos al correo que indicaste.");
});
window.addEventListener("hashchange", () => { show(location.hash.slice(1)); focusScreen(); try { placeTabInd(); } catch (err) {} });
setTimeout(() => { try { placeTabInd(); } catch (err) {} }, 50);
/* Al cambiar de pantalla, el foco va a su título (lectores de pantalla y teclado) y se anuncia */
function focusScreen() {
  const sec = document.getElementById(current); if (!sec) return;
  const h = sec.querySelector("main h1, h1") || sec.querySelector("h2");
  let live = document.getElementById("srLive");
  if (!live) { live = document.createElement("div"); live.id = "srLive"; live.className = "sr-only"; live.setAttribute("aria-live", "polite"); document.body.append(live); }
  live.textContent = "";
  setTimeout(() => {
    const ae = document.activeElement, keep = ae && sec.contains(ae) && ae.matches("input, textarea, select"); // la pantalla ya enfocó un campo
    if (!keep && h && h.offsetParent !== null) { if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    live.textContent = (sec.dataset.title || (h ? h.textContent.trim() : "")) ;
  }, 60);
}
applyUser();
show(location.hash.slice(1));
try { const fl = sessionStorage.getItem("nexo-flash"); if (fl) { sessionStorage.removeItem("nexo-flash"); setTimeout(() => toast(fl), 50); } } catch (err) {}
try { lucide.createIcons(); } catch (err) {}
