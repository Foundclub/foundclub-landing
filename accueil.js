// Accueil foundclubpro.com. Aucun cookie, aucun stockage, aucune requête tierce.
// 1) bouton Installer  2) démonstrations animées  3) apparition au défilement  4) formulaire sans quitter la page

// 1. Le bouton « Installer l'application » vise le bon magasin (inchangé).
(function () {
  document.documentElement.classList.add('js');
  var ua = navigator.userAgent || '';
  var isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);
  if (!isIos && !isAndroid) return;
  var liens = document.querySelectorAll('[data-installer]');
  for (var i = 0; i < liens.length; i++) {
    liens[i].href = isIos ? liens[i].getAttribute('data-ios') : liens[i].getAttribute('data-android');
    liens[i].setAttribute('rel', 'noopener');
  }
})();

// 2. Démonstrations : un pas toutes les 2,6 s, pause manuelle (WCAG 2.2.2), pause hors écran,
//    arrêt complet si le visiteur demande moins de mouvement. Seuls transform et opacity bougent.
(function () {
  var DUREE = 2600;
  function mouvementReduit() {
    if (document.body.getAttribute('data-mvt') === 'reduit') return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  var demos = [];

  Array.prototype.forEach.call(document.querySelectorAll('[data-demo]'), function (demo) {
    var pause = false, visible = true, index = 0, timer = null;
    var pauseBtn = demo.querySelector('.demo__pause');

    function ecransVisibles() {
      return Array.prototype.filter.call(demo.querySelectorAll('.ecran'), function (e) {
        return window.getComputedStyle(e).display !== 'none';
      });
    }

    function montrer(i) {
      var liste = ecransVisibles();
      if (!liste.length) return;
      index = ((i % liste.length) + liste.length) % liste.length;
      if (mouvementReduit()) {
        var fixe = liste.filter(function (e) { return e.hasAttribute('data-fixe'); })[0];
        if (fixe) index = liste.indexOf(fixe);
      }
      liste.forEach(function (e, n) {
        e.classList.toggle('est-actif', n === index);
        if (n === index && !mouvementReduit()) { e.classList.remove('est-actif'); void e.offsetWidth; e.classList.add('est-actif'); }
      });
      var actif = liste[index];
      demo.classList.toggle('est-paysage', actif.hasAttribute('data-paysage') && !mouvementReduit());

      var items = demo.querySelectorAll('.rail li');
      Array.prototype.forEach.call(items, function (li, n) {
        li.classList.toggle('est-actif', n === index);
        var b = li.querySelector('button');
        if (b) b.setAttribute('aria-current', n === index ? 'true' : 'false');
        // L'étape « terrain » suit l'onglet de sport : le code et le libellé viennent de l'écran affiché.
        if (li.hasAttribute('data-suit-sport') && liste[n]) {
          var code = li.querySelector('b');
          if (code) code.textContent = liste[n].getAttribute('data-code') || code.textContent;
          var nom = li.querySelector('.rail__nom');
          if (nom) nom.textContent = liste[n].getAttribute('data-nom') || nom.textContent;
        }
      });
      Array.prototype.forEach.call(demo.querySelectorAll('.annotation'), function (a) {
        a.classList.toggle('est-actif', mouvementReduit() || Number(a.getAttribute('data-etape')) === index + 1);
      });
    }

    function planifier() {
      window.clearTimeout(timer);
      if (mouvementReduit() || pause || !visible) return;
      timer = window.setTimeout(function () { montrer(index + 1); planifier(); }, DUREE);
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () {
        pause = !pause;
        pauseBtn.setAttribute('aria-pressed', String(pause));
        pauseBtn.textContent = pause ? 'Lecture' : 'Pause';
        pauseBtn.setAttribute('aria-label', pause ? "Relancer l'animation" : "Mettre l'animation en pause");
        planifier();
      });
    }

    Array.prototype.forEach.call(demo.querySelectorAll('.rail button'), function (b, n) {
      b.addEventListener('click', function () { montrer(n); planifier(); });
    });

    Array.prototype.forEach.call(demo.querySelectorAll('[data-sport-onglet]'), function (b) {
      b.addEventListener('click', function () {
        var sport = b.getAttribute('data-sport-onglet');
        demo.setAttribute('data-sport', sport);
        Array.prototype.forEach.call(demo.querySelectorAll('[data-sport-onglet]'), function (o) {
          o.setAttribute('aria-pressed', String(o === b));
        });
        montrer(index);
        planifier();
      });
    });

    montrer(0);
    planifier();
    demos.push({
      rejouer: function () { montrer(index); planifier(); },
      // Visibilité mesurée au défilement : une séquence hors écran, ou masquée par un onglet, ne tourne pas.
      controler: function () {
        var h = window.innerHeight || document.documentElement.clientHeight;
        var r = demo.getBoundingClientRect();
        var v = demo.offsetParent !== null && r.top < h * 0.85 && r.bottom > h * 0.15;
        if (v !== visible) { visible = v; planifier(); }
      }
    });
  });

  function controlerTout() { demos.forEach(function (d) { d.controler(); }); }
  // Étranglement au temps, pas à la trame : certains navigateurs embarqués ne délivrent pas requestAnimationFrame.
  var dernier = 0, differe = null;
  function auDefilement() {
    var t = Date.now();
    if (t - dernier > 100) { dernier = t; controlerTout(); return; }
    if (differe) return;
    differe = window.setTimeout(function () { differe = null; dernier = Date.now(); controlerTout(); }, 100);
  }
  window.addEventListener('scroll', auDefilement, { passive: true });
  window.addEventListener('resize', auDefilement);
  controlerTout();

  // Bascule du point de vue : dirigeant ou joueur, sur les blocs qui en ont deux.
  Array.prototype.forEach.call(document.querySelectorAll('[data-vue-onglet]'), function (b) {
    b.addEventListener('click', function () {
      var bloc = b.closest('.benefice');
      var vue = b.getAttribute('data-vue-onglet');
      if (!bloc) return;
      bloc.setAttribute('data-vue', vue);
      Array.prototype.forEach.call(bloc.querySelectorAll('[data-vue-onglet]'), function (o) {
        o.setAttribute('aria-pressed', String(o === b));
      });
      demos.forEach(function (d) { d.rejouer(); });
      controlerTout();
    });
  });

  window.addEventListener('fc-mouvement', function () { demos.forEach(function (d) { d.rejouer(); }); controlerTout(); });
})();

// 3. Apparition au défilement : chaque bloc monte de 16 px une seule fois, à son entrée à l'écran.
//    Contrôle de position au défilement, étranglé à 100 ms : ce qui est déjà visible apparaît tout de suite,
//    et un filet de sécurité affiche tout si rien ne s'est déclenché au bout d'une seconde.
(function () {
  var SELECTEUR = '.section > .conteneur > h2, .section > .conteneur > .chapeau, .douleurs li, .benefice > div, .bande__carte, .offre, .engagements li, .carte-action, .faq details, .formulaire, .final .badges, .final .heros__actions';
  var cibles = Array.prototype.slice.call(document.querySelectorAll(SELECTEUR));
  function mouvementReduit() {
    if (document.body.getAttribute('data-mvt') === 'reduit') return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function toutMontrer() {
    document.documentElement.classList.add('sans-apparition');
    cibles.forEach(function (e) { e.style.transitionDelay = ''; e.classList.add('est-vu'); });
    cibles = [];
  }
  function reveler(el) {
    // Les éléments d'une même liste entrent en cascade, 70 ms d'écart, 210 ms au plus.
    var rang = 0, p = el.previousElementSibling;
    while (p && p.tagName === el.tagName && rang < 3) { rang++; p = p.previousElementSibling; }
    el.style.transitionDelay = rang * 70 + 'ms';
    el.classList.add('est-vu');
  }
  function controler() {
    if (mouvementReduit()) { toutMontrer(); return; }
    var h = window.innerHeight || document.documentElement.clientHeight;
    var restants = [];
    cibles.forEach(function (e) {
      var r = e.getBoundingClientRect();
      if (r.top < h * 0.94 && r.bottom > 0) { reveler(e); } else { restants.push(e); }
    });
    cibles = restants;
  }
  if (mouvementReduit()) { toutMontrer(); return; }
  controler();
  var dernier = 0, differe = null, filet = null;
  // Le filet de sécurité ne s'arme que sur un vrai défilement, et il ne se déclenche que si un élément
  // effectivement dans la fenêtre est resté masqué — « aucun élément révélé » est l'état normal en haut de page.
  function armerFilet() {
    if (filet || !window.pageYOffset) return;
    filet = window.setTimeout(function () {
      controler();
      var h = window.innerHeight || document.documentElement.clientHeight;
      var bloque = cibles.some(function (e) {
        var r = e.getBoundingClientRect();
        return r.top < h && r.bottom > 0;
      });
      if (bloque) toutMontrer();
    }, 1200);
  }
  function auDefilement(e) {
    if (e && e.type === 'scroll') armerFilet();
    var t = Date.now();
    if (t - dernier > 100) { dernier = t; controler(); return; }
    if (differe) return;
    differe = window.setTimeout(function () { differe = null; dernier = Date.now(); controler(); }, 100);
  }
  window.addEventListener('scroll', auDefilement, { passive: true });
  window.addEventListener('resize', auDefilement);
  window.addEventListener('fc-mouvement', function () { if (mouvementReduit()) toutMontrer(); });
  window.addEventListener('beforeprint', toutMontrer);
  // Dernier recours : si aucun événement de défilement n'est jamais arrivé (navigateurs embarqués,
  // aperçus intégrés), le mécanisme est inutilisable et le contenu passe avant l'effet.
  var aDefile = false;
  window.addEventListener('scroll', function () { aDefile = true; }, { passive: true });
  window.setTimeout(function () { if (!aDefile && !window.pageYOffset) toutMontrer(); }, 6000);
  if (window.pageYOffset > 0) armerFilet(); // arrivée directe sur une ancre
})();

// 4. Aide au démarrage : le formulaire part vers Formspree sans quitter la page.
(function () {
  var form = document.querySelector('[data-formulaire]');
  if (!form) return;
  var etat = form.querySelector('.formulaire__etat');
  form.addEventListener('submit', function (e) {
    if (!window.fetch) return; // sans fetch, l'envoi classique prend le relais
    e.preventDefault();
    var bouton = form.querySelector('button[type="submit"]');
    etat.removeAttribute('data-erreur');
    etat.textContent = 'Envoi…';
    if (bouton) bouton.disabled = true;
    window.fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('refus');
        form.reset();
        etat.textContent = 'Message reçu. Une personne vous répond sous 24 heures.';
      })
      .catch(function () {
        etat.setAttribute('data-erreur', '');
        etat.textContent = 'Envoi impossible. Écrivez-nous à contact@foundclubpro.com.';
      })
      .then(function () { if (bouton) bouton.disabled = false; });
  });
})();
