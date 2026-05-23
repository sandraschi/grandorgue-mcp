import { test, expect } from "@playwright/test";

const BASE = "http://localhost:11011";

test("dashboard loads", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.locator("text=Dashboard")).toBeVisible();
  await expect(page.locator("text=GrandOrgue Console")).toBeVisible();
});

test("sidebar navigation works", async ({ page }) => {
  await page.goto(BASE);
  await page.click("text=Console");
  await expect(page.locator("text=Tutti")).toBeVisible();

  await page.click("text=Library");
  await expect(page.locator("text=Organ Library")).toBeVisible();

  await page.click("text=Marketplace");
  await expect(page.locator("text=Available Sample Sets")).toBeVisible();

  await page.click("text=Memory");
  await expect(page.locator("text=Combination Memory")).toBeVisible();

  await page.click("text=Record");
  await expect(page.locator("text=MIDI Recorder")).toBeVisible();

  await page.click("text=Mixer");
  await expect(page.locator("text=Audio Mixer")).toBeVisible();
});

test("dashboard shows MIDI and GO status", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.locator("text=MIDI")).toBeVisible();
  await expect(page.locator("text=GO")).toBeVisible();
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
