// Checks whether a payment is PENDING, SUCCESSFUL or FAILED, and updates the order.
import { ensureDB } from "../_lib/db.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestGet({ request, env }) {
  try {
    const reference = new URL(request.url).searchParams.get("reference") || "";
    if (!/^[0-9a-f-]{36}$/i.test(reference)) return json({ error: "Bad reference." }, 400);

    const t = await fetch(env.CAMPAY_BASE_URL + "/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: env.CAMPAY_USERNAME, password: env.CAMPAY_PASSWORD })
    });
    const { token } = await t.json();
    if (!token) return json({ error: "Campay login failed." }, 502);

    const r = await fetch(env.CAMPAY_BASE_URL + "/transaction/" + reference + "/", {
      headers: { Authorization: "Token " + token }
    });
    const d = await r.json();
    const status = d.status || "PENDING";

    if (env.DB && (status === "SUCCESSFUL" || status === "FAILED")) {
      const db = await ensureDB(env);
      const order = await db.prepare("SELECT id, items, status FROM orders WHERE campay_ref = ?").bind(reference).first();
      if (order && order.status === "pending") {
        if (status === "SUCCESSFUL") {
          // Only the request that flips pending -> paid reduces stock (no double counting).
          const u = await db.prepare("UPDATE orders SET status='paid' WHERE id = ? AND status='pending'").bind(order.id).run();
          if (u.meta.changes === 1) {
            await db.batch(JSON.parse(order.items || "[]").map(i =>
              db.prepare("UPDATE products SET stock = MAX(stock - ?, 0) WHERE name = ?").bind(i.qty, i.name)));
          }
        } else {
          await db.prepare("UPDATE orders SET status='failed' WHERE id = ? AND status='pending'").bind(order.id).run();
        }
      }
    }
    return json({ status });
  } catch (e) {
    return json({ status: "PENDING" });
  }
}
