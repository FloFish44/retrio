(function () {
  "use strict";

  var POSTHOG_KEY = "phc_pThJPfjMxRRwQbLS9Kia2MnxS7CuJgg6U6cYuicJ2EEP";
  var POSTHOG_CAPTURE = "https://us.i.posthog.com/capture/";
  var CONSENT_KEY = "retrio_analytics_consent";
  var ID_KEY = "retrio_analytics_id";

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
    banner.setAttribute("aria-label", "Choix des statistiques d’audience");
    banner.innerHTML = '<div><strong>Statistiques d’audience</strong><p>Acceptez-vous des statistiques anonymes pour nous aider à améliorer Retrio ? Aucun document, recherche ou e-mail n’est collecté.</p></div><div class="retrio-consent-actions"><button type="button" data-choice="no">Refuser</button><button type="button" class="accept" data-choice="yes">Accepter</button><a href="/politique-confidentialite.html">En savoir plus</a></div>';
    var style = document.createElement("style");
    style.textContent = '#retrio-consent{position:fixed;z-index:9999;left:18px;right:18px;bottom:18px;max-width:820px;margin:auto;padding:18px 20px;border:1px solid #c9be9f;border-radius:16px;background:#fbf8f0;color:#14251c;box-shadow:0 12px 42px rgba(20,37,28,.2);display:flex;gap:20px;align-items:center;justify-content:space-between;font:14px/1.45 Inter,Arial,sans-serif}#retrio-consent strong{font-size:15px}#retrio-consent p{margin:4px 0 0;color:#4c5a50}.retrio-consent-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-shrink:0}.retrio-consent-actions button{border:1px solid #1b4332;border-radius:999px;background:transparent;color:#1b4332;padding:9px 14px;font-weight:700;cursor:pointer}.retrio-consent-actions button.accept{background:#1b4332;color:#fff}.retrio-consent-actions a{font-size:12px}@media(max-width:680px){#retrio-consent{align-items:stretch;flex-direction:column}.retrio-consent-actions{justify-content:flex-start}}';
    document.head.appendChild(style);
    document.body.appendChild(banner);
    banner.addEventListener("click", function (event) { var button = event.target.closest("button[data-choice]"); if (button) setConsent(button.dataset.choice === "yes"); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var consent = localStorage.getItem(CONSENT_KEY);
    if (consent === "yes") recordPageView();
    else if (consent !== "no") showConsent();
  });
})();
