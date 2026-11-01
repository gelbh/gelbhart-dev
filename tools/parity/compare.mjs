import { readFile } from "node:fs/promises";

const [baseDir, candDir] = process.argv.slice(2);
if (!baseDir || !candDir) {
  console.error("usage: compare.mjs <baselineDir> <candidateDir>");
  process.exit(2);
}

const load = async (d) => JSON.parse(await readFile(`${d}/index.json`, "utf8")).results;
const base = await load(baseDir);
const cand = new Map((await load(candDir)).map((r) => [r.path, r]));
const FIELDS = [
  "status", "finalUrl", "redirects", "title", "canonical", "meta",
  "links", "images", "jsonLd", "text", "body", "sitemapRefs", "locs",
];
// Intentional change: the gzip sitemap becomes @astrojs/sitemap's index file. Its locs are still compared.
const ALLOWED = new Set([
  "/sitemap.xml finalUrl", "/sitemap.xml redirects",
  "/sitemap.xml.gz finalUrl", "/sitemap.xml.gz redirects",
]);
// Meta keys added to Rails after the baseline was captured (#45).
const ALLOWED_META = new Set(["/contact turbo-cache-control"]);
const omitAllowedMeta = (path, meta) =>
  meta && Object.fromEntries(Object.entries(meta).filter(([k]) => !ALLOWED_META.has(`${path} ${k}`)));
// Baseline text keeps tag tails cut at a literal "->" (see crawl.mjs); Astro re-serializes `" />` and `" >` as `">`.
const normalizeTagTails = (text) => text?.replace(/\s*\/?>/g, ">");
// The robots Sitemap line may move to the Astro index file, but must still point at a prod sitemap.
const VALID_SITEMAP_REF = /^Sitemap: https:\/\/gelbhart\.dev\/(sitemap\.xml\.gz|sitemap-index\.xml|sitemap\.xml)$/;
const show = (v) => JSON.stringify(v)?.slice(0, 300);
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function report(path, field, b, c) {
  console.log(`DIFF ${path} ${field}`);
  if (!isPlainObject(b) || !isPlainObject(c)) {
    console.log(`  base: ${show(b)}\n  cand: ${show(c)}`);
    return;
  }
  for (const key of [...new Set([...Object.keys(b), ...Object.keys(c)])].sort()) {
    if (JSON.stringify(b[key]) === JSON.stringify(c[key])) continue;
    const fmt = (v) => (v === undefined ? "(missing)" : typeof v === "string" ? v : show(v));
    console.log(`  ${key}: ${fmt(b[key])} -> ${fmt(c[key])}`);
  }
}

let failures = 0;
for (const b of base) {
  const c = cand.get(b.path);
  cand.delete(b.path);
  if (!c) { console.log(`MISSING ${b.path}`); failures++; continue; }
  for (const f of FIELDS) {
    if (b.path === "/robots.txt" && f === "sitemapRefs") {
      const refs = c[f];
      if (!Array.isArray(refs) || !refs.length || !refs.every((r) => VALID_SITEMAP_REF.test(r))) {
        report(b.path, f, b[f], refs);
        failures++;
      }
      continue;
    }
    if (ALLOWED.has(`${b.path} ${f}`)) continue;
    const [bv, cv] = f === "meta" ? [omitAllowedMeta(b.path, b[f]), omitAllowedMeta(b.path, c[f])]
      : f === "text" ? [normalizeTagTails(b[f]), normalizeTagTails(c[f])]
      : [b[f], c[f]];
    if (JSON.stringify(bv) !== JSON.stringify(cv)) {
      report(b.path, f, bv, cv);
      failures++;
    }
  }
}
for (const path of cand.keys()) { console.log(`EXTRA ${path}`); failures++; }
console.log(failures === 0 ? "parity OK" : `${failures} differences`);
process.exit(failures === 0 ? 0 : 1);
