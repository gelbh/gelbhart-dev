import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./d1";
import { analyticsResponse, DEFAULT_STATS, fetchGaStats, refreshAnalytics, type GaCreds } from "../src/analytics";
import type { Env } from "../src/env";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
let creds: GaCreds;
let publicKey: CryptoKey;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  publicKey = pair.publicKey;
  const der = Buffer.from(await crypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
  const privateKey = `-----BEGIN PRIVATE KEY-----\n${der.match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----\n`;
  creds = { clientEmail: "ga@test.iam.gserviceaccount.com", privateKey, propertyId: "123" };
});

afterEach(() => vi.restoreAllMocks());

const b64urlDecode = (s: string) => Buffer.from(s, "base64url");

type Call = { url: string; init?: RequestInit };

function fakeGa(calls: Call[] = []): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === TOKEN_URL) return Response.json({ access_token: "at" });
    const body = JSON.parse(String(init?.body));
    if (body.dimensions?.[0]?.name === "country") {
      return Response.json({
        rows: [{ dimensionValues: [{ value: "Ireland" }], metricValues: [{ value: "7" }] }],
        rowCount: 1,
      });
    }
    const value = { totalUsers: "1979", engagementRate: "0.4712", eventCount: "757" }[body.metrics[0].name as string];
    return Response.json({ rows: [{ metricValues: [{ value }] }] });
  }) as typeof fetch;
}

const gaEnv = (db: D1Database) => ({
  DB: db,
  GA_SERVICE_ACCOUNT_KEY: JSON.stringify({ client_email: creds.clientEmail, private_key: creds.privateKey }),
  GA_PROPERTY_ID: creds.propertyId,
}) as unknown as Env;

describe("fetchGaStats", () => {
  it("maps the four GA4 reports to the Rails stats shape", async () => {
    expect(await fetchGaStats(creds, fakeGa())).toEqual({
      active_users: 1979,
      countries: { list: [{ name: "Ireland", users: 7 }], total: 1 },
      engagement_rate: 47,
      install_count: 757,
    });
  });

  it("gets a token with a signed service-account JWT and sends it to the property", async () => {
    const calls: Call[] = [];
    await fetchGaStats(creds, fakeGa(calls));

    const form = new URLSearchParams(String(calls[0].init?.body));
    expect(calls[0].url).toBe(TOKEN_URL);
    expect(form.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    const [header, claims, sig] = (form.get("assertion") ?? "").split(".");
    const signed = new TextEncoder().encode(`${header}.${claims}`);
    expect(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, b64urlDecode(sig), signed)).toBe(true);
    expect(JSON.parse(b64urlDecode(claims).toString())).toMatchObject({
      iss: creds.clientEmail,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: TOKEN_URL,
    });

    for (const call of calls.slice(1)) {
      expect(call.url).toBe("https://analyticsdata.googleapis.com/v1beta/properties/123:runReport");
      expect(new Headers(call.init?.headers).get("authorization")).toBe("Bearer at");
    }
  });
});

describe("analyticsResponse", () => {
  it("returns DEFAULT_STATS marked stale when no snapshot exists", async () => {
    expect(await analyticsResponse(createTestDb())).toEqual({ ...DEFAULT_STATS, source: "defaults", stale: true });
  });

  it("returns the stored snapshot after a refresh, then marks it stale after two hours", async () => {
    const db = createTestDb();
    await refreshAnalytics(gaEnv(db), fakeGa());
    const fresh = await analyticsResponse(db);
    expect(fresh).toMatchObject({ active_users: 1979, install_count: 757, source: "fresh" });
    expect(fresh.fetched_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);

    const later = Date.parse(fresh.fetched_at!) + 2 * 3600 * 1000 + 1;
    expect(await analyticsResponse(db, later)).toMatchObject({ active_users: 1979, source: "fallback", stale: true });
  });

  it("keeps the previous snapshot when GA4 fails", async () => {
    const db = createTestDb();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await refreshAnalytics(gaEnv(db), fakeGa());
    await refreshAnalytics(gaEnv(db), (async () => new Response("nope", { status: 500 })) as typeof fetch);
    expect(logged).toHaveBeenCalledWith("analytics refresh failed", expect.any(Error));
    expect(await analyticsResponse(db)).toMatchObject({ active_users: 1979, source: "fresh" });
  });

  it("falls back to defaults when the database read fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const db = { prepare: () => { throw new Error("d1 down"); } } as unknown as D1Database;
    expect(await analyticsResponse(db)).toEqual({ ...DEFAULT_STATS, source: "defaults", stale: true });
  });
});
