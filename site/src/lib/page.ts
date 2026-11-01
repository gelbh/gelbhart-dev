export const CANONICAL_BASE_URL = "https://gelbhart.dev";
export const DEFAULT_META_DESCRIPTION =
  "Personal portfolio and development projects by Tomer Gelbhart. " +
  "Full-stack developer specializing in Ruby on Rails and modern web applications.";

// Rails asset_url against the production host; the static build serves assets undigested.
export function assetUrl(path: string): string {
  return path.startsWith("/") ? `${CANONICAL_BASE_URL}${path}` : `${CANONICAL_BASE_URL}/assets/${path}`;
}

export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function pageTitle(title: string): string {
  const baseTitle = "gelbhart.dev";
  return title === "" ? baseTitle : `${title} | ${baseTitle}`;
}

// Rails request.path for a built page: build.format "file" gives Astro.url.pathname like /index.html or /contact.html.
export function requestPath(pathname: string): string {
  const path = pathname.replace(/\.html$/, "").replace(/\/index$/, "");
  return path === "" ? "/" : path;
}

export function canonicalUrl(path: string): string {
  return `${CANONICAL_BASE_URL}${path || "/"}`;
}

// meta_description: String#truncate(157, separator: " ", omission: "") then strip.
export function metaDescription(description: string): string {
  if (description.length <= 157) return description.trim();
  const stop = description.lastIndexOf(" ", 157);
  return description.slice(0, stop === -1 ? 157 : stop).trim();
}

export function ogTypeFor(path: string): string {
  if (path === "/") return "website";
  if (path === "/contact") return "profile";
  return /\/projects\/(video-captioner|nasa-exoplanet-explorer|hevy-tracker)/.test(path) ? "article" : "website";
}

export const socialImageUrl = () => assetUrl("logos/social/logo_social.png");
export const socialImageDimensions = () => ({ width: 1200, height: 630 });
