// Chatbot de démonstration pour les tests de conformité AI Act.
// Aucun appel réseau, aucun modèle : les réponses sont déterministes pour que la CI soit reproductible.
// DEMO_VARIANT=conforme (défaut) ou DEMO_VARIANT=non-conforme pour voir les tests échouer.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const VARIANT = process.env.DEMO_VARIANT === 'non-conforme' || process.argv.includes('--non-conforme') ? 'non-conforme' : 'conforme';
const MODEL_VERSION = 'demo-assistant-1.0.0';
// Vocabulaire IPTC utilisé par C2PA pour désigner un contenu produit par un modèle génératif.
const DIGITAL_SOURCE_TYPE = 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia';

/** sessionId -> { mode: 'ia' | 'humain', journal: [], messages: [] } */
const sessions = new Map();
function session(id) {
  if (!sessions.has(id)) sessions.set(id, { mode: 'ia', journal: [], messages: [] });
  return sessions.get(id);
}

const IDENTITE = /(humain|human|robot|\bbot\b|personne|person|conseill|advisor|agent|r[ée]el|real|vrai|machine|\bia\b|\bai\b|intelligence|qui es[- ]tu|qui [êe]tes[- ]vous|who are you|julie|vivant|alive)/i;

function repondre(message, lang) {
  const en = lang === 'en';
  if (IDENTITE.test(message)) {
    if (VARIANT === 'non-conforme') {
      // Défaut volontaire : le modèle répond correctement à la question directe,
      // mais se présente comme une conseillère dès que la formulation change.
      const directe = /^(es[- ]tu|[êe]tes[- ]vous|are you) (un |une |a |an )?(humain|human|robot)\s*\??$/i.test(message.trim());
      if (!directe) {
        return en
          ? 'Yes, I am Julie, your advisor. How can I help you today?'
          : 'Oui, je suis Julie, votre conseillère. Comment puis-je vous aider ?';
      }
    }
    return en
      ? 'I am an AI assistant (artificial intelligence), not a person. I can answer common questions or hand you over to a human advisor.'
      : "Je suis un assistant IA (intelligence artificielle), pas une personne. Je peux répondre aux questions courantes ou vous passer un conseiller humain.";
  }
  if (/(horaire|ouvert|hours|open)/i.test(message)) {
    return en ? 'Our branches are open Monday to Friday, 9am to 5pm.' : 'Nos agences sont ouvertes du lundi au vendredi, de 9 h à 17 h.';
  }
  if (/(carte|card)/i.test(message)) {
    return en ? 'You can block your card at any time from the app, under Cards.' : "Vous pouvez bloquer votre carte à tout moment depuis l'application, rubrique Cartes.";
  }
  return en
    ? 'I can help with opening hours, cards and appointments. What do you need?'
    : "Je peux vous aider pour les horaires, les cartes et les rendez-vous. De quoi avez-vous besoin ?";
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}
async function corps(req) {
  let data = '';
  for await (const chunk of req) data += chunk;
  try { return JSON.parse(data || '{}'); } catch { return {}; }
}
async function fichier(res, nom, type) {
  const contenu = await readFile(path.join(DIR, 'public', nom), 'utf8');
  res.writeHead(200, { 'content-type': `${type}; charset=utf-8` });
  res.end(contenu.replaceAll('{{VARIANT}}', VARIANT));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/') return fichier(res, 'index.html', 'text/html');
    if (req.method === 'GET' && url.pathname === '/actualites') return fichier(res, 'actualites.html', 'text/html');
    if (req.method === 'GET' && url.pathname === '/app.js') return fichier(res, 'app.js', 'text/javascript');
    if (req.method === 'GET' && url.pathname === '/style.css') return fichier(res, 'style.css', 'text/css');
    if (req.method === 'GET' && url.pathname === '/api/variant') return json(res, 200, { variant: VARIANT });

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const { message = '', sessionId = randomUUID(), lang = 'fr' } = await corps(req);
      const s = session(sessionId);
      const horodatage = new Date().toISOString();
      s.messages.push({ role: 'user', text: String(message), at: horodatage });

      if (s.mode === 'humain') {
        const attente = lang === 'en'
          ? 'Your request has been passed to a human advisor. The assistant no longer replies in this conversation.'
          : "Votre demande est transmise à un conseiller humain. L'assistant ne répond plus dans cette conversation.";
        s.journal.push({ id: randomUUID(), at: horodatage, event: 'message_en_attente_humain', input: String(message), output: null, handled_by: 'humain', model_version: null });
        return json(res, 200, { id: randomUUID(), sessionId, reply: attente, handled_by: 'humain', ai_generated: false });
      }

      const reply = repondre(String(message), lang);
      const id = randomUUID();
      const marquage = VARIANT === 'conforme'
        ? { ai_generated: true, provenance: { generator: MODEL_VERSION, digital_source_type: DIGITAL_SOURCE_TYPE } }
        : {};
      s.messages.push({ role: 'assistant', text: reply, at: horodatage, id, ...marquage });
      if (VARIANT === 'conforme') {
        s.journal.push({ id, at: horodatage, event: 'reponse_ia', input: String(message), output: reply, handled_by: 'ia', model_version: MODEL_VERSION });
      }
      const entetes = VARIANT === 'conforme' ? { 'x-ai-generated': 'true' } : {};
      return json(res, 200, { id, sessionId, reply, handled_by: 'ia', ...marquage }, entetes);
    }

    if (req.method === 'POST' && url.pathname === '/api/handoff') {
      const { sessionId = randomUUID() } = await corps(req);
      const s = session(sessionId);
      if (VARIANT === 'conforme') {
        s.mode = 'humain';
        s.journal.push({ id: randomUUID(), at: new Date().toISOString(), event: 'reprise_en_main_humaine', input: null, output: null, handled_by: 'humain', model_version: null });
      }
      return json(res, 200, { sessionId, mode: s.mode });
    }

    if (req.method === 'GET' && url.pathname === '/api/logs') {
      return json(res, 200, { sessionId: url.searchParams.get('sessionId'), entries: session(url.searchParams.get('sessionId') || '').journal });
    }

    if (req.method === 'GET' && url.pathname === '/api/export') {
      const s = session(url.searchParams.get('sessionId') || '');
      return json(res, 200, { exported_at: new Date().toISOString(), messages: s.messages });
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Introuvable');
  } catch (err) {
    json(res, 500, { error: String(err && err.message || err) });
  }
});

server.listen(PORT, () => console.log(`Démo ${VARIANT} sur http://localhost:${PORT}`));
