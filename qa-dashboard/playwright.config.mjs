import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.e2e.spec.mjs',
  timeout: 90000,
  retries: 0,
  use: {
    baseURL: process.env.FLOW4_BASE_URL || process.env.QA_BASE_URL || 'http://localhost:4200',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  outputDir: process.env.FLOW4_ARTIFACT_DIR || 'test-results/flow4',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/flow4-html', open: 'never' }],
    ['json', { outputFile: 'test-results/flow4-results.json' }],
    ['junit', { outputFile: 'test-results/flow4-junit.xml' }]
  ]
});
