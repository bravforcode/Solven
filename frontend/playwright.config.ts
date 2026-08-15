import { defineConfig } from "@playwright/test";

/**
 * E2E smoke tests run the frontend ONLY in demo mode (no backend, no Clerk
 * keys): demo mode is the designed fail-open path — the BFF fabricates
 * deterministic local mock drafts when the backend is unreachable, so the
 * full teacher workflow is verifiable headlessly in CI.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Next dev-mode compiles on demand; parallel browser contexts against one
  // dev server cause ECONNRESET mid-compile races (observed flaky failures).
  // Serial runs keep the workflow tests deterministic.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SOLVEN_MODE: "demo",
    },
  },
});
