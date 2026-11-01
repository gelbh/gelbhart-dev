import { Hono, type Context } from "hono";
import type { Env } from "./env";
import {
  handleContact, hashIp, parseContactForm, pruneContactAttempts, recordAttempt,
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

app.get("/contact", passThrough);

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
