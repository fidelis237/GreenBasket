import { ensureDB, json } from "../../_lib/db.js";
import { verifyPassword, sameOrigin, createSession, cookieHeader, tooManyAttempts } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!sameOrigin(request)) return json({ error: "Blocked request." }, 403);
    const b = await request.json().catch(() => ({}));
    const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
    const password = String(b.password || "").slice(0, 200);
    const db = await ensureDB(env);
    const lim = await tooManyAttempts(request, env, "login|" + email);
    if (lim.limited) return json({ error: "Too many failed attempts. Try again in 15 minutes." }, 429);
    const a = await db.prepare("SELECT id, name, password_hash FROM admins WHERE email = ?").bind(email).first();
    // Same work and same message whether or not the email exists.
    const ok = a ? await verifyPassword(password, a.password_hash)
                 : (await verifyPassword(password, "pbkdf2$100000$" + "00".repeat(16) + "$" + "00".repeat(32)), false);
    if (!ok) { await lim.record(); return json({ error: "Wrong email or password." }, 401); }
    const token = await createSession(env, a.id);
    return json({ ok: true, name: a.name }, 200, { "Set-Cookie": cookieHeader(request, token, 7 * 86400) });
  } catch (e) {
    if (e.message === "NO_DB") return json({ error: "Database not connected. See README step 3." }, 503);
    return json({ error: "Server error." }, 500);
  }
}
