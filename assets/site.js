(function () {
  "use strict";

  // GitHub Pages redirige déjà vers HTTPS. Ce garde-fou couvre aussi tout
  // futur hébergement qui servirait accidentellement une page en HTTP.
  if (location.protocol === "http:" && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    location.replace("https:" + location.href.slice(location.protocol.length));
    return;
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a");
    if (link && link.hostname && link.hostname !== location.hostname) {
      link.rel = "noopener noreferrer";
    }
  });
})();
