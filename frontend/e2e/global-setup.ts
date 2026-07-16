import { request } from "@playwright/test";

// Next.js dev mode compiles each route on-demand on its first request in a
// given server process — that first compile can take several seconds, long
// enough to make the very first test look flaky even with a generous
// assertion timeout. Warming every route once here (fire-and-forget on the
// response, we only care that the route got requested) keeps the actual
// test's timings representative of a warm server, not a cold one.
export default async function globalSetup() {
  const ctx = await request.newContext({ baseURL: "http://localhost:3000" });
  const routes = [
    "/",
    "/login",
    "/signup",
    "/dashboard",
    "/workspace/00000000-0000-0000-0000-000000000000",
  ];
  for (const route of routes) {
    try {
      await ctx.get(route, { timeout: 20_000 });
    } catch {
      // Ignore — a 404/redirect/timeout here doesn't matter, the point is
      // just to trigger compilation, not to assert on the response.
    }
  }
  await ctx.dispose();
}
