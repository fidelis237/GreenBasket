import { ensureDB, json, hashPassword, sameOrigin, normPhone, startSession, cookieC } from "../../_lib/customer.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!sameOrigin(request)) return json({ error: "Blocked request." }, 403);
    const b = await request.json().catch(() => ({}));
    const name = String(b.name || "").trim().slice(0, 80);
    const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
    const phone = normPhone(b.phone);
    const address = String(b.address || "").trim().slice(0, 300);
    const password = String(b.password || "");
    if (!name) return json({ error: "Enter your name." }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (!phone) return json({ error: "Enter a valid Cameroon mobile number, like 6XX XXX XXX." }, 400);
    if (password.length < 8) return json({ error: "Use a password of at least 8 characters." }, 400);

    const db = await ensureDB(env);
    if (await db.prepare("SELECT id FROM customers WHERE email = ?").bind(email).first())
      return json({ error: "That email already has an account. Sign in instead." }, 409);

    const r = await db.prepare("INSERT INTO customers (name,email,phone,address,password_hash,created_at) VALUES (?,?,?,?,?,?)")
      .bind(name, email, phone, address, await hashPassword(password), Date.now()).run();
    const token = await startSession(env, r.meta.last_row_id);
    return json({ ok: true, customer: { name, email, phone, address } }, 200, { "Set-Cookie": cookieC(request, token, 30 * 86400) });
  } catch (e) {
    if (e.message === "NO_DB") return json({ error: "The shop database is not connected yet." }, 503);
    return json({ error: "Server error." }, 500);
  }
}
