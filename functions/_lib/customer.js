// Customer accounts for the shop. Completely separate from admin accounts:
// own tables, own cookie, own endpoints. A customer can never reach the dashboard.
import { ensureDB, json } from "./db.js";
import { hashPassword, verifyPassword, safeEqual, sameOrigin, getCookie, tooManyAttempts } from "./auth.js";

const DAYS = 30;
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const sha256 = async s => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));

export const cookieC = (request, token, maxAge) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return "gb_cust=" + token + "; HttpOnly; SameSite=Strict; Path=/" + secure + "; Max-Age=" + maxAge;
};

export function normPhone(v) {
  const m = String(v || "").replace(/[\s().-]/g, "").match(/^(?:\+?237)?(6\d{8})$/);
  return m ? "237" + m[1] : null;
}

export async function startSession(env, customerId) {
  const db = await ensureDB(env);
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await db.prepare("DELETE FROM customer_sessions WHERE expires_at < ?").bind(Date.now()).run();
  await db.prepare("INSERT INTO customer_sessions (token_hash, customer_id, expires_at) VALUES (?,?,?)")
    .bind(await sha256(token), customerId, Date.now() + DAYS * 86400000).run();
  return token;
}

export async function currentCustomer(request, env) {
  const token = getCookie(request, "gb_cust");
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const db = await ensureDB(env);
  return await db.prepare(
    "SELECT c.id, c.name, c.email, c.phone, c.address FROM customer_sessions s JOIN customers c ON c.id = s.customer_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(await sha256(token), Date.now()).first();
}

export async function endSession(request, env) {
  const token = getCookie(request, "gb_cust");
  if (/^[0-9a-f]{64}$/.test(token)) {
    const db = await ensureDB(env);
    await db.prepare("DELETE FROM customer_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
}

export async function requireCustomer(request, env) {
  try {
    if (!sameOrigin(request)) return { res: json({ error: "Blocked request." }, 403) };
    const customer = await currentCustomer(request, env);
    if (!customer) return { res: json({ error: "Please sign in." }, 401) };
    return { customer };
  } catch (e) {
    if (e.message === "NO_DB") return { res: json({ error: "The shop database is not connected yet." }, 503) };
    return { res: json({ error: "Server error." }, 500) };
  }
}

export { hashPassword, verifyPassword, safeEqual, sameOrigin, tooManyAttempts, ensureDB, json };
