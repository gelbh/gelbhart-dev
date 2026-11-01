import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { glob, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const rails = (p) => fileURLToPath(new URL(`../app/${p}`, import.meta.url));

// ponytail: Rails emits Stimulus data-action "->" unescaped and the parity baseline text depends on it; remove once the Rails parity gate is retired (PR 8).
const unescapeStimulusArrows = {
  name: "unescape-stimulus-arrows",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      for await (const file of glob("**/*.html", { cwd: fileURLToPath(dir) })) {
        const path = fileURLToPath(new URL(file, dir));
        const html = await readFile(path, "utf8");
        const fixed = html.replace(/data-action="[^"]*"/g, (attr) => attr.replaceAll("-&gt;", "->"));
        if (fixed !== html) await writeFile(path, fixed);
      }
    },
  },
};

export default defineConfig({
  site: "https://gelbhart.dev",
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [sitemap(), unescapeStimulusArrows],
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
