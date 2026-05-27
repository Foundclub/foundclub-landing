(() => {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  const headerInner = header.querySelector(".site-header__inner");
  const nav = header.querySelector(".site-nav");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let navToggle = null;
  let navToggleText = null;
  let navScrim = null;

  const isNavOpen = () => header.classList.contains("site-header--nav-open");

  const syncNavState = ({ restoreFocus = false } = {}) => {
    if (!nav || !navToggle || !navScrim) {
      return;
    }

    const open = isNavOpen();
    document.body.classList.toggle("site-nav-open", open);
    header.classList.toggle("site-header--hidden", false);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    navToggle.classList.toggle("site-nav__toggle--open", open);
    nav.setAttribute("aria-hidden", String(!open));
    navScrim.hidden = !open;
    if (navToggleText) {
      navToggleText.textContent = open ? "Fermer" : "Menu";
    }

    if (restoreFocus) {
      navToggle.focus();
    }
  };

  const closeNav = (options = {}) => {
    if (!nav || !navToggle || !navScrim || !isNavOpen()) {
      return;
    }

    header.classList.remove("site-header--nav-open");
    syncNavState(options);
  };

  const openNav = () => {
    if (!nav || !navToggle || !navScrim) {
      return;
    }

    header.classList.add("site-header--nav-open");
    syncNavState();
  };

  if (headerInner && nav) {
    header.classList.add("site-header--nav-ready");
    nav.classList.add("site-nav--drawer-ready");
    nav.id = nav.id || "site-nav-primary";
    if (!nav.getAttribute("aria-label")) {
      nav.setAttribute("aria-label", "Navigation principale");
    }

    navToggle = document.createElement("button");
    navToggle.type = "button";
    navToggle.className = "site-nav__toggle";
    navToggle.setAttribute("aria-controls", nav.id);
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Ouvrir le menu");
    navToggle.innerHTML = `
      <span class="site-nav__toggle-box" aria-hidden="true">
        <span class="site-nav__toggle-line"></span>
        <span class="site-nav__toggle-line"></span>
        <span class="site-nav__toggle-line"></span>
      </span>
      <span class="site-nav__toggle-text">Menu</span>
    `;
    navToggleText = navToggle.querySelector(".site-nav__toggle-text");

    navScrim = document.createElement("button");
    navScrim.type = "button";
    navScrim.className = "site-nav__scrim";
    navScrim.setAttribute("aria-label", "Fermer le menu");
    navScrim.hidden = true;

    headerInner.insertBefore(navToggle, nav);
    header.appendChild(navScrim);

    navToggle.addEventListener("click", () => {
      if (isNavOpen()) {
        closeNav({ restoreFocus: true });
        return;
      }

      openNav();
    });

    navScrim.addEventListener("click", () => {
      closeNav({ restoreFocus: true });
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        closeNav();
      });
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeNav({ restoreFocus: true });
      }
    });

    syncNavState();
  }

  if (prefersReducedMotion) {
    return;
  }

  let lastScrollY = window.scrollY;
  let ticking = false;
  const hideOffset = 96;
  const minDelta = 10;

  const updateHeader = () => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;

    if (isNavOpen()) {
      header.classList.remove("site-header--hidden");
      lastScrollY = currentScrollY;
      ticking = false;
      return;
    }

    if (currentScrollY <= 8) {
      header.classList.remove("site-header--hidden");
      lastScrollY = currentScrollY;
      ticking = false;
      return;
    }

    if (delta > minDelta && currentScrollY > hideOffset) {
      header.classList.add("site-header--hidden");
    } else if (delta < -minDelta) {
      header.classList.remove("site-header--hidden");
    }

    lastScrollY = currentScrollY;
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) {
      return;
    }
    ticking = true;
    window.requestAnimationFrame(updateHeader);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
})();
