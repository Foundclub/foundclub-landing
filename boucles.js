// Boucles vidéo muettes du site (LANDING-HUMAIN, 12/10/2026).
// Rien n'est téléchargé avant que la boucle approche de l'écran, pas même son image d'attente (data-poster) : un poster
// classique part au chargement de la page et ralentit le premier affichage (accueil : 97 → 94-95 mesuré le 12/10).
// Pas de lecture automatique quand le visiteur demande moins de mouvement ou économise ses données ;
// un bouton Pause / Lecture par boucle (WCAG 2.2.2 : tout mouvement de plus de 5 s doit pouvoir s'arrêter).
(function () {
  var plannings = Array.prototype.slice.call(document.querySelectorAll('.planning-anime'));
  if (plannings.length && 'IntersectionObserver' in window) {
    var obsPlanning = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('joue'); obsPlanning.unobserve(e.target); } });
    }, { threshold: 0.35 });
    plannings.forEach(function (p) { obsPlanning.observe(p); });
  } else {
    plannings.forEach(function (p) { p.classList.add('joue'); });
  }
  var boucles = Array.prototype.slice.call(document.querySelectorAll('video[data-boucle]'));
  if (!boucles.length) return;
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var economie = navigator.connection && navigator.connection.saveData;

  function charger(v) {
    if (v.dataset.chargee) return;
    v.dataset.chargee = '1';
    ['webm', 'mp4'].forEach(function (type) {
      var src = v.getAttribute('data-' + type);
      if (!src) return;
      var s = document.createElement('source');
      s.src = src;
      s.type = 'video/' + type;
      v.appendChild(s);
    });
    v.load();
  }
  function lire(v) {
    if (v.dataset.arretee === '1') return;
    charger(v);
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  boucles.forEach(function (v) {
    var bouton = v.parentNode.querySelector('.boucle__pause');
    if (calme || economie) v.dataset.arretee = '1';
    if (bouton) {
      var maj = function () {
        var arretee = v.dataset.arretee === '1';
        bouton.setAttribute('aria-pressed', arretee ? 'true' : 'false');
        bouton.textContent = arretee ? 'Lecture' : 'Pause';
      };
      bouton.addEventListener('click', function () {
        v.dataset.arretee = v.dataset.arretee === '1' ? '0' : '1';
        if (v.dataset.arretee === '1') v.pause(); else lire(v);
        maj();
      });
      maj();
    }
  });

  if (!('IntersectionObserver' in window)) { // sans observateur : l'image d'attente tout de suite, et pas de lecture automatique
    boucles.forEach(function (v) { if (v.dataset.poster) v.setAttribute('poster', v.dataset.poster); });
    return;
  }
  var obs = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (!v.getAttribute('poster') && v.dataset.poster) v.setAttribute('poster', v.dataset.poster);
        lire(v);
      } else {
        v.pause();
      }
    });
  }, { rootMargin: '200px 0px' });
  boucles.forEach(function (v) { obs.observe(v); });
})();
