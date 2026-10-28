import { ensureDB, json } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const g = await requireAdmin(request, env); if (g.res) return g.res;
  const db = await ensureDB(env);
  const { results } = await db.prepare(
    "SELECT c.id, c.name, c.email, c.phone, c.address, c.created_at, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS orders FROM customers c ORDER BY c.id DESC LIMIT 500"
  ).all();
  return json({ customers: results });
}
