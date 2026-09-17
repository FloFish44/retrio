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
  return Number(n).toLocaleString("fr-FR");
}

function api() { return window.pywebview && window.pywebview.api; }

// -------------------- Attente que le pont pywebview soit prêt --------------------
function whenReady(cb) {
  if (window.pywebview) { cb(); return; }
  window.addEventListener("pywebviewready", cb, { once: true });
}

whenReady(init);

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

  const folders = await api().get_known_folders();
  state.knownFolders = folders;
  renderFolderChecks();

  try {
    applyLicenseState(JSON.parse(await api().get_license_state()));
  } catch (e) {}
  api().refresh_license().then((raw) => {
    try { applyLicenseState(JSON.parse(raw)); } catch (e) {}
  }).catch(() => {});
}

// -------------------- Retrio Pro (licence / abonnement) --------------------
let licenseState = { email: "", premium: false, status: "none" };
let previewAsFree = false;

function bindPremium() {
  const dialog = document.getElementById("proDialog");
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-pro");
    if (!btn) return;
    e.preventDefault();
    const emailInput = document.getElementById("proEmailInput");
    if (emailInput && licenseState.email) emailInput.value = licenseState.email;
    dialog.showModal();
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
  licenseState = data;
  if (!data.premium) previewAsFree = false;
  const title = document.getElementById("proCardTitle");
  const sub = document.getElementById("proCardSub");
  const discoverBtn = document.getElementById("proDiscoverBtn");
  const activeMsg = document.getElementById("proActiveMsg");
  const emailInput = document.getElementById("proEmailInput");
  if (emailInput && data.email && !emailInput.value) emailInput.value = data.email;
  if (!title || !sub || !discoverBtn || !activeMsg) return;
  if (data.premium) {
    title.hidden = true; sub.hidden = true; discoverBtn.hidden = true;
    activeMsg.hidden = false;
  } else {
    title.hidden = false; sub.hidden = false; discoverBtn.hidden = false;
    activeMsg.hidden = true;
  }
  refreshPreviewUI();
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
  api().find_duplicates().then((raw) => {
    const data = JSON.parse(raw);
    const total = (data.groups || []).reduce((sum, g) => sum + Math.max(0, g.files.length - 1), 0);
    applyTeaserValue("doublons", formatFr(total));
  }).catch(() => {});
  api().organize_suggestions("type").then((raw) => {
    const data = JSON.parse(raw);
    applyTeaserValue("ranger", formatFr((data.suggestions || []).length));
  }).catch(() => {});
  api().cleanup_suggestions().then((raw) => {
    const data = JSON.parse(raw);
    if (data.total_recoverable_human) applyTeaserValue("nettoyage", data.total_recoverable_human);
  }).catch(() => {});
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
          <button class="btn btn-pro">Passer à Retrio Pro — 4,99 €/mois</button>
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
    name: (a, b) => a.name.localeCompare(b.name, "fr"),
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
  const dateLabel = new Date(item.mtime * 1000).toLocaleDateString("fr-FR");
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
  const { matches, count_label } = JSON.parse(resultJson);
  document.getElementById("resultsCount").textContent = count_label;
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
    row.querySelector('[data-act="open"]').addEventListener("click", () => api().open_path(entry.path));
    row.querySelector('[data-act="folder"]').addEventListener("click", () => api().open_folder(entry.path));
    row.querySelector('[data-act="copy"]').addEventListener("click", () => api().copy_path(entry.path));
    list.appendChild(row);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : String(str);
  return d.innerHTML;
}
