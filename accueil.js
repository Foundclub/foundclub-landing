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
