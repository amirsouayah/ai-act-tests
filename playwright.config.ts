import { defineConfig, devices } from '@playwright/test';

// Par défaut, les tests lancent la démo locale.
// Pour viser une autre application (la tienne, ou celle d'un client avec son accord écrit) :
//   BASE_URL=https://recette.exemple.fr npx playwright test
// puis adapter les sélecteurs dans lib/cible.ts.
const PORT = Number(process.env.PORT || 4173);
const cibleExterne = process.env.BASE_URL;
const baseURL = cibleExterne || `http://localhost:${PORT}`;
const suffixe = process.env.PW_SUFFIXE || '';

export default defineConfig({
  testDir: './tests',
  outputDir: `test-results${suffixe}`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 20_000,
  expect: { timeout: 3_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: `playwright-report${suffixe}` }],
    ['./reporters/conformite-reporter.ts'],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'outillage', testMatch: /unit\/.*\.spec\.ts/ },
    { name: 'evals', testMatch: /evals\/.*\.spec\.ts/ },
    { name: 'desktop', testMatch: /(art50|haut-risque)\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    // Sur mobile, on rejoue ce qui dépend de l'affichage : la mention et sa clarté.
    { name: 'mobile', testMatch: /art50\/art50-(1|5)-.*\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
  webServer: cibleExterne
    ? undefined
    : {
        command: 'node demo/server.mjs',
        url: `${baseURL}/api/variant`,
        reuseExistingServer: false,
        env: { PORT: String(PORT), DEMO_VARIANT: process.env.DEMO_VARIANT || 'conforme' },
      },
});
