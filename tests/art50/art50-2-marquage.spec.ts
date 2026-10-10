import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { cible } from '../../lib/cible';
import { envoyer, ouvrirAssistant } from '../../lib/assistant';

// Art. 50 §2 : les contenus générés portent un marquage lisible par machine.
// Applicable depuis le 2 août 2026 ; les systèmes déjà sur le marché à cette date ont jusqu'au 2 décembre 2026.

const SOURCE_GENEREE = /trainedAlgorithmicMedia/;

test('ART50-2 · chaque réponse de l\'API porte un marquage lisible par machine', async ({ request }) => {
  const reponse = await request.post(cible.api.chat, { data: { message: 'Quels sont vos horaires ?', sessionId: randomUUID(), lang: 'fr' } });
  expect(reponse.ok()).toBe(true);
  const corps = await reponse.json();
  expect(corps.ai_generated, 'champ ai_generated absent de la réponse').toBe(true);
  expect(corps.provenance?.digital_source_type ?? '', 'provenance absente de la réponse').toMatch(SOURCE_GENEREE);
  expect(reponse.headers()['x-ai-generated'], 'en-tête x-ai-generated absent').toBe('true');
});

test('ART50-2 · le marquage survit à l\'export de la conversation', async ({ request }) => {
  const sessionId = randomUUID();
  await request.post(cible.api.chat, { data: { message: 'Comment bloquer ma carte ?', sessionId, lang: 'fr' } });
  await request.post(cible.api.chat, { data: { message: 'Et vos horaires ?', sessionId, lang: 'fr' } });

  const exportation = await (await request.get(`${cible.api.export}?sessionId=${sessionId}`)).json();
  const reponsesIa = exportation.messages.filter((m: { role: string }) => m.role === 'assistant');
  expect(reponsesIa).toHaveLength(2);
  for (const message of reponsesIa) {
    expect(message.ai_generated, `message exporté sans marquage : « ${message.text} »`).toBe(true);
    expect(message.provenance?.digital_source_type ?? '').toMatch(SOURCE_GENEREE);
  }
});

test('ART50-2 · le marquage est présent dans la page', async ({ page }) => {
  await ouvrirAssistant(page);
  await envoyer(page, 'Quels sont vos horaires ?');
  const message = page.locator(cible.messageAssistant).last();
  await expect(message).toHaveAttribute('data-ai-generated', 'true');
  await expect(message).toHaveAttribute('data-digital-source-type', SOURCE_GENEREE);
});

test('ART50-2 · un texte généré publié porte le marquage', async ({ page }) => {
  await page.goto(cible.cheminArticle);
  await expect(page.getByTestId('article')).toHaveAttribute('data-ai-generated', 'true');
});
