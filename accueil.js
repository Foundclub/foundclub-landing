// Accueil foundclubpro.com : le bouton « Installer l'application » vise le bon magasin.
// Même détection que telecharger.html (iPadOS 13+ se présente comme un Mac tactile).
// Aucun cookie, aucun stockage, aucune requête : on ne fait que réécrire des liens.
(function () {
  var ua = navigator.userAgent || '';
  var isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);
  if (!isIos && !isAndroid) return; // ordinateur : le lien garde sa cible, la section avec les deux magasins
  var liens = document.querySelectorAll('[data-installer]');
  for (var i = 0; i < liens.length; i++) {
    var lien = liens[i];
    lien.href = isIos ? lien.getAttribute('data-ios') : lien.getAttribute('data-android');
    lien.setAttribute('rel', 'noopener');
  }
})();

// Séquences animées : bouton pause (WCAG 2.2.2) et pause automatique quand la séquence sort de l'écran.
(function () {
  var sequences = document.querySelectorAll('[data-sequence]');
  for (var i = 0; i < sequences.length; i++) {
    (function (seq) {
      var bouton = seq.querySelector('.sequence__pause');
      var pauseManuelle = false;
      function appliquer(enPause) { seq.classList.toggle('est-en-pause', enPause); }
      if (bouton) {
        bouton.addEventListener('click', function () {
          pauseManuelle = !pauseManuelle;
          appliquer(pauseManuelle);
          bouton.setAttribute('aria-pressed', String(pauseManuelle));
          bouton.textContent = pauseManuelle ? 'Lecture' : 'Pause';
          bouton.setAttribute('aria-label', pauseManuelle ? "Relancer l'animation" : "Mettre l'animation en pause");
        });
      }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entrees) {
          appliquer(pauseManuelle || !entrees[0].isIntersecting);
        }).observe(seq);
      }
    })(sequences[i]);
  }
})();