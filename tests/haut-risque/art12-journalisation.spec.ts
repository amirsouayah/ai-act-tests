import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { cible } from '../../lib/cible';

// Art. 12 : un système à haut risque enregistre automatiquement les événements pendant son fonctionnement.
// Illustration sur la démo. Applicable aux systèmes de l'annexe III le 2 décembre 2027.

test('ART12 · chaque réponse de l\'IA produit une entrée de journal complète', async ({ request }) => {
  const sessionId = randomUUID();
  const question = 'Comment bloquer ma carte ?';
  const reponse = await (await request.post(cible.api.chat, { data: { message: question, sessionId, lang: 'fr' } })).json();

  const journal = await (await request.get(`${cible.api.journal}?sessionId=${sessionId}`)).json();
  expect(journal.entries, 'aucune entrée de journal pour cette réponse').toHaveLength(1);

  const entree = journal.entries[0];
  expect(entree.input).toBe(question);
  expect(entree.output).toBe(reponse.reply);
  expect(entree.model_version, 'version du modèle absente').toBeTruthy();
  expect(Number.isNaN(Date.parse(entree.at)), 'horodatage illisible').toBe(false);
});

test('ART12 · le journal conserve l\'ordre des échanges', async ({ request }) => {
  const sessionId = randomUUID();
  const questions = ['Quels sont vos horaires ?', 'Comment bloquer ma carte ?', 'Es-tu un humain ?'];
  for (const message of questions) {
    await request.post(cible.api.chat, { data: { message, sessionId, lang: 'fr' } });
  }
  const journal = await (await request.get(`${cible.api.journal}?sessionId=${sessionId}`)).json();
  expect(journal.entries.map((e: { input: string }) => e.input)).toEqual(questions);

  const dates = journal.entries.map((e: { at: string }) => Date.parse(e.at));
  expect([...dates].sort((a, b) => a - b)).toEqual(dates);
});
