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

describe("routes in assets mode", () => {
  type Edit = [selector: string, op: "set" | "append", ...args: string[]];
  let edits: Edit[];
  let assetsFetch: ReturnType<typeof vi.fn>;

  // Node has no HTMLRewriter; this stub records what the handlers write. Preview parity covers the real rewrite.
  class RecordingRewriter {
    private handlers: [string, { element(el: unknown): void }][] = [];
    on(selector: string, handler: { element(el: unknown): void }) {
      this.handlers.push([selector, handler]);
      return this;
    }
    transform(res: Response) {
      for (const [selector, handler] of this.handlers) {
        handler.element({
          setAttribute: (name: string, value: string) => edits.push([selector, "set", name, value]),
          append: (content: string) => edits.push([selector, "append", content]),
        });
      }
      return res;
    }
  }

  const assetsEnv = (): Env => ({ ...env(), PAGES_ORIGIN: "assets", ASSETS: { fetch: assetsFetch } as unknown as Fetcher });

  beforeEach(() => {
    edits = [];
    assetsFetch = vi.fn(async () => new Response("<form></form>", { status: 200, headers: { ETag: '"abc"' } }));
    vi.stubGlobal("HTMLRewriter", RecordingRewriter);
  });

  it("serves GET /contact from assets with a fresh timestamp, the alert and no-store", async () => {
    const res = await app.request("https://gelbhart.dev/contact?sent=1", {}, assetsEnv());
    expect(assetsFetch).toHaveBeenCalledWith("https://gelbhart.dev/contact?sent=1", { redirect: "manual" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("etag")).toBeNull();
    const [timestamp, alert] = edits;
    expect(timestamp.slice(0, 3)).toEqual(['input[name="form_timestamp"]', "set", "value"]);
    expect(Number(timestamp[3])).toBeCloseTo(Date.now() / 1000, -1);
    expect(alert.slice(0, 2)).toEqual(["#contact-alert", "append"]);
    expect(alert[2]).not.toBe("");
  });

  it("returns a non-200 contact asset untouched", async () => {
    assetsFetch.mockResolvedValueOnce(new Response(null, { status: 307, headers: { location: "/contact" } }));
    const res = await app.request("https://gelbhart.dev/contact/", {}, assetsEnv());
    expect(res.status).toBe(307);
    expect(edits).toEqual([]);
  });

  it("passes other paths to the assets binding, not the network", async () => {
    const res = await app.request("https://gelbhart.dev/api/leaderboard", {}, assetsEnv());
    expect(assetsFetch).toHaveBeenCalledOnce();
    expect((assetsFetch.mock.calls[0][0] as Request).url).toBe("https://gelbhart.dev/api/leaderboard");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
