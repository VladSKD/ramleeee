import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import externalService from "./routes/externalService.js";
import gdpr from "./routes/gdpr.js";

app.use('/api/connections', connectionsRouter)

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", externalService);
app.use("/api", gdpr);

// 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error("[server] unhandled:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`RAMLE backend listening on :${PORT}`);
});