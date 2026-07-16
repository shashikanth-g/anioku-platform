import { defineConfig } from "@playwright/test";

// Points at the already-running docker compose stack (frontend on :3000,
// backend on :8000) rather than spawning its own server — this is meant to
// verify the real dev stack end to end, the same way a user's browser would.
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 75_000,
  // Next.js dev mode compiles each route on-demand on its first request in a
  // given server session, which can comfortably exceed the default 5s
  // assertion timeout — bump it rather than chase a flaky-looking failure
  // that's actually just cold-compile latency.
  expect: { timeout: 10_000 },
  retries: 0,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
