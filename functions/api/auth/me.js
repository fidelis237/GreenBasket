import { json } from "../../_lib/db.js";
import { currentAdmin } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const a = await currentAdmin(request, env);
    return a ? json({ admin: { name: a.name, email: a.email } }) : json({ admin: null });
  } catch (e) {
    return json({ admin: null, error: e.message === "NO_DB" ? "no_db" : "error" });
  }
}
