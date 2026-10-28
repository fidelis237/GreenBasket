import { ensureDB, json } from "../../../_lib/db.js";
import { requireAdmin } from "../../../_lib/auth.js";
import { checkProduct } from "../../../_lib/validate.js";

export async function onRequestGet({ request, env }) {
  const g = await requireAdmin(request, env); if (g.res) return g.res;
  const db = await ensureDB(env);
  const { results } = await db.prepare(
    "SELECT id,name,category,unit,price,old_price,rating,stock,active,updated_at,(image IS NOT NULL AND image != '') AS has_image FROM products ORDER BY id DESC"
  ).all();
  return json({ products: results });
}

export async function onRequestPost({ request, env }) {
  const g = await requireAdmin(request, env); if (g.res) return g.res;
  const db = await ensureDB(env);
  const c = checkProduct(await request.json().catch(() => ({})));
  if (c.error) return json({ error: c.error }, 400);
  const v = c.value;
  if (await db.prepare("SELECT id FROM products WHERE name = ?").bind(v.name).first())
    return json({ error: "A product with that name already exists." }, 409);
  const r = await db.prepare(
    "INSERT INTO products (name,category,unit,price,old_price,rating,stock,active,image,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).bind(v.name, v.category, v.unit, v.price, v.oldPrice, v.rating, v.stock, v.active, v.image || null, Date.now()).run();
  return json({ ok: true, id: r.meta.last_row_id }, 201);
}
