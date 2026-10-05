// Starts a MoMo / Orange Money payment request with Campay.
// Prices live HERE (server side) so customers cannot change what they pay.
// Keep this list in sync with the prices shown on the page.
const CATALOG = {
  "Fresh strawberry": 2000,
  "Fresh cauliflower": 1500,
  "Fresh peaches": 2500,
  "Organic carrots": 800,
  "Sweet pineapple": 1200
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
    let amount = 0;
    for (const it of items) {
      const price = CATALOG[it.name];
      const qty = Number(it.qty);
      if (!price || !Number.isInteger(qty) || qty < 1 || qty > 50) return json({ error: "Invalid cart." }, 400);
      amount += price * qty;
    }
    if (amount < 1) return json({ error: "Your cart is empty." }, 400);

    const ref = String(body.orderRef || "GB-" + Date.now()).slice(0, 40);
    const token = await getToken(env);
    const r = await fetch(env.CAMPAY_BASE_URL + "/collect/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Token " + token },
      body: JSON.stringify({
        amount: String(amount),
        currency: "XAF",
        from: phone,
        description: "GreenBasket order " + ref,
        external_reference: ref
      })
    });
    const d = await r.json();
    if (!d.reference) return json({ error: d.message || "The payment could not be started." }, 502);
    return json({ reference: d.reference, ref, amount });
  } catch (e) {
    return json({ error: "Payment service error. Please try again." }, 500);
  }
}
