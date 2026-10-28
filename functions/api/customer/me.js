import { json, currentCustomer, requireCustomer, ensureDB, normPhone } from "../../_lib/customer.js";

export async function onRequestGet({ request, env }) {
  try {
    const c = await currentCustomer(request, env);
    return json({ customer: c ? { name: c.name, email: c.email, phone: c.phone, address: c.address } : null });
  } catch (e) {
    return json({ customer: null });
  }
}

// Save name, phone and delivery address.
export async function onRequestPut({ request, env }) {
  const g = await requireCustomer(request, env); if (g.res) return g.res;
  const b = await request.json().catch(() => ({}));
  const name = String(b.name || "").trim().slice(0, 80);
  const phone = normPhone(b.phone);
  const address = String(b.address || "").trim().slice(0, 300);
  if (!name) return json({ error: "Enter your name." }, 400);
  if (!phone) return json({ error: "Enter a valid Cameroon mobile number, like 6XX XXX XXX." }, 400);
  const db = await ensureDB(env);
  await db.prepare("UPDATE customers SET name=?, phone=?, address=? WHERE id=?").bind(name, phone, address, g.customer.id).run();
  return json({ ok: true, customer: { name, email: g.customer.email, phone, address } });
}
