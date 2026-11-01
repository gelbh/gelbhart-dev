import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./d1";
import { app } from "../src/index";
import { sendContactMail } from "../src/mail";
import type { Env } from "../src/env";

vi.mock("../src/mail", () => ({ sendContactMail: vi.fn(async () => {}) }));

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
let fetchMock: ReturnType<typeof vi.fn>;

const env = (): Env => ({
  DB: createTestDb(),
  SEND_EMAIL: {} as SendEmail,
  PAGES_ORIGIN: "render",
  TURNSTILE_SECRET_KEY: "secret",
  IP_SALT: "salt",
});

beforeEach(() => {
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === SITEVERIFY) return Response.json({ success: true, hostname: "gelbhart.dev" });
    return new Response("origin page", { status: 200, headers: { "x-origin": "render" } });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(sendContactMail).mockClear();
});

const validForm = () => {
  const fd = new FormData();
  fd.set("name", "Ada");
  fd.set("email", "ada@example.com");
  fd.set("message", "Hello there");
  fd.set("website", "");
  fd.set("form_timestamp", String(Math.floor(Date.now() / 1000) - 30));
  fd.set("cf-turnstile-response", "tok");
  return fd;
};

describe("routes", () => {
  it("redirects a POST /contact with no body to the error page", async () => {
    const res = await app.request("https://gelbhart.dev/contact", { method: "POST" }, env());
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/contact?error=1");
    expect(sendContactMail).not.toHaveBeenCalled();
  });

  it("handles POST /contact/ (trailing slash) with a valid form", async () => {
    const res = await app.request(
      "https://gelbhart.dev/contact/",
      { method: "POST", body: validForm(), headers: { "CF-Connecting-IP": "1.1.1.1" } },
      env(),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/contact?sent=1");
    expect(sendContactMail).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(SITEVERIFY, expect.anything());
  });

  it.each(["https://gelbhart.dev/contact", "https://gelbhart.dev/contacts"])(
    "passes GET %s through to the origin",
    async (url) => {
      const res = await app.request(url, {}, env());
      expect(fetchMock).toHaveBeenCalledOnce();
      expect((fetchMock.mock.calls[0][0] as Request).url).toBe(url);
      expect(res.status).toBe(200);
      expect(res.headers.get("x-origin")).toBe("render");
      expect(await res.text()).toBe("origin page");
    },
  );
});
