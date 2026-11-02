import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { Env } from "./env";
import { analyticsResponse } from "./analytics";
import { globalLeaderboard, insertScore, isGlobalHighScore, playerScores, validateScore } from "./pacman";

export const api = new Hono<{ Bindings: Env }>({ strict: false });

api.use(secureHeaders({ referrerPolicy: "strict-origin-when-cross-origin" }));

api.onError((err, c) => {
  console.error(err);
  return c.json({ success: false }, 500);
});

api.get("/pacman_scores/global", async (c) => c.json({ leaderboard: await globalLeaderboard(c.env.DB) }));

api.get("/pacman_scores/player/:player_name", async (c) => {
  const name = c.req.param("player_name").trim();
  if (name === "") return c.json({ success: false, error: "Player name is required" }, 400);
  const scores = await playerScores(c.env.DB, name);
  return c.json({
    player_name: name,
    scores: scores.map(({ score, is_win, played_at }) => ({ score, is_win, played_at })),
  });
});

api.post("/pacman_scores", async (c) => {
  // Every insert spends D1 writes that the contact form shares on the Free plan.
  const { success } = await c.env.SCORE_LIMITER.limit({ key: c.req.header("CF-Connecting-IP") ?? "" });
  if (!success) return c.json({ success: false, errors: ["Too many scores submitted, try again in a minute"] }, 429);
  const body = (await c.req.json().catch(() => null)) as { pacman_score?: unknown } | null;
  if (!body?.pacman_score) {
    return c.json({ success: false, errors: ["param is missing or the value is empty: pacman_score"] }, 400);
  }
  const result = validateScore(body.pacman_score);
  if (!result.ok) return c.json({ success: false, errors: result.errors }, 422);
  const score = await insertScore(c.env.DB, result.value, new Date());
  return c.json({ success: true, score, is_high_score: await isGlobalHighScore(c.env.DB, score.score) }, 201);
});

api.get("/analytics/hevy-tracker", async (c) => {
  c.header("Cache-Control", "public, max-age=300");
  return c.json(await analyticsResponse(c.env.DB));
});
