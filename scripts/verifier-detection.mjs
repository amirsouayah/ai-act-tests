// Vérifie que les tests détectent bien les défauts.
// On lance la suite sur la variante non conforme de la démo : chaque exigence listée doit passer en échec.
// Une suite qui reste verte sur une application défectueuse ne prouve rien.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ATTENDUS = ['ART50-1', 'ART50-2', 'ART50-4', 'ART50-5', 'ART12', 'ART14'];
const DOSSIER = path.join('reports', 'non-conforme');

const env = { ...process.env, DEMO_VARIANT: 'non-conforme', RAPPORT_DIR: DOSSIER, PW_SUFFIXE: '-non-conforme' };
delete env.BASE_URL;

console.log('Lancement de la suite sur la variante non conforme. Des tests rouges sont attendus.\n');
spawnSync(process.execPath, [path.join('node_modules', '@playwright', 'test', 'cli.js'), 'test'], { stdio: 'inherit', env });

const rapport = JSON.parse(readFileSync(path.join(DOSSIER, 'conformite.json'), 'utf8'));
const statuts = Object.fromEntries(rapport.exigences.map((e) => [e.id, e.statut]));

console.log('\nDétection des défauts injectés :');
let manques = 0;
for (const id of ATTENDUS) {
  const detecte = statuts[id] === 'echec';
  if (!detecte) manques++;
  console.log(`  ${detecte ? 'détecté    ' : 'NON DÉTECTÉ'}  ${id}`);
}
if (rapport.outillage.echoues > 0) {
  console.error(`\n${rapport.outillage.echoues} test(s) du juge en échec : l'outillage lui-même est cassé.`);
  process.exit(1);
}
if (manques > 0) {
  console.error(`\n${manques} défaut(s) non détecté(s) : la suite laisse passer une application non conforme.`);
  process.exit(1);
}
console.log(`\nLes ${ATTENDUS.length} défauts injectés sont détectés. Rapport : ${path.join(DOSSIER, 'conformite.html')}`);
console.log('Rapport Playwright détaillé de cette exécution : npm run rapport:non-conforme');
