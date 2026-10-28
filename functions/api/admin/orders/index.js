import { ensureDB, json } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/auth.js";
import { ORDER_STATUSES } from "../../../_lib/validate.js";

export async function onRequestGet({ request, env }) {
  const g = await requireAdmin(request, env); if (g.res) return g.res;
  const db = await ensureDB(env);
  const status = new URL(request.url).searchParams.get("status");
  const q = ORDER_STATUSES.includes(status)
    ? db.prepare("SELECT * FROM orders WHERE status = ? ORDER BY id DESC LIMIT 300").bind(status)
    : db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 300");
  const { results } = await q.all();
  return json({ orders: results.map(o => ({ ...o, items: JSON.parse(o.items || "[]") })) });
}
