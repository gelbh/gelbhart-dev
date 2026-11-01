import { EmailMessage } from "cloudflare:email";
import { createMimeMessage, Mailbox } from "mimetext";
import type { ContactMail } from "./contact";

const FROM = "contact@gelbhart.dev";
const TO = "gelbharttomer@gmail.com";

// mimetext only labels the part as base64; the data must already be encoded (RFC 2045: 76-char lines).
const toBase64Lines = (text: string) =>
  Buffer.from(text, "utf8").toString("base64").replace(/.{76}/g, "$&\n").trimEnd();

export async function sendContactMail(binding: SendEmail, mail: ContactMail): Promise<void> {
  const msg = createMimeMessage();
  msg.setSender({ name: "gelbhart.dev", addr: FROM });
  msg.setRecipient(TO);
  msg.setSubject(mail.subject);
  msg.setHeader("Reply-To", new Mailbox(mail.replyTo));
  msg.addMessage({ contentType: "text/plain", encoding: "base64", data: toBase64Lines(mail.text) });
  await binding.send(new EmailMessage(FROM, TO, msg.asRaw()));
}
