import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cible } from '../../lib/cible';
import { ouvrirAssistant } from '../../lib/assistant';

// Art. 50 §5 : l'information est claire, distincte, donnée au plus tard
// à la première interaction, et conforme aux exigences d'accessibilité.

test('ART50-5 · la mention est à l\'écran dès le chargement, sans défilement', async ({ page }) => {
  await ouvrirAssistant(page);
  await expect(page.locator(cible.mention)).toBeInViewport({ ratio: 1 });
});

test('ART50-5 · la mention est distincte : hors du pied de page et de taille lisible', async ({ page }) => {
  await ouvrirAssistant(page);
  const mention = page.locator(cible.mention);
  await expect(mention).toBeVisible();

  const mesure = await mention.evaluate((el) => ({
    taille: parseFloat(getComputedStyle(el).fontSize),
    dansLePied: !!el.closest('footer'),
    dansUnLien: !!el.closest('a'),
  }));
  expect(mesure.dansLePied, 'la mention est reléguée dans le pied de page').toBe(false);
  expect(mesure.dansUnLien, 'la mention est cachée derrière un lien').toBe(false);
  expect(mesure.taille, 'la mention est écrite trop petit').toBeGreaterThanOrEqual(14);
});

test('ART50-5 · la mention est annoncée aux lecteurs d\'écran', async ({ page }) => {
  await ouvrirAssistant(page);
  const annonce = page.getByRole('status').filter({ hasText: /\bIA\b|intelligence artificielle/i });
  await expect(annonce).toBeVisible();
});

test('ART50-5 · la mention respecte le contraste minimal', async ({ page }) => {
  await ouvrirAssistant(page);
  // Sans cette vérification, une mention absente passerait le contrôle de contraste.
  await expect(page.locator(cible.mention)).toBeVisible();
  const resultat = await new AxeBuilder({ page }).include(cible.mention).withRules(['color-contrast']).analyze();
  expect(resultat.violations.map((v) => v.help)).toEqual([]);
});
