import type { Env } from "./env";

const CACHE_KEY = "hevy_tracker_analytics";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const DATE_RANGES = [{ startDate: "2024-11-19", endDate: "today" }];
const STALE_AFTER_MS = 2 * 3600 * 1000;

export type Stats = {
  active_users: number;
  countries: { list: { name: string; users: number }[]; total: number };
  engagement_rate: number;
  install_count: number;
};
export type GaCreds = { clientEmail: string; privateKey: string; propertyId: string };

export const DEFAULT_STATS: Stats = {
  active_users: 1005,
  countries: {
    list: [
      { name: "United States", users: 404 },
      { name: "United Kingdom", users: 76 },
      { name: "India", users: 43 },
      { name: "Canada", users: 36 },
      { name: "China", users: 36 },
      { name: "Germany", users: 36 },
    ],
    total: 72,
  },
  engagement_rate: 52,
  install_count: 345,
};

type ReportRow = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type Report = { rows?: ReportRow[]; rowCount?: number };

const isoSeconds = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** OAuth 2.0 JWT bearer grant for a service account (RFC 7523). */
async function accessToken(creds: GaCreds, fetchFn: typeof fetch): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ iss: creds.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 }),
  )}`;
  const der = Uint8Array.from(atob(creds.privateKey.replace(/-----[^-]+-----|\s/g, "")), (ch) => ch.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const res = await fetchFn(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`token request failed: ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export async function fetchGaStats(creds: GaCreds, fetchFn: typeof fetch): Promise<Stats> {
  const token = await accessToken(creds, fetchFn);
  const report = async (body: Record<string, unknown>): Promise<Report> => {
    const res = await fetchFn(
      `https://analyticsdata.googleapis.com/v1beta/properties/${creds.propertyId}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ dateRanges: DATE_RANGES, ...body }),
      },
    );
    if (!res.ok) throw new Error(`runReport failed: ${res.status}`);
    return (await res.json()) as Report;
  };
  const first = (r: Report) => r.rows?.[0]?.metricValues?.[0]?.value ?? "0";

  const [users, engagement, installs, countries] = await Promise.all([
    report({ metrics: [{ name: "totalUsers" }] }),
    report({ metrics: [{ name: "engagementRate" }] }),
    report({
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "FINISH_INSTALL" } } },
    }),
    report({
      dimensions: [{ name: "country" }],
      metrics: [{ name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
      limit: 100,
    }),
  ]);

  return {
    active_users: Number.parseInt(first(users), 10),
    countries: {
      list: (countries.rows ?? []).map((row) => ({
        name: row.dimensionValues?.[0]?.value ?? "Unknown",
        users: Number.parseInt(row.metricValues?.[0]?.value ?? "0", 10),
      })),
      total: countries.rowCount ?? 0,
    },
    engagement_rate: Math.round(Number.parseFloat(first(engagement)) * 100),
    install_count: Number.parseInt(first(installs), 10),
  };
}

/** Never throws; on any failure the previous snapshot stays in place. */
export async function refreshAnalytics(env: Env, fetchFn: typeof fetch = fetch): Promise<void> {
  if (!env.GA_SERVICE_ACCOUNT_KEY || !env.GA_PROPERTY_ID) {
    console.error("analytics refresh skipped: GA_SERVICE_ACCOUNT_KEY or GA_PROPERTY_ID missing");
    return;
  }
  try {
    const key = JSON.parse(env.GA_SERVICE_ACCOUNT_KEY) as { client_email: string; private_key: string };
    const stats = await fetchGaStats(
      { clientEmail: key.client_email, privateKey: key.private_key, propertyId: env.GA_PROPERTY_ID },
      fetchFn,
    );
    await env.DB
      .prepare(
        `INSERT INTO analytics_cache (key, data, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`,
      )
      .bind(CACHE_KEY, JSON.stringify(stats), isoSeconds(new Date()))
      .run();
  } catch (err) {
    console.error("analytics refresh failed", err);
  }
}

export async function analyticsResponse(db: D1Database): Promise<Record<string, unknown>> {
  const row = await db
    .prepare("SELECT data, fetched_at FROM analytics_cache WHERE key = ?")
    .bind(CACHE_KEY)
    .first<{ data: string; fetched_at: string }>();
  if (!row) return { ...DEFAULT_STATS, source: "defaults", stale: true };
  const stale = Date.now() - Date.parse(row.fetched_at) > STALE_AFTER_MS;
  return {
    ...(JSON.parse(row.data) as Stats),
    source: stale ? "fallback" : "fresh",
    fetched_at: row.fetched_at,
    ...(stale ? { stale: true } : {}),
  };
}
