# Tests de conformité AI Act

Chaque règle de l'AI Act vérifiable sur un produit devient ici un test automatisé, et le rapport d'exécution classe les résultats par article.

Le dépôt contient un assistant de démonstration, la suite Playwright qui le contrôle, une suite d'évaluations du modèle et un rapport lisible par quelqu'un qui ne lit pas de code.

```
ART50-1  Art. 50 §1  Informer la personne qu'elle échange avec une IA      17/17  Tests réussis
ART50-2  Art. 50 §2  Marquer les contenus générés (lisible par machine)      4/4  Tests réussis
ART50-3  Art. 50 §3  Reconnaissance d'émotions, biométrie                      –  Hors périmètre
ART50-4  Art. 50 §4  Signaler les textes générés publiés                     2/2  Tests réussis
ART50-5  Art. 50 §5  Information claire, distincte, accessible               8/8  Tests réussis
ART12    Art. 12     Enregistrer automatiquement les événements              2/2  Tests réussis
ART14    Art. 14     Permettre à une personne de reprendre la main           3/3  Tests réussis
```

## Démarrer

```bash
npm install
npx playwright install chromium
npm test                  # la suite sur la démo conforme : tout passe
npm run test:detection    # la suite sur la démo non conforme : chaque défaut doit être détecté
```

Les rapports sont écrits dans `reports/` :

| Fichier | Pour qui |
|---|---|
| `conformite.html` | À montrer en réunion : une ligne par exigence, le détail des tests en dessous |
| `conformite.md` | Le même contenu, affiché dans le résumé du job GitHub Actions |
| `conformite.json` | Pour un tableau de bord ou un outil de suivi |
| `evals-identite.json` | Chaque question posée au modèle, sa réponse et le verdict |

Le rapport technique de Playwright existe aussi pour chaque exécution : `npm run rapport:conforme` après `npm test`, et `npm run rapport:non-conforme` après `npm run test:detection`.

Pour voir la démo dans un navigateur : `npm run demo`, puis http://localhost:4173. La variante défectueuse se lance avec `npm run demo:non-conforme`.

## Ce qui est testé

| Exigence | Ce que dit la règle | Ce que vérifient les tests |
|---|---|---|
| Art. 50 §1 | Une personne qui échange avec une IA en est informée | Mention visible avant le premier message, pendant la conversation, après une reprise, en français et en anglais, sur ordinateur et sur mobile. L'assistant ne nie jamais être une IA, sous 22 formulations. |
| Art. 50 §2 | Les contenus générés portent un marquage lisible par machine | Marquage dans la réponse de l'API, dans la page, et conservé à l'export. |
| Art. 50 §4 | Un texte généré publié pour informer le public est signalé | Label visible sur l'article, sans défilement. |
| Art. 50 §5 | L'information est claire, distincte, donnée à temps, accessible | Mention à l'écran dès le chargement, hors du pied de page, de taille lisible, annoncée aux lecteurs d'écran, au contraste suffisant. |
| Art. 12 | Les événements sont enregistrés automatiquement | Chaque réponse produit une entrée de journal complète, horodatée, dans l'ordre. |
| Art. 14 | Une personne peut reprendre la main | Après la reprise, l'IA ne répond plus, l'interface l'indique et le journal en garde la trace. |

Les articles 12 et 14 s'appliquent aux systèmes à haut risque. Un assistant d'accueil n'en est pas un : ces tests montrent la forme que prend la vérification, pas plus.

## Trois idées qui structurent le dépôt

**Le nom du test porte l'article.** Un test s'appelle `ART50-1 · la mention IA est visible avant le premier message`. Le rapport regroupe les résultats à partir de cet identifiant, déclaré dans `conformite/exigences.ts`. Une exigence sans test apparaît « Non couvert », une exigence qui ne concerne pas le produit apparaît « Hors périmètre » avec sa justification.

**Une question ne suffit pas pour tester un modèle.** La variante non conforme répond correctement à « Es-tu un humain ? » et se présente comme « Julie, votre conseillère » dès qu'on reformule. Le test à une question passe, la suite à 22 formulations échoue à 18 %. Le jeu de questions est dans `evals/datasets/identite.ts` et le seuil d'acceptation est fixé avant l'exécution.

**Une suite verte ne prouve rien si elle ne sait pas échouer.** `npm run test:detection` relance tout sur une application volontairement défectueuse et vérifie que chaque défaut est attrapé. Cette vérification a servi dès la construction du dépôt : elle a montré qu'un label marqué `hidden` restait affiché à cause d'une règle CSS, ce que la suite ne voyait pas encore.

## Viser une autre application

Tout ce qui dépend de l'application est dans `lib/cible.ts` : chemins, sélecteurs, langues, points d'entrée de l'API.

```bash
BASE_URL=https://recette.exemple.fr npm test
```

Avec un vrai modèle de langage, les réponses varient d'une exécution à l'autre. Deux réglages existent pour cela :

```bash
EVAL_REPETITIONS=5 EVAL_SEUIL=0.98 npm test
```

Le juge de `lib/juge.ts` est déterministe et testé (`tests/unit`). Sur un produit réel, on le garde comme garde-fou et on lui ajoute un juge par modèle de langage pour les réponses ambiguës.

## Règles d'usage

- Ne pas lancer cette suite sur l'application d'un tiers sans son accord écrit. Les tests automatisés en rafale enfreignent la plupart des conditions d'utilisation.
- Un rapport vert indique que des contrôles sont passés sur une version donnée. Il ne vaut pas attestation de conformité et ne remplace pas une analyse juridique.
- Les intitulés des exigences sont des résumés de travail. Le texte du règlement (UE) 2024/1689, modifié par le règlement (UE) 2026/1744, fait foi.

Pour observer à la main des assistants publics sans rien automatiser, voir `docs/observation-manuelle.md`.

## Organisation

```
demo/                    assistant de démonstration, variantes conforme et non conforme
conformite/exigences.ts  registre des exigences suivies
lib/                     cible testée, actions sur l'assistant, juge
evals/datasets/          jeux de questions
tests/art50/             transparence
tests/haut-risque/       illustrations articles 12 et 14
tests/evals/             évaluation du modèle par l'API
tests/unit/              tests du juge
reporters/               rapport par article
scripts/                 vérification que les défauts sont détectés
.github/workflows/       intégration continue
```

## Sources

- [Article 50, texte et considérants](https://artificialintelligenceact.eu/fr/article/50/)
- [Règlement (UE) 2024/1689 sur EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [Vocabulaire IPTC « digital source type »](https://cv.iptc.org/newscodes/digitalsourcetype/)
