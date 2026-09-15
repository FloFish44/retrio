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
};

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
  document.getElementById('minBtn').onclick = () => api().minimize();
  document.getElementById('maxBtn').onclick = () => api().toggle_maximize();
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

  const folders = await api().get_known_folders();
  state.knownFolders = folders;
  renderFolderChecks();
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
      if (tab === "ranger") {
        renderRangerTab(el);
      } else if (tab === "doublons") {
        renderDoublonsTab(el);
      } else if (tab !== "recherche" && !el.dataset.built) {
        buildLockedTab(tab, el);
        el.dataset.built = "1";
      }
    });
  });
}

const LOCKED_TABS = {
  doublons: {
    title: "Libérez de l'espace en un clic.",
    bullets: [
      "Détection avancée des doublons : à venir",
      "Comparaison par contenu (pas seulement le nom)",
      "Suppression groupée avec validation",
    ],
  },
  ranger: {
    title: "Un classement automatique, sans effort.",
    bullets: [
      "Analyse du rangement : à venir",
      "Suggestions de rangement par dossier",
      "Renommage intelligent en un clic",
    ],
  },
  nettoyage: {
    title: "Le nettoyage sera disponible plus tard.",
    bullets: [
      "Fichiers temporaires et caches oubliés",
      "Doublons volumineux repérés",
      "Rien n'est supprimé sans accord",
    ],
  },
};

function buildLockedTab(key, el) {
  const info = LOCKED_TABS[key];
  el.innerHTML = `
    <h2>${info.title}</h2>
    <ul>${info.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
    <button class="btn btn-pro">Passer à Retrio Pro</button>
  `;
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
