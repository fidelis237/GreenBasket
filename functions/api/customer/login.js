import { ensureDB, json, verifyPassword, sameOrigin, tooManyAttempts, startSession, cookieC } from "../../_lib/customer.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!sameOrigin(request)) return json({ error: "Blocked request." }, 403);
    const b = await request.json().catch(() => ({}));
    const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
    const password = String(b.password || "").slice(0, 200);
    const db = await ensureDB(env);
    const lim = await tooManyAttempts(request, env, "clogin|" + email);
    if (lim.limited) return json({ error: "Too many failed attempts. Try again in 15 minutes." }, 429);
    const c = await db.prepare("SELECT id, name, email, phone, address, password_hash FROM customers WHERE email = ?").bind(email).first();
    const ok = c ? await verifyPassword(password, c.password_hash)
                 : (await verifyPassword(password, "pbkdf2$100000$" + "00".repeat(16) + "$" + "00".repeat(32)), false);
    if (!ok) { await lim.record(); return json({ error: "Wrong email or password." }, 401); }
    const token = await startSession(env, c.id);
    return json({ ok: true, customer: { name: c.name, email: c.email, phone: c.phone, address: c.address } }, 200,
      { "Set-Cookie": cookieC(request, token, 30 * 86400) });
  } catch (e) {
    if (e.message === "NO_DB") return json({ error: "The shop database is not connected yet." }, 503);
    return json({ error: "Server error." }, 500);
  }
}
