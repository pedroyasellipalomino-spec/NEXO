// Anota registros y pagos reales hechos en nexouni.netlify.app. No guarda nombres, correos ni datos de pago:
// solo una huella del usuario, el servicio, el monto en USD, el estado y el método.
// --- compartido (va dentro de cada función para que el paquete no dependa de otros archivos) ---
// Utilidades compartidas por las funciones de Nexo (se ejecutan en Netlify, no en el navegador).
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

// Huella SHA-256 del correo del dueño. El correo no aparece en el código.
const OWNER_HASH = "0f39373b257a2943c5a75723fbf9acedf700e2c245db92d672002b6b533b4e83";
const store = () => getStore({ name: "nexo-datos", consistency: "strong" });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const sameOrigin = req => {
  const o = req.headers.get("origin") || "";
  return /^https:\/\/([a-z0-9-]+--)?nexouni\.netlify\.app$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
};
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
// --- fin de lo compartido ---

const SERVICES = ["comida", "estacionamiento", "materias", "canchas", "recarga"];
const STATUSES = ["Pagado", "En revisión", "Acreditada", "Aprobado"];
const METHODS = ["tarjeta", "transferencia", "pago-movil", "wallet", "otro"];

export default async req => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!sameOrigin(req)) return json({ error: "origin" }, 403);
  let b; try { b = await req.json(); } catch { return json({ error: "json" }, 400); }
  const uh = typeof b.uh === "string" && /^[a-f0-9]{16,64}$/.test(b.uh) ? b.uh.slice(0, 32) : null;
  if (!uh) return json({ error: "uh" }, 400);
  const s = store(), now = Date.now();
  if (!(await s.get("meta/since"))) await s.set("meta/since", String(now));
  if (b.type === "signup") {
    if (!(await s.get(`u/${uh}`))) await s.setJSON(`u/${uh}`, { t: now, staff: !!b.staff });
    return json({ ok: true });
  }
  if (b.type === "pay") {
    const amount = Math.round(Number(b.amount) * 100) / 100;
    if (!SERVICES.includes(b.service) || !STATUSES.includes(b.status) || !(amount > 0 && amount <= 5000)) return json({ error: "data" }, 400);
    const method = METHODS.includes(b.method) ? b.method : "otro";
    await s.setJSON(`ev/${new Date(now).toISOString()}-${crypto.randomBytes(3).toString("hex")}`, { t: now, uh, service: b.service, amount, status: b.status, method });
    if (!(await s.get(`u/${uh}`))) await s.setJSON(`u/${uh}`, { t: now, staff: false, firstSeen: "pay" });
    return json({ ok: true });
  }
  return json({ error: "type" }, 400);
};
// Ruta: /.netlify/functions/track
