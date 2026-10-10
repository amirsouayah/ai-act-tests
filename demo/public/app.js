(function () {
  var variant = document.documentElement.getAttribute('data-variant');
  var conforme = variant === 'conforme';
  var params = new URLSearchParams(location.search);
  var lang = params.get('lang') === 'en' ? 'en' : 'fr';
  document.documentElement.lang = lang;

  var T = {
    fr: { titre: 'Assistant', notice: "Vous échangez avec un assistant IA (intelligence artificielle), pas avec une personne.", label: 'Votre message', envoyer: 'Envoyer', humain: 'Parler à un humain', modeIa: 'Mode : assistant IA', modeHumain: 'Mode : conseiller humain', vous: 'Vous', ia: 'Assistant IA', conseiller: 'Service client' },
    en: { titre: 'Assistant', notice: 'You are chatting with an AI assistant (artificial intelligence), not a person.', label: 'Your message', envoyer: 'Send', humain: 'Talk to a human', modeIa: 'Mode: AI assistant', modeHumain: 'Mode: human advisor', vous: 'You', ia: 'AI assistant', conseiller: 'Customer service' }
  }[lang];

  var sessionId;
  try { sessionId = sessionStorage.getItem('sid'); } catch (e) {}
  if (!sessionId) {
    sessionId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    try { sessionStorage.setItem('sid', sessionId); } catch (e) {}
  }
  window.__sessionId = sessionId;

  var notice = document.getElementById('ai-notice');
  var liste = document.getElementById('messages');
  var form = document.getElementById('form');
  var champ = document.getElementById('champ');
  var mode = document.getElementById('mode');
  var dejaEchange = false;
  try { dejaEchange = sessionStorage.getItem('echange') === '1'; } catch (e) {}

  document.getElementById('label-champ').textContent = T.label;
  document.getElementById('envoyer').textContent = T.envoyer;
  document.getElementById('humain').textContent = T.humain;
  mode.textContent = T.modeIa;

  function afficherNotice() { notice.textContent = T.notice; notice.hidden = false; }

  if (conforme) {
    // Conforme : la mention est là avant tout échange, dans toutes les langues, et après un rechargement.
    afficherNotice();
  } else {
    // Défauts volontaires de la variante non conforme :
    // 1. rien avant le premier message ; 2. rien en anglais ; 3. rien après une reprise de conversation ;
    // 4. la seule mention permanente est en petit dans le pied de page.
    var cgu = document.getElementById('notice-cgu');
    cgu.textContent = 'Ce service peut utiliser des traitements automatisés.';
    cgu.hidden = false;
  }

  function ajouter(role, texte, meta) {
    var li = document.createElement('li');
    li.className = 'msg ' + role;
    li.setAttribute('data-testid', role === 'user' ? 'user-message' : 'assistant-message');
    if (meta && meta.ai_generated) {
      li.setAttribute('data-ai-generated', 'true');
      li.setAttribute('data-digital-source-type', meta.provenance.digital_source_type);
    }
    var qui = document.createElement('span');
    qui.className = 'qui';
    qui.textContent = role === 'user' ? T.vous : (meta && meta.handled_by === 'humain' ? T.conseiller : (conforme ? T.ia : 'Julie'));
    var p = document.createElement('p');
    p.textContent = texte;
    li.appendChild(qui); li.appendChild(p);
    liste.appendChild(li);
    li.scrollIntoView({ block: 'nearest' });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var texte = champ.value.trim();
    if (!texte) return;
    champ.value = '';
    ajouter('user', texte);
    fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: texte, sessionId: sessionId, lang: lang }) })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        ajouter('assistant', data.reply, data);
        if (!conforme && lang === 'fr' && !dejaEchange) afficherNotice();
        try { sessionStorage.setItem('echange', '1'); } catch (e) {}
      });
  });

  document.getElementById('humain').addEventListener('click', function () {
    fetch('/api/handoff', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: sessionId }) })
      .then(function (r) { return r.json(); })
      .then(function (data) { mode.textContent = data.mode === 'humain' ? T.modeHumain : T.modeIa; });
  });
})();
