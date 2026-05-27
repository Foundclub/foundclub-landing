document.querySelectorAll(".yt-lite").forEach((button) => {
  const activate = () => {
    if (button.dataset.loaded === "true") {
      return;
    }

    button.dataset.loaded = "true";

    const iframe = document.createElement("iframe");
    iframe.className = "yt-lite__iframe";
    iframe.src = `https://www.youtube.com/embed/${button.dataset.ytid}?autoplay=1&rel=0&modestbranding=1&playsinline=1&origin=${location.origin}`;
    iframe.title = "Presentation video de FoundClub";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;

    button.replaceWith(iframe);
  };

  button.addEventListener("click", activate);
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });
});
