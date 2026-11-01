// Copies Rails-owned static files into site/public until the cleanup PR moves them for good.
import { cpSync, rmSync } from "node:fs";

const from = (p) => new URL(`../../${p}`, import.meta.url);
const to = (p) => new URL(`../public/${p}`, import.meta.url);
const copy = (src, dest) => {
  rmSync(to(dest), { recursive: true, force: true });
  cpSync(from(src), to(dest), { recursive: true });
};

copy("app/assets/images", "assets");
copy("app/assets/json/cbms-json-schema.json", "assets/cbms-json-schema.json");
copy("app/assets/json/error.json", "assets/error.json");
for (const name of ["favicon.ico", "apple-touch-icon.png", "browserconfig.xml", "site.webmanifest", "icons", "images", "downloads"]) {
  copy(`public/${name}`, name);
}
console.log("synced Rails public files into site/public");
