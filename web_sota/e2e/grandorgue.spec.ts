import { expect, test } from "@playwright/test";

const BASE = "http://localhost:11011";

test("dashboard loads", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.getByTestId("dashboard")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByTestId("topbar")).toContainText("GrandOrgue Console");
});

test("sidebar navigation works", async ({ page }) => {
  await page.goto(BASE);
  // The sidebar is icon-only (title attribute, no text), so navigate by href.
  const nav = (path: string) => page.locator(`aside a[href="${path}"]`).click();

  await nav("/console");
  await expect(page.getByTestId("console-page")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tutti", exact: true })).toBeVisible();

  await nav("/library");
  await expect(page.getByRole("heading", { name: "Organ Library" })).toBeVisible();

  await nav("/marketplace");
  await expect(page.getByText("Available Sample Sets")).toBeVisible();

  await nav("/combinations");
  await expect(page.getByRole("heading", { name: "Combination Memory" })).toBeVisible();

  await nav("/record");
  await expect(page.getByRole("heading", { name: "MIDI Recorder" })).toBeVisible();

  await nav("/mixer");
  await expect(page.getByRole("heading", { name: "Audio Mixer" })).toBeVisible();
});

test("dashboard shows MIDI and GO status", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.getByTestId("kpi-midi-bridge")).toBeVisible();
  await expect(page.getByTestId("kpi-grandorgue")).toBeVisible();
});

test("command palette opens with Ctrl+K and navigates", async ({ page }) => {
  await page.goto(BASE);
  // Key listeners attach after React mounts: wait for the app shell first.
  await expect(page.getByTestId("topbar")).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await page.keyboard.type("mixer");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/mixer$/);
  await expect(dialog).toBeHidden();
});

test("command palette closes on Escape", async ({ page }) => {
  await page.goto(BASE);
  await page.getByTestId("open-palette").click();
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("sidebar collapses and the choice persists", async ({ page }) => {
  await page.goto(BASE);
  const sidebar = page.getByTestId("sidebar");
  await expect(sidebar).toHaveAttribute("data-collapsed", "false");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(sidebar).toHaveAttribute("data-collapsed", "true");
  await page.reload();
  await expect(page.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "true");
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(page.getByTestId("sidebar")).toHaveAttribute("data-collapsed", "false");
});

test("topbar has an always-visible panic button", async ({ page }) => {
  await page.goto(BASE);
  await page.getByTestId("sidebar").locator('a[href="/mixer"]').click();
  await expect(page.getByTestId("panic-button")).toBeVisible();
});

test("health check via API", async ({ request }) => {
  const r = await request.get("http://localhost:11010/health");
  expect(r.status()).toBe(200);
  const data = await r.json();
  expect(data.service).toBe("grandorgue-mcp");
});

test("REST: GET /api/status returns JSON", async ({ request }) => {
  const r = await request.get("http://localhost:11010/api/status");
  expect(r.status()).toBe(200);
  const data = await r.json();
  expect(data).toHaveProperty("go_running");
  expect(data).toHaveProperty("midi_connected");
});

test("REST: GET /api/marketplace/search returns results", async ({ request }) => {
  const r = await request.get("http://localhost:11010/api/marketplace/search?q=baroque");
  expect(r.status()).toBe(200);
  const data = await r.json();
  expect(data.success).toBe(true);
  expect(Array.isArray(data.results)).toBe(true);
});

test("REST: GET /api/bach/catalog returns works", async ({ request }) => {
  const r = await request.get("http://localhost:11010/api/bach/catalog");
  expect(r.status()).toBe(200);
  const data = await r.json();
  expect(data.success).toBe(true);
  expect(data.works.length).toBeGreaterThan(0);
});
