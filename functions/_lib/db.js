import SEED_IMAGES from "./seed-images.js";
// Database helpers (Cloudflare D1). Tables are created automatically on first use.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    key TEXT NOT NULL,
    at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL,
    old_price INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 4.8,
    stock INTEGER NOT NULL DEFAULT 100,
    active INTEGER NOT NULL DEFAULT 1,
    image TEXT,
    updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS customer_sessions (
    token_hash TEXT PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref TEXT NOT NULL,
    campay_ref TEXT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    items TEXT NOT NULL,
    total INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL)`
];

const SEED = [
  ["Fresh strawberry", "Fruits", "500 g", 2000, 2500, 4.8],
  ["Fresh cauliflower", "Vegetables", "250 g", 1500, 1900, 4.9],
  ["Fresh peaches", "Fruits", "500 g", 2500, 3100, 4.7],
  ["Organic carrots", "Vegetables", "1 Kg", 800, 1000, 4.6],
  ["Sweet pineapple", "Fruits", "1 piece", 1200, 1500, 4.8]
];

let ready = null;
export function getDB(env) {
  if (!env.DB) throw new Error("NO_DB");
  return env.DB;
}

export async function ensureDB(env) {
  const db = getDB(env);
  if (!ready) {
    ready = (async () => {
      await db.batch(SCHEMA.map(s => db.prepare(s)));
      // Upgrade older databases: link orders to customer accounts.
      const cols = await db.prepare("PRAGMA table_info(orders)").all();
      if (!cols.results.some(c => c.name === "customer_id"))
        await db.prepare("ALTER TABLE orders ADD COLUMN customer_id INTEGER").run();
      const c = await db.prepare("SELECT COUNT(*) AS n FROM products").first();
      if (!c || c.n === 0) {
        const now = Date.now();
        await db.batch(SEED.map(p => db.prepare(
          "INSERT OR IGNORE INTO products (name,category,unit,price,old_price,rating,stock,active,image,updated_at) VALUES (?,?,?,?,?,?,100,1,?,?)"
        ).bind(p[0], p[1], p[2], p[3], p[4], p[5], SEED_IMAGES[p[0]] || null, now)));
      }
    })().catch(e => { ready = null; throw e; });
  }
  await ready;
  return db;
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers }
  });
