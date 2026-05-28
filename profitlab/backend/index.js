import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();
const PORT = process.env.PORT || 3001;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const INSTAGRAM_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json());

// ── Anthropic proxy (shared logic) ─────────────────────────────
async function callAnthropic(system, messages, maxTokens = 1000) {
  if (!ANTHROPIC_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `Anthropic error ${response.status}`);
  }
  return data;
}

// ── POST /api/generate ──────────────────────────────────────────
app.post("/api/generate", async (req, res) => {
  try {
    const { system, messages, max_tokens } = req.body;
    if (!system || !Array.isArray(messages)) {
      return res.status(400).json({ error: "system and messages are required" });
    }
    const data = await callAnthropic(system, messages, max_tokens || 1000);
    res.json(data);
  } catch (err) {
    console.error("/api/generate error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/chat ──────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { system, messages, max_tokens } = req.body;
    if (!system || !Array.isArray(messages)) {
      return res.status(400).json({ error: "system and messages are required" });
    }
    const data = await callAnthropic(system, messages, max_tokens || 1000);
    res.json(data);
  } catch (err) {
    console.error("/api/chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ideas ─────────────────────────────────────────────
app.post("/api/ideas", async (req, res) => {
  try {
    const { system, messages, max_tokens } = req.body;
    if (!system || !Array.isArray(messages)) {
      return res.status(400).json({ error: "system and messages are required" });
    }
    const data = await callAnthropic(system, messages, max_tokens || 700);
    res.json(data);
  } catch (err) {
    console.error("/api/ideas error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/instagram/reels ────────────────────────────────────
app.get("/api/instagram/reels", async (req, res) => {
  if (!INSTAGRAM_TOKEN) {
    return res.status(503).json({ error: "INSTAGRAM_ACCESS_TOKEN not configured" });
  }
  try {
    const fields = [
      "id",
      "caption",
      "media_type",
      "timestamp",
      "like_count",
      "comments_count",
      "insights.metric(impressions,reach,saved,video_views)",
    ].join(",");

    const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=20&access_token=${INSTAGRAM_TOKEN}`;
    const igRes = await fetch(url);
    const igData = await igRes.json();

    if (!igRes.ok) {
      throw new Error(igData.error?.message || `Instagram API error ${igRes.status}`);
    }

    // Filter only REELS
    const reels = (igData.data || []).filter(
      (m) => m.media_type === "VIDEO" || m.media_type === "REELS"
    );
    res.json({ data: reels });
  } catch (err) {
    console.error("/api/instagram/reels error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/health ─────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Profit Lab backend running on port ${PORT}`);
});
