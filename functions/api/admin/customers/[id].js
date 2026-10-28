import { ensureDB, json } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/auth.js";

// Deletes the account and signs the customer out everywhere. Their past orders are kept.
export async function onRequestDelete({ request, env, params }) {
  const g = await requireAdmin(request, env); if (g.res) return g.res;
  const db = await ensureDB(env);
  const id = Number(params.id);
  const r = await db.prepare("DELETE FROM customers WHERE id = ?").bind(id).run();
  if (!r.meta.changes) return json({ error: "Customer not found." }, 404);
  await db.batch([
    db.prepare("DELETE FROM customer_sessions WHERE customer_id = ?").bind(id),
    db.prepare("UPDATE orders SET customer_id = NULL WHERE customer_id = ?").bind(id)
  ]);
  return json({ ok: true });
}
