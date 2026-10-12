// Entête commun aux 17 pages (12/10/2026). Aucun cookie, aucun stockage, aucune requête tierce.
// 1) « Menu » sur téléphone et tablette : bouton à bascule (aria-expanded), fermé par Échap, un clic dehors ou un lien.
// 2) « Installer » : sur iPhone ou Android, le lien vise directement le bon magasin.
(function () {
  var entete = document.querySelector('.fc-entete');
  var bouton = entete && entete.querySelector('.fc-menu');
  var nav = entete && entete.querySelector('.fc-nav');
  if (bouton && nav) {
    var texte = bouton.querySelector('.fc-menu__texte');
    var ouvert = function () { return entete.classList.contains('est-ouvert'); };
    var basculer = function (oui, rendreFocus) {
      entete.classList.toggle('est-ouvert', oui);
      bouton.setAttribute('aria-expanded', oui ? 'true' : 'false');
      if (texte) texte.textContent = oui ? 'Fermer' : 'Menu';
      if (!oui && rendreFocus) bouton.focus();
    };
    bouton.addEventListener('click', function () { basculer(!ouvert()); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) basculer(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ouvert()) basculer(false, true); });
    document.addEventListener('click', function (e) { if (ouvert() && !entete.contains(e.target)) basculer(false); });
  }

  var ua = navigator.userAgent || '';
  var ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  if (!ios && !android) return;
  var liens = document.querySelectorAll('[data-installer]');
  for (var i = 0; i < liens.length; i++) {
    liens[i].href = liens[i].getAttribute(ios ? 'data-ios' : 'data-android');
    liens[i].setAttribute('rel', 'noopener');
  }
})();
