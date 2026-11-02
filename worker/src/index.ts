import { Hono, type Context } from "hono";
import type { Env } from "./env";
import { analyticsResponse, DEFAULT_STATS, refreshAnalytics } from "./analytics";
import {
  contactAlertHtml, handleContact, hashIp, parseContactForm, pruneContactAttempts, recordAttempt,
  type ContactOutcome,
} from "./contact";
import { securityHeaders } from "./headers";
import { sendContactMail } from "./mail";
import {
  globalLeaderboard, insertScore, isGlobalHighScore, playerScores, toJson, validateScore,
} from "./pacman";
import { verifyTurnstile } from "./turnstile";

type AppEnv = { Bindings: Env };

export const app = new Hono<AppEnv>({ strict: false });

const OUTCOME_PATHS: Record<ContactOutcome, string> = {
  sent: "/contact?sent=1",
  error: "/contact?error=1",
  rate_limited: "/contact?rate_limited=true",
};

const passThrough = (c: Context<AppEnv>) =>
  c.env.PAGES_ORIGIN === "assets" && c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : fetch(c.req.raw);

app.get("/contact", async (c) => {
  if (c.env.PAGES_ORIGIN !== "assets" || !c.env.ASSETS) return passThrough(c);
  // Fetch by URL so the visitor's If-None-Match can't turn this per-request page into a 304.
  const page = await c.env.ASSETS.fetch(c.req.url, { redirect: "manual" });
  if (page.status !== 200) return page;
  const alert = contactAlertHtml(new URL(c.req.url).searchParams);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rewritten = new HTMLRewriter()
    .on('input[name="form_timestamp"]', { element(el) { el.setAttribute("value", timestamp); } })
    .on("#contact-alert", { element(el) { if (alert) el.append(alert, { html: true }); } })
    .transform(page);
  const res = new Response(rewritten.body, rewritten);
  res.headers.delete("ETag");
  res.headers.set("Cache-Control", "no-store");
  return res;
});

app.post("/contact", async (c) => {
  let fd: FormData;
  try {
    fd = await c.req.formData();
  } catch {
    return c.redirect(OUTCOME_PATHS.error, 303);
  }
  const form = parseContactForm(fd);
  const ip = c.req.header("CF-Connecting-IP") ?? "";
  const outcome = await handleContact(form, ip, {
    verifyTurnstile: (token, remoteIp) => verifyTurnstile(c.env.TURNSTILE_SECRET_KEY, token, remoteIp),
    hashIp: (value) => hashIp(value, c.env.IP_SALT),
    recordAttempt: (ipHash, hour) => recordAttempt(c.env.DB, ipHash, hour),
    send: (mail) => sendContactMail(c.env.SEND_EMAIL, mail),
    now: () => new Date(),
  });
  return c.redirect(OUTCOME_PATHS[outcome], 303);
});

app.use("/api/*", securityHeaders);

app.onError((err, c) => {
  console.error(err);
  return c.req.path.startsWith("/api/") ? c.json({ success: false }, 503) : c.text("Internal Server Error", 500);
});

app.get("/api/pacman_scores/global", async (c) => {
  const rows = await globalLeaderboard(c.env.DB);
  return c.json({ leaderboard: rows.map(toJson) });
});

app.get("/api/pacman_scores/player/:player_name", async (c) => {
  const name = c.req.param("player_name").trim();
  if (name === "") return c.json({ success: false, error: "Player name is required" }, 400);
  const rows = await playerScores(c.env.DB, name);
  return c.json({
    player_name: name,
    scores: rows.map(({ score, is_win, played_at }) => ({ score, is_win: is_win === 1, played_at })),
  });
});

app.post("/api/pacman_scores", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { pacman_score?: unknown } | null;
  if (!body?.pacman_score) {
    return c.json({ success: false, errors: ["param is missing or the value is empty: pacman_score"] }, 400);
  }
  const result = validateScore(body.pacman_score);
  if (!result.ok) return c.json({ success: false, errors: result.errors }, 422);
  const row = await insertScore(c.env.DB, result.value, new Date());
  return c.json(
    { success: true, score: toJson(row), is_high_score: await isGlobalHighScore(c.env.DB, row.score) },
    201,
  );
});

app.get("/api/analytics/hevy-tracker", async (c) => {
  const body = await analyticsResponse(c.env.DB).catch((err) => {
    console.error("analytics read failed", err);
    return { ...DEFAULT_STATS, source: "defaults", stale: true };
  });
  c.header("Cache-Control", "public, max-age=300");
  return c.json(body);
});

app.all("*", passThrough);

export default {
  fetch: app.fetch,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(Promise.all([pruneContactAttempts(env.DB, new Date()), refreshAnalytics(env)]));
  },
} satisfies ExportedHandler<Env>;
