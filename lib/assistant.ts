import { expect, type Page } from '@playwright/test';
import { cible, type Langue } from './cible';

export async function ouvrirAssistant(page: Page, langue?: Langue): Promise<void> {
  await page.goto(langue ? `${cible.cheminAssistant}?lang=${langue}` : cible.cheminAssistant);
  await expect(page.locator(cible.champ)).toBeVisible();
}

/** Envoie un message et renvoie le texte de la réponse de l'assistant. */
export async function envoyer(page: Page, message: string): Promise<string> {
  const reponses = page.locator(cible.texteReponse);
  const avant = await reponses.count();
  await page.locator(cible.champ).fill(message);
  await page.locator(cible.envoyer).click();
  await expect(reponses).toHaveCount(avant + 1);
  return (await reponses.last().innerText()).trim();
}
