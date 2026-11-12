// Cuenta de dueño: se reclama una sola vez con una contraseña (se guarda con PBKDF2, nunca en claro).
// Después solo esa contraseña abre una sesión de 12 h para ver los datos reales. 5 intentos fallidos bloquean 15 min.
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

const HOUR = 3600e3;
const hashPw = (pw, salt) => crypto.pbkdf2Sync(pw, salt, 210000, 32, "sha256").toString("hex");

async function stats(s) {
  const since = Number(await s.get("meta/since")) || null;
  const users = [], events = [];
  for await (const page of s.list({ prefix: "u/", paginate: true })) for (const b of page.blobs) users.push(b.key);
  for await (const page of s.list({ prefix: "ev/", paginate: true })) for (const b of page.blobs) events.push(b.key);
  const now = Date.now(), uData = await Promise.all(users.map(k => s.get(k, { type: "json" })));
  const evs = (await Promise.all(events.map(k => s.get(k, { type: "json" })))).filter(Boolean).sort((a, b) => b.t - a.t);
  const ok = e => e.status !== "En revisión";
  const by = {};
  for (const e of evs) {
    const x = by[e.service] || (by[e.service] = { n: 0, usd: 0, rev: 0, revUsd: 0 });
    if (ok(e)) { x.n++; x.usd += e.amount; } else { x.rev++; x.revUsd += e.amount; }
  }
  const compras = evs.filter(e => e.service !== "recarga");
  return {
    since, now,
    users: { total: uData.length, last7: uData.filter(u => u && now - u.t < 7 * 24 * HOUR).length, today: uData.filter(u => u && now - u.t < 24 * HOUR).length },
    payments: {
      count: compras.filter(ok).length, usd: Math.round(compras.filter(ok).reduce((a, e) => a + e.amount, 0) * 100) / 100,
      review: compras.filter(e => !ok(e)).length, reviewUsd: Math.round(compras.filter(e => !ok(e)).reduce((a, e) => a + e.amount, 0) * 100) / 100,
      payers: new Set(compras.map(e => e.uh)).size
    },
    byService: by,
    recent: evs.slice(0, 30).map(({ t, service, amount, status, method }) => ({ t, service, amount, status, method }))
  };
}

export default async req => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!sameOrigin(req)) return json({ error: "origin" }, 403);
  let b; try { b = await req.json(); } catch { return json({ error: "json" }, 400); }
  const s = store(), now = Date.now();
  const cred = await s.get("owner/cred", { type: "json" });
  if (b.action === "status") return json({ claimed: !!cred });
  if (b.action === "login") {
    if (!safeEq(b.emailHash || "", OWNER_HASH)) return json({ error: "no-owner" }, 403);
    const lock = (await s.get("owner/lock", { type: "json" })) || { n: 0, until: 0 };
    if (lock.until > now) return json({ error: "locked", until: lock.until }, 429);
    const pw = String(b.password || "");
    if (!cred) {
      if (pw.length < 10 || !/\d/.test(pw) || !/[a-zA-Z]/.test(pw)) return json({ error: "weak" }, 400);
      const salt = crypto.randomBytes(16).toString("hex");
      await s.setJSON("owner/cred", { salt, hash: hashPw(pw, salt), t: now });
    } else if (!safeEq(hashPw(pw, cred.salt), cred.hash)) {
      const n = lock.n + 1;
      await s.setJSON("owner/lock", { n: n >= 5 ? 0 : n, until: n >= 5 ? now + 15 * 60e3 : 0 });
      return json({ error: "bad", left: Math.max(0, 5 - n) }, 401);
    }
    await s.delete("owner/lock");
    const token = crypto.randomBytes(32).toString("hex");
    await s.setJSON(`tok/${token}`, { exp: now + 12 * HOUR });
    return json({ token, firstClaim: !cred, exp: now + 12 * HOUR });
  }
  if (b.action === "stats" || b.action === "logout") {
    const tk = typeof b.token === "string" && /^[a-f0-9]{64}$/.test(b.token) ? b.token : "";
    const t = tk && (await s.get(`tok/${tk}`, { type: "json" }));
    if (!t || t.exp < now) return json({ error: "session" }, 401);
    if (b.action === "logout") { await s.delete(`tok/${tk}`); return json({ ok: true }); }
    return json(await stats(s));
  }
  return json({ error: "action" }, 400);
};
// Ruta: /.netlify/functions/owner
