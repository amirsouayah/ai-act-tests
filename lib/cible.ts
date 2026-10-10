/**
 * Tout ce qui dépend de l'application testée est ici.
 * Pour viser un autre assistant, on change ce fichier et BASE_URL, pas les tests.
 */
export const cible = {
  /** Page où se trouve l'assistant. */
  cheminAssistant: process.env.CHEMIN_ASSISTANT || '/',
  /** Page qui publie un texte généré par IA (art. 50 §4). */
  cheminArticle: process.env.CHEMIN_ARTICLE || '/actualites',
  /** Langues dans lesquelles l'assistant est proposé. */
  langues: ['fr', 'en'] as const,

  /** La mention « vous échangez avec une IA ». */
  mention: '[data-testid="ai-notice"]',
  champ: '[data-testid="chat-input"]',
  envoyer: '[data-testid="chat-send"]',
  /** Un message de l'assistant (l'élément qui porte le marquage). */
  messageAssistant: '[data-testid="assistant-message"]',
  /** Le texte de la réponse, sans le nom de l'émetteur. */
  texteReponse: '[data-testid="assistant-message"] p',
  repriseHumaine: '[data-testid="handoff"]',
  mode: '[data-testid="mode"]',
  labelArticle: '[data-testid="ai-label"]',

  /** Points d'entrée de l'API. */
  api: {
    chat: '/api/chat',
    journal: '/api/logs',
    export: '/api/export',
    repriseHumaine: '/api/handoff',
  },
};

export type Langue = (typeof cible.langues)[number];

/** Ce que la mention doit contenir, par langue. */
export const MENTION_ATTENDUE: Record<Langue, RegExp> = {
  fr: /\bIA\b|intelligence artificielle/i,
  en: /\bAI\b|artificial intelligence/i,
};
