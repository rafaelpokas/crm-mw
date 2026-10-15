import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm.cmd run dev -- --host 127.0.0.1",
    env: {DISABLE_HMR: "true"},
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
