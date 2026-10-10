import type { FullConfig, Reporter, Suite } from '@playwright/test/reporter';
import fs from 'node:fs';
import path from 'node:path';
import { EXIGENCES, type Exigence } from '../conformite/exigences';

/**
 * Regroupe les résultats Playwright par exigence de l'AI Act.
 * Produit reports/conformite.json, conformite.md et conformite.html.
 *
 * Un test réussi prouve qu'un contrôle est passé. Il ne vaut pas attestation de conformité.
 */

type Statut = 'reussi' | 'echec' | 'non-couvert' | 'hors-perimetre';

type TestRapporte = {
  titre: string;
  projet: string;
  resultat: 'reussi' | 'echec' | 'instable';
  erreur?: string;
  metriques: string[];
};

type LigneRapport = Exigence & { statut: Statut; reussis: number; echoues: number; tests: TestRapporte[] };

const LIBELLE: Record<Statut, string> = {
  reussi: 'Tests réussis',
  echec: 'Échec',
  'non-couvert': 'Non couvert',
  'hors-perimetre': 'Hors périmètre',
};

const sansCouleurs = (texte: string) => texte.replace(/\u001b\[[0-9;]*m/g, '');
/** Garde le message utile : sans codes couleur, sans le journal d'appels de Playwright. */
function extrait(message: string): string {
  const lignes = sansCouleurs(message).split('\n');
  const fin = lignes.findIndex((l) => l.trim().startsWith('Call log'));
  return (fin === -1 ? lignes : lignes.slice(0, fin)).slice(0, 30).join('\n').trim();
}
const html = (texte: string) => texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dateFr = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

class ConformiteReporter implements Reporter {
  private racine!: Suite;
  private cible = '';
  private dossier: string;

  constructor(options: { dossier?: string } = {}) {
    this.dossier = options.dossier || process.env.RAPPORT_DIR || 'reports';
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.racine = suite;
    this.cible = String(config.projects[0]?.use?.baseURL ?? '');
  }

  printsToStdio() {
    return false;
  }

  onEnd() {
    const parExigence = new Map<string, TestRapporte[]>();
    const outillage: TestRapporte[] = [];

    for (const test of this.racine.allTests()) {
      const issue = test.outcome();
      if (issue === 'skipped') continue;
      const dernier = test.results[test.results.length - 1];
      const annotations = [...test.annotations, ...(dernier?.annotations ?? [])];
      const rapporte: TestRapporte = {
        titre: test.title,
        projet: test.parent.project()?.name ?? '',
        resultat: issue === 'expected' ? 'reussi' : issue === 'flaky' ? 'instable' : 'echec',
        erreur: issue === 'unexpected' ? extrait(dernier?.error?.message ?? '') : undefined,
        metriques: [...new Set(annotations.filter((a) => a.type === 'metrique' && a.description).map((a) => a.description as string))],
      };
      const id = /^(ART\d+(?:-\d+)?)\b/.exec(test.title)?.[1];
      if (!id) { outillage.push(rapporte); continue; }
      if (!parExigence.has(id)) parExigence.set(id, []);
      parExigence.get(id)!.push(rapporte);
    }

    const lignes: LigneRapport[] = EXIGENCES.map((exigence) => {
      const tests = parExigence.get(exigence.id) ?? [];
      const echoues = tests.filter((t) => t.resultat === 'echec').length;
      const reussis = tests.length - echoues;
      let statut: Statut = 'reussi';
      if (exigence.horsPerimetre) statut = 'hors-perimetre';
      else if (tests.length === 0) statut = 'non-couvert';
      else if (echoues > 0) statut = 'echec';
      return { ...exigence, statut, reussis, echoues, tests };
    });

    const inconnus = [...parExigence.keys()].filter((id) => !EXIGENCES.some((e) => e.id === id));
    const rapport = {
      genere_le: new Date().toISOString(),
      cible: this.cible,
      variante: process.env.BASE_URL ? 'cible externe' : process.env.DEMO_VARIANT || 'conforme',
      synthese: {
        exigences: lignes.length,
        reussies: lignes.filter((l) => l.statut === 'reussi').length,
        en_echec: lignes.filter((l) => l.statut === 'echec').length,
        non_couvertes: lignes.filter((l) => l.statut === 'non-couvert').length,
        hors_perimetre: lignes.filter((l) => l.statut === 'hors-perimetre').length,
        tests: lignes.reduce((n, l) => n + l.tests.length, 0),
      },
      exigences: lignes,
      outillage: { tests: outillage.length, echoues: outillage.filter((t) => t.resultat === 'echec').length },
      identifiants_inconnus: inconnus,
    };

    fs.mkdirSync(this.dossier, { recursive: true });
    fs.writeFileSync(path.join(this.dossier, 'conformite.json'), JSON.stringify(rapport, null, 2));
    fs.writeFileSync(path.join(this.dossier, 'conformite.md'), this.markdown(rapport));
    fs.writeFileSync(path.join(this.dossier, 'conformite.html'), this.pageHtml(rapport));

    const s = rapport.synthese;
    console.log(`\nRapport AI Act : ${s.reussies} exigence(s) avec tests réussis, ${s.en_echec} en échec, ${s.non_couvertes} non couverte(s), ${s.hors_perimetre} hors périmètre.`);
    console.log(`Détail : ${path.join(this.dossier, 'conformite.md')} et ${path.join(this.dossier, 'conformite.html')}`);
  }

  private markdown(rapport: any): string {
    const lignes: LigneRapport[] = rapport.exigences;
    const s = rapport.synthese;
    const out: string[] = [];
    out.push('# Rapport de tests AI Act', '');
    out.push(`Cible : \`${rapport.cible}\` (${rapport.variante}) · généré le ${new Date(rapport.genere_le).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`, '');
    out.push(`**${s.reussies}** exigence(s) avec tests réussis · **${s.en_echec}** en échec · **${s.non_couvertes}** non couverte(s) · **${s.hors_perimetre}** hors périmètre · ${s.tests} tests`, '');
    out.push('| Exigence | Article | Ce que dit la règle | Qui | Applicable le | Tests | Statut |');
    out.push('|---|---|---|---|---|---|---|');
    for (const l of lignes) {
      const tests = l.tests.length ? `${l.reussis}/${l.tests.length}` : '–';
      out.push(`| ${l.id} | ${l.article} | ${l.titre} | ${l.role} | ${dateFr(l.applicableLe)} | ${tests} | ${LIBELLE[l.statut]} |`);
    }
    out.push('');

    const enEchec = lignes.filter((l) => l.statut === 'echec');
    if (enEchec.length) {
      out.push('## Échecs', '');
      for (const l of enEchec) {
        out.push(`### ${l.id} · ${l.article}`, '');
        for (const t of l.tests.filter((x) => x.resultat === 'echec')) {
          out.push(`- **${t.titre}** (${t.projet})`);
          if (t.erreur) out.push('', '  ```', ...t.erreur.split('\n').map((x) => '  ' + x), '  ```', '');
        }
        out.push('');
      }
    }

    const mesures = lignes.flatMap((l) => l.tests.flatMap((t) => t.metriques.map((m) => `- ${l.id} : ${m}`)));
    if (mesures.length) out.push('## Mesures', '', ...mesures, '');

    const notes = lignes.filter((l) => l.horsPerimetre || l.note);
    if (notes.length) {
      out.push('## Périmètre et limites', '');
      for (const l of notes) out.push(`- **${l.id}** : ${l.horsPerimetre ?? l.note}`);
      out.push('');
    }
    if (rapport.identifiants_inconnus.length) out.push(`Identifiants sans exigence déclarée : ${rapport.identifiants_inconnus.join(', ')}`, '');
    out.push(`Outillage : ${rapport.outillage.tests - rapport.outillage.echoues}/${rapport.outillage.tests} tests du juge réussis.`, '');
    out.push('_Un test réussi montre qu\'un contrôle est passé sur cette version. Ce rapport ne vaut pas attestation de conformité et ne remplace pas une analyse juridique._', '');
    return out.join('\n');
  }

  private pageHtml(rapport: any): string {
    const lignes: LigneRapport[] = rapport.exigences;
    const s = rapport.synthese;
    const rangs = lignes.map((l) => {
      const tests = l.tests.length ? `${l.reussis}/${l.tests.length}` : '–';
      const details = l.tests.map((t) => `<li class="${t.resultat}"><span>${html(t.titre)}</span> <em>${html(t.projet)}</em>${t.metriques.map((m) => `<small>${html(m)}</small>`).join('')}${t.erreur ? `<pre>${html(t.erreur)}</pre>` : ''}</li>`).join('');
      const note = l.horsPerimetre ?? l.note;
      return `<tr class="${l.statut}"><td><code>${l.id}</code></td><td>${l.article}</td><td>${html(l.titre)}${note ? `<p class="note">${html(note)}</p>` : ''}${details ? `<details${l.statut === 'echec' ? ' open' : ''}><summary>${l.tests.length} test(s)</summary><ul>${details}</ul></details>` : ''}</td><td>${html(l.role)}</td><td>${dateFr(l.applicableLe)}</td><td class="num">${tests}</td><td><span class="pastille">${LIBELLE[l.statut]}</span></td></tr>`;
    }).join('\n');

    return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport de tests AI Act</title>
<style>
:root{--bg:#eef1f8;--surface:#fff;--ink:#0e1830;--muted:#56617a;--line:#d3d9e8;--ok:#12794a;--okbg:#ddf3e7;--ko:#b3261e;--kobg:#fbe3e1;--na:#56617a;--nabg:#e6e9f2}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,"Segoe UI",Helvetica,Arial,sans-serif}
main{max-width:1100px;margin:0 auto;padding:32px 20px 56px}
h1{font-size:28px;margin:0 0 4px}.meta{color:var(--muted);margin:0 0 20px}
.synthese{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}
.synthese span{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:8px 12px}
.synthese b{font-variant-numeric:tabular-nums}
.tableau{overflow-x:auto;background:var(--surface);border:1px solid var(--line);border-radius:10px}
table{border-collapse:collapse;width:100%;min-width:760px}
th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid var(--line)}
th{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
tr:last-child td{border-bottom:0}.num{font-variant-numeric:tabular-nums;white-space:nowrap}
code{font:13px ui-monospace,Menlo,Consolas,monospace}
.pastille{display:inline-block;padding:2px 9px;border-radius:4px;font-size:13px;font-weight:600;white-space:nowrap;background:var(--nabg);color:var(--na)}
tr.reussi .pastille{background:var(--okbg);color:var(--ok)}tr.echec .pastille{background:var(--kobg);color:var(--ko)}
.note{margin:4px 0 0;color:var(--muted);font-size:13px}
details{margin-top:6px}summary{cursor:pointer;color:var(--muted);font-size:13px}
ul{margin:6px 0 0;padding-left:18px}li{margin-bottom:4px}li.echec span{color:var(--ko);font-weight:600}
li em{color:var(--muted);font-size:12px}li small{display:block;color:var(--muted)}
pre{margin:4px 0 8px;padding:10px;background:#0e1830;color:#e6eaf5;border-radius:6px;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
footer{margin-top:20px;color:var(--muted);font-size:13px}
</style></head>
<body><main>
<h1>Rapport de tests AI Act</h1>
<p class="meta">Cible : <code>${html(rapport.cible)}</code> (${html(rapport.variante)}) · généré le ${new Date(rapport.genere_le).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
<div class="synthese"><span><b>${s.reussies}</b> exigence(s) avec tests réussis</span><span><b>${s.en_echec}</b> en échec</span><span><b>${s.non_couvertes}</b> non couverte(s)</span><span><b>${s.hors_perimetre}</b> hors périmètre</span><span><b>${s.tests}</b> tests</span></div>
<div class="tableau"><table>
<thead><tr><th>Exigence</th><th>Article</th><th>Ce que dit la règle</th><th>Qui</th><th>Applicable le</th><th>Tests</th><th>Statut</th></tr></thead>
<tbody>
${rangs}
</tbody></table></div>
<footer>Outillage : ${rapport.outillage.tests - rapport.outillage.echoues}/${rapport.outillage.tests} tests du juge réussis. Un test réussi montre qu'un contrôle est passé sur cette version. Ce rapport ne vaut pas attestation de conformité et ne remplace pas une analyse juridique.</footer>
</main></body></html>`;
  }
}

export default ConformiteReporter;
