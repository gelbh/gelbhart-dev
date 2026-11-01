// tools/parity/crawl.mjs
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const [origin, outDir, pathsFromDir] = process.argv.slice(2);
if (!origin || !outDir) {
  console.error("usage: crawl.mjs <origin> <outDir> [pathsFromDir]");
  process.exit(2);
}

const REDIRECT_PATHS = [
  "/hevy-tracker", "/hevy-tracker/privacy", "/hevy-tracker/terms",
  "/video-captioner", "/nim-quantum-ml", "/nasa-exoplanet-explorer",
  "/google-maps-converter", "/vscode-torch-checkpoint-inspector", "/jetlag",
  "/sitemap.xml", "/robots.txt", "/does-not-exist",
];

async function sitemapPaths() {
  const res = await fetch("https://gelbhart.dev/sitemap.xml.gz");
  const xml = gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

const pick = (html, re) => html.match(re)?.[1]?.trim() ?? null;
// Sprockets appends a 64-hex digest to asset names; the static build does not.
const stripDigests = (s) => s?.replace(/-[0-9a-f]{64}(\.\w+)/g, "$1") ?? null;
const collapse = (s) => s.replace(/\s+/g, " ").trim();

function extract(html) {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "");
  return {
    title: pick(html, /<title>([^<]*)<\/title>/),
    canonical: stripDigests(pick(html, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)),
    metaDescription: pick(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/),
    jsonLd: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => stripDigests(JSON.stringify(JSON.parse(m[1])))),
    text: collapse(stripDigests(body.replace(/<[^>]+>/g, " "))),
  };
}

const paths = pathsFromDir
  ? JSON.parse(await readFile(`${pathsFromDir}/index.json`, "utf8")).map((r) => r.path)
  : [...new Set([...(await sitemapPaths()), ...REDIRECT_PATHS])].sort();
const results = [];
for (const path of paths) {
  const res = await fetch(origin + path, { redirect: "follow" });
  const type = res.headers.get("content-type") ?? "";
  const html = type.includes("html") ? await res.text() : "";
  results.push({
    path,
    status: res.status,
    finalUrl: new URL(res.url).pathname,
    ...(html ? extract(html) : {}),
  });
}
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/index.json`, JSON.stringify(results, null, 2));
console.log(`crawled ${results.length} paths into ${outDir}`);
