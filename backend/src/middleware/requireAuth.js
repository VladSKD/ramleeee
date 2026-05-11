import { supabaseAuth } from "../supabaseClients.js";

/**
 * Express middleware. Verifies a Supabase JWT from
 * `Authorization: Bearer <token>` and attaches `req.user_id` + `req.user`.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing Bearer token" });
    }

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user_id = data.user.id;
    req.user = data.user;
    req.access_token = token;
    next();
  } catch (err) {
    console.error("[auth] verify failed:", err);
    res.status(500).json({ error: "Auth verification failed" });
  }
}