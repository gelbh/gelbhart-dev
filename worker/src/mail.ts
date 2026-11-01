// worker/src/mail.ts
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";
import type { ContactMail } from "./contact";

const FROM = "contact@gelbhart.dev";
const TO = "gelbharttomer@gmail.com";

export async function sendContactMail(binding: SendEmail, mail: ContactMail): Promise<void> {
  const msg = createMimeMessage();
  msg.setSender({ name: "gelbhart.dev", addr: FROM });
  msg.setRecipient(TO);
  msg.setSubject(mail.subject);
  msg.setHeader("Reply-To", mail.replyTo);
  msg.addMessage({ contentType: "text/plain", data: mail.text });
  await binding.send(new EmailMessage(FROM, TO, msg.asRaw()));
}
