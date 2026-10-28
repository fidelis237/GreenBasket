import { ensureDB, json } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/auth.js";
import { checkProduct } from "../../../_lib/validate.js";

export async function onRequestPut({ request, env, params }) {
  const g = await requireAdmin(request, env); if (g.res) return g.res;
  const db = await ensureDB(env);
  const id = Number(params.id);
  const cur = await db.prepare("SELECT id, image FROM products WHERE id = ?").bind(id).first();
  if (!cur) return json({ error: "Product not found." }, 404);
  const c = checkProduct(await request.json().catch(() => ({})));
  if (c.error) return json({ error: c.error }, 400);
  const v = c.value;
  if (await db.prepare("SELECT id FROM products WHERE name = ? AND id != ?").bind(v.name, id).first())
    return json({ error: "Another product already uses that name." }, 409);
  const image = v.image === undefined ? cur.image : v.image;
  await db.prepare(
    "UPDATE products SET name=?,category=?,unit=?,price=?,old_price=?,rating=?,stock=?,active=?,image=?,updated_at=? WHERE id=?"
  ).bind(v.name, v.category, v.unit, v.price, v.oldPrice, v.rating, v.stock, v.active, image, Date.now(), id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const g = await requireAdmin(request, env); if (g.res) return g.res;
  const db = await ensureDB(env);
  const r = await db.prepare("DELETE FROM products WHERE id = ?").bind(Number(params.id)).run();
  return r.meta.changes ? json({ ok: true }) : json({ error: "Product not found." }, 404);
}
