import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Pure TS unit tests for lib/* — mirror the tsconfig "@/*" alias.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
