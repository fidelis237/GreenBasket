// Password hashing, sessions and the admin-only guard.
import { ensureDB, json } from "./db.js";

const ITER = 100000; // Cloudflare's maximum for PBKDF2
const SESSION_DAYS = 7;
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const unhex = s => new Uint8Array(s.match(/../g).map(h => parseInt(h, 16)));

async function pbkdf2(password, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256);
}

export function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return "pbkdf2$" + ITER + "$" + hex(salt) + "$" + hex(await pbkdf2(password, salt));
}

export async function verifyPassword(password, stored) {
  const p = String(stored).split("$");
  if (p.length !== 4 || p[0] !== "pbkdf2") return false;
  return safeEqual(hex(await pbkdf2(password, unhex(p[2]))), p[3]);
}

async function sha256(s) { return hex(await crypto.subtle.digest("SHA-256", enc.encode(s))); }

export function getCookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? m[1] : "";
}

export function cookieHeader(request, token, maxAge) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return "gb_session=" + token + "; HttpOnly; SameSite=Strict; Path=/" + secure + "; Max-Age=" + maxAge;
}

export async function createSession(env, adminId) {
  const db = await ensureDB(env);
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = Date.now() + SESSION_DAYS * 86400000;
  await db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(Date.now()).run();
  await db.prepare("INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?,?,?)")
    .bind(await sha256(token), adminId, expires).run();
  return token;
}

export async function currentAdmin(request, env) {
  const token = getCookie(request, "gb_session");
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const db = await ensureDB(env);
  return await db.prepare(
    "SELECT a.id, a.name, a.email FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(await sha256(token), Date.now()).first();
}

export async function destroySession(request, env) {
  const token = getCookie(request, "gb_session");
  if (/^[0-9a-f]{64}$/.test(token)) {
    const db = await ensureDB(env);
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  }
}

// Blocks cross-site requests that change data.
export function sameOrigin(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const o = request.headers.get("Origin");
  return !o || o === new URL(request.url).origin;
}

// Use at the top of every admin endpoint. Returns { admin } or { res } to return.
export async function requireAdmin(request, env) {
  try {
    if (!sameOrigin(request)) return { res: json({ error: "Blocked request." }, 403) };
    const admin = await currentAdmin(request, env);
    if (!admin) return { res: json({ error: "Please sign in." }, 401) };
    return { admin };
  } catch (e) {
    if (e.message === "NO_DB") return { res: json({ error: "Database not connected. See README step 3." }, 503) };
    return { res: json({ error: "Server error." }, 500) };
  }
}

// Limits password guessing: 5 failures per 15 minutes per email+IP.
export async function tooManyAttempts(request, env, label) {
  const db = await ensureDB(env);
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const key = label + "|" + ip;
  const since = Date.now() - 15 * 60000;
  await db.prepare("DELETE FROM login_attempts WHERE at < ?").bind(since).run();
  const r = await db.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE key = ?").bind(key).first();
  return { limited: r.n >= 5, record: () => db.prepare("INSERT INTO login_attempts (key, at) VALUES (?,?)").bind(key, Date.now()).run() };
}
