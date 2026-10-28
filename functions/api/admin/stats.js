import { ensureDB, json } from "../../_lib/db.js";
import { requireAdmin } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const g = await requireAdmin(request, env); if (g.res) return g.res;
  const db = await ensureDB(env);
  const p = await db.prepare("SELECT COUNT(*) AS total, SUM(active) AS active, SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) AS low FROM products").first();
  const o = await db.prepare(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status IN ('paid','processing') THEN 1 ELSE 0 END) AS todo, SUM(CASE WHEN status IN ('paid','processing','delivered') THEN total ELSE 0 END) AS revenue FROM orders"
  ).first();
  const { results } = await db.prepare("SELECT id,ref,customer_name,total,status,created_at FROM orders ORDER BY id DESC LIMIT 5").all();
  return json({
    products: { total: p.total || 0, active: p.active || 0, low: p.low || 0 },
    orders: { total: o.total || 0, pending: o.pending || 0, todo: o.todo || 0, revenue: o.revenue || 0 },
    recent: results
  });
}
