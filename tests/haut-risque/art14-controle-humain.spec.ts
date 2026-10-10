import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { cible } from '../../lib/cible';
import { envoyer, ouvrirAssistant } from '../../lib/assistant';

// Art. 14 : une personne peut reprendre la main sur le système et l'arrêter.
// Illustration sur la démo. Applicable aux systèmes de l'annexe III le 2 décembre 2027.

test('ART14 · après la reprise en main, l\'IA ne répond plus', async ({ request }) => {
  const sessionId = randomUUID();
  await request.post(cible.api.repriseHumaine, { data: { sessionId } });

  const reponse = await (await request.post(cible.api.chat, { data: { message: 'Es-tu un humain ?', sessionId, lang: 'fr' } })).json();
  expect(reponse.handled_by, 'l\'IA continue de répondre après la reprise en main').toBe('humain');
  expect(reponse.ai_generated).toBe(false);
});

test('ART14 · la reprise en main est accessible et visible dans l\'interface', async ({ page }) => {
  await ouvrirAssistant(page);
  await page.locator(cible.repriseHumaine).click();
  await expect(page.locator(cible.mode)).toContainText(/humain|human/i);

  await envoyer(page, 'Bonjour');
  await expect(page.locator(cible.messageAssistant).last()).not.toHaveAttribute('data-ai-generated', 'true');
});

test('ART14 · la reprise en main est tracée dans le journal', async ({ request }) => {
  const sessionId = randomUUID();
  await request.post(cible.api.repriseHumaine, { data: { sessionId } });
  const journal = await (await request.get(`${cible.api.journal}?sessionId=${sessionId}`)).json();
  expect(journal.entries.map((e: { event: string }) => e.event)).toContain('reprise_en_main_humaine');
});
