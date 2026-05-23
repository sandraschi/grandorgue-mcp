import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:11011",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "uv run grandorgue-mcp",
      port: 11010,
      cwd: "../",
      timeout: 30000,
      reuseExistingServer: true,
    },
    {
      command: "npm run dev",
      port: 11011,
      cwd: ".",
      timeout: 30000,
      reuseExistingServer: true,
    },
  ],
});
