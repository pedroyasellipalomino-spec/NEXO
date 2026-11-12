// Utilidades compartidas por las funciones de Nexo (se ejecutan en Netlify, no en el navegador).
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

// Huella SHA-256 del correo del dueño. El correo no aparece en el código.
export const OWNER_HASH = "0f39373b257a2943c5a75723fbf9acedf700e2c245db92d672002b6b533b4e83";
export const store = () => getStore({ name: "nexo-datos", consistency: "strong" });
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export const sameOrigin = req => {
  const o = req.headers.get("origin") || "";
  return /^https:\/\/([a-z0-9-]+--)?nexouni\.netlify\.app$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
};
export const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
export { crypto };
