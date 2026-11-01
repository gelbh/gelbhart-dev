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
      alias: {
        controllers: rails("javascript/controllers"),
        lib: rails("javascript/lib"),
        theme: rails("javascript/theme"),
        "@hotwired/turbo-rails": fileURLToPath(import.meta.resolve("@hotwired/turbo")),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          loadPaths: [rails("assets/stylesheets"), fileURLToPath(new URL("./node_modules", import.meta.url))],
          silenceDeprecations: ["import", "global-builtin", "color-functions", "mixed-decls"],
        },
      },
    },
    server: { fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] } },
  },
});
