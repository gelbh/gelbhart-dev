import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const [origin, outDir, pathsFromDir] = process.argv.slice(2);
if (!origin || !outDir) {
  console.error("usage: crawl.mjs <origin> <outDir> [pathsFromDir]");
  process.exit(2);
}

const HOME = new URL(origin).origin;
// Rails emits absolute Locations and links on the prod hosts; the preview emits relative ones.
const SAME_SITE = new Set([HOME, "https://gelbhart.dev", "https://www.gelbhart.dev"]);
const SITEMAP_PATHS = ["/sitemap.xml.gz", "/sitemap-index.xml", "/sitemap.xml"];
const REDIRECT_PATHS = [
  "/hevy-tracker", "/hevy-tracker/privacy", "/hevy-tracker/terms",
  "/video-captioner", "/nim-quantum-ml", "/nasa-exoplanet-explorer",
  "/google-maps-converter", "/vscode-torch-checkpoint-inspector", "/jetlag",
  "/sitemap.xml", "/robots.txt", "/does-not-exist",
  "/hevy-tracker/spreadsheet", "/sitemap.xml.gz",
];
// Per-request Rails values (CSRF pair is also absent from a static build).
const DROPPED_META = new Set(["csrf-token", "csrf-param"]);
const VOLATILE_META = new Set(["og:updated_time"]);

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
  return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
});
// Sprockets appends a 64-hex digest to asset names; the static build does not.
const stripDigests = (s) => s?.replace(/-[0-9a-f]{64}(\.\w+)/g, "$1") ?? null;
const collapse = (s) => s.replace(/\s+/g, " ").trim();
const fetchOpts = () => ({ redirect: "manual", signal: AbortSignal.timeout(20000) });

function localize(raw, base) {
  let url;
  try { url = new URL(raw, base); } catch { return raw; }
  return SAME_SITE.has(url.origin) ? url.pathname + url.search + url.hash : url.href;
}

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  }
  return v;
}

function parseAttrs(src) {
  const attrs = {};
  for (const m of src.matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

const tags = (html, name) =>
  [...html.matchAll(new RegExp(`<${name}\\b((?:[^>"']|"[^"]*"|'[^']*')*)>`, "gi"))].map((m) => parseAttrs(m[1]));

// Follows same-site redirects against the crawl origin; stops at the first off-site hop.
async function follow(path) {
  let url = new URL(path, origin);
  const redirects = [];
  for (let hops = 0; hops < 10; hops++) {
    const res = await fetch(url, fetchOpts());
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) {
      return { res, redirects, finalUrl: url.pathname + url.search };
    }
    await res.body?.cancel();
    const next = new URL(location, url);
    redirects.push({ status: res.status, location: localize(next.href) });
    if (!SAME_SITE.has(next.origin)) return { res, redirects, finalUrl: next.href, external: true };
    url = new URL(next.pathname + next.search, origin);
  }
  throw new Error(`too many redirects for ${path}`);
}

async function locsFrom(buf, seen = new Set()) {
  const xml = (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString("utf8");
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => decode(m[1]));
  if (!/<sitemapindex[\s>]/.test(xml)) return locs.map((l) => new URL(l, origin).pathname);
  const out = [];
  for (const loc of locs) {
    const child = new URL(loc, origin);
    const key = child.pathname + child.search;
    if (seen.has(key)) continue;
    seen.add(key);
    const { res, external } = await follow(key);
    if (external || res.status !== 200) throw new Error(`sitemap child ${loc} returned ${res.status}`);
    out.push(...(await locsFrom(Buffer.from(await res.arrayBuffer()), seen)));
  }
  return out;
}

const sortedSet = (xs) => [...new Set(xs)].sort();

async function discoverSitemap() {
  for (const path of SITEMAP_PATHS) {
    const { res, external } = await follow(path);
    if (external || res.status !== 200) { await res.body?.cancel(); continue; }
    const locs = await locsFrom(Buffer.from(await res.arrayBuffer()));
    if (locs.length) return sortedSet(locs);
  }
  throw new Error(`no non-empty sitemap at ${SITEMAP_PATHS.join(", ")} on ${origin}`);
}

function extract(html, pageUrl) {
  const clean = html.replace(/<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, "");
  const meta = {};
  for (const a of tags(clean, "meta")) {
    const key = a.name ?? a.property;
    if (!key || a.content === undefined || DROPPED_META.has(key)) continue;
    const value = VOLATILE_META.has(key) ? "<volatile>" : stripDigests(a.content);
    meta[key] = key in meta ? [meta[key], value].flat() : value;
  }
  const jsonLd = [...html.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script>/gi)]
    .filter((m) => parseAttrs(m[1]).type === "application/ld+json")
    .map((m) => {
      try { return stripDigests(JSON.stringify(sortKeys(JSON.parse(m[2])))); }
      catch { return { invalidJsonLd: stripDigests(m[2]) }; }
    });
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const canonical = tags(clean, "link").find((a) => a.rel?.toLowerCase().split(/\s+/).includes("canonical"))?.href;
  return {
    title: title === undefined ? null : collapse(decode(title)),
    canonical: stripDigests(canonical ?? null),
    meta: Object.fromEntries(Object.entries(meta).sort(([a], [b]) => (a < b ? -1 : 1))),
    links: sortedSet(tags(clean, "a").filter((a) => a.href !== undefined).map((a) => stripDigests(localize(a.href, pageUrl)))),
    images: tags(clean, "img").map((a) => `${stripDigests(localize(a.src ?? "", pageUrl))}|${a.alt ?? ""}`).sort(),
    jsonLd,
    text: collapse(stripDigests(decode(clean.replace(/<[^>]+>/g, " ")))),
  };
}

async function crawl(path) {
  const { res, redirects, finalUrl, external } = await follow(path);
  const record = { path, status: res.status, finalUrl, redirects };
  if (external) { await res.body?.cancel(); return record; }
  const type = res.headers.get("content-type") ?? "";
  if (path === "/sitemap.xml" || path === "/sitemap.xml.gz") {
    record.locs = res.status === 200 ? sortedSet(await locsFrom(Buffer.from(await res.arrayBuffer()))) : null;
  } else if (type.includes("text/plain")) {
    const lines = (await res.text()).split("\n").map(collapse);
    const isRef = (l) => /^sitemap:/i.test(l);
    record.body = lines.filter((l) => !isRef(l)).join("\n").trim();
    record.sitemapRefs = lines.filter(isRef).sort();
  } else if (type.includes("html")) {
    Object.assign(record, extract(await res.text(), new URL(finalUrl, origin)));
  } else {
    await res.body?.cancel();
  }
  return record;
}

const sitemap = pathsFromDir ? await discoverSitemap().catch(() => []) : await discoverSitemap();
const paths = pathsFromDir
  ? sortedSet([...JSON.parse(await readFile(`${pathsFromDir}/index.json`, "utf8")).map((r) => r.path), ...sitemap])
  : sortedSet([...sitemap, ...REDIRECT_PATHS]);

const results = [];
for (const path of paths) {
  try {
    results.push(await crawl(path));
  } catch (err) {
    throw new Error(`${path}: ${err.message}`, { cause: err });
  }
}

if (!pathsFromDir) {
  const bad = results.filter((r) => sitemap.includes(r.path)
    && (r.status !== 200 || !r.title || !r.canonical || !r.meta?.description));
  if (bad.length) {
    for (const r of bad) {
      console.error(`BAD ${r.path} status=${r.status} title=${!!r.title} canonical=${!!r.canonical} description=${!!r.meta?.description}`);
    }
    console.error("baseline sanity check failed; index.json not written");
    process.exit(1);
  }
}

await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/index.json`, JSON.stringify(results, null, 2));
console.log(`crawled ${results.length} paths into ${outDir}`);
