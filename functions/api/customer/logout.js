import { json, sameOrigin, endSession, cookieC } from "../../_lib/customer.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Blocked request." }, 403);
  try { await endSession(request, env); } catch (e) {}
  return json({ ok: true }, 200, { "Set-Cookie": cookieC(request, "", 0) });
}
