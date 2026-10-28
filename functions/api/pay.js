// Starts a MoMo / Orange Money payment request with Campay.
// Prices are read on the SERVER (from your dashboard database), so customers cannot change what they pay.
import { ensureDB } from "../_lib/db.js";
import { currentCustomer } from "../_lib/customer.js";

// Used only if the database is not connected yet.
const FALLBACK = {
  "Fresh strawberry": 2000, "Fresh cauliflower": 1500, "Fresh peaches": 2500,
  "Organic carrots": 800, "Sweet pineapple": 1200
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

async function getToken(env) {
  const r = await fetch(env.CAMPAY_BASE_URL + "/token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: env.CAMPAY_USERNAME, password: env.CAMPAY_PASSWORD })
  });
  const d = await r.json();
  if (!d.token) throw new Error("Campay login failed. Check CAMPAY_USERNAME and CAMPAY_PASSWORD.");
  return d.token;
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const phone = String(body.phone || "").replace(/\D/g, "");
    if (!/^2376\d{8}$/.test(phone)) return json({ error: "Enter a valid Cameroon mobile number." }, 400);

    const items = Array.isArray(body.items) ? body.items : [];
    let catalog = null, db = null;
    if (env.DB) {
      db = await ensureDB(env);
      const { results } = await db.prepare("SELECT name, price, stock FROM products WHERE active = 1").all();
      catalog = {};
      results.forEach(p => { catalog[p.name] = p; });
    }

    let amount = 0;
    const lines = [];
    for (const it of items) {
      const qty = Number(it.qty);
      const p = catalog ? catalog[it.name] : (FALLBACK[it.name] ? { price: FALLBACK[it.name], stock: 1e9 } : null);
      if (!p || !Number.isInteger(qty) || qty < 1 || qty > 50) return json({ error: "Invalid cart." }, 400);
      if (qty > p.stock) return json({ error: it.name + " has only " + p.stock + " left in stock." }, 400);
      amount += p.price * qty;
      lines.push({ name: it.name, qty, price: p.price });
    }
    if (amount < 1) return json({ error: "Your cart is empty." }, 400);

    const ref = String(body.orderRef || "GB-" + Date.now()).replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);
    const token = await getToken(env);
    const r = await fetch(env.CAMPAY_BASE_URL + "/collect/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Token " + token },
      body: JSON.stringify({
        amount: String(env.TEST_AMOUNT ? Number(env.TEST_AMOUNT) : amount), // TEST_AMOUNT: demo testing only. Delete before going live.
        currency: "XAF",
        from: phone,
        description: "GreenBasket order " + ref,
        external_reference: ref
      })
    });
    const d = await r.json();
    if (!d.reference) return json({ error: d.message || "The payment could not be started." }, 502);

    if (db) {
      let customerId = null;
      try { const c = await currentCustomer(request, env); customerId = c ? c.id : null; } catch (e) {}
      await db.prepare(
        "INSERT INTO orders (ref,campay_ref,customer_name,phone,address,items,total,status,created_at,customer_id) VALUES (?,?,?,?,?,?,?,'pending',?,?)"
      ).bind(ref, d.reference, String(body.name || "").slice(0, 80), phone, String(body.address || "").slice(0, 300),
             JSON.stringify(lines), amount, Date.now(), customerId).run();
    }
    return json({ reference: d.reference, ref, amount });
  } catch (e) {
    return json({ error: "Payment service error. Please try again." }, 500);
  }
}
