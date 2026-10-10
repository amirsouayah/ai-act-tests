import { test, expect } from '@playwright/test';
import { cible } from '../../lib/cible';

// Art. 50 §4 : un texte généré par IA et publié pour informer le public est signalé,
// sauf relecture humaine avec responsabilité éditoriale.

test('ART50-4 · un texte généré publié porte un label visible', async ({ page }) => {
  await page.goto(cible.cheminArticle);
  const label = page.locator(cible.labelArticle);
  await expect(label).toBeVisible();
  await expect(label).toContainText(/g[ée]n[ée]r[ée] par (une )?IA|AI[- ]generated/i);
});

test('ART50-4 · le label est visible sans faire défiler la page', async ({ page }) => {
  await page.goto(cible.cheminArticle);
  await expect(page.locator(cible.labelArticle)).toBeInViewport();
});
