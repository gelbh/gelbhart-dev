import type { MiddlewareHandler } from "hono";

/** Mirrors the headers Rails sent; _headers covers static assets only. */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  // Responses from fetch() or ASSETS.fetch() have immutable headers.
  c.res = new Response(c.res.body, c.res);
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "SAMEORIGIN");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
};
