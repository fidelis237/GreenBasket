import { ensureDB, json } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/auth.js";
import { ORDER_STATUSES } from "../../../_lib/validate.js";

export async function onRequestPut({ request, env, params }) {
  const g = await requireAdmin(request, env); if (g.res) return g.res;
  const db = await ensureDB(env);
  const b = await request.json().catch(() => ({}));
  if (!ORDER_STATUSES.includes(b.status)) return json({ error: "Unknown status." }, 400);
  const r = await db.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(b.status, Number(params.id)).run();
  return r.meta.changes ? json({ ok: true }) : json({ error: "Order not found." }, 404);
}

export async function onRequestDelete({ request, env, params }) {
  const g = await requireAdmin(request, env); if (g.res) return g.res;
  const db = await ensureDB(env);
  const r = await db.prepare("DELETE FROM orders WHERE id = ?").bind(Number(params.id)).run();
  return r.meta.changes ? json({ ok: true }) : json({ error: "Order not found." }, 404);
}
