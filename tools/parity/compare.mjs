import { readFile } from "node:fs/promises";

const [baseDir, candDir] = process.argv.slice(2);
if (!baseDir || !candDir) {
  console.error("usage: compare.mjs <baselineDir> <candidateDir>");
  process.exit(2);
}

const load = async (d) => JSON.parse(await readFile(`${d}/index.json`, "utf8"));
const base = await load(baseDir);
const cand = new Map((await load(candDir)).map((r) => [r.path, r]));
const FIELDS = [
  "status", "finalUrl", "redirects", "title", "canonical", "meta",
  "links", "images", "jsonLd", "text", "body", "locs",
];
// Intentional change: the gzip sitemap becomes @astrojs/sitemap's index file. Its locs are still compared.
const ALLOWED = new Set([
  "/sitemap.xml finalUrl", "/sitemap.xml redirects",
  "/sitemap.xml.gz finalUrl", "/sitemap.xml.gz redirects",
]);

let failures = 0;
for (const b of base) {
  const c = cand.get(b.path);
  cand.delete(b.path);
  if (!c) { console.log(`MISSING ${b.path}`); failures++; continue; }
  for (const f of FIELDS) {
    if (ALLOWED.has(`${b.path} ${f}`)) continue;
    if (JSON.stringify(b[f]) !== JSON.stringify(c[f])) {
      console.log(`DIFF ${b.path} ${f}\n  base: ${JSON.stringify(b[f])?.slice(0, 300)}\n  cand: ${JSON.stringify(c[f])?.slice(0, 300)}`);
      failures++;
    }
  }
}
for (const path of cand.keys()) { console.log(`EXTRA ${path}`); failures++; }
console.log(failures === 0 ? "parity OK" : `${failures} differences`);
process.exit(failures === 0 ? 0 : 1);
