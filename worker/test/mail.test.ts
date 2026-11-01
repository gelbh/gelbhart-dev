import { describe, expect, it } from "vitest";
import { sendContactMail } from "../src/mail";
import type { EmailMessage } from "./cloudflare-email-stub";

const decodeBody = (raw: string) => {
  const body = raw.split(/\r?\n\r?\n/).slice(1).join("\n").replace(/\s+/g, "");
  return Buffer.from(body, "base64").toString("utf8");
};

describe("sendContactMail", () => {
  it("sends from the site address to the inbox with the visitor as Reply-To", async () => {
    const sent: EmailMessage[] = [];
    const binding = { send: async (m: EmailMessage) => { sent.push(m); } } as unknown as SendEmail;
    const text = `Name: Ada\nEmail: ada@example.com\n\nLoved the café ${"x".repeat(200)}\n`;

    await sendContactMail(binding, { subject: "New Contact Form Message from Ada", text, replyTo: "ada@example.com" });

    expect(sent).toHaveLength(1);
    const [msg] = sent;
    expect(msg.from).toBe("contact@gelbhart.dev");
    expect(msg.to).toBe("gelbharttomer@gmail.com");
    expect(msg.raw).toContain("Reply-To: <ada@example.com>");
    const subjectB64 = Buffer.from("New Contact Form Message from Ada").toString("base64");
    expect(msg.raw).toContain(`Subject: =?utf-8?B?${subjectB64}?=`);
    expect(msg.raw).toContain("Content-Transfer-Encoding: base64");
    expect(msg.raw.split(/\r?\n/).every((line) => line.length <= 998)).toBe(true);
    expect(decodeBody(msg.raw)).toBe(text);
  });
});
