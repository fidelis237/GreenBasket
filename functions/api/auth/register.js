// Create an admin account. Only possible with the secret ADMIN_SETUP_KEY you set in Cloudflare.
import { ensureDB, json } from "../../_lib/db.js";
import { hashPassword, safeEqual, sameOrigin, createSession, cookieHeader, tooManyAttempts } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  try {
    if (!sameOrigin(request)) return json({ error: "Blocked request." }, 403);
    if (!env.ADMIN_SETUP_KEY || String(env.ADMIN_SETUP_KEY).length < 12)
      return json({ error: "Registration is switched off. Set ADMIN_SETUP_KEY (12+ characters) in Cloudflare first." }, 503);
    const b = await request.json().catch(() => ({}));
    const name = String(b.name || "").trim().slice(0, 80);
    const email = String(b.email || "").trim().toLowerCase().slice(0, 120);
    const password = String(b.password || "");
    if (!name) return json({ error: "Enter your name." }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (password.length < 10) return json({ error: "Use a password of at least 10 characters." }, 400);

    const db = await ensureDB(env);
    const lim = await tooManyAttempts(request, env, "register");
    if (lim.limited) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
    if (!safeEqual(String(b.setupKey || ""), env.ADMIN_SETUP_KEY)) {
      await lim.record();
      return json({ error: "Wrong setup key." }, 403);
    }
    if (await db.prepare("SELECT id FROM admins WHERE email = ?").bind(email).first())
      return json({ error: "That email already has an account. Sign in instead." }, 409);

    const r = await db.prepare("INSERT INTO admins (name,email,password_hash,created_at) VALUES (?,?,?,?)")
      .bind(name, email, await hashPassword(password), Date.now()).run();
    const token = await createSession(env, r.meta.last_row_id);
    return json({ ok: true, name }, 200, { "Set-Cookie": cookieHeader(request, token, 7 * 86400) });
  } catch (e) {
    if (e.message === "NO_DB") return json({ error: "Database not connected. See README step 3." }, 503);
    return json({ error: "Server error." }, 500);
  }
}
