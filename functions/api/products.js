// Public list of products shown on the shop (only active ones).
import { ensureDB, json } from "../_lib/db.js";

export async function onRequestGet({ env }) {
  try {
    const db = await ensureDB(env);
    const { results } = await db.prepare(
      "SELECT id,name,category,unit,price,old_price,rating,stock,updated_at, (image IS NOT NULL AND image != '') AS has_image FROM products WHERE active = 1 ORDER BY id"
    ).all();
    return json({
      products: results.map(p => ({
        id: p.id, name: p.name, category: p.category, unit: p.unit, price: p.price,
        oldPrice: p.old_price, rating: p.rating, stock: p.stock,
        image: p.has_image ? "/api/image/" + p.id + "?v=" + p.updated_at : null
      }))
    }, 200, { "Cache-Control": "no-cache" });
  } catch (e) {
    return json({ products: null }, 200);
  }
}
