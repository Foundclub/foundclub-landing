(() => {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
