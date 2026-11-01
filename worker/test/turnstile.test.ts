import { describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "../src/turnstile";

const respond = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("verifyTurnstile", () => {
  it("accepts a successful token minted on the expected hostname", async () => {
    const fetchFn = respond({ success: true, hostname: "gelbhart.dev" });
    expect(await verifyTurnstile("secret", "tok", "1.1.1.1", fetchFn, "gelbhart.dev")).toBe(true);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("defaults the expected hostname to gelbhart.dev", async () => {
    expect(await verifyTurnstile("secret", "tok", "", respond({ success: true, hostname: "gelbhart.dev" }))).toBe(true);
  });

  it("rejects a token minted on another hostname", async () => {
    const fetchFn = respond({ success: true, hostname: "gelbhart-dev.example.workers.dev" });
    expect(await verifyTurnstile("secret", "tok", "1.1.1.1", fetchFn, "gelbhart.dev")).toBe(false);
  });

  it("rejects when siteverify reports success: false", async () => {
    const fetchFn = respond({ success: false, hostname: "gelbhart.dev" });
    expect(await verifyTurnstile("secret", "tok", "1.1.1.1", fetchFn)).toBe(false);
  });

  it("rejects a non-OK HTTP response", async () => {
    const fetchFn = respond({ success: true, hostname: "gelbhart.dev" }, 500);
    expect(await verifyTurnstile("secret", "tok", "1.1.1.1", fetchFn)).toBe(false);
  });

  it("rejects when fetch throws", async () => {
    const fetchFn = vi.fn(async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    expect(await verifyTurnstile("secret", "tok", "1.1.1.1", fetchFn)).toBe(false);
  });

  it("rejects an empty token without calling siteverify", async () => {
    const fetchFn = respond({ success: true, hostname: "gelbhart.dev" });
    expect(await verifyTurnstile("secret", "", "1.1.1.1", fetchFn)).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
