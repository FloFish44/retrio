/* Frontend logic — communique avec le backend Python via pywebview.api.* */

const state = {
  knownFolders: {},        // label -> path
  customFolders: [],
  typeFilter: "tous",
  lastQuery: "",
  hasScanned: false,
  scanning: false,
  ranger: { scheme: "type", sort: "name", filter: "tous", selected: new Set(), suggestions: [], freeLimit: 0 },
  doublons: { groups: [], freeLimit: 0, totalRecoverable: "", selected: new Set() },
  nettoyage: { items: [], freeLimit: 0, totalRecoverable: "", selected: new Set(), healthScore: null, healthLabel: "", counts: {} },
  teasers: { doublons: null, ranger: null, nettoyage: null },
};

// Chiffres d'exemple affichés tant qu'aucune analyse n'a été lancée sur cet
// ordinateur — remplacés par les vrais chiffres calculés dès que possible.
const TEASER_FALLBACK = { doublons: "3 751", ranger: "1 858", nettoyage: "3,7 Go" };

function formatFr(n) {
  return Number(n).toLocaleString(window.retrioI18n ? window.retrioI18n.locale : "fr-FR");
}

function api() { return window.pywebview && window.pywebview.api; }

// -------------------- Attente que le pont pywebview soit prêt --------------------
function whenReady(cb) {
  if (window.pywebview) { cb(); return; }
  window.addEventListener("pywebviewready", cb, { once: true });
}

whenReady(init);

function hideBootSplash() {
  const s = document.getElementById("bootSplash");
  if (s) s.remove();
}
setTimeout(hideBootSplash, 90000);

async function init() {
  bindNav();
  const demoDialog = document.getElementById('demoDialog');
  const demoVideo = document.getElementById('demoVideo');
  document.getElementById('demoBtn').onclick = () => { demoDialog.showModal(); demoVideo.currentTime = 0; demoVideo.play().catch(() => {}); };
  demoDialog.addEventListener('close', () => demoVideo.pause());
  const demoDialogDoublons = document.getElementById('demoDialogDoublons');
  const demoVideoDoublons = document.getElementById('demoVideoDoublons');
  demoDialogDoublons.addEventListener('close', () => demoVideoDoublons.pause());
  document.getElementById('minBtn').onclick = () => api().minimize();
  document.getElementById('maxBtn').onclick = () => api().toggle_maximize();
  const dragRegion = document.querySelector('.pywebview-drag-region');
  if (dragRegion) {
    dragRegion.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      api().begin_move();
    });
    dragRegion.addEventListener('dblclick', () => api().toggle_maximize());
  }
  document.querySelectorAll('.resize-handle').forEach((handle) => {
    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      api().begin_resize(handle.dataset.edge);
    });
  });
  document.getElementById('closeBtn').onclick = () => api().close_window();
  document.getElementById('folderScope').onchange = () => runSearch(document.getElementById('searchInput').value);
  document.getElementById('yesBtn').onclick = () => document.getElementById('feedbackText').textContent = 'Parfait, vous pouvez ouvrir votre fichier.';
  document.getElementById('noBtn').onclick = () => {document.getElementById('refineHelp').hidden = false; document.getElementById('folderScope').focus();};
  document.getElementById('pickScopeBtn').onclick = async () => {
    const path = await api().pick_folder(); if (!path) return;
    const scope=document.getElementById('folderScope');
    if (![...scope.options].some(o=>o.value===path)) {const o=document.createElement('option');o.value=path;o.textContent=path;scope.appendChild(o);}
    scope.value=path;runSearch(document.getElementById('searchInput').value);
  };
  bindSearch();
  bindFilters();
  bindAddFolder();
  bindAnalyze();
  bindPremium();
  bindRetrioProPanel();
  await bindTelemetryConsent();
  bindWelcome();

  const folders = await api().get_known_folders();
  state.knownFolders = folders;
  renderFolderChecks();
  hideBootSplash();

  try {
    applyLicenseState(JSON.parse(await api().get_license_state()));
  } catch (e) {}
  if (!licenseState.welcome_done) showWelcome('choice');
  api().refresh_license().then((raw) => {
    try { applyLicenseState(JSON.parse(raw)); } catch (e) {}
  }).catch(() => {});
}

async function bindTelemetryConsent() {
  const dialog = document.getElementById("telemetryDialog");
  const settingsBtn = document.getElementById("telemetrySettingsBtn");
  const acceptBtn = document.getElementById("telemetryAcceptBtn");
  const declineBtn = document.getElementById("telemetryDeclineBtn");
  if (!dialog || !settingsBtn || !acceptBtn || !declineBtn) return;

  const choose = async (enabled) => {
    acceptBtn.disabled = true;
    declineBtn.disabled = true;
    try { await api().set_telemetry_consent(enabled); } catch (e) {}
    dialog.close();
    acceptBtn.disabled = false;
    declineBtn.disabled = false;
  };
  acceptBtn.onclick = () => choose(true);
  declineBtn.onclick = () => choose(false);
  settingsBtn.onclick = () => dialog.showModal();

  // Pas de fenêtre bloquante au démarrage. La mesure technique minimale est
  // active par défaut et désactivable via « Confidentialité ».
}

// -------------------- Retrio Pro (licence / abonnement) --------------------
let licenseState = { email: "", premium: false, status: "none", welcome_done: true, has_account: false, license_kind: "none", days_left: 0 };
let previewAsFree = false;

function openProDialogForLimit() {
  const dialog = document.getElementById("proDialog");
  if (!dialog || dialog.open) return;
  const msg = document.getElementById("proLimitMsg");
  if (msg) msg.hidden = false;
  const emailInput = document.getElementById("proEmailInput");
  if (emailInput && licenseState.email) emailInput.value = licenseState.email;
  dialog.addEventListener("close", () => { if (msg) msg.hidden = true; }, { once: true });
  dialog.showModal();
  try { api().track_premium_page_viewed("recherche"); } catch (err) {}
}

function bindPremium() {
  const dialog = document.getElementById("proDialog");
  dialog.addEventListener("close", () => {
    try { api().track_premium_page_closed(); } catch (e) {}
  });
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-pro");
    if (!btn) return;
    e.preventDefault();
    const activeBtn = document.querySelector(".nav-item.active");
    const section = (activeBtn && activeBtn.dataset.tab) || "";
    try { api().track_premium_feature_clicked(section); } catch (err) {}
    const emailInput = document.getElementById("proEmailInput");
    if (emailInput && licenseState.email) emailInput.value = licenseState.email;
    dialog.showModal();
    try { api().track_premium_page_viewed(section); } catch (err) {}
  });
  document.getElementById("proSubscribeBtn").onclick = () => api().open_premium_checkout();
  const previewBtn = document.getElementById("proPreviewToggle");
  if (previewBtn) {
    previewBtn.onclick = () => {
      previewAsFree = !previewAsFree;
      refreshPreviewUI();
    };
  }
  const exitPreviewBtn = document.getElementById("exitPreviewBtn");
  if (exitPreviewBtn) {
    exitPreviewBtn.onclick = () => {
      previewAsFree = false;
      refreshPreviewUI();
    };
  }
  document.getElementById("proVerifyBtn").onclick = async () => {
    const emailInput = document.getElementById("proEmailInput");
    const statusMsg = document.getElementById("proStatusMsg");
    const email = (emailInput.value || "").trim();
    if (!email) { statusMsg.textContent = "Indiquez l'email utilisé lors du paiement."; return; }
    statusMsg.textContent = "Vérification en cours…";
    try {
      const raw = await api().set_license_email(email);
      const data = JSON.parse(raw);
      applyLicenseState(data);
      statusMsg.textContent = data.premium
        ? "Abonnement Retrio Pro actif — merci !"
        : "Aucun abonnement actif trouvé pour cet email.";
    } catch (e) {
      statusMsg.textContent = "Impossible de vérifier pour le moment (hors ligne ?).";
    }
  };
}

function applyLicenseState(data) {
  if (!data) return;
  licenseState = Object.assign({}, licenseState, data);
  data = licenseState;
  if (!data.premium) previewAsFree = false;
  const title = document.getElementById("proCardTitle");
  const sub = document.getElementById("proCardSub");
  const discoverBtn = document.getElementById("proDiscoverBtn");
  const activeMsg = document.getElementById("proActiveMsg");
  const emailInput = document.getElementById("proEmailInput");
  if (emailInput && data.email && !emailInput.value) emailInput.value = data.email;
  if (!title || !sub || !discoverBtn || !activeMsg) return;
  const kind = data.license_kind;
  if (data.premium) {
    title.hidden = true; sub.hidden = true; discoverBtn.hidden = true;
    activeMsg.hidden = false;
    activeMsg.textContent = kind === "trial"
      ? "Essai Retrio Pro offert : " + data.days_left + " jour" + (data.days_left > 1 ? "s" : "") + " restant" + (data.days_left > 1 ? "s" : "")
      : "Retrio Pro actif — merci !";
  } else {
    title.hidden = false; sub.hidden = false; discoverBtn.hidden = false;
    activeMsg.hidden = true;
    if (kind === "trial_expired") {
      title.textContent = "Votre essai gratuit est terminé";
      sub.textContent = "Gardez toutes les fonctionnalités pour 9,99 € par mois, sans engagement.";
    } else {
      title.textContent = "Passer à Retrio Pro";
      sub.textContent = "9,99 € par mois sans engagement. 15 jours offerts avec un compte.";
    }
  }
  // Compte
  const accEmail = document.getElementById("accountEmail");
  const accBtn = document.getElementById("accountBtn");
  if (accEmail && accBtn) {
    accEmail.textContent = data.has_account ? data.account_email : "";
    accBtn.textContent = data.has_account ? "Se déconnecter" : "Se connecter";
  }
  // Dialogue Pro : l'offre d'essai n'a de sens que sans compte
  const trialLine = document.getElementById("proTrialLine");
  const trialBtn = document.getElementById("proTrialBtn");
  if (trialLine && trialBtn) {
    trialLine.hidden = !!data.has_account;
    trialBtn.hidden = !!data.has_account;
  }
  refreshTrialBanner();
  refreshPreviewUI();
}

let trialBannerDismissed = false;
function refreshTrialBanner() {
  const banner = document.getElementById("trialBanner");
  const text = document.getElementById("trialBannerText");
  if (!banner || !text) return;
  const d = licenseState;
  let msg = "";
  if (d.reminder) {
    msg = "Attention, votre accès va expirer. N'hésitez pas à vous abonner pour seulement 9,99 € par mois.";
  } else if (d.license_kind === "trial_expired" && !d.premium) {
    msg = "Votre essai gratuit est terminé. Retrouvez toutes les fonctionnalités pour seulement 9,99 € par mois.";
  }
  text.textContent = msg;
  banner.hidden = !msg || trialBannerDismissed;
  // Rappel (une fois par jour) quand il reste 5 jours ou moins
  if (d.reminder && d.reminder_popup && !reminderShownThisSession) {
    const w = document.getElementById("welcomeScreen");
    if (w && w.hidden) {
      reminderShownThisSession = true;
      document.getElementById("reminderText").textContent = msg + " (Il reste " + d.days_left + " jour" + (d.days_left > 1 ? "s" : "") + " d'essai.)";
      try { document.getElementById("reminderDialog").showModal(); } catch (e) {}
      try { api().ack_reminder(); } catch (e) {}
    }
  }
}
let reminderShownThisSession = false;

// -------------------- Accueil : se connecter / invité --------------------
function showWelcome(step) {
  document.getElementById("welcomeScreen").hidden = false;
  setWelcomeStep(step || "choice");
}
function hideWelcome() {
  document.getElementById("welcomeScreen").hidden = true;
  refreshTrialBanner();
}
function setWelcomeStep(step) {
  ["choice", "email", "code"].forEach((s) => {
    document.getElementById("welcome-" + s).hidden = (s !== step);
  });
  const first = step === "email" ? "welcomeEmail" : step === "code" ? "welcomeCode" : null;
  if (first) setTimeout(() => { const el = document.getElementById(first); if (el) el.focus(); }, 50);
}
function welcomeStatus(id, msg, isError) {
  const el = document.getElementById(id);
  el.textContent = msg || "";
  el.classList.toggle("error", !!isError);
}
function showNotice(title, text) {
  document.getElementById("noticeTitle").textContent = title;
  document.getElementById("noticeText").textContent = text;
  document.getElementById("noticeDialog").showModal();
}

function bindWelcome() {
  const $ = (id) => document.getElementById(id);
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-open]");
    if (!a) return;
    e.preventDefault();
    try { api().open_url(a.dataset.open); } catch (err) {}
  });
  $("welcomeLoginBtn").onclick = () => setWelcomeStep("email");
  $("welcomeGuestBtn").onclick = async () => {
    try { applyLicenseState(JSON.parse(await api().welcome_continue_as_guest())); } catch (e) {}
    hideWelcome();
  };
  $("welcomeBackBtn1").onclick = () => { welcomeStatus("welcomeStatus1", ""); setWelcomeStep("choice"); };
  $("welcomeBackBtn2").onclick = () => { welcomeStatus("welcomeStatus2", ""); setWelcomeStep("email"); };
  $("welcomeEmail").addEventListener("keydown", (e) => { if (e.key === "Enter") $("welcomeSendBtn").click(); });
  $("welcomeCode").addEventListener("input", (e) => { const d = (e.target.value || "").replace(/\D/g, "").slice(0, 6); if (e.target.value !== d) e.target.value = d; });
  $("welcomeCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("welcomeVerifyBtn").click(); });

  $("welcomeSendBtn").onclick = async () => {
    const email = ($("welcomeEmail").value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { welcomeStatus("welcomeStatus1", "Indiquez une adresse e-mail valide.", true); return; }
    if (!$("welcomeCgu").checked) { welcomeStatus("welcomeStatus1", "Merci d'accepter les conditions d'utilisation pour continuer.", true); return; }
    const btn = $("welcomeSendBtn");
    btn.disabled = true;
    welcomeStatus("welcomeStatus1", "Envoi du code… la première fois, cela peut prendre jusqu'à une minute.");
    try {
      const res = JSON.parse(await api().request_login_code(email, $("welcomeMkt").checked));
      if (res.ok) {
        $("welcomeCodeSub").textContent = (window.retrioI18n && window.retrioI18n.language === "en") ? ("Code sent to " + email + ". Also check your spam folder.") : ("Code envoyé à " + email + ". Vérifiez aussi vos courriers indésirables.");
        welcomeStatus("welcomeStatus1", "");
        $("welcomeCode").value = "";
        setWelcomeStep("code");
      } else {
        welcomeStatus("welcomeStatus1", res.error || "Une erreur est survenue.", true);
      }
    } catch (e) {
      welcomeStatus("welcomeStatus1", "Connexion impossible pour le moment. Réessayez.", true);
    }
    btn.disabled = false;
  };

  $("welcomeVerifyBtn").onclick = async () => {
    const email = ($("welcomeEmail").value || "").trim();
    const code = ($("welcomeCode").value || "").trim();
    if (code.length < 6) { welcomeStatus("welcomeStatus2", "Entrez le code à 6 chiffres reçu par e-mail.", true); return; }
    const btn = $("welcomeVerifyBtn");
    btn.disabled = true;
    welcomeStatus("welcomeStatus2", "Vérification…");
    try {
      const res = JSON.parse(await api().verify_login_code(email, code));
      if (res.ok) {
        applyLicenseState(res.state);
        hideWelcome();
        welcomeStatus("welcomeStatus2", "");
        if (res.trial_denied) {
          showNotice("Connexion réussie", res.message || "Un essai gratuit a déjà été utilisé depuis cette connexion. Vous gardez la version gratuite.");
        } else if (res.state && res.state.license_kind === "trial") {
          showNotice("Bienvenue !", "Votre compte est créé : " + res.state.days_left + " jours de Retrio Pro offerts. Profitez de tout, sans limite.");
        } else {
          showNotice("Connexion réussie", "Vous êtes connecté.");
        }
      } else {
        welcomeStatus("welcomeStatus2", res.error || "Code invalide.", true);
      }
    } catch (e) {
      welcomeStatus("welcomeStatus2", "Connexion impossible pour le moment. Réessayez.", true);
    }
    btn.disabled = false;
  };

  $("accountBtn").onclick = async () => {
    if (licenseState.has_account) {
      try { applyLicenseState(JSON.parse(await api().logout_account())); } catch (e) {}
      showWelcome("choice");
    } else {
      showWelcome("email");
    }
  };
  $("proTrialBtn").onclick = () => { $("proDialog").close(); showWelcome("email"); };
  $("trialBannerBtn").onclick = () => { const b = document.querySelector(".btn-pro"); if (b) b.click(); };
  $("trialBannerClose").onclick = () => { trialBannerDismissed = true; $("trialBanner").hidden = true; };
  $("reminderSubscribeBtn").onclick = () => { $("reminderDialog").close(); const b = document.querySelector(".btn-pro"); if (b) b.click(); };
}

function isEffectivePremium() {
  return licenseState.premium && !previewAsFree;
}

function refreshPreviewUI() {
  const previewBtn = document.getElementById("proPreviewToggle");
  const banner = document.getElementById("previewBanner");
  const activeMsg = document.getElementById("proActiveMsg");
  if (previewBtn) {
    previewBtn.hidden = !licenseState.premium;
    previewBtn.textContent = previewAsFree ? "Revenir en mode Pro" : "Aperçu mode visiteur";
  }
  if (banner) banner.hidden = !previewAsFree;
  if (activeMsg) activeMsg.hidden = !licenseState.premium || previewAsFree;
  updateNavLockVisibility();
  renderRetrioProPanel();
  const activeBtn = document.querySelector('.nav-item.active');
  const activeTab = activeBtn && activeBtn.dataset.tab;
  const toolMap = { ranger: 'tabRanger', doublons: 'tabDoublons', nettoyage: 'tabNettoyage' };
  if (activeTab && toolMap[activeTab]) {
    renderToolTab(activeTab, document.getElementById(toolMap[activeTab]));
  }
}

function updateNavLockVisibility() {
  const locked = !isEffectivePremium();
  ["Doublons", "Ranger", "Nettoyage"].forEach((name) => {
    const el = document.getElementById("navRight" + name);
    if (el) el.hidden = !locked;
  });
}

function applyTeaserValue(key, value) {
  state.teasers[key] = value;
  const idMap = { doublons: "teaserDoublons", ranger: "teaserRanger", nettoyage: "teaserNettoyage" };
  const badge = document.getElementById(idMap[key]);
  if (badge) badge.textContent = value;
  const activeBtn = document.querySelector(".nav-item.active");
  const activeTab = activeBtn && activeBtn.dataset.tab;
  if (activeTab === key && !isEffectivePremium()) {
    const map = { doublons: "tabDoublons", ranger: "tabRanger", nettoyage: "tabNettoyage" };
    const el = document.getElementById(map[key]);
    if (el) buildLockedTab(key, el);
  }
}

// Calcule les vrais chiffres (doublons / fichiers mal rangés / espace
// récupérable) à partir de la dernière analyse, pour remplacer les chiffres
// d'exemple affichés par défaut. Se déclenche en tâche de fond, sans
// bloquer l'interface — chaque badge se met à jour dès que sa réponse arrive.
function refreshTeasers() {
  if (!state.hasScanned) return;
  rpData.loaded = { dup: false, sort: false, clean: false };
  api().find_duplicates().then((raw) => {
    const data = JSON.parse(raw);
    const total = (data.groups || []).reduce((sum, g) => sum + Math.max(0, g.files.length - 1), 0);
    applyTeaserValue("doublons", formatFr(total));
    rpData.duplicates = total;
    rpData.samples.duplicates = (data.groups || []).slice(0, 3).map((g) => (g.files[1] || g.files[0] || {}).name).filter(Boolean);
  }).catch(() => {}).finally(() => { rpData.loaded.dup = true; renderRetrioProPanel(); });
  api().organize_suggestions("type").then((raw) => {
    const data = JSON.parse(raw);
    applyTeaserValue("ranger", formatFr((data.suggestions || []).length));
    rpData.toSort = (data.suggestions || []).length;
    rpData.samples.toSort = (data.suggestions || []).slice(0, 3).map((s) => s.name).filter(Boolean);
  }).catch(() => {}).finally(() => { rpData.loaded.sort = true; renderRetrioProPanel(); });
  api().cleanup_suggestions().then((raw) => {
    const data = JSON.parse(raw);
    if (data.total_recoverable_human) applyTeaserValue("nettoyage", data.total_recoverable_human);
    rpData.reclaimable = rpParseSize(data.total_recoverable_human) || (data.items || []).reduce((sum, it) => sum + (it.size || 0), 0);
    rpData.samples.cleanup = (data.items || []).slice(0, 3).map((it) => it.name + (it.size ? " — " + rpHumanSize(it.size) : "")).filter(Boolean);
  }).catch(() => {}).finally(() => { rpData.loaded.clean = true; renderRetrioProPanel(); });
}


// -------------------- Panneau « Retrio Pro » (colonne droite) --------------------
// Affiché uniquement hors Pro, après une analyse, avec les vrais chiffres.
const rpData = { duplicates: null, toSort: null, reclaimable: null, samples: { duplicates: [], toSort: [], cleanup: [] }, loaded: { dup: false, sort: false, clean: false } };
let rpOpenRow = -1;

function rpLang() { return window.retrioI18n && window.retrioI18n.language === "en"; }
function rpT(fr, en) { return rpLang() ? en : fr; }
function rpEsc(s) { return String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch])); }
function rpParseSize(text) {
  const m = String(text || "").replace(/ /g, " ").match(/([\d.,]+)\s*(o|Ko|Mo|Go|To|Po)/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(",", "."));
  const pow = { o: 0, ko: 1, mo: 2, go: 3, to: 4, po: 5 }[m[2].toLowerCase()] || 0;
  return n * Math.pow(1024, pow);
}
function rpHumanSize(bytes) {
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let s = bytes, i = 0;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return (i === 0 ? String(Math.round(s)) : s.toLocaleString(rpLang() ? "en-US" : "fr-FR", { maximumFractionDigits: 1 })) + " " + (rpLang() ? ["B", "KB", "MB", "GB", "TB"][i] : units[i]);
}

function rpReady() { const l = rpData.loaded; return l.dup && l.sort && l.clean; }

function rpVisible() {
  if (isEffectivePremium() || !state.hasScanned || !rpReady()) return false;
  const any = (rpData.duplicates || 0) + (rpData.toSort || 0) + (rpData.reclaimable || 0);
  return any > 0;
}

function renderRetrioProPanel() {
  const host = document.getElementById("rpHost");
  const app = document.querySelector(".app");
  if (!host || !app) return;
  const show = rpVisible();
  host.hidden = !show;
  app.classList.toggle("has-rp", show);
  if (!show) return;

  const recl = rpHumanSize(rpData.reclaimable || 0);
  const used = rpParseSize((document.getElementById("statSize") || {}).textContent);
  const usedTxt = used > 0 ? rpHumanSize(used) : "";
  const nf = (n) => Number(n || 0).toLocaleString(rpLang() ? "en-US" : "fr-FR");
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  set("rpEyebrow", rpT("ANALYSE TERMINÉE · VERROUILLÉ", "ANALYSIS COMPLETE · LOCKED"));
  const title = document.getElementById("rpTitle");
  if (title) title.textContent = rpT("Votre PC cache " + recl + " de fichiers inutiles.", "Your PC is hiding " + recl + " of unnecessary files.");
  set("rpSub", rpT("Retrio les a déjà repérés pendant l'analyse. Il ne vous reste qu'à les débloquer.", "Retrio already spotted them during the analysis. You only have to unlock them."));
  set("rpGaugeLabel", rpT("Espace récupérable", "Recoverable space"));
  set("rpGaugeValue", usedTxt ? (recl + rpT(" sur ", " of ") + usedTxt) : recl);
  const pct = used > 0 ? Math.min(100, Math.max(2, (rpData.reclaimable / used) * 100)) : 0;
  const fill = document.getElementById("rpBarFill");
  if (fill) fill.style.width = pct + "%";

  const lockSvg = '<svg class="rp-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const rows = [
    [rpT("Doublons détectés", "Duplicates found"), rpT("Mêmes fichiers, copiés plusieurs fois", "Same files, copied several times"), rpData.duplicates === null ? "—" : nf(rpData.duplicates), rpData.samples.duplicates],
    [rpT("Fichiers à ranger", "Files to organize"), rpT("Éparpillés sur votre ordinateur", "Scattered across your computer"), rpData.toSort === null ? "—" : nf(rpData.toSort), rpData.samples.toSort],
    [rpT("Nettoyage possible", "Possible cleanup"), rpT("Fichiers lourds et inutiles", "Heavy, unneeded files"), recl, rpData.samples.cleanup],
  ];
  const card = document.getElementById("rpCard");
  if (card) {
    card.innerHTML = rows.map(([t, s, v, files], i) => (
      '<div class="rp-row' + (i === rpOpenRow ? " open" : "") + '" data-i="' + i + '">' +
      '<div class="rp-row-top"><div class="rp-row-txt"><div class="rp-row-t">' + rpEsc(t) + '</div><div class="rp-row-s">' + rpEsc(s) + '</div></div>' +
      '<div class="rp-row-v">' + rpEsc(v) + '</div>' + lockSvg + '</div>' +
      '<div class="rp-files">' + files.map((f) => '<div class="rp-file">' + rpEsc(f) + '</div>').join("") +
      '<div class="rp-pill-wrap"><span class="rp-pill">' + rpEsc(rpT("Visible avec Pro", "Visible with Pro")) + '</span></div></div></div>'
    )).join("");
  }
  const cmp = document.getElementById("rpCmp");
  if (cmp) {
    const feat = [
      [rpT("Recherche par mots", "Search by words"), true],
      [rpT("Supprimer les doublons", "Delete duplicates"), false],
      [rpT("Rangement automatique", "Automatic organizing"), false],
      [rpT("Nettoyage en 1 clic", "One-click cleanup"), false],
    ];
    cmp.innerHTML = '<span class="h">' + rpEsc(rpT("CE QUE VOUS RATEZ", "WHAT YOU MISS")) + '</span><span class="h c">' + rpEsc(rpT("GRATUIT", "FREE")) + '</span><span class="h c ok">PRO</span>' +
      feat.map(([l, free]) => '<span class="l">' + rpEsc(l) + '</span><span class="c ' + (free ? "ok" : "no") + '">' + (free ? "✓" : "—") + '</span><span class="c ok">✓</span>').join("");
  }
  set("rpCtaTitle", rpT("15 jours offerts", "15 days free"));
  set("rpCtaPrice", rpT("puis 9,99 €/mois", "then €9.99/month"));
  set("rpBtn", rpT("Débloquer mes " + recl + " →", "Unlock my " + recl + " →"));
  set("rpFine", rpT("Sans engagement · Annulable en 1 clic · Vos fichiers restent sur ce PC", "No commitment · Cancel in 1 click · Your files stay on this PC"));
  rpApplyHeight();
}

function rpApplyHeight() {
  const panel = document.getElementById("rp");
  if (!panel) return;
  const h = panel.clientHeight;
  panel.querySelectorAll("[data-rp-hide-below]").forEach((el) => { el.hidden = h < Number(el.dataset.rpHideBelow); });
}

function bindRetrioProPanel() {
  const card = document.getElementById("rpCard");
  if (card) card.addEventListener("click", (e) => {
    const row = e.target.closest(".rp-row"); if (!row) return;
    const i = Number(row.dataset.i);
    rpOpenRow = rpOpenRow === i ? -1 : i;
    card.querySelectorAll(".rp-row").forEach((r) => r.classList.toggle("open", Number(r.dataset.i) === rpOpenRow));
  });
  const btn = document.getElementById("rpBtn");
  if (btn) btn.addEventListener("click", () => { const d = document.getElementById("proDiscoverBtn"); if (d) d.click(); });
  const panel = document.getElementById("rp");
  if (panel && window.ResizeObserver) new ResizeObserver(rpApplyHeight).observe(panel);
  window.addEventListener("retrio-language-changed", renderRetrioProPanel);
}

// -------------------- Navigation --------------------
function bindNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-content").forEach((el) => (el.hidden = true));
      const map = { recherche: "tabRecherche", doublons: "tabDoublons", ranger: "tabRanger", nettoyage: "tabNettoyage" };
      const el = document.getElementById(map[tab]);
      el.hidden = false;
      const core = document.getElementById("rechercheCore");
      if (core) core.hidden = tab !== "recherche";
      if (tab === "ranger" || tab === "doublons" || tab === "nettoyage") {
        renderToolTab(tab, el);
      }
    });
  });
}

const LOCKED_TABS = {
  doublons: {
    eyebrow: "RETRIO PRO",
    headlineFor: (n) => `${n} doublons se cachent dans votre ordinateur.`,
    title: "Récupérez de l'espace disque en un clic.",
    subtitle:
      "Retrio repère les fichiers strictement identiques sur votre ordinateur et vous laisse choisir lesquels garder.",
    bullets: [
      "Détection des doublons stricts, sans aucune limite",
      "Aperçu et comparaison avant toute suppression",
      "Suppression groupée, toujours envoyée à la corbeille",
    ],
    video: "demo-doublons.mp4",
  },
  ranger: {
    eyebrow: "RETRIO PRO",
    headlineFor: (n) => `${n} fichiers traînent, mal rangés.`,
    title: "Un classement automatique, sans effort.",
    subtitle:
      "Vos fichiers rangés par type, par date ou par fournisseur — sans jamais rien déplacer sans votre accord.",
    bullets: [
      "Classement par type, par date ou par type puis année",
      "Vous validez chaque déplacement, rien n'est automatique",
      "Renommage intelligent selon des règles simples (date, fournisseur, contenu…)",
    ],
    video: "demo-ranger.mp4",
  },
  nettoyage: {
    eyebrow: "RETRIO PRO",
    headlineFor: (n) => `${n} d'espace disque à récupérer.`,
    title: "Un nettoyage plus profond qu'un simple vide-cache.",
    subtitle:
      "Retrio traque ce qui encombre vraiment votre disque, bien au-delà des doublons évidents.",
    bullets: [
      "Quasi-doublons repérés par le contenu, pas juste le nom",
      "Téléchargements oubliés depuis des mois",
      "Photos en rafale regroupées automatiquement",
      "Score de santé de votre PC à chaque analyse",
    ],
    video: "demo-nettoyage.mp4",
  },
};

function buildLockedTab(key, el) {
  const info = LOCKED_TABS[key];
  const teaserValue = state.teasers[key] || TEASER_FALLBACK[key];
  el.classList.add("locked-tab");
  const videoBlock = info.video
    ? `<div class="locked-tab-video-label">VOIR LA DÉMO</div>
       <div class="locked-tab-video">
         <video class="demo-video" id="lockedTabVideo" controls autoplay muted loop playsinline preload="auto">
           <source src="${info.video}" type="video/mp4">
         </video>
         <div class="locked-tab-video-error" id="lockedTabVideoError" hidden>Vidéo indisponible pour le moment.</div>
         <button type="button" class="locked-tab-fs" id="lockedTabFsBtn" title="Plein écran" aria-label="Plein écran">⛶</button>
       </div>`
    : `<div class="locked-tab-video-label">VOIR LA DÉMO</div>
       <div class="locked-tab-video locked-tab-video-soon"><div class="locked-tab-soon">Démo vidéo bientôt disponible</div></div>`;
  el.innerHTML = `
    <div class="locked-tab-grid">
      <div class="locked-tab-copy">
        <div class="locked-tab-eyebrow"><span class="locked-tab-pill">${escapeHtml(info.eyebrow)}</span></div>
        <h2>${escapeHtml(info.headlineFor ? info.headlineFor(teaserValue) : info.title)}</h2>
        <p class="locked-tab-subtitle">${escapeHtml(info.subtitle)}</p>
        <ul>${info.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
        <div class="locked-tab-actions">
          <button class="btn btn-pro">Passer à Retrio Pro — 9,99 €/mois</button>
        </div>
        <div class="locked-tab-reassurance">Sans engagement · Vos fichiers restent sur votre ordinateur</div>
      </div>
      <div class="locked-tab-video-col">${videoBlock}</div>
    </div>
  `;
  if (info.video) {
    const vid = document.getElementById("lockedTabVideo");
    const fsBtn = document.getElementById("lockedTabFsBtn");
    const errBox = document.getElementById("lockedTabVideoError");
    if (vid) {
      vid.play().catch(() => {});
      vid.addEventListener("error", () => {
        if (errBox) errBox.hidden = false;
        console.error("Retrio: échec de chargement de la vidéo", info.video);
      });
    }
    if (fsBtn && vid) {
      fsBtn.onclick = () => {
        if (vid.requestFullscreen) vid.requestFullscreen().catch(() => {});
        else if (vid.webkitRequestFullscreen) vid.webkitRequestFullscreen();
      };
    }
  }
}

function renderToolTab(tab, el) {
  el.classList.remove("locked-tab");
  if (isEffectivePremium()) {
    if (tab === "ranger") renderRangerTab(el);
    else if (tab === "doublons") renderDoublonsTab(el);
    else if (tab === "nettoyage") renderNettoyageTab(el);
  } else {
    buildLockedTab(tab, el);
  }
}

// -------------------- Ranger vos documents (bêta fonctionnelle) --------------------
const RANGER_SCHEMES = [
  { value: "type", label: "Par type de fichier" },
  { value: "date", label: "Par date (année / mois)" },
  { value: "type_date", label: "Par type, puis par année" },
];
const RANGER_SORTS = [
  { value: "name", label: "Nom (A → Z)" },
  { value: "date", label: "Date (récent d'abord)" },
  { value: "size", label: "Taille (plus gros d'abord)" },
];
const RANGER_CATEGORY_LABELS = {
  pdf: "PDF", images: "Photos & images", videos: "Vidéos", audio: "Musique & audio",
  documents: "Autres documents", archives: "Archives", autres: "Autres fichiers",
};

async function renderRangerTab(el) {
  if (!state.hasScanned) {
    el.className = "tab-content";
    el.innerHTML = `<div class="pro-tool-empty"><h2>Analysez d'abord vos dossiers</h2><p>Retrio utilise la dernière analyse pour préparer le rangement. Revenez à Recherche, choisissez vos dossiers et lancez l'analyse.</p><button class="btn btn-primary ranger-go-search">Retour à la recherche</button></div>`;
    el.querySelector(".ranger-go-search").onclick = () => document.querySelector('.nav-item[data-tab="recherche"]').click();
    return;
  }
  el.className = "tab-content ranger-tab";
  el.innerHTML = `<div class="ranger-loading">Préparation du rangement…</div>`;
  await loadRangerSuggestions(el);
}

async function loadRangerSuggestions(el) {
  const data = JSON.parse(await api().organize_suggestions(state.ranger.scheme));
  state.ranger.suggestions = data.suggestions;
  state.ranger.freeLimit = data.free_limit;
  state.ranger.selected = new Set();
  renderRangerList(el);
}

function rangerCounts() {
  const counts = { tous: state.ranger.suggestions.length };
  state.ranger.suggestions.forEach((s) => { counts[s.category] = (counts[s.category] || 0) + 1; });
  return counts;
}

function renderRangerList(el) {
  const { suggestions, filter, sort, scheme, freeLimit, selected } = state.ranger;
  const counts = rangerCounts();
  const filtered = filter === "tous" ? suggestions.slice() : suggestions.filter((s) => s.category === filter);
  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name, window.retrioI18n ? window.retrioI18n.language : "fr"),
    date: (a, b) => b.mtime - a.mtime,
    size: (a, b) => b.size - a.size,
  };
  filtered.sort(sorters[sort]);

  const categoryChips = ["tous", ...Object.keys(RANGER_CATEGORY_LABELS)]
    .filter((key) => key === "tous" || counts[key])
    .map((key) => `<button class="chip chip-ranger-filter${filter === key ? " active" : ""}" data-key="${key}">${key === "tous" ? `Tous (${counts.tous || 0})` : `${RANGER_CATEGORY_LABELS[key]} (${counts[key] || 0})`}</button>`)
    .join("");

  el.innerHTML = `
    <div class="tool-head">
      <div>
        <div class="pro-eyebrow">RANGEMENT · BÊTA</div>
        <h2>${suggestions.length} proposition(s) de classement</h2>
        <p>Chaque déplacement est affiché avant validation. Aucun fichier existant n'est écrasé.</p>
      </div>
    </div>
    <div class="ranger-toolbar">
      <label class="ranger-select">Classer <select id="rangerScheme">${RANGER_SCHEMES.map((s) => `<option value="${s.value}"${s.value === scheme ? " selected" : ""}>${s.label}</option>`).join("")}</select></label>
      <label class="ranger-select">Trier par <select id="rangerSort">${RANGER_SORTS.map((s) => `<option value="${s.value}"${s.value === sort ? " selected" : ""}>${s.label}</option>`).join("")}</select></label>
    </div>
    <div class="filter-row ranger-filter-row">${categoryChips}</div>
    <div class="ranger-bulk-row">
      <label class="ranger-select-all"><input type="checkbox" id="rangerSelectAll"> Tout sélectionner</label>
      <span class="ranger-selected-count" id="rangerSelectedCount">${selected.size} sélectionné(s)</span>
      <button class="btn btn-primary" id="rangerBulkValidate" disabled>Valider la sélection</button>
    </div>
    <div class="tool-list" id="rangerList"></div>
  `;

  document.getElementById("rangerScheme").onchange = async (e) => {
    state.ranger.scheme = e.target.value;
    el.innerHTML = `<div class="ranger-loading">Préparation du rangement…</div>`;
    await loadRangerSuggestions(el);
  };
  document.getElementById("rangerSort").onchange = (e) => { state.ranger.sort = e.target.value; renderRangerList(el); };
  el.querySelectorAll(".chip-ranger-filter").forEach((chip) => {
    chip.onclick = () => { state.ranger.filter = chip.dataset.key; renderRangerList(el); };
  });

  const listEl = document.getElementById("rangerList");
  if (!filtered.length) {
    listEl.innerHTML = '<div class="tool-empty">Aucun fichier à classer dans cette catégorie.</div>';
  } else {
    const actionable = filtered.slice(0, freeLimit);
    const locked = filtered.slice(freeLimit);
    actionable.forEach((item) => listEl.appendChild(buildRangerCard(item, el)));
    if (locked.length) {
      const upsell = document.createElement("article");
      upsell.className = "tool-card ranger-upsell";
      upsell.innerHTML = `<strong>+${locked.length} autre(s) fichier(s) à classer</strong><p>Passez à Retrio Pro pour ranger tous vos fichiers en un clic, sans limite.</p><button class="btn btn-pro">Découvrir Retrio Pro</button>`;
      listEl.appendChild(upsell);
    }
  }

  const selectAll = document.getElementById("rangerSelectAll");
  selectAll.onchange = () => {
    listEl.querySelectorAll(".ranger-check").forEach((cb) => {
      cb.checked = selectAll.checked;
      toggleRangerSelection(cb.dataset.path, selectAll.checked);
    });
    updateRangerBulkUI();
  };
  document.getElementById("rangerBulkValidate").onclick = () => applyRangerBulk(el);
  updateRangerBulkUI();
}

function buildRangerCard(item, el) {
  const card = document.createElement("article");
  card.className = "tool-card organize-card";
  const dateLabel = new Date(item.mtime * 1000).toLocaleDateString(window.retrioI18n ? window.retrioI18n.locale : "fr-FR");
  card.innerHTML = `
    <label class="ranger-check-wrap"><input type="checkbox" class="ranger-check" data-path="${escapeHtml(item.path)}"></label>
    <div class="ranger-card-body">
      <span class="reason-label">${escapeHtml(item.reason)}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <small>→ ${escapeHtml(item.target)}</small>
      <small class="ranger-meta">${escapeHtml(item.size_human)} · ${dateLabel}</small>
    </div>
    <button class="btn btn-primary organize-action">Valider</button>
  `;
  card.querySelector(".ranger-check").onchange = (e) => { toggleRangerSelection(item.path, e.target.checked); updateRangerBulkUI(); };
  card.querySelector(".organize-action").onclick = async (evt) => {
    evt.currentTarget.disabled = true;
    const result = await api().apply_organization(item.path, item.target);
    if (result.ok) {
      card.classList.add("done");
      card.innerHTML = '<strong>✓ Fichier classé</strong><small>' + escapeHtml(result.path) + '</small>';
      state.ranger.selected.delete(item.path);
      state.ranger.suggestions = state.ranger.suggestions.filter((s) => s.path !== item.path);
      updateRangerBulkUI();
    } else {
      evt.currentTarget.disabled = false;
      alert(result.error);
    }
  };
  return card;
}

function toggleRangerSelection(path, checked) {
  if (checked) state.ranger.selected.add(path);
  else state.ranger.selected.delete(path);
}

function updateRangerBulkUI() {
  const count = state.ranger.selected.size;
  const countEl = document.getElementById("rangerSelectedCount");
  if (countEl) countEl.textContent = `${count} sélectionné(s)`;
  const btn = document.getElementById("rangerBulkValidate");
  if (btn) btn.disabled = count === 0;
}

async function applyRangerBulk(el) {
  const items = state.ranger.suggestions.filter((s) => state.ranger.selected.has(s.path)).map((s) => ({ path: s.path, target: s.target }));
  if (!items.length) return;
  const btn = document.getElementById("rangerBulkValidate");
  btn.disabled = true;
  btn.textContent = "Classement en cours…";
  const data = JSON.parse(await api().apply_organization_bulk(JSON.stringify(items)));
  const okSources = new Set(data.results.filter((r) => r.ok).map((r) => r.source));
  state.ranger.suggestions = state.ranger.suggestions.filter((s) => !okSources.has(s.path));
  state.ranger.selected = new Set();
  if (data.failed) alert(`${data.failed} fichier(s) n'ont pas pu être déplacés.`);
  renderRangerList(el);
}

// -------------------- Doublons (bêta fonctionnelle) --------------------
async function renderDoublonsTab(el) {
  if (!state.hasScanned) {
    el.className = "tab-content";
    el.innerHTML = `<div class="pro-tool-empty"><h2>Analysez d'abord vos dossiers</h2><p>Retrio utilise la dernière analyse pour repérer les doublons. Revenez à Recherche, choisissez vos dossiers et lancez l'analyse.</p><button class="btn btn-primary ranger-go-search">Retour à la recherche</button></div>`;
    el.querySelector(".ranger-go-search").onclick = () => document.querySelector('.nav-item[data-tab="recherche"]').click();
    return;
  }
  el.className = "tab-content ranger-tab";
  el.innerHTML = `<div class="ranger-loading">Recherche des doublons…</div>`;
  await loadDoublonsGroups(el);
}

async function loadDoublonsGroups(el) {
  const data = JSON.parse(await api().find_duplicates());
  state.doublons.groups = data.groups;
  state.doublons.freeLimit = data.free_limit;
  state.doublons.totalRecoverable = data.total_recoverable_human;
  state.doublons.selected = new Set();
  renderDoublonsList(el);
}

function renderDoublonsList(el) {
  const { groups, freeLimit, totalRecoverable } = state.doublons;

  el.innerHTML = `
    <div class="tool-head">
      <div>
        <div class="pro-eyebrow">DOUBLONS · BÊTA</div>
        <h2>${groups.length} groupe(s) de doublons détecté(s)</h2>
        <p>${groups.length ? `Espace récupérable estimé : ${escapeHtml(totalRecoverable)}.` : "Aucun doublon exact trouvé dans la dernière analyse."}</p>
      </div>
      <button class="btn-mini" id="doublonsDemoBtn">Voir la démo</button>
    </div>
    <div class="ranger-bulk-row">
      <span class="ranger-selected-count" id="doublonsSelectedCount">0 fichier(s) sélectionné(s)</span>
      <button class="btn btn-primary" id="doublonsBulkValidate" disabled>Supprimer la sélection (corbeille)</button>
    </div>
    <div class="tool-list" id="doublonsList"></div>
  `;

  const listEl = document.getElementById("doublonsList");
  if (!groups.length) {
    listEl.innerHTML = '<div class="tool-empty">Rien à nettoyer pour le moment.</div>';
  } else {
    const actionable = groups.slice(0, freeLimit);
    const locked = groups.slice(freeLimit);
    actionable.forEach((group, idx) => listEl.appendChild(buildDoublonsGroupCard(group, idx, el)));
    if (locked.length) {
      const upsell = document.createElement("article");
      upsell.className = "tool-card ranger-upsell";
      upsell.innerHTML = `<strong>+${locked.length} autre(s) groupe(s) de doublons</strong><p>Passez à Retrio Pro pour nettoyer tous vos doublons en un clic, sans limite.</p><button class="btn btn-pro">Découvrir Retrio Pro</button>`;
      listEl.appendChild(upsell);
    }
  }

  document.getElementById("doublonsBulkValidate").onclick = () => applyDoublonsBulk(el);
  document.getElementById("doublonsDemoBtn").onclick = () => {
    const dlg = document.getElementById("demoDialogDoublons");
    const vid = document.getElementById("demoVideoDoublons");
    dlg.showModal();
    vid.currentTime = 0;
    vid.play().catch(() => {});
  };
  updateDoublonsBulkUI();
}

function buildDoublonsGroupCard(group, idx, el) {
  const card = document.createElement("article");
  card.className = "tool-card doublons-group-card";
  const rowsHtml = group.files.map((file, fIdx) => `
    <label class="doublons-file-row${file.keep ? " is-keep" : ""}">
      <input type="radio" class="doublons-radio" name="doublons-keep-${idx}" data-group="${idx}" data-path="${escapeHtml(file.path)}" ${file.keep ? "checked" : ""}>
      <div class="doublons-file-body">
        <strong>${escapeHtml(file.name)}</strong>
        <small>${escapeHtml(file.dir)}</small>
      </div>
      ${file.keep ? '<span class="reason-label">À conserver</span>' : ""}
    </label>
  `).join("");
  card.innerHTML = `
    <div class="doublons-group-head">
      <span class="reason-label">${group.files.length} copies identiques</span>
      <small class="ranger-meta">${escapeHtml(group.size_human)} chacune · ${escapeHtml(group.recoverable)} récupérables</small>
    </div>
    <div class="doublons-files">${rowsHtml}</div>
    <div class="doublons-status"></div>
  `;
  const updateSelectionFromCard = () => {
    const keepPath = card.querySelector(`input[name="doublons-keep-${idx}"]:checked`).dataset.path;
    group.files.forEach((file) => {
      if (file.path === keepPath) state.doublons.selected.delete(file.path);
      else state.doublons.selected.add(file.path);
    });
    updateDoublonsBulkUI();
  };
  card.querySelectorAll(".doublons-radio").forEach((radio) => {
    radio.onchange = updateSelectionFromCard;
  });
  updateSelectionFromCard();
  return card;
}

function updateDoublonsBulkUI() {
  const count = state.doublons.selected.size;
  const countEl = document.getElementById("doublonsSelectedCount");
  if (countEl) countEl.textContent = `${count} fichier(s) sélectionné(s)`;
  const btn = document.getElementById("doublonsBulkValidate");
  if (btn) btn.disabled = count === 0;
}

async function applyDoublonsBulk(el) {
  const paths = [...state.doublons.selected];
  if (!paths.length) return;
  if (!confirm(`Envoyer ${paths.length} fichier(s) à la corbeille ?`)) return;
  const btn = document.getElementById("doublonsBulkValidate");
  btn.disabled = true;
  btn.textContent = "Suppression en cours…";
  const data = JSON.parse(await api().move_to_trash_bulk(JSON.stringify(paths)));
  if (data.failed) alert(`${data.failed} fichier(s) n'ont pas pu être supprimés.`);
  await loadDoublonsGroups(el);
}

// -------------------- Nettoyage (bêta fonctionnelle) --------------------
const NETTOYAGE_KIND_LABELS = {
  junk: "Fichiers temporaires & caches",
  old_large: "Gros fichiers anciens",
  near_duplicate: "Quasi-doublons (analyse de contenu)",
  forgotten_download: "Téléchargements oubliés",
  burst_photo: "Photos en rafale",
};
const NETTOYAGE_KIND_ORDER = ["near_duplicate", "burst_photo", "forgotten_download", "old_large", "junk"];

async function renderNettoyageTab(el) {
  if (!state.hasScanned) {
    el.className = "tab-content";
    el.innerHTML = `<div class="pro-tool-empty"><h2>Analysez d'abord vos dossiers</h2><p>Retrio utilise la dernière analyse pour repérer les fichiers à nettoyer. Revenez à Recherche, choisissez vos dossiers et lancez l'analyse.</p><button class="btn btn-primary ranger-go-search">Retour à la recherche</button></div>`;
    el.querySelector(".ranger-go-search").onclick = () => document.querySelector('.nav-item[data-tab="recherche"]').click();
    return;
  }
  el.className = "tab-content ranger-tab";
  el.innerHTML = `<div class="ranger-loading">Analyse approfondie en cours (contenu, doublons, photos)…</div>`;
  await loadNettoyageSuggestions(el);
}

async function loadNettoyageSuggestions(el) {
  const data = JSON.parse(await api().cleanup_suggestions());
  state.nettoyage.items = data.items;
  state.nettoyage.freeLimit = data.free_limit;
  state.nettoyage.totalRecoverable = data.total_recoverable_human;
  state.nettoyage.healthScore = data.health_score;
  state.nettoyage.healthLabel = data.health_label;
  state.nettoyage.counts = data.counts;
  state.nettoyage.selected = new Set();
  renderNettoyageList(el);
}

function renderNettoyageList(el) {
  const { items, freeLimit, totalRecoverable, selected, healthScore, healthLabel, counts } = state.nettoyage;

  el.innerHTML = `
    <div class="tool-head">
      <div>
        <div class="pro-eyebrow">NETTOYAGE · BÊTA</div>
        <h2>Nettoyage profond</h2>
        <p>${items.length ? `${items.length} fichier(s) repérés · espace récupérable estimé : ${escapeHtml(totalRecoverable)}.` : "Rien à signaler pour le moment : votre PC est propre."}</p>
      </div>
    </div>
    <div class="health-banner">
      <div class="health-score-circle">${healthScore ?? "–"}</div>
      <div class="health-banner-body">
        <strong>Score de santé : ${escapeHtml(healthLabel || "")}</strong>
        <small>Basé sur les fichiers temporaires, quasi-doublons, téléchargements oubliés et photos en rafale détectés dans votre dernière analyse.</small>
      </div>
    </div>
    <div class="ranger-bulk-row">
      <label class="ranger-select-all"><input type="checkbox" id="nettoyageSelectAll"> Tout sélectionner</label>
      <span class="ranger-selected-count" id="nettoyageSelectedCount">${selected.size} sélectionné(s)</span>
      <button class="btn btn-primary" id="nettoyageBulkValidate" disabled>Supprimer la sélection (corbeille)</button>
    </div>
    <div id="nettoyageSections"></div>
  `;

  const sectionsEl = document.getElementById("nettoyageSections");
  if (!items.length) {
    sectionsEl.innerHTML = '<div class="tool-empty">Aucun fichier temporaire, quasi-doublon ou oublié détecté.</div>';
  } else {
    const actionable = items.slice(0, freeLimit);
    const locked = items.slice(freeLimit);
    const byKind = {};
    actionable.forEach((item) => { (byKind[item.kind] = byKind[item.kind] || []).push(item); });

    NETTOYAGE_KIND_ORDER.filter((kind) => byKind[kind]?.length).forEach((kind) => {
      const section = document.createElement("div");
      section.innerHTML = `<div class="nettoyage-section-title">${escapeHtml(NETTOYAGE_KIND_LABELS[kind])} (${counts?.[kind] ?? byKind[kind].length})</div>`;
      const list = document.createElement("div");
      list.className = "tool-list";
      byKind[kind].forEach((item) => list.appendChild(buildNettoyageCard(item)));
      section.appendChild(list);
      sectionsEl.appendChild(section);
    });

    if (locked.length) {
      const upsell = document.createElement("article");
      upsell.className = "tool-card ranger-upsell nettoyage-upsell";
      upsell.innerHTML = `
        <strong>+${locked.length} élément(s) supplémentaire(s) détecté(s)</strong>
        <p>Retrio Pro va plus loin qu'un simple nettoyeur de cache :</p>
        <ul>
          <li>Quasi-doublons repérés par le <strong>contenu</strong> des documents, pas juste leur nom</li>
          <li>Téléchargements oubliés depuis des mois</li>
          <li>Photos en rafale regroupées automatiquement</li>
          <li>Score de santé complet, mis à jour à chaque analyse</li>
        </ul>
        <button class="btn btn-pro">Découvrir Retrio Pro</button>`;
      sectionsEl.appendChild(upsell);
    }
  }

  const selectAll = document.getElementById("nettoyageSelectAll");
  selectAll.onchange = () => {
    sectionsEl.querySelectorAll(".ranger-check").forEach((cb) => {
      cb.checked = selectAll.checked;
      toggleNettoyageSelection(cb.dataset.path, selectAll.checked);
    });
    updateNettoyageBulkUI();
  };
  document.getElementById("nettoyageBulkValidate").onclick = () => applyNettoyageBulk(el);
  updateNettoyageBulkUI();
}

function buildNettoyageCard(item) {
  const card = document.createElement("article");
  card.className = "tool-card organize-card";
  card.innerHTML = `
    <label class="ranger-check-wrap"><input type="checkbox" class="ranger-check" data-path="${escapeHtml(item.path)}"></label>
    <div class="ranger-card-body">
      <span class="reason-label">${escapeHtml(item.reason)}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <small>${escapeHtml(item.dir)}</small>
      <small class="ranger-meta">${escapeHtml(item.size_human)}</small>
    </div>
  `;
  card.querySelector(".ranger-check").onchange = (e) => { toggleNettoyageSelection(item.path, e.target.checked); updateNettoyageBulkUI(); };
  return card;
}

function toggleNettoyageSelection(path, checked) {
  if (checked) state.nettoyage.selected.add(path);
  else state.nettoyage.selected.delete(path);
}

function updateNettoyageBulkUI() {
  const count = state.nettoyage.selected.size;
  const countEl = document.getElementById("nettoyageSelectedCount");
  if (countEl) countEl.textContent = `${count} sélectionné(s)`;
  const btn = document.getElementById("nettoyageBulkValidate");
  if (btn) btn.disabled = count === 0;
}

async function applyNettoyageBulk(el) {
  const paths = [...state.nettoyage.selected];
  if (!paths.length) return;
  if (!confirm(`Envoyer ${paths.length} fichier(s) à la corbeille ?`)) return;
  const btn = document.getElementById("nettoyageBulkValidate");
  btn.disabled = true;
  btn.textContent = "Suppression en cours…";
  const data = JSON.parse(await api().move_to_trash_bulk(JSON.stringify(paths)));
  if (data.failed) alert(`${data.failed} fichier(s) n'ont pas pu être supprimés.`);
  await loadNettoyageSuggestions(el);
}

// -------------------- Réglages / dossiers --------------------
function renderFolderChecks() {
  const wrap = document.getElementById("folderChecks");
  wrap.innerHTML = "";
  Object.keys(state.knownFolders).forEach((label) => {
    const id = "chk_" + label.replace(/[^a-zA-Z0-9]/g, "_");
    const checked = label === "Documents" || label === "Téléchargements";
    const row = document.createElement("div");
    row.className = "folder-check";
    row.innerHTML = `<input type="checkbox" id="${id}" ${checked ? "checked" : ""}><label for="${id}">${escapeHtml(label)}</label>`;
    wrap.appendChild(row);
  });
}

function bindAddFolder() {
  document.getElementById("addFolderBtn").addEventListener("click", async () => {
    const path = await api().pick_folder();
    if (path) {
      state.customFolders.push(path);
      renderCustomFolders();
    }
  });
}

function renderCustomFolders() {
  const wrap=document.getElementById('customFoldersLabel');wrap.innerHTML='';
  state.customFolders=[...new Set(state.customFolders)];
  state.customFolders.forEach(path=>{const button=document.createElement('button');button.className='btn-mini';button.textContent=path+' ×';button.title='Retirer ce dossier de la prochaine analyse';button.onclick=()=>{state.customFolders=state.customFolders.filter(p=>p!==path);renderCustomFolders();};wrap.appendChild(button);});
}

function selectedRoots() {
  const roots = [];
  Object.keys(state.knownFolders).forEach((label) => {
    const id = "chk_" + label.replace(/[^a-zA-Z0-9]/g, "_");
    const cb = document.getElementById(id);
    if (cb && cb.checked) roots.push(state.knownFolders[label]);
  });
  return [...new Set([...roots, ...state.customFolders])];
}

// -------------------- Analyse --------------------
function bindAnalyze() {
  document.getElementById("stopBtn").addEventListener("click", async () => {
    await api().stop_scan();
    setStatus("Arrêt en cours… Les fichiers déjà lus resteront disponibles.");
  });
  document.getElementById("analyzeBtn").addEventListener("click", async () => {
    if (state.scanning) return;
    const roots = selectedRoots();
    if (roots.length === 0) {
      setStatus("Sélectionnez au moins un dossier avant de lancer l'analyse.");
      return;
    }
    state.scanning = true;
    const btn = document.getElementById("analyzeBtn");
    btn.disabled = true;
    btn.textContent = "Analyse en cours…";
    document.getElementById("progressTrack").hidden = false;
    setStatus("Analyse en cours (lecture du contenu des documents)…");
    document.getElementById("stopBtn").hidden = false;
    document.getElementById("pdfReport").hidden = true;
    try {
      if (!await api().start_scan(roots)) window.onScanError("Une analyse est déjà en cours ou la sélection est invalide.");
    } catch (_) { window.onScanError("Impossible de démarrer l’analyse. Réessayez."); }
  });
}

// Appelé depuis Python (window.evaluate_js) pendant le scan
window.onScanProgress = function (nFiles, currentPath) {
  const shown = currentPath.length < 60 ? currentPath : "…" + currentPath.slice(-57);
  setStatus(`${nFiles} fichiers analysés — ${shown}`);
};

// Appelé depuis Python à la fin du scan, avec le résumé JSON
window.onScanDone = function (resultJson) {
  const result = JSON.parse(resultJson);
  state.scanning = false;
  state.hasScanned = true;

  document.getElementById("progressTrack").hidden = true;
  const btn = document.getElementById("analyzeBtn");
  btn.disabled = false;
  btn.textContent = "▶  Relancer l'analyse";

  setStatus(
    `${result.cancelled ? "Analyse arrêtée" : "Analyse terminée"} : ${result.total_files} fichiers, ${result.total_size_human} — ` +
    `${result.content_indexed_count} fichiers indexés en contenu.`
  );

  document.getElementById("stopBtn").hidden = true;
  const report = document.getElementById("pdfReport");
  report.hidden = false;
  report.textContent = `${result.pdf_read || 0} PDF lus, dont ${result.pdf_ocr || 0} par OCR local. ` +
    `${result.pdf_unread || 0} PDF sans contenu lisible ; ${result.pdf_partial || 0} partiellement lus. ` +
    `${result.errors || 0} élément(s) inaccessible(s) ou non disponible(s) localement.`;
  for (const issue of result.pdf_issues || []) {
    const line = document.createElement("div");
    line.textContent = `${issue.name} : ${issue.status}`;
    line.title = [issue.path, ...(issue.details || [])].join("\n");
    report.appendChild(line);
  }
  document.getElementById("statFiles").textContent = result.total_files;
  document.getElementById("statPdf").textContent = result.counts.pdf || 0;
  document.getElementById("statImages").textContent = result.counts.images || 0;
  document.getElementById("statSize").textContent = result.total_size_human;

  setFilterLabel("tous", `Tous (${result.total_files})`);
  setFilterLabel("pdf", `PDF (${result.counts.pdf || 0})`);
  setFilterLabel("image", `Images (${result.counts.images || 0})`);
  setFilterLabel("doc", `Documents (${result.counts.documents || 0})`);

  const scope = document.getElementById('folderScope');
  scope.innerHTML = '<option value="">Tous les dossiers analysés</option>';
  (result.roots || []).forEach(path => {const option=document.createElement('option'); option.value=path; option.textContent=path; scope.appendChild(option);});
  const q = document.getElementById("searchInput").value.trim();
  if (q) runSearch(q);
  else runSearch("");

  if (!isEffectivePremium()) refreshTeasers();
};

window.onScanError = function(message) {
  state.scanning = false;
  const button = document.getElementById("analyzeBtn");
  button.disabled = false;
  button.textContent = "Relancer l’analyse";
  document.getElementById("stopBtn").hidden = true;
  document.getElementById("progressTrack").hidden = true;
  setStatus(message);
};

function setStatus(text) {
  document.getElementById("statusText").textContent = text;
}
function setFilterLabel(key, label) {
  const chip = document.querySelector(`.chip-filter[data-key="${key}"]`);
  if (chip) chip.textContent = label;
}

// -------------------- Recherche --------------------
function bindSearch() {
  const input = document.getElementById("searchInput");
  document.getElementById("searchBtn").addEventListener("click", () => runSearch(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch(input.value);
  });
  document.querySelectorAll(".chip-suggest").forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.dataset.q;
      runSearch(chip.dataset.q);
    });
  });
}

function bindFilters() {
  document.querySelectorAll(".chip-filter").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip-filter").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.typeFilter = chip.dataset.key;
      runSearch(document.getElementById("searchInput").value);
    });
  });
}

async function runSearch(query) {
  if (query !== state.lastQuery && /\b(photos?|images?)\b/i.test(query || '')) {
    state.typeFilter='image';
    document.querySelectorAll('.chip-filter').forEach(c => c.classList.toggle('active', c.dataset.key === 'image'));
  } else if (query !== state.lastQuery && /\bpdfs?\b/i.test(query || '')) {
    state.typeFilter='pdf';
    document.querySelectorAll('.chip-filter').forEach(c => c.classList.toggle('active', c.dataset.key === 'pdf'));
  }
  state.lastQuery = query || "";
  if (!state.hasScanned) {
    document.getElementById("resultsCount").textContent = "Lancez d'abord une analyse pour pouvoir rechercher.";
    renderResults([], query);
    return;
  }
  const requestId = state.requestId = (state.requestId || 0) + 1;
  const resultJson = await api().search(query || "", state.typeFilter, document.getElementById("folderScope").value);
  if (requestId !== state.requestId) return;
  const { matches, count_label, limit_reached, searches_left, free_limit } = JSON.parse(resultJson);
  const en = !!(window.retrioI18n && window.retrioI18n.language === "en");
  if (limit_reached) {
    document.getElementById("resultsCount").textContent = en ? ("You have used your " + (free_limit || 10) + " free searches.") : ("Vous avez utilisé vos " + (free_limit || 10) + " recherches gratuites.");
    renderResults([], "");
    openProDialogForLimit();
    return;
  }
  let label = count_label;
  if (typeof searches_left === "number" && label) {
    label += searches_left > 0 ? (en ? (" · " + searches_left + " free search" + (searches_left > 1 ? "es" : "") + " left") : (" · " + searches_left + " recherche" + (searches_left > 1 ? "s" : "") + " gratuite" + (searches_left > 1 ? "s" : "") + " restante" + (searches_left > 1 ? "s" : ""))) : (en ? " · last free search" : " · dernière recherche gratuite");
  }
  document.getElementById("resultsCount").textContent = label;
  renderResults(matches, query);
}

function renderResults(matches, query) {
  const list = document.getElementById("resultsList");
  list.innerHTML = "";
  document.getElementById('feedback').hidden = !query || !state.hasScanned;
  document.getElementById('refineHelp').hidden = !!matches.length;
  if (!matches || matches.length === 0) {
    const msg = query && query.trim() ? `Aucun résultat pour « ${escapeHtml(query)} ».` : "Lancez une recherche pour voir vos fichiers.";
    list.innerHTML = `<div class="empty-state">${msg}<p>Essayez un fournisseur ou moins de mots. Vérifiez que le dossier du PDF est sélectionné, puis relancez l’analyse. Le bilan PDF signale les documents non lisibles.</p></div>`;
    return;
  }
  document.getElementById('feedback').hidden = !query;
  document.getElementById('refineHelp').hidden = !!matches.length;
  document.getElementById('feedbackText').textContent = 'Ces résultats vous conviennent-ils ?';
  matches.forEach((entry, index) => {
    const row = document.createElement("div");
    row.className = "result-row" + (index === 0 && query.trim() ? " best-match" : "");
    row.innerHTML = `
      <div class="result-badge" style="background:${entry.badge_color}">${escapeHtml(entry.badge_label)}</div>
      <div class="result-body">
        ${index === 0 && query.trim() ? '<div class="best-label">★ Meilleure correspondance parmi les résultats</div>' : ""}<div class="result-title-row">
          <span class="result-name">${escapeHtml(entry.name)}</span>
          ${entry.badly_named ? '<span class="result-badly-named">nom peu explicite</span>' : ""}
        </div>
        ${entry.snippet ? `<div class="result-snippet">« ${escapeHtml(entry.snippet)} »</div>` : ""}
        <div class="result-meta">${escapeHtml(entry.read_status || "")}${entry.page ? ` · Page ${entry.page}` : ""}${entry.method === "OCR" ? " · Texte reconnu par OCR" : ""}</div>
        <div class="result-meta">${escapeHtml(entry.dir)} · ${escapeHtml(entry.size_human)}</div>
        <div class="result-actions">
          <button class="btn-mini" data-act="open">Ouvrir</button>
          <button class="btn-mini" data-act="folder">Dossier</button>
          <button class="btn-mini" data-act="copy">Copier le chemin</button>
        </div>
      </div>
    `;
    row.querySelector('[data-act="open"]').addEventListener("click", async () => {
      if (!await api().open_path(entry.path)) alert("Impossible d’ouvrir ce fichier. Vérifiez qu’il existe encore et qu’une application compatible est installée.");
    });
    row.querySelector('[data-act="folder"]').addEventListener("click", async () => {
      if (!await api().open_folder(entry.path)) alert("Impossible d’ouvrir le dossier de ce fichier.");
    });
    row.querySelector('[data-act="copy"]').addEventListener("click", async () => {
      if (!await api().copy_path(entry.path)) alert("Impossible de copier le chemin de ce fichier.");
    });
    list.appendChild(row);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : String(str);
  return d.innerHTML;
}
