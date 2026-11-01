import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:email": fileURLToPath(new URL("./test/cloudflare-email-stub.ts", import.meta.url)),
    },
  },
  test: { environment: "node", include: ["test/**/*.test.ts"] },
});
