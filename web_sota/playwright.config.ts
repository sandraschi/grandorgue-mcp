import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:11011",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      // Backend defaults to stdio transport; HTTP mode must be explicit.
      command: "uv run grandorgue-mcp",
      env: { MCP_TRANSPORT: "http" },
      port: 11010,
      cwd: "../",
      timeout: 120_000,
      reuseExistingServer: true,
    },
    {
      command: "bunx vite --port 11011 --strictPort",
      port: 11011,
      cwd: ".",
      timeout: 120_000,
      reuseExistingServer: true,
    },
  ],
});
