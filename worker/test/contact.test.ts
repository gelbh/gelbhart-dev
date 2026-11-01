import { describe, expect, it, vi } from "vitest";
import { createTestDb } from "./d1";
import {
  contactAlertHtml, handleContact, recordAttempt, pruneContactAttempts, type ContactDeps, type ContactForm,
} from "../src/contact";

const NOW = new Date("2026-11-01T12:00:00Z");
const nowSec = Math.floor(NOW.getTime() / 1000);

const form = (over: Partial<ContactForm> = {}): ContactForm => ({
  name: "Ada", email: "ada@example.com", message: "Hello there",
  website: "", formTimestamp: String(nowSec - 30), turnstileToken: "tok", ...over,
});

const deps = (over: Partial<ContactDeps> = {}): ContactDeps => {
  const db = createTestDb();
  return {
    verifyTurnstile: async () => true,
    hashIp: async (ip) => `h:${ip}`,
    recordAttempt: (h, hour) => recordAttempt(db, h, hour),
    send: vi.fn(async () => {}),
    now: () => NOW,
    ...over,
  };
};

describe("handleContact", () => {
  it("sends a valid message with the visitor in Reply-To", async () => {
    const d = deps();
    expect(await handleContact(form(), "1.1.1.1", d)).toBe("sent");
    expect(d.send).toHaveBeenCalledWith({
      subject: "New Contact Form Message from Ada",
      text: expect.stringContaining("Hello there"),
      replyTo: "ada@example.com",
    });
  });

  it("rate limits the fourth submission from one IP in the same hour", async () => {
    const d = deps();
    for (let i = 0; i < 3; i++) expect(await handleContact(form(), "2.2.2.2", d)).toBe("sent");
    expect(await handleContact(form(), "2.2.2.2", d)).toBe("rate_limited");
    expect(await handleContact(form(), "3.3.3.3", d)).toBe("sent");
  });

  it.each([
    ["failed turnstile", form(), { verifyTurnstile: async () => false }],
    ["filled honeypot", form({ website: "http://x" }), {}],
    ["submitted under 3 seconds", form({ formTimestamp: String(nowSec - 1) }), {}],
    ["older than 3600 seconds", form({ formTimestamp: String(nowSec - 3601) }), {}],
    ["missing timestamp", form({ formTimestamp: "" }), {}],
    ["spam keyword", form({ message: "cheap SEO backlinks" }), {}],
    ["two links", form({ message: "see https://a.com and www.b.com" }), {}],
    ["invalid email", form({ email: "not-an-email" }), {}],
    ["name over 100 chars", form({ name: "a".repeat(101) }), {}],
  ])("rejects %s with error and sends nothing", async (_label, f, over) => {
    const d = deps(over as Partial<ContactDeps>);
    expect(await handleContact(f, "4.4.4.4", d)).toBe("error");
    expect(d.send).not.toHaveBeenCalled();
  });

  it("strips CR and LF from the name and reply-to address", async () => {
    const d = deps();
    await handleContact(form({ name: "Ada\r\nBcc: x@y.z" }), "5.5.5.5", d);
    expect(d.send).toHaveBeenCalledWith(expect.objectContaining({
      subject: "New Contact Form Message from AdaBcc: x@y.z",
    }));
  });

  it("returns error when sending throws", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({ send: async () => { throw new Error("boom"); } });
    expect(await handleContact(form(), "6.6.6.6", d)).toBe("error");
    expect(logged).toHaveBeenCalledWith("contact failed", expect.any(Error));
    logged.mockRestore();
  });
});

describe("pruneContactAttempts", () => {
  it("deletes rows older than 24 hours", async () => {
    const db = createTestDb();
    await recordAttempt(db, "old", "2026-10-30T11");
    await recordAttempt(db, "new", "2026-11-01T11");
    await pruneContactAttempts(db, NOW);
    expect(await recordAttempt(db, "old", "2026-10-30T11")).toBe(1);
    expect(await recordAttempt(db, "new", "2026-11-01T11")).toBe(2);
  });
});

describe("contactAlertHtml", () => {
  const alert = (query: string) => contactAlertHtml(new URLSearchParams(query));
  const markup = (kind: string, message: string) =>
    `<div class="alert alert-${kind} alert-dismissible fade show terminal-alert" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;

  it.each([
    ["sent=1", markup("success", "Thank you! Your message has been sent successfully.")],
    ["error=1", markup("danger", "Sorry, there was an error sending your message. Please try emailing directly.")],
    ["rate_limited=true", markup("danger", "Too many submissions. Please try again later.")],
  ])("renders the alert for %s", (query, html) => {
    expect(alert(query)).toBe(html);
  });

  it("prefers rate_limited over error over sent", () => {
    expect(alert("sent=1&error=1&rate_limited=true")).toBe(alert("rate_limited=true"));
    expect(alert("sent=1&error=1")).toBe(alert("error=1"));
  });

  it.each(["", "sent=0", "error=true", "rate_limited=1", "other=1"])("renders nothing for %j", (query) => {
    expect(alert(query)).toBe("");
  });
});
