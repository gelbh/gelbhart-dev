// Copies Rails-owned static files into site/public until the cleanup PR moves them for good.
import { cpSync, rmSync } from "node:fs";

const from = (p) => new URL(`../../${p}`, import.meta.url);
const to = (p) => new URL(`../public/${p}`, import.meta.url);

rmSync(to("assets"), { recursive: true, force: true });
cpSync(from("app/assets/images"), to("assets"), { recursive: true });
cpSync(from("app/assets/json/cbms-json-schema.json"), to("assets/cbms-json-schema.json"));
cpSync(from("app/assets/json/error.json"), to("assets/error.json"));
for (const name of ["favicon.ico", "apple-touch-icon.png", "browserconfig.xml", "site.webmanifest", "icons", "images", "downloads"]) {
  cpSync(from(`public/${name}`), to(name), { recursive: true });
}
console.log("synced Rails public files into site/public");
