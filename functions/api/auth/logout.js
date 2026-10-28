import { json } from "../../_lib/db.js";
import { destroySession, cookieHeader, sameOrigin } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Blocked request." }, 403);
  try { await destroySession(request, env); } catch (e) {}
  return json({ ok: true }, 200, { "Set-Cookie": cookieHeader(request, "", 0) });
}
