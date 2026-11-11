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

document.querySelectorAll("[data-account]").forEach(el => el.append(document.getElementById("account-tpl").content.cloneNode(true)));

document.querySelectorAll("section.app").forEach(sec => {
  const tab = sec.dataset.tab, back = sec.dataset.back, title = sec.dataset.title;
  const body = document.createElement("main");
  body.className = "content gutter";
  while (sec.firstChild) body.append(sec.firstChild);

  const side = document.createElement("aside");
  side.className = "side";
  side.innerHTML = `
    <button class="brand" type="button" data-go="inicio" style="color:#fff"><span class="emblem"><i data-lucide="layers"></i></span>nexo</button>
    <div class="inst"><b>U. Metropolitana</b><span>Campus Central · Caracas</span></div>
    <nav class="nav">${NAV.map(n => `<button type="button" data-go="${n[3]}" class="${n[0]===tab?'on':''}"><i data-lucide="${n[1]}"></i>${n[2]}</button>`).join("")}</nav>
    <div class="profile"><p class="tag">ESPACIO DE ESTUDIANTE</p><button class="user userbtn" type="button" data-go="perfil" aria-label="Abrir mi cuenta"><span class="avatar" data-user="initials">AT</span><div><b data-user="full">Ana Torres</b><span>Ver mi cuenta</span></div></button></div>
    <button class="logout" type="button" data-logout><i data-lucide="log-out"></i>Cerrar sesión</button>`;

  const main = document.createElement("div");
  main.className = "main";
  const left = back
    ? `<button class="title" type="button" data-go="${back}"><i data-lucide="arrow-left"></i>${title}</button>`
    : `<button class="brand" type="button" data-go="inicio"><span class="emblem"><i data-lucide="layers"></i></span>nexo</button>`;
  main.innerHTML = `
    <header class="mbar gutter">${left}<div class="mbar-acts"><button class="bellbtn" type="button" aria-label="Notificaciones" data-go="notificaciones"><i data-lucide="bell"></i><span class="nbadge" data-notif-badge hidden></span></button><button class="avatarbtn" type="button" aria-label="Mi cuenta" data-go="perfil"><span data-user="initials">AT</span></button></div></header>
    <header class="deskbar"><div class="crumbs">${back ? `<button class="deskback" type="button" data-go="${back}" aria-label="Volver"><i data-lucide="arrow-left"></i>Volver</button>` : ""}<span>Mi campus&nbsp;&nbsp;/&nbsp;&nbsp;${sec.dataset.crumb.replace(/  \/  /g,"&nbsp;&nbsp;/&nbsp;&nbsp;")}</span></div>
      <div class="acts"><span class="pill ok">Trimestre sep–nov 2026</span><button class="bellbtn desk" type="button" aria-label="Notificaciones" data-go="notificaciones"><i data-lucide="bell"></i><span class="nbadge" data-notif-badge hidden></span></button><span>ES</span></div></header>`;
  main.append(body);
  const bar = document.createElement("nav");
  bar.className = "tabbar";
  bar.setAttribute("aria-label", "Navegación principal");
  bar.innerHTML = TABS.map(n => `<button type="button" data-go="${n[3]}" class="${n[0]===tab?'on':''}"><i data-lucide="${n[1]}"></i>${n[2]}</button>`).join("");
  main.append(bar);
  sec.append(side, main);
});

/* ---------- QR ilustrativo (patrón determinista, no escaneable) ---------- */
document.querySelectorAll("canvas[data-qr]").forEach(c => {
  const ctx = c.getContext("2d"), N = 29;
  let seed = [...c.dataset.qr].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, N, N); ctx.fillStyle = "#162e33";
  const finder = (x, y) => { ctx.fillRect(x, y, 7, 7); ctx.clearRect(x+1, y+1, 5, 5); ctx.fillStyle="#fff"; ctx.fillRect(x+1,y+1,5,5); ctx.fillStyle="#162e33"; ctx.fillRect(x+2, y+2, 3, 3); };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const inF = (x < 8 && y < 8) || (x > N-9 && y < 8) || (x < 8 && y > N-9);
    if (!inF && rnd() > .52) ctx.fillRect(x, y, 1, 1);
  }
  finder(0, 0); finder(N-7, 0); finder(0, N-7);
});


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
const saveAccounts = () => { try { localStorage.setItem("nexo-accounts", JSON.stringify(accounts)); } catch (err) {} };
saveAccounts();
function getSession() { let s = null; try { s = localStorage.getItem("nexo-session") || sessionStorage.getItem("nexo-session"); } catch (err) {} return s && accounts.some(a => a.email === s) ? s : null; }
function setSession(email, remember) {
  try { localStorage.removeItem("nexo-session"); sessionStorage.removeItem("nexo-session"); (remember ? localStorage : sessionStorage).setItem("nexo-session", email); } catch (err) {}
}
function clearSession() { try { localStorage.removeItem("nexo-session"); sessionStorage.removeItem("nexo-session"); } catch (err) {} }
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
  if (typeof renderCards === "function" && document.getElementById("cardPicker")) try { renderCards(); } catch (err) {}
}
/* cambiar de cuenta recarga la app para cargar los datos de esa cuenta */
function enterApp(email, remember, flash) {
  setSession(email, remember);
  try { sessionStorage.setItem("nexo-flash", flash); } catch (err) {}
  history.replaceState(null, "", "#inicio");
  location.reload();
}

/* ---------- Navegación ---------- */
const screens = [...document.querySelectorAll("section.screen")].map(s => s.id);
let current = null, previous = "tutorial";
const PUBLIC = ["tutorial", "login", "registro", "ayuda"];
function show(id) {
  if (!screens.includes(id)) id = sessionEmail ? "inicio" : "tutorial";
  if (!sessionEmail && !PUBLIC.includes(id)) { id = "login"; if (location.hash !== "#login") history.replaceState(null, "", "#login"); setTimeout(() => toast("Inicia sesión para continuar."), 0); }
  if (current && current !== id) previous = current;
  current = id;
  screens.forEach(s => { document.getElementById(s).hidden = s !== id; });
  if (id === "recarga" && typeof renderRecarga === "function") renderRecarga();
  if (id === "afiliar" && typeof renderAf === "function") renderAf();
  if (id === "vehiculo" && typeof openVehicleForm === "function") openVehicleForm();
  if (id === "perfil" && typeof openPerfil === "function") openPerfil();
  if (["materias", "caja", "tarjeta"].includes(id)) { let none = false; try { none = !MATERIAS.length; } catch (err) {} if (none) { insReturn = id; history.replaceState(null, "", "#inscripcion"); id = "inscripcion"; current = id; screens.forEach(s => { document.getElementById(s).hidden = s !== id; }); } }
  if (id === "inscripcion" && typeof openInscripcion === "function") openInscripcion();
  if (id === "planes") { const s = document.querySelector("#planList .opt.plan.on"); if (s) try { updatePlan(s); } catch (err) {} }

  window.scrollTo(0, 0);
}
function go(id) { if (location.hash === "#" + id) show(id); else location.hash = id; }

let toastTimer;
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role","status"); document.body.append(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
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
const saveWallet = () => { try { localStorage.setItem(K("nexo-wallet"), String(WALLET)); } catch (err) {} };
const money = n => { const [i, d] = Math.abs(n).toFixed(2).split("."); return (n < 0 ? "-" : "") + "$" + i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + d; };
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
const savePlan = () => { try { localStorage.setItem(K("nexo-plan"), JSON.stringify(plan)); } catch (err) {} };
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
  ps("price").textContent = money(price);
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
const SPORTS = {"futbol": {"label": "Fútbol", "court": "Cancha de fútbol 7", "desc": "Césped sintético · Hasta 14 personas · Iluminación", "price": 20, "busy": ["17:00", "19:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7.5l3.2 2.3-1.2 3.7h-4l-1.2-3.7z\"/><path d=\"M12 7.5V3.2M15.2 9.8l4-1.4M14 13.5l2.5 3.5M10 13.5l-2.5 3.5M8.8 9.8l-4-1.4\"/></svg>"}, "beisbol": {"label": "Béisbol", "court": "Campo de béisbol", "desc": "Tierra y grama · Hasta 18 personas · Dugouts", "price": 30, "busy": ["16:00", "20:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M7.5 4.3c2 2.2 2.6 5.4 1.6 8.4-.6 1.9-1.8 3.5-3.4 4.7\"/><path d=\"M16.5 19.7c-2-2.2-2.6-5.4-1.6-8.4.6-1.9 1.8-3.5 3.4-4.7\"/></svg>"}, "tenis": {"label": "Tenis", "court": "Cancha de tenis 02", "desc": "Superficie dura · Hasta 4 personas · Iluminación", "price": 12, "busy": ["17:00", "20:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M5.6 5.6c3.5 3.5 3.5 9.3 0 12.8\"/><path d=\"M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8\"/></svg>"}, "padel": {"label": "Pádel", "court": "Cancha de pádel 01", "desc": "Cristal y césped · Hasta 4 personas · Iluminación", "price": 14, "busy": ["18:00", "21:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><path d=\"M9.5 3.5c3.6 0 6.5 2.6 6.5 6 0 2.3-1.4 4.2-3.4 5.2L11 19.5\"/><path d=\"M9.5 3.5C5.9 3.5 3 6.1 3 9.5c0 2.3 1.4 4.2 3.4 5.2l1.6 4.8\"/><path d=\"M8 19.5h3\"/><circle cx=\"19\" cy=\"17\" r=\"2\"/></svg>"}, "baloncesto": {"label": "Baloncesto", "court": "Cancha de baloncesto", "desc": "Techada · Hasta 10 personas · Tableros reglamentarios", "price": 10, "busy": ["19:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3v18\"/><path d=\"M5.6 5.6c2.3 2.3 2.3 10.5 0 12.8M18.4 5.6c-2.3 2.3-2.3 10.5 0 12.8\"/></svg>"}, "voleibol": {"label": "Voleibol", "court": "Cancha de voleibol", "desc": "Techada · Hasta 12 personas · Red reglamentaria", "price": 10, "busy": ["16:00", "17:00"], "icon": "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"sport-svg\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 12c0-4 1.5-7 4-8.2\"/><path d=\"M12 12c-3.5 2-6.8 2.2-8.9.9\"/><path d=\"M12 12c3.5 2 5.4 4.8 5.3 7.3\"/></svg>"}};
const res = { sport: "tenis", day: "12", dname: "Jue", slot: "18:00" };
const pad2 = n => String(n).padStart(2, "0");
const DAYS_LONG = { Lun: "Lunes", Mar: "Martes", "Mié": "Miércoles", Jue: "Jueves", Vie: "Viernes", "Sáb": "Sábado", Dom: "Domingo" };
function renderReserva() {
  const sp = SPORTS[res.sport];
  document.querySelectorAll("#sportPicker .sport").forEach(b => b.classList.toggle("on", b.dataset.sport === res.sport));
  document.querySelectorAll("#dayPicker .day").forEach(b => b.classList.toggle("on", b.dataset.day === res.day));
  const busy = sp.busy;
  if (busy.includes(res.slot)) res.slot = ["16:00","17:00","18:00","19:00","20:00","21:00"].find(t => !busy.includes(t));
  document.querySelectorAll("#slotPicker .slot").forEach(b => {
    const t = b.dataset.slot, isBusy = busy.includes(t), on = t === res.slot;
    b.classList.toggle("busy", isBusy); b.disabled = isBusy; b.classList.toggle("on", on);
    b.querySelector("small").textContent = isBusy ? "Ocupado" : on ? "Seleccionado" : "Disponible";
  });
  const end = pad2(parseInt(res.slot) + 1) + ":00";
  const fee = Math.round(sp.price * 5) / 100, total = sp.price + fee;
  const v = {
    label: sp.label, court: sp.court, desc: sp.desc, pricehour: money(sp.price),
    date: `${res.day} nov 2026`, datelong: `${res.dname}, ${res.day} nov 2026`,
    dayhint: `${DAYS_LONG[res.dname]}, ${res.day} de noviembre · Selecciona una hora`,
    time: `${res.slot} – ${end}`, timeh: `${res.slot} – ${end} · 1 h`,
    rent: money(sp.price), fee: money(fee), total: money(total)
  };
  document.querySelectorAll("[data-r]").forEach(el => {
    const k = el.dataset.r;
    if (k === "icon") el.innerHTML = sp.icon; else if (k in v) el.textContent = v[k];
  });
}
document.getElementById("sportPicker").addEventListener("click", e => { const b = e.target.closest(".sport"); if (b) { res.sport = b.dataset.sport; renderReserva(); } });
document.getElementById("dayPicker").addEventListener("click", e => { const b = e.target.closest(".day"); if (b) { res.day = b.dataset.day; res.dname = b.dataset.dname; renderReserva(); } });
document.getElementById("slotPicker").addEventListener("click", e => { const b = e.target.closest(".slot"); if (b && !b.disabled) { res.slot = b.dataset.slot; renderReserva(); } });
renderReserva();
/* ---------- Facturas mensuales del trimestre ---------- */
const TRIM_ID = "2026-sep-nov", TRIM_LABEL = "sep–nov 2026";
let MATERIAS = isDemo ? [{ n: "Matemáticas II", c: "BPTMI02" }, { n: "Física II", c: "BPTFI02" }, { n: "Algoritmos y Programación", c: "BPTSP05" }] : [];
try { const sm = JSON.parse(localStorage.getItem(K("nexo-materias")) || "null"); if (sm && sm.trim === TRIM_ID && Array.isArray(sm.list) && !sm.list.some(m => /^[A-Z]{3}-\d{3}$/.test(m.c || ""))) MATERIAS = sm.list.map(m => (m.c && MATDB[m.c]) ? m : findSubject(m.n, myCareer())); } catch (err) {}
const saveMaterias = () => { try { localStorage.setItem(K("nexo-materias"), JSON.stringify({ trim: TRIM_ID, list: MATERIAS })); } catch (err) {} };
const PRICE_REG = 160, PRICE_PP = 150;
const MONTHS = [{ id: "sep", mes: "septiembre", m: 8 }, { id: "oct", mes: "octubre", m: 9 }, { id: "nov", mes: "noviembre", m: 10 }];
const MES_CORTO = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DIA_CORTO = ["dom","lun","mar","mié","jue","vie","sáb"];
const DIA_LARGO = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const fmtD = d => `${String(d.getDate()).padStart(2, "0")} ${MES_CORTO[d.getMonth()]} ${d.getFullYear()}`;
const fmtDW = d => `${DIA_CORTO[d.getDay()]} ${d.getDate()} ${MES_CORTO[d.getMonth()]}`;
const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
function secondMonday(y, m) { const first = new Date(y, m, 1); const off = (8 - first.getDay()) % 7; return new Date(y, m, 1 + off + 7); }
function inv(mo) {
  const issue = secondMonday(2026, mo.m);
  return { ...mo, issue, ppEnd: new Date(issue.getFullYear(), issue.getMonth(), issue.getDate() + 4), due: new Date(2026, mo.m, 20) };
}
const INVOICES = MONTHS.filter(mo => isDemo || createdAt.getFullYear() < 2026 || (createdAt.getFullYear() === 2026 && mo.m >= createdAt.getMonth())).map(inv);

const PAGOS0 = isDemo ? { sep: { estado: "pagada", monto: 450, fecha: "15 sep 2026", via: "Transferencia", pp: true }, oct: { estado: "pagada", monto: 450, fecha: "14 oct 2026", via: "Transferencia", pp: true } } : {};
let pagos, simDate;
try { pagos = JSON.parse(localStorage.getItem(K("nexo-pagos")) || "null"); } catch (err) {}
if (!pagos || typeof pagos !== "object") pagos = JSON.parse(JSON.stringify(PAGOS0));
else pagos = { ...JSON.parse(JSON.stringify(PAGOS0)), ...pagos };
const activeInvoices = () => MATERIAS.length ? INVOICES : [];
const realToday = () => { const t = day0(new Date()); const min = new Date(2026, 8, 1), max = new Date(2026, 10, 30); return t < min ? min : t > max ? max : t; };
try { const s = localStorage.getItem(K("nexo-sim")); simDate = s ? new Date(s + "T12:00") : null; } catch (err) {}
if (!simDate || isNaN(simDate)) simDate = realToday();
const savePagos = () => { try { localStorage.setItem(K("nexo-pagos"), JSON.stringify(pagos)); } catch (err) {} };
const isoD = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function statusOf(iv) {
  const p = pagos[iv.id], t = day0(simDate);
  if (p && p.estado === "pagada") return "pagada";
  if (p && p.estado === "revision") return "revision";
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

const ST = { pagada: ["ok", "Pagada"], revision: ["neutral", "En revisión"], futura: ["neutral", "Aún no emitida"], pronto: ["ok", "Pronto pago"], pendiente: ["warn", "Pendiente"], vencida: ["warn", "Vencida"] };
function invLine(iv) {
  const s = statusOf(iv), p = pagos[iv.id];
  if (s === "pagada") return `Pagada el ${p.fecha} · ${p.via}${p.pp ? " · con pronto pago" : ""}`;
  if (s === "revision") return `Transferencia en revisión · ${money(p.monto)}`;
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

  document.getElementById("cuotasList").innerHTML = MONTHS.map(inv).map((iv, i) => { if (!INVOICES.some(x => x.id === iv.id)) return `<div class="cuota"><span class="ico" style="background:var(--chip);color:var(--muted)"><i data-lucide="minus"></i></span><div class="grow"><b>Factura de ${iv.mes}</b><span class="tiny">No aplica: creaste tu cuenta después de este mes</span></div><div class="mv-actions"><span class="pill neutral">No aplica</span></div></div>`; if (!MATERIAS.length) return ""; const s = statusOf(iv);
    return `<div class="cuota"><span class="ico"><i data-lucide="${s === "pagada" ? "circle-check" : s === "futura" ? "lock" : "file-text"}"></i></span>
      <div class="grow"><b>Factura de ${iv.mes}</b><span class="tiny">${invLine(iv)}</span></div>
      <div class="mv-actions"><b class="mono">${s === "futura" ? "desde " + money(PRICE_PP * MATERIAS.length) : money(amountOf(iv))}</b><span class="pill ${ST[s][0]}">${ST[s][1]}</span></div></div>`; }).join("");

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
      <button class="btn" type="button" data-go="caja">Pagar ${money(u * MATERIAS.length)}</button>`;
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
    <div class="mv-actions"><span class="amt${m.amount.startsWith("+") ? " pos" : ""}">${m.amount}</span><span class="pill ${m.pillCls}">${m.pill}</span><button class="link b" type="button" data-go="${m.go || "materias"}" style="font-size:12px">${m.goLabel || "Ver estado de cuenta ›"}</button></div>`;
  card.querySelector("h2").after(el);
}
function addMovement(title, detail, amount, pill, pillCls, extra = {}) {
  const m = { id: "m" + Date.now(), title, detail, amount, pill, pillCls, date: fmtD(day0(simDate)), ...extra };
  moves.push(m);
  try { localStorage.setItem(K("nexo-moves"), JSON.stringify(moves)); } catch (err) {}
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
  if (e.target.closest("[data-pay-transfer]")) {
    const sel = activeInvoices().filter(iv => paySel.includes(iv.id) && payableInv().includes(iv)); if (!sel.length) return;
    let total = 0;
    sel.forEach(iv => { const m = amountOf(iv); total += m; pagos[iv.id] = { estado: "revision", monto: m, pp: statusOf(iv) === "pronto" }; });
    savePagos();
    addMovement(sel.map(iv => `Factura de ${iv.mes}`).join(" + "), "Universidad · Transferencia", money(total), "En revisión", "neutral");
    defaultSel(); renderDebt();
    showDebtNotice("Comprobante enviado.", "La factura queda en revisión y tu saldo se actualiza cuando la universidad valide la transferencia.");
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
    : `<p class="nempty">No hay avisos en este tema.</p>`;
  document.getElementById("notifPrefs").innerHTML = Object.entries(NCATS).map(([k, c]) => `
    <div class="npref"><span class="ico"><i data-lucide="${c.icon}"></i></span><div class="grow"><b>${c.label}</b><span class="tiny">${c.desc}</span></div>
      <button class="switch" type="button" role="switch" aria-checked="${nPrefs[k] !== false}" aria-label="Recibir avisos de ${c.label}" data-npref="${k}"></button></div>`).join("");
  try { lucide.createIcons(); } catch (err) {}
}
document.getElementById("notificaciones").addEventListener("click", e => {
  const f = e.target.closest("[data-nf]"); if (f) { nFilter = f.dataset.nf; renderNotifs(); return; }
  const sw = e.target.closest("[data-npref]"); if (sw) { const k = sw.dataset.npref; nPrefs[k] = nPrefs[k] === false; if (nPrefs[k] === false && nFilter === k) nFilter = "all"; saveN(); renderNotifs(); toast(nPrefs[k] === false ? `Ya no verás avisos de ${NCATS[k].label.toLowerCase()}.` : `Volverás a ver avisos de ${NCATS[k].label.toLowerCase()}.`); return; }
  if (e.target.closest("#notifReadAll")) { lastNotifs.forEach(n => nRead[n.id] = true); saveN(); renderNotifs(); toast("Todas las notificaciones están leídas."); return; }
  const it = e.target.closest("[data-notif]");
  if (it) {
    const n = lastNotifs.find(x => x.id === it.dataset.notif); if (!n) return;
    nRead[n.id] = true; saveN();
    if (n.sport) { res.sport = n.sport; res.day = String(day0(simDate).getDate()); res.dname = DIA_CORTO[day0(simDate).getDay()][0].toUpperCase() + DIA_CORTO[day0(simDate).getDay()].slice(1); if (!document.querySelector(`#dayPicker [data-day="${res.day}"]`)) { res.day = "12"; res.dname = "Jue"; } res.slot = n.slot; renderReserva(); }
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
document.getElementById("loginForm").addEventListener("submit", e => {
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
  const acc = accounts.find(a => byDigits ? a.carnet === ident : a.email === normEmail(ident));
  if (!acc) {
    idEl.closest(".field").classList.add("bad");
    loginError("No encontramos esa cuenta.", byDigits ? `No hay ninguna cuenta con el carnet ${ident}. Revisa los 11 dígitos o crea una cuenta.` : !ident.includes("@") ? `"${ident}" no es un correo registrado. Escribe tu correo institucional completo o tu carnet.` : `No hay ninguna cuenta con el correo ${normEmail(ident)}.`, !byDigits && ident.includes("@"));
    idEl.focus(); return;
  }
  if (acc.pass !== passKey(pass)) {
    passEl.closest(".field").classList.add("bad");
    loginError("La contraseña no es correcta.", "Revísala e inténtalo de nuevo, o usa \"¿Olvidaste tu contraseña?\".", false);
    passEl.select(); return;
  }
  enterApp(acc.email, document.getElementById("l-rem").checked, `Hola de nuevo, ${acc.full.split(" ")[0]}.`);
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
document.getElementById("registerForm").addEventListener("submit", e => {
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
  if (accounts.some(a => a.email === email)) return signupError("Ese correo ya tiene una cuenta.", "Inicia sesión con él o usa otro correo.", mailEl);
  if (accounts.some(a => a.carnet === carnetEl.value)) return signupError("Ese carnet ya está registrado.", "Cada carnet solo puede tener una cuenta. Inicia sesión o revisa los dígitos.", carnetEl);
  const full = cleanName(nameEl.value);
  const now = new Date();
  accounts.push({ full, carnet: carnetEl.value, email, pass: passKey(passEl.value), created: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` });
  saveAccounts();
  enterApp(email, true, `Cuenta creada. Te damos la bienvenida a Nexo, ${full.split(" ")[0]}.`);
});
document.addEventListener("click", e => {
  if (!e.target.closest("[data-logout]")) return;
  clearSession();
  try { sessionStorage.setItem("nexo-flash", "Cerraste sesión."); } catch (err) {}
  history.replaceState(null, "", "#login");
  location.reload();
});

/* ---------- Recarga de wallet ---------- */
const RC_MIN = 5, RC_MAX = 100;
let rcAmount = 10, rcMethod = "card", rcCardId = null, afReturn = "recarga";
let pendRec = [];
try { pendRec = JSON.parse(localStorage.getItem(K("nexo-pendrec")) || "[]") || []; } catch (err) {}
const savePend = () => { try { localStorage.setItem(K("nexo-pendrec"), JSON.stringify(pendRec)); } catch (err) {} };
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
  rc("method").forEach(el => el.textContent = rcMethod === "pm" ? "Pago móvil" : card ? `${cardLabel(card)} · ${card.type}` : "Sin tarjeta afiliada");
  rc("afterlabel").forEach(el => el.textContent = rcMethod === "pm" ? "Saldo cuando se valide" : "Saldo tras la recarga");
  rc("after").forEach(el => el.textContent = money(WALLET + (ok ? rcAmount : 0)));
  const go = document.getElementById("rcGo");
  const cta = rcMethod === "pm" ? `Continuar a Pago móvil` : card ? `Recargar ${money(rcAmount)}` : "Afiliar una tarjeta";
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
    addMovement("Recarga de wallet", `Estacionamiento · ${cardLabel(card)}`, "+" + money(rcAmount), "Pagado", "ok", { icon: "wallet", go: "estacionamiento", goLabel: "Ver wallet ›" });
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

/* ---------- Pago móvil ---------- */
function openPagoMovil() {
  const amt = money(rcAmount);
  document.querySelector('[data-pm="lead"]').textContent = `Recarga de ${amt} a tu wallet Nexo`;
  document.querySelector('[data-pm="amount"]').textContent = `${amt} en bolívares, a la tasa BCV del día`;
  document.querySelector('[data-pm="concept"]').textContent = `Wallet ${user.carnet}`;
  document.querySelector('[data-pm="bshint"]').textContent = `Debe equivaler a ${amt} a la tasa BCV del día del pago.`;
  document.querySelector('[data-pm="cta"]').textContent = `Registrar pago de ${amt}`;
  const d = document.getElementById("pm-date"); if (!d.value) { const t = new Date(); d.value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; }
  document.getElementById("pmError").hidden = true;
  go("pagomovil");
}
document.getElementById("pagomovil").addEventListener("click", e => {
  if (!e.target.closest("[data-pm-copyconcept]")) return;
  const txt = `Wallet ${user.carnet}`;
  try { navigator.clipboard.writeText(txt).then(() => toast("Concepto copiado"), () => toast(txt)); } catch (err) { toast(txt); }
});
document.getElementById("pm-phone").addEventListener("input", e => { let v = e.target.value.replace(/\D/g, "").slice(0, 11); if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4); e.target.value = v; });
["pm-ci", "pm-ref"].forEach(id => document.getElementById(id).addEventListener("input", e => { e.target.value = e.target.value.replace(/\D/g, ""); }));
document.getElementById("pm-bs").addEventListener("input", e => { e.target.value = e.target.value.replace(/[^\d,]/g, "").replace(/(,.*?),/g, "$1").replace(/(,\d{2}).+/, "$1"); });
document.getElementById("pmForm").addEventListener("input", e => { e.target.closest(".field")?.classList.remove("bad"); document.getElementById("pmError").hidden = true; });
document.getElementById("pmForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = id => document.getElementById(id).value.trim();
  const checks = [
    ["pm-bank", !!v("pm-bank"), "Elige el banco desde el que pagaste."],
    ["pm-phone", /^04(12|14|16|24|26|22)-\d{7}$/.test(v("pm-phone")), "Escribe el teléfono con el formato 0414-1234567."],
    ["pm-ci", /^\d{6,9}$/.test(v("pm-ci")), "Escribe la cédula del titular, solo números."],
    ["pm-ref", /^\d{6,12}$/.test(v("pm-ref")), "La referencia debe tener al menos 6 dígitos."],
    ["pm-date", !!v("pm-date"), "Indica la fecha del pago."],
    ["pm-bs", parseAmt(v("pm-bs")) > 0, "Escribe el monto que pagaste en bolívares."]
  ];
  const bad = checks.find(c => !c[1]);
  if (bad) {
    document.getElementById(bad[0]).closest(".field").classList.add("bad");
    const box = document.getElementById("pmError"); box.querySelector('[data-pm="err"]').textContent = bad[2]; box.hidden = false;
    document.getElementById(bad[0]).focus(); return;
  }
  const ref = v("pm-ref");
  pendRec.push({ id: "r" + Date.now(), amount: rcAmount, ref, bank: v("pm-bank"), estado: "revision" }); savePend();
  addMovement("Recarga de wallet", `Pago móvil · Ref. ${ref.slice(-6)}`, "+" + money(rcAmount), "En revisión", "neutral", { icon: "smartphone", go: "recarga", goLabel: "Ver estado ›" });
  e.target.reset();
  toast(`Registramos tu Pago Móvil de ${money(rcAmount)}. Lo validaremos en un máximo de 24 horas hábiles.`);
  renderRecarga(); go("recarga");
});
renderRecarga(); renderAf();
/* ---------- Mi vehículo ---------- */
const CAR_MODELS = {"Toyota": ["Corolla", "Yaris", "Hilux", "Fortuner", "4Runner", "Land Cruiser", "Prado", "RAV4", "Camry", "Terios"], "Chevrolet": ["Aveo", "Optra", "Spark", "Cruze", "Captiva", "Silverado", "Tahoe", "Corsa", "Malibu", "Orlando"], "Ford": ["Fiesta", "Focus", "Fusion", "EcoSport", "Escape", "Explorer", "Ranger", "F-150", "Mustang", "Ka"], "Hyundai": ["Accent", "Elantra", "Getz", "Tucson", "Santa Fe", "Creta", "i10", "Sonata"], "Kia": ["Rio", "Picanto", "Cerato", "Sportage", "Sorento", "Soluto", "Seltos"], "Mitsubishi": ["Lancer", "Montero", "Outlander", "L200", "ASX", "Signo"], "Nissan": ["Sentra", "Tiida", "Versa", "X-Trail", "Frontier", "Patrol", "Kicks", "March"], "Renault": ["Logan", "Sandero", "Clio", "Duster", "Megane", "Symbol", "Twingo"], "Volkswagen": ["Gol", "Fox", "Jetta", "Polo", "Golf", "Tiguan", "Amarok", "Bora"], "Chery": ["Arauca", "Orinoco", "Tiggo 2", "Tiggo 4", "Tiggo 7", "Arrizo"], "Fiat": ["Palio", "Siena", "Uno", "Punto", "Mobi", "Cronos"], "Jeep": ["Cherokee", "Grand Cherokee", "Wrangler", "Compass", "Renegade"], "Honda": ["Civic", "Accord", "Fit", "CR-V", "HR-V"], "Mazda": ["Mazda 2", "Mazda 3", "Mazda 6", "CX-3", "CX-5", "BT-50"]};
const PLATE_RE = /^[A-Z]{2}\d{3}[A-Z]{2}$|^[A-Z]{3}\d{2}[A-Z]$|^[A-Z]\d{2}[A-Z]{3}$/;
let vehicle = isDemo ? { brand: "Toyota", model: "Yaris", year: "2019", plate: "AB123CD" } : null;
try { const sv = localStorage.getItem(K("nexo-vehicle")); if (sv !== null) vehicle = JSON.parse(sv); } catch (err) {}
const saveVehicle = () => { try { localStorage.setItem(K("nexo-vehicle"), JSON.stringify(vehicle)); } catch (err) {} };
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
  addMovement(`Plan ${p.name.toLowerCase()}`, `Estacionamiento · Wallet Nexo · ${ref}`, "−" + money(p.price), "Pagado", "ok", { icon: "car-front", go: "acceso", goLabel: "Ver credencial ›" });
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
  document.getElementById("pf-carnet").value = user.carnet;
  document.getElementById("pf-mailpass").value = "";
  document.querySelector('#perfil [data-pf="mailpass"]').hidden = true;
  const ci = acc.ci || "";
  document.getElementById("pf-cit").value = ci[0] === "E" ? "E" : "V";
  document.getElementById("pf-ci").value = ci.replace(/^[VE]-?/, "");
  document.getElementById("pf-phone").value = acc.phone || "";
  document.getElementById("pf-birth").value = acc.birth || "";
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
  return accounts[i];
}
document.getElementById("pfAccount").addEventListener("submit", e => {
  e.preventDefault();
  const nameEl = document.getElementById("pf-name"), mailEl = document.getElementById("pf-mail"), passEl = document.getElementById("pf-mailpass");
  const full = cleanName(nameEl.value), email = normEmail(mailEl.value);
  if (full.split(" ").filter(Boolean).length < 2) return pfErr(1, "Escribe tu nombre y al menos un apellido.", nameEl);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return pfErr(1, "Escribe un correo válido, por ejemplo nombre@correo.unimet.edu.ve.", mailEl);
  const mailChanged = email !== user.email;
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
document.getElementById("pfPersonal").addEventListener("submit", e => {
  e.preventDefault();
  const ci = document.getElementById("pf-ci"), ph = document.getElementById("pf-phone"), bd = document.getElementById("pf-birth");
  if (ci.value && !/^\d{6,9}$/.test(ci.value)) return pfErr(2, "La cédula debe tener entre 6 y 9 números.", ci);
  if (ph.value && !/^04(12|14|16|24|26|22)-\d{7}$/.test(ph.value)) return pfErr(2, "Escribe el teléfono con el formato 0414-1234567.", ph);
  if (bd.value && new Date(bd.value + "T12:00") >= new Date()) return pfErr(2, "La fecha de nacimiento debe ser anterior a hoy.", bd);
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
}
function openInscripcion() {
  insN = MATERIAS.length; insNames = MATERIAS.map(m => m.n);
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
  saveMaterias(); defaultSel(); renderDebt(); renderMatList(); if (typeof renderNotifs === "function") renderNotifs();
  toast(wasEmpty ? `Registramos tus ${MATERIAS.length} ${MATERIAS.length === 1 ? "materia" : "materias"}. Cada factura es de ${money(MATERIAS.length * PRICE_REG)}.` : "Actualizamos tus materias.");
  go(wasEmpty ? insReturn : "materias");
});
renderMatList();
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
window.addEventListener("hashchange", () => show(location.hash.slice(1)));
applyUser();
show(location.hash.slice(1));
try { const fl = sessionStorage.getItem("nexo-flash"); if (fl) { sessionStorage.removeItem("nexo-flash"); setTimeout(() => toast(fl), 50); } } catch (err) {}
try { lucide.createIcons(); } catch (err) {}
