import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { supabaseAdmin } from "../supabaseClients.js";

const router = Router();

/**
 * GET /api/gdpr/export
 * GDPR Art.15 / Art.20 — Right of access & data portability.
 * Aggregates all user data and returns JSON.
 */
router.get("/gdpr/export", requireAuth, async (req, res) => {
  const uid = req.user_id;
  try {
    const [
      profile,
      consents,
      userInterests,
      matches,
      messages,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabaseAdmin.from("consents").select("*").eq("user_id", uid),
      supabaseAdmin
        .from("user_interests")
        .select("interest_id, created_at, interests(name, category)")
        .eq("user_id", uid),
      supabaseAdmin
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`),
      supabaseAdmin.from("messages").select("*").eq("sender_id", uid),
    ]);

    res
      .setHeader(
        "Content-Disposition",
        `attachment; filename="ramle-export-${uid}.json"`,
      )
      .json({
        exported_at: new Date().toISOString(),
        legal_basis: "GDPR Art. 15 (Right of access) & Art. 20 (Portability)",
        user: { id: uid, email: req.user.email },
        profile: profile.data,
        consents: consents.data,
        interests: userInterests.data,
        matches: matches.data,
        messages: messages.data,
      });
  } catch (err) {
    console.error("[gdpr/export] error:", err);
    res.status(500).json({ error: "Export failed" });
  }
});

/**
 * DELETE /api/gdpr/delete
 * GDPR Art.17 — Right to erasure ("right to be forgotten").
 * Cascades through DB tables, then permanently removes the auth account.
 */
router.delete("/gdpr/delete", requireAuth, async (req, res) => {
  const uid = req.user_id;
  try {
    // 1. Delete dependent rows (in case ON DELETE CASCADE is not configured).
    await supabaseAdmin.from("messages").delete().eq("sender_id", uid);
    await supabaseAdmin
      .from("matches")
      .delete()
      .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);
    await supabaseAdmin.from("user_interests").delete().eq("user_id", uid);
    await supabaseAdmin.from("consents").delete().eq("user_id", uid);
    await supabaseAdmin.from("profiles").delete().eq("id", uid);

    // 2. Permanently delete the Auth user (requires service role).
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (authErr) {
      console.error("[gdpr/delete] auth delete failed:", authErr);
      return res
        .status(500)
        .json({ error: "Account row removed, but auth deletion failed" });
    }

    res.json({ success: true, deleted_user_id: uid });
  } catch (err) {
    console.error("[gdpr/delete] error:", err);
    res.status(500).json({ error: "Deletion failed" });
  }
});

export default router;