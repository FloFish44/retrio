/*
 * Retrio — intégration PostHog (site web uniquement).
 * Chargé sur toutes les pages publiques via <script src="/assets/posthog.js"></script>.
 *
 * Confidentialité : ce script ne capture jamais de texte saisi par
 * l'utilisateur, de nom/chemin de fichier ni de contenu de document — le
 * site n'a d'ailleurs aucun champ de saisie. L'autocapture PostHog et le
 * Session Replay sont désactivés explicitement ci-dessous.
 */
(function () {
  if (window.__retrioPostHogInit) return;
  window.__retrioPostHogInit = true;

  /* ---- Snippet officiel PostHog (fourni par le projet Retrio) ---- */
  !function (t, e) {
    var o, n, p, r;
    e.__SV || (window.posthog && window.posthog.__loaded) || (window.posthog = e, e._i = [], e.init = function (i, s, a) {
      function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }
      p || ((p = t.createElement("script")).type = "text/javascript", p.crossOrigin = "anonymous", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", p.onerror = function () { p = null }, (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r));
      var u = e;
      for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], Object.defineProperty(u, "toString", { configurable: !0, enumerable: !0, writable: !0, value: function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e } }), Object.defineProperty(u.people, "toString", { configurable: !0, enumerable: !0, writable: !0, value: function () { return u.toString(1) + ".people (stub)" } }), o = "vu fu pu gu bu init Hu zu qu ju Gu Xl Bu Qu Du eh ih nh sh rh oh capture getExtension Uu cu hh calculateEventProperties uh register register_once register_for_session unregister unregister_for_session gh Nu dh getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync mh identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset yh shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty fh Xu createPersonProfile setInternalOrTestUser ph wu opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Ju debug Yl Os getPageViewId captureTraceFeedback captureTraceMetric Ru".split(" "), n = 0; n < o.length; n++) g(u, o[n]);
      e._i.push([i, s, a])
    }, e.__SV = 1)
  }(document, window.posthog || []);

  posthog.init('phc_pThJPfjMxRRwQbLS9Kia2MnxS7CuJgg6U6cYuicJ2EEP', {
    api_host: 'https://us.i.posthog.com',
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
    /* Rien de plus que pages vues / sessions / événements custom ci-dessous. */
    autocapture: false,
    disable_session_recording: true
  });

  /* ---- Événements personnalisés Retrio ---- */
  function currentPage() {
    return location.pathname;
  }

  function fireDownloadClicked(hrefAttr) {
    /* Anti-doublon : un clic sur index.html envoie déjà l'événement ; le
       clic de secours sur telecharger.html (bouton manuel + redirection
       automatique) quelques secondes plus tard ne doit pas recompter le
       même téléchargement. */
    var now = Date.now();
    var last = Number(sessionStorage.getItem('retrio_ph_dl_ts') || 0);
    if (now - last < 120000) return;
    sessionStorage.setItem('retrio_ph_dl_ts', String(now));
    posthog.capture('website_download_clicked', {
      page: currentPage(),
      destination: hrefAttr,
      lang: document.documentElement.lang || 'fr'
    });
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('telecharger.html') !== -1 || href.indexOf('/releases/download/') !== -1) {
      fireDownloadClicked(href);
    } else if (href.indexOf('buy.stripe.com') !== -1) {
      posthog.capture('checkout_started', { page: currentPage() });
    }
  });

  if (currentPage().indexOf('retrio-pro.html') !== -1) {
    posthog.capture('premium_page_viewed', { page: currentPage() });
  }
})();
