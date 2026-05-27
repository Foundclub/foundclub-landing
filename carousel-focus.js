(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    return;
  }

  const targets = [
    ...document.querySelectorAll(".hero-carousel"),
    ...Array.from(document.querySelectorAll(".section")).filter((section) =>
      section.querySelector(".product-lane")
    ),
  ];

  if (!targets.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const isHero = entry.target.classList.contains("hero-carousel");
        const activeClass = isHero ? "carousel-focus--active" : "section--carousel-focus";
        if (entry.isIntersecting) {
          entry.target.classList.add(activeClass);
        } else {
          entry.target.classList.remove(activeClass);
        }
      });
    },
    {
      threshold: 0.36,
      rootMargin: "-10% 0px -10% 0px",
    }
  );

  targets.forEach((target) => observer.observe(target));
})();
