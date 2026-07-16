import { expect, test } from "@playwright/test";

// End-to-end smoke test against the real dev stack (docker compose:
// frontend on :3000, backend + Postgres behind it on :8000). Covers the
// path that unit/integration tests can't: actually clicking through the
// signup/login forms, the dashboard dialogs, the resizable IDE panels, the
// file tree, and Monaco — verifying save-then-reload really round-trips
// through the backend, not just that the right fetch calls were made.
test.describe.configure({ mode: "serial" });

const runId = Date.now();
const email = `pw-smoke-${runId}@example.com`;
const password = "supersecret123";
const savedContent = `// Edited by Playwright at ${runId}`;

// This environment's dev server (Next.js in Docker, proxied from a Windows
// host) has multi-second baseline latency on ordinary requests even when
// every route is already compiled and warm (observed: plain `GET /` taking
// 3-6s) — it is not just first-compile cold-start. A short (~5s) timeout on
// the post-submit navigation check was too tight and looked like a click
// that "didn't register," which led to a retry helper that blindly
// re-submitted the form. For signup that is actively wrong: if the first
// submission actually succeeded server-side and only the client-side
// redirect was slow, resubmitting hits the backend's duplicate-email 409
// and leaves the test stuck on a page that will never navigate. The fix is
// a single generous wait instead of a resubmitting retry.
const NAV_TIMEOUT = 20_000;

// Clicking a form's submit button before React has finished hydrating
// attaches no onClick/onSubmit handler yet, so the click falls through to
// the browser's native GET form submission — confirmed as a real,
// reproducible bug in this project (it corrupted the Next.js dev server's
// chunk serving, `MODULE_NOT_FOUND` for `_not-found/page.js`, until the
// container was restarted). `HydrationMarker` (src/components/HydrationMarker.tsx)
// stamps `<html data-hydrated="true">` from a useEffect once mounted — wait
// on that deterministic signal rather than guessing a fixed settle time.
async function waitForHydration(page: import("@playwright/test").Page) {
  await page.locator("html[data-hydrated='true']").waitFor({ timeout: 15_000 });
}

test("login → create project → open file → edit → save → reload → content persisted", async ({
  page,
}) => {
  // --- Signup (also verifies the signup form itself) ---
  await page.goto("/signup");
  await waitForHydration(page);
  await page.locator("#name").fill("Playwright Smoke");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: NAV_TIMEOUT });

  // --- Log out, then log back in through the real login form ---
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: NAV_TIMEOUT });

  await waitForHydration(page);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: NAV_TIMEOUT });

  // --- Create a workspace ---
  await page.getByRole("button", { name: "New workspace" }).click();
  await page.locator("#workspace-name").fill(`Smoke Workspace ${runId}`);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByText(`Smoke Workspace ${runId}`)).toBeVisible();

  // --- Create a project from the (default-selected) blank template ---
  await page.getByRole("button", { name: "New project" }).click();
  await page.locator("#project-name").fill(`Smoke Project ${runId}`);
  await page.getByRole("button", { name: "Create project" }).click();

  const projectCard = page.getByText(`Smoke Project ${runId}`);
  await expect(projectCard).toBeVisible();

  // --- Open the project's IDE ---
  // Clicking a project card is a plain navigation (idempotent — clicking it
  // twice just lands on the same URL), so a click retry here is safe in a
  // way resubmitting the signup/login forms above is not.
  await projectCard.click();
  try {
    await expect(page).toHaveURL(/\/workspace\/[0-9a-f-]+$/, {
      timeout: NAV_TIMEOUT,
    });
  } catch {
    if (!/\/workspace\/[0-9a-f-]+$/.test(page.url())) {
      await projectCard.click();
      await expect(page).toHaveURL(/\/workspace\/[0-9a-f-]+$/, {
        timeout: NAV_TIMEOUT,
      });
    }
  }
  await expect(
    page.getByText(`Smoke Project ${runId}`, { exact: true }),
  ).toBeVisible();

  // The blank template's only file: README.md.
  const readme = page.getByText("README.md", { exact: true });
  await expect(readme).toBeVisible({ timeout: 10_000 });

  // --- Ctrl+B toggles the sidebar (verifies the keyboard shortcut for real) ---
  await expect(readme).toBeVisible();
  await page.keyboard.press("Control+b");
  await expect(readme).toBeHidden();
  await page.keyboard.press("Control+b");
  await expect(readme).toBeVisible();
  // Let the resizable-panel collapse/expand transition fully settle before
  // Monaco ever measures its container — otherwise it can initialize against
  // a mid-transition size and its internal "hidden" measurement pass never
  // gets corrected by a later automaticLayout tick within our timeout.
  await page.waitForTimeout(500);

  // --- Open the file, edit it, save it ---
  await readme.click();
  await expect(page.getByText("No files open")).not.toBeVisible();

  const editor = page.locator(".monaco-editor").first();
  await expect(editor).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".monaco-editor .view-lines")).toBeVisible({
    timeout: 10_000,
  });

  await editor.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type(savedContent);

  const saveResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/files/content") && res.request().method() === "PUT",
  );
  await page.keyboard.press("Control+s");
  const response = await saveResponse;
  expect(response.status()).toBe(200);

  // --- Reload and confirm the saved content round-tripped through the backend ---
  // A hard reload re-triggers the whole chain (fetch project -> restore tab
  // layout -> fetch file content -> mount Monaco) sequentially, plus this
  // environment's several-seconds-per-request dev-server latency —
  // comfortably slower than the 10s used for the first (already-warm)
  // editor mount earlier in this test.
  await page.reload();
  await expect(page.locator(".monaco-editor .view-lines")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator(".monaco-editor .view-lines")).toContainText(
    savedContent,
    { timeout: 15_000 },
  );
});
