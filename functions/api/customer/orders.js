import { json, requireCustomer, ensureDB } from "../../_lib/customer.js";

export async function onRequestGet({ request, env }) {
  const g = await requireCustomer(request, env); if (g.res) return g.res;
  const db = await ensureDB(env);
  const { results } = await db.prepare(
    "SELECT ref, items, total, status, created_at FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 50"
  ).bind(g.customer.id).all();
  return json({ orders: results.map(o => ({ ...o, items: JSON.parse(o.items || "[]") })) });
}
