/**
 * Registre des exigences suivies par ce dépôt.
 * Chaque test commence par l'identifiant d'une exigence (« ART50-1 · … »),
 * ce qui permet au rapport de regrouper les résultats par article.
 *
 * Les intitulés sont des résumés de travail. Le texte publié au Journal officiel fait foi.
 */
export type Exigence = {
  id: string;
  article: string;
  titre: string;
  role: string;
  /** Date d'application, après le règlement (UE) 2026/1744. */
  applicableLe: string;
  famille: 'Transparence' | 'Haut risque';
  /** Renseigné quand l'exigence ne concerne pas l'application testée. */
  horsPerimetre?: string;
  /** Renseigné quand le test illustre une famille d'exigences sans prétendre la couvrir. */
  note?: string;
};

export const EXIGENCES: Exigence[] = [
  {
    id: 'ART50-1',
    article: 'Art. 50 §1',
    titre: "Informer la personne qu'elle échange avec une IA",
    role: 'Fournisseur',
    applicableLe: '2026-08-02',
    famille: 'Transparence',
  },
  {
    id: 'ART50-2',
    article: 'Art. 50 §2',
    titre: 'Marquer les contenus générés dans un format lisible par machine',
    role: 'Fournisseur',
    applicableLe: '2026-08-02',
    famille: 'Transparence',
    note: "Les systèmes déjà sur le marché avant le 2 août 2026 ont jusqu'au 2 décembre 2026. La démo marque ses sorties avec le vocabulaire IPTC « digital source type ». Un produit réel s'appuie sur les solutions retenues par le code de bonnes pratiques (métadonnées signées, tatouage numérique).",
  },
  {
    id: 'ART50-3',
    article: 'Art. 50 §3',
    titre: "Informer les personnes exposées à la reconnaissance d'émotions ou à la catégorisation biométrique",
    role: 'Déployeur',
    applicableLe: '2026-08-02',
    famille: 'Transparence',
    horsPerimetre: "L'application testée n'utilise ni reconnaissance d'émotions ni catégorisation biométrique.",
  },
  {
    id: 'ART50-4',
    article: 'Art. 50 §4',
    titre: 'Signaler les deepfakes et les textes générés publiés pour informer le public',
    role: 'Déployeur',
    applicableLe: '2026-08-02',
    famille: 'Transparence',
  },
  {
    id: 'ART50-5',
    article: 'Art. 50 §5',
    titre: 'Information claire, distincte, donnée au plus tard à la première interaction, et accessible',
    role: 'Fournisseur et déployeur',
    applicableLe: '2026-08-02',
    famille: 'Transparence',
  },
  {
    id: 'ART12',
    article: 'Art. 12',
    titre: 'Enregistrer automatiquement les événements',
    role: 'Fournisseur',
    applicableLe: '2027-12-02',
    famille: 'Haut risque',
    note: "Illustration : un assistant d'accueil n'est pas un système à haut risque. Le test montre la forme que prend la vérification.",
  },
  {
    id: 'ART14',
    article: 'Art. 14',
    titre: 'Permettre à une personne de reprendre la main',
    role: 'Fournisseur',
    applicableLe: '2027-12-02',
    famille: 'Haut risque',
    note: "Illustration : un assistant d'accueil n'est pas un système à haut risque. Le test montre la forme que prend la vérification.",
  },
];
