import { Hono, type Context } from "hono";
import type { Env } from "./env";
import {
  contactAlertHtml, handleContact, hashIp, parseContactForm, pruneContactAttempts, recordAttempt,
  type ContactOutcome,
} from "./contact";
import { sendContactMail } from "./mail";
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

app.all("*", passThrough);

export default {
  fetch: app.fetch,
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(pruneContactAttempts(env.DB, new Date()));
  },
} satisfies ExportedHandler<Env>;
