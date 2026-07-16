/**
 * Générateur d'affiches public — page affiches.html (foundclubpro.com).
 * Appelle l'endpoint PUBLIC du backend FoundClub : POST /api/visual-assets/render-public
 * (aucune auth ; QR verrouillé côté serveur sur foundclub.app ; rate-limité par IP).
 *
 * API auto-détectée : localhost:1337 en test local, foundclub.app en production.
 * Robustesse : numéro de séquence (la sélection la plus récente gagne) + retry
 * automatique sur erreur réseau (démarrage à froid / hiccup serveur).
 */
(function () {
  var API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:1337'
    : 'https://api.foundclubpro.com';
  var ENDPOINT = API_BASE + '/api/public-poster';

  var CATALOG = {
    'affiche-detection': {
      label: 'Détection / essai',
      variants: [['projecteurs', 'Projecteurs'], ['laissez-passer', 'Laissez-passer'], ['decouverte', 'Découverte']],
      fields: [
        ['club', 'Club', 'SMUC'], ['ville', 'Ville', 'Marseille'],
        ['equipe', 'Équipe', 'U15 Élite'], ['niveau', 'Niveau', 'Niveau régional'],
        ['date', 'Date', 'Sam. 14 sept.'], ['horaires', 'Horaires', '14h00 – 17h00'], ['lieu', 'Lieu', 'Stade de Luminy'],
        ['titre', 'Titre (ligne 1)', 'Viens montrer'], ['titreAccent', 'Titre (ligne 2, accent)', 'ce que tu vaux.'],
        ['qrLabel', 'Label du QR', 'Scannez pour participer'],
      ],
    },
    'affiche-club': {
      label: 'Rejoindre le club',
      variants: [['ecusson', 'Écusson'], ['famille', 'Famille']],
      fields: [
        ['club', 'Club', 'SMUC'], ['ville', 'Ville', 'Marseille'],
        ['titre', 'Titre (ligne 1)', 'Ici, on joue'], ['titreAccent', 'Titre (ligne 2, accent)', 'ensemble.'],
        ['sports', 'Sports (séparés par ·)', 'Football · Rugby · Handball'],
        ['qrLabel', 'Label du QR', 'Scannez pour nous rejoindre'],
      ],
    },
    'avis-de-recherche': {
      label: 'Avis de recherche',
      variants: [['far-west', 'Far-west'], ['viseur', 'Viseur'], ['club-recherche', 'Club recherché'], ['western', 'Western'], ['club-recherche-western', 'Club recherché — Western']],
      fields: [
        ['club', 'Club', 'SMUC'], ['ville', 'Ville', 'Marseille'],
        ['cible', 'Cible (ligne 1)', 'Joueur·se'], ['mention', 'Mention (ligne 2)', 'recherché·e'],
        ['poste', 'Poste', 'Ailier · Meneur'], ['niveau', 'Niveau', 'Tous niveaux'],
        ['recompense', 'Récompense', 'Une équipe qui compte sur toi, chaque week-end.'],
        ['qrLabel', 'Label du QR', "Scannez si c'est vous"],
      ],
    },
  };
  var FORMATS = [['a4', 'A4 (impression)'], ['post', 'Post 4:5'], ['story', 'Story 9:16']];

  var state = { type: 'affiche-detection', variant: 'projecteurs', format: 'post', logo: '' };
  var debounceId = null;
  var inflight = null;
  var renderSeq = 0;

  var $ = function (id) { return document.getElementById(id); };
  var seg = function (host, items, current, onPick) {
    host.innerHTML = '';
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = it[1];
      if (it[0] === current) b.classList.add('on');
      b.onclick = function () { onPick(it[0]); };
      host.appendChild(b);
    });
  };

  function renderForm() {
    seg($('type-seg'), Object.keys(CATALOG).map(function (k) { return [k, CATALOG[k].label]; }), state.type, function (k) {
      state.type = k; state.variant = CATALOG[k].variants[0][0]; renderForm(); schedule();
    });
    seg($('variant-seg'), CATALOG[state.type].variants, state.variant, function (k) { state.variant = k; renderForm(); schedule(); });
    seg($('format-seg'), FORMATS, state.format, function (k) { state.format = k; renderForm(); schedule(); });

    var saved = {};
    Array.prototype.forEach.call(document.querySelectorAll('#fields input'), function (i) { saved[i.dataset.key] = i.value; });
    var host = $('fields'); host.innerHTML = '';
    CATALOG[state.type].fields.forEach(function (f) {
      var wrap = document.createElement('div'); wrap.className = 'aff-fld';
      var lab = document.createElement('label'); lab.textContent = f[1];
      var inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = f[2]; inp.dataset.key = f[0];
      if (saved[f[0]]) inp.value = saved[f[0]];
      inp.addEventListener('input', schedule);
      wrap.appendChild(lab); wrap.appendChild(inp); host.appendChild(wrap);
    });
  }

  function collectFields() {
    var fields = {};
    Array.prototype.forEach.call(document.querySelectorAll('#fields input'), function (i) {
      if (i.value.trim()) fields[i.dataset.key] = i.value.trim();
    });
    if (state.logo) fields.logo = state.logo;
    return fields;
  }

  function callRender(preview, signal) {
    return fetch(ENDPOINT, {
      method: 'POST',
      signal: signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ template: state.type, variant: state.variant, format: state.format, preview: preview, fields: collectFields() }),
    }).then(function (r) {
      if (r.status === 403) throw new Error('Générateur momentanément indisponible.');
      if (r.status === 429) throw new Error('Trop de générations d’affilée — patiente une minute.');
      if (!r.ok) return r.json().catch(function () { return null; }).then(function (d) { throw new Error((d && d.error && d.error.message) || ('HTTP ' + r.status)); });
      return r.blob();
    });
  }

  function schedule() { clearTimeout(debounceId); debounceId = setTimeout(function () { generatePreview(0); }, 1100); }

  function generatePreview(attempt) {
    var mySeq = (renderSeq += 1);
    if (inflight) inflight.abort();
    var ctrl = new AbortController(); inflight = ctrl;
    $('loading').classList.remove('aff-hidden');
    callRender(true, ctrl.signal).then(function (blob) {
      if (ctrl === inflight) inflight = null;
      if (mySeq !== renderSeq) return;
      var img = $('preview-img');
      img.onload = function () { if (mySeq === renderSeq) $('loading').classList.add('aff-hidden'); };
      img.classList.remove('aff-hidden');
      img.src = URL.createObjectURL(blob);
      $('dl-btn').disabled = false;
      $('warns').textContent = '';
    }).catch(function (e) {
      if (ctrl === inflight) inflight = null;
      if (e.name === 'AbortError' || mySeq !== renderSeq) return;
      if ((attempt || 0) < 4) {
        $('warns').textContent = 'Génération du visuel… (nouvelle tentative)';
        setTimeout(function () { if (mySeq === renderSeq) generatePreview((attempt || 0) + 1); }, 1200);
      } else {
        $('loading').classList.add('aff-hidden');
        $('warns').textContent = '⚠ ' + e.message;
      }
    });
  }

  function download() {
    var btn = $('dl-btn'); var prev = btn.textContent;
    btn.disabled = true; btn.textContent = 'Préparation du fichier…';
    callRender(false, undefined).then(function (blob) {
      var ext = blob.type.indexOf('pdf') !== -1 ? 'pdf' : 'png';
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'affiche-foundclub-' + state.type + '-' + state.variant + '-' + state.format + '.' + ext;
      document.body.appendChild(a); a.click(); a.remove();
      if (window.gtag) gtag('event', 'affiche_download', { type: state.type, variant: state.variant, format: state.format });
    }).catch(function (e) {
      $('warns').textContent = '⚠ ' + e.message;
    }).then(function () { btn.disabled = false; btn.textContent = prev; });
  }

  $('dl-btn').onclick = download;
  $('logo-file').addEventListener('change', function () {
    var f = $('logo-file').files[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { $('warns').textContent = '⚠ Logo trop lourd (max 2 Mo).'; return; }
    var reader = new FileReader();
    reader.onload = function () {
      state.logo = String(reader.result);
      $('logo-thumb').src = state.logo; $('logo-thumb').classList.remove('aff-hidden');
      $('logo-clear').classList.remove('aff-hidden');
      schedule();
    };
    reader.readAsDataURL(f);
  });
  $('logo-clear').onclick = function () {
    state.logo = ''; $('logo-file').value = '';
    $('logo-thumb').classList.add('aff-hidden'); $('logo-clear').classList.add('aff-hidden');
    schedule();
  };

  renderForm();
  generatePreview(0);
}());
