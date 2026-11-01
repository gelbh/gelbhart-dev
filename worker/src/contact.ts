export type ContactForm = {
  name: string;
  email: string;
  message: string;
  website: string;
  formTimestamp: string;
  turnstileToken: string;
};
export type ContactOutcome = "sent" | "error" | "rate_limited";
export type ContactMail = { subject: string; text: string; replyTo: string };
export type ContactDeps = {
  verifyTurnstile(token: string, ip: string): Promise<boolean>;
  hashIp(ip: string): Promise<string>;
  recordAttempt(ipHash: string, hour: string): Promise<number>;
  send(mail: ContactMail): Promise<void>;
  now(): Date;
};

const SPAM_KEYWORDS = [
  "seo", "backlinks", "ranking", "promotion", "seobests",
  "upgrade your website", "increase your search", "click here",
  "buy now", "limited offer", "act now", "make money",
  "work from home", "weight loss", "cryptocurrency", "bitcoin",
  "casino", "viagra", "cialis", "pharmacy",
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_HOUR = 3;

const field = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

export function parseContactForm(fd: FormData): ContactForm {
  return {
    name: field(fd, "name").trim(),
    email: field(fd, "email").trim(),
    message: field(fd, "message").trim(),
    website: field(fd, "website"),
    formTimestamp: field(fd, "form_timestamp"),
    turnstileToken: field(fd, "cf-turnstile-response"),
  };
}

function isSpam(form: ContactForm, now: Date): boolean {
  if (form.website !== "") return true;
  if (form.formTimestamp === "") return true;
  const elapsed = now.getTime() / 1000 - Number.parseInt(form.formTimestamp, 10);
  if (!(elapsed >= 3 && elapsed <= 3600)) return true;
  const message = form.message.toLowerCase();
  if (SPAM_KEYWORDS.some((k) => message.includes(k))) return true;
  return (form.message.match(/https?:\/\/|www\./g) ?? []).length > 1;
}

function isValid(form: ContactForm): boolean {
  return (
    form.name !== "" && form.name.length <= 100 &&
    form.email.length <= 100 && EMAIL_RE.test(form.email) &&
    form.message !== "" && form.message.length <= 5000
  );
}

const stripLineBreaks = (s: string) => s.replace(/[\r\n]+/g, "");

export async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function recordAttempt(db: D1Database, ipHash: string, hour: string): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO contact_attempts (ip_hash, hour, count) VALUES (?, ?, 1)
       ON CONFLICT (ip_hash, hour) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(ipHash, hour)
    .first<{ count: number }>();
  return row?.count ?? 1;
}

export async function pruneContactAttempts(db: D1Database, now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().slice(0, 13);
  await db.prepare("DELETE FROM contact_attempts WHERE hour < ?").bind(cutoff).run();
}

export async function handleContact(form: ContactForm, ip: string, deps: ContactDeps): Promise<ContactOutcome> {
  try {
    if (!(await deps.verifyTurnstile(form.turnstileToken, ip))) return "error";
    const now = deps.now();
    if (isSpam(form, now) || !isValid(form)) return "error";
    const count = await deps.recordAttempt(await deps.hashIp(ip), now.toISOString().slice(0, 13));
    if (count > MAX_PER_HOUR) return "rate_limited";
    const name = stripLineBreaks(form.name);
    await deps.send({
      subject: `New Contact Form Message from ${name}`,
      text: `Name: ${name}\nEmail: ${form.email}\n\n${form.message}\n`,
      replyTo: stripLineBreaks(form.email),
    });
    return "sent";
  } catch (err) {
    console.error("contact failed", err);
    return "error";
  }
}
