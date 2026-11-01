import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

const rails = (p) => fileURLToPath(new URL(`../app/${p}`, import.meta.url));

export default defineConfig({
  site: "https://gelbhart.dev",
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [sitemap()],
  vite: {
    resolve: {
      // theme matches extensionless JS specifiers only; SCSS url() rebasing yields theme/... asset paths.
      alias: [
        { find: "@rails", replacement: rails("").replace(/\/$/, "") },
        { find: "controllers", replacement: rails("javascript/controllers") },
        { find: "lib", replacement: rails("javascript/lib") },
        { find: /^theme\/([^.]+)$/, replacement: `${rails("javascript/theme")}/$1` },
        { find: "@hotwired/turbo-rails", replacement: fileURLToPath(import.meta.resolve("@hotwired/turbo")) },
      ],
      // Bare imports from ../app/javascript must resolve from site/node_modules, not the repo root.
      dedupe: [
        "@hotwired/stimulus",
        "axios",
        "bootstrap",
        "date-fns",
        "eases",
        "he",
        "i18n-iso-countries",
        "localforage",
        "lodash.throttle",
      ],
    },
    css: {
      preprocessorOptions: {
        scss: {
          loadPaths: [rails("assets/stylesheets"), fileURLToPath(new URL("./node_modules", import.meta.url))],
          silenceDeprecations: ["import", "global-builtin", "color-functions", "mixed-decls"],
        },
      },
    },
    server: { fs: { allow: [fileURLToPath(new URL(".", import.meta.url)), rails("")] } },
  },
});
