(function () {
  "use strict";

  var POSTHOG_KEY = "phc_pThJPfjMxRRwQbLS9Kia2MnxS7CuJgg6U6cYuicJ2EEP";
  var POSTHOG_CAPTURE = "https://us.i.posthog.com/capture/";
  var CONSENT_KEY = "retrio_analytics_consent";
  var ID_KEY = "retrio_analytics_id";

  var LANGUAGE_ROUTES = {
    "/": "/en/", "/index.html": "/en/",
    "/telecharger.html": "/en/download.html",
    "/retrio-pro.html": "/en/retrio-pro.html",
    "/assistance.html": "/en/support.html",
    "/politique-confidentialite.html": "/en/privacy-policy.html",
    "/cgu.html": "/en/terms.html",
    "/informations-legales.html": "/en/legal-information.html",
    "/404.html": "/en/404.html",
    "/guides.html": "/en/guides.html",
    "/logiciel-recherche-fichiers-windows.html": "/en/windows-file-search-software.html",
    "/organiser-fichiers-ordinateur.html": "/en/organize-computer-files.html",
    "/rechercher-fichier-par-date.html": "/en/search-file-by-date-windows.html",
    "/rechercher-texte-dans-pdf.html": "/en/search-text-inside-pdf-files.html",
    "/renommer-fichiers-facilement.html": "/en/rename-files-easily-windows.html",
    "/retrouver-document-sans-connaitre-nom.html": "/en/find-document-without-filename.html",
    "/retrouver-document-scanne.html": "/en/find-scanned-document.html",
    "/retrouver-dossier-perdu-windows.html": "/en/find-lost-folder-windows.html",
    "/retrouver-facture-ordinateur.html": "/en/find-invoice-on-computer.html",
    "/retrouver-fichier-perdu.html": "/en/how-to-find-lost-file-windows.html",
    "/retrouver-fichier-supprime-windows.html": "/en/recover-deleted-file-windows.html",
    "/retrouver-fichier-telecharge.html": "/en/find-downloaded-file.html",
    "/retrouver-fichier-word-excel.html": "/en/find-lost-word-excel-file.html",
    "/retrouver-photo-ordinateur.html": "/en/find-photo-on-computer.html",
    "/trouver-fichiers-doublons.html": "/en/find-duplicate-files-windows.html"
  };

  function addLanguageSwitch() {
    var path = location.pathname.replace(/\/+$/, "") || "/";
    var isEnglish = path === "/en" || path.indexOf("/en/") === 0;
    var frenchPath = path;
    var englishPath = LANGUAGE_ROUTES[path];
    if (isEnglish) {
      englishPath = path === "/en" || path === "/en/index.html" ? "/en/" : path;
      Object.keys(LANGUAGE_ROUTES).some(function (fr) {
        if (LANGUAGE_ROUTES[fr] === englishPath || (englishPath === "/en/" && LANGUAGE_ROUTES[fr] === "/en/")) {
          frenchPath = fr === "/index.html" ? "/" : fr;
          return true;
        }
        return false;
      });
    }
    if (!englishPath) return;

    var nav = document.querySelector("header nav") || document.querySelector("header .nav");
    if (!nav || nav.querySelector(".retrio-language-switch")) return;
    var switcher = document.createElement("span");
    switcher.className = "retrio-language-switch";
    switcher.setAttribute("aria-label", isEnglish ? "Choose language" : "Choisir la langue");
    switcher.innerHTML = '<a href="' + frenchPath + '" lang="fr" hreflang="fr" aria-label="Version française"' + (!isEnglish ? ' aria-current="page"' : '') + '>🇫🇷<span>FR</span></a>' +
      '<a href="' + englishPath + '" lang="en" hreflang="en" aria-label="English version"' + (isEnglish ? ' aria-current="page"' : '') + '>🇬🇧<span>EN</span></a>';
    var cta = nav.querySelector("a.btn, a.cta");
    nav.insertBefore(switcher, cta || null);

    if (!document.getElementById("retrio-language-style")) {
      var style = document.createElement("style");
      style.id = "retrio-language-style";
      style.textContent = '.retrio-language-switch{display:inline-flex;align-items:center;gap:3px;padding:3px;border:1px solid #c9be9f;border-radius:999px;background:#fbf8f0;white-space:nowrap}.retrio-language-switch a{display:flex;align-items:center;gap:4px;padding:5px 7px;border-radius:999px;color:#3c4a40;font:700 11px/1 Inter,Arial,sans-serif;text-decoration:none}.retrio-language-switch a[aria-current="page"]{background:#1b4332;color:#fff}.retrio-language-switch a:hover{background:#e9e2cf}.retrio-language-switch a[aria-current="page"]:hover{background:#1b4332}@media(max-width:760px){.retrio-language-switch span{display:none}.retrio-language-switch a{font-size:16px;padding:4px 6px}}';
      document.head.appendChild(style);
    }
  }

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
    if (!link) return;
    var href = link.href || "";
    if (/Installateur_Retrio\.exe(?:$|[?#])/i.test(href)) {
      capture("installer_download_clicked");
    } else if (link.hostname === "buy.stripe.com") {
      capture("pro_checkout_clicked", { source_path: location.pathname });
    } else if (link.protocol === "mailto:") {
      capture("support_email_clicked", { source_path: location.pathname });
    }
  });

  function analyticsId() {
    var id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "web-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  }

  function capture(eventName, extra) {
    if (localStorage.getItem(CONSENT_KEY) !== "yes") return;
    var properties = { distinct_id: analyticsId(), $current_url: location.origin + location.pathname, path: location.pathname, language: document.documentElement.lang || "fr", source: "retrio_website" };
    if (extra) Object.keys(extra).forEach(function (key) { properties[key] = extra[key]; });
    try {
      fetch(POSTHOG_CAPTURE, { method: "POST", mode: "cors", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: POSTHOG_KEY, event: eventName, properties: properties }) }).catch(function () {});
    } catch (_error) {}
  }

  function recordPageView() {
    capture("site_page_view");
    if (location.pathname.endsWith("/telecharger.html")) capture("download_page_view");
  }

  function setConsent(accepted) {
    localStorage.setItem(CONSENT_KEY, accepted ? "yes" : "no");
    var banner = document.getElementById("retrio-consent");
    if (banner) banner.remove();
    if (accepted) { capture("analytics_consent_accepted"); recordPageView(); }
  }

  function showConsent() {
    if (document.getElementById("retrio-consent")) return;
    var banner = document.createElement("aside");
    banner.id = "retrio-consent";
    var isEnglish = document.documentElement.lang === "en";
    banner.setAttribute("aria-label", isEnglish ? "Analytics preference" : "Choix des statistiques d’audience");
    banner.innerHTML = isEnglish
      ? '<div><strong>Anonymous analytics</strong><p>May we collect anonymous usage data to improve Retrio? We never collect your documents, searches or email address.</p></div><div class="retrio-consent-actions"><button type="button" data-choice="no">Decline</button><button type="button" class="accept" data-choice="yes">Accept</button><a href="/en/privacy-policy.html">Learn more</a></div>'
      : '<div><strong>Statistiques d’audience</strong><p>Acceptez-vous des statistiques anonymes pour nous aider à améliorer Retrio ? Aucun document, recherche ou e-mail n’est collecté.</p></div><div class="retrio-consent-actions"><button type="button" data-choice="no">Refuser</button><button type="button" class="accept" data-choice="yes">Accepter</button><a href="/politique-confidentialite.html">En savoir plus</a></div>';
    var style = document.createElement("style");
    style.textContent = '#retrio-consent{position:fixed;z-index:9999;left:18px;right:18px;bottom:18px;max-width:820px;margin:auto;padding:18px 20px;border:1px solid #c9be9f;border-radius:16px;background:#fbf8f0;color:#14251c;box-shadow:0 12px 42px rgba(20,37,28,.2);display:flex;gap:20px;align-items:center;justify-content:space-between;font:14px/1.45 Inter,Arial,sans-serif}#retrio-consent strong{font-size:15px}#retrio-consent p{margin:4px 0 0;color:#4c5a50}.retrio-consent-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-shrink:0}.retrio-consent-actions button{border:1px solid #1b4332;border-radius:999px;background:transparent;color:#1b4332;padding:9px 14px;font-weight:700;cursor:pointer}.retrio-consent-actions button.accept{background:#1b4332;color:#fff}.retrio-consent-actions a{font-size:12px}@media(max-width:680px){#retrio-consent{align-items:stretch;flex-direction:column}.retrio-consent-actions{justify-content:flex-start}}';
    document.head.appendChild(style);
    document.body.appendChild(banner);
    banner.addEventListener("click", function (event) { var button = event.target.closest("button[data-choice]"); if (button) setConsent(button.dataset.choice === "yes"); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    addLanguageSwitch();
    var consent = localStorage.getItem(CONSENT_KEY);
    if (consent === "yes") recordPageView();
    else if (consent !== "no") showConsent();
  });
})();
