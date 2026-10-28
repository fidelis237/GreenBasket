// Everything under /admin: never indexed, and the dashboard page itself is only
// delivered to a signed-in admin. Anyone else is sent to the sign-in page.
import { currentAdmin } from "../_lib/auth.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const guarded = url.pathname.startsWith("/admin/app");
  if (guarded) {
    let admin = null;
    try { admin = await currentAdmin(request, env); } catch (e) {}
    if (!admin) return Response.redirect(url.origin + "/admin/", 302);
  }
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  out.headers.set("Cache-Control", "no-store");
  out.headers.set("X-Frame-Options", "DENY");
  out.headers.set("Referrer-Policy", "no-referrer");
  return out;
}
