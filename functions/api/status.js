// Checks whether a payment is PENDING, SUCCESSFUL or FAILED.
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
    return json({ status: d.status || "PENDING" });
  } catch (e) {
    return json({ status: "PENDING" });
  }
}
