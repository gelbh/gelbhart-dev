const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Fails closed on any error, and on tokens minted for another hostname. */
export async function verifyTurnstile(
  secret: string, token: string, ip: string, fetchFn: typeof fetch = fetch,
  expectedHostname = "gelbhart.dev",
): Promise<boolean> {
  if (!secret || !token || token.length > 2048) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  try {
    const res = await fetchFn(SITEVERIFY_URL, { method: "POST", body });
    if (!res.ok) return false;
    const json = (await res.json()) as { success?: boolean; hostname?: string };
    return json.success === true && json.hostname === expectedHostname;
  } catch {
    return false;
  }
}
