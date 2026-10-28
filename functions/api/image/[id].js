// Serves a product photo stored in the database.
import { ensureDB } from "../../_lib/db.js";

export async function onRequestGet({ params, env }) {
  try {
    const db = await ensureDB(env);
    const row = await db.prepare("SELECT image FROM products WHERE id = ?").bind(Number(params.id)).first();
    const m = row && row.image && row.image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!m) return new Response("Not found", { status: 404 });
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Response(bytes, { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch (e) {
    return new Response("Not found", { status: 404 });
  }
}
