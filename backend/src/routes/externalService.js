import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

/**
 * GET /api/external-service
 * Authenticated proxy to a hypothetical 3rd-party API.
 * Demonstrates server-side use of secrets the browser must never see.
 */
router.get("/external-service", requireAuth, async (req, res) => {
  try {
    const url = process.env.EXTERNAL_API_URL;
    if (!url) {
      return res.status(503).json({ error: "External API not configured" });
    }

    const upstream = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(process.env.EXTERNAL_API_KEY
          ? { Authorization: `Bearer ${process.env.EXTERNAL_API_KEY}` }
          : {}),
      },
    });

    if (!upstream.ok) {
      return res
        .status(502)
        .json({ error: "Upstream failed", status: upstream.status });
    }

    const payload = await upstream.json().catch(() => ({}));
    res.json({ requested_by: req.user_id, data: payload });
  } catch (err) {
    console.error("[external-service] error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;