(function () {
  "use strict";

  const STORAGE_KEY = "retrio_language";
  const TEXT = {
    "R   Retrio · Vos fichiers, en un instant": "R   Retrio · Find your files in seconds",
    "R Retrio · Vos fichiers, en un instant": "R Retrio · Find your files in seconds",
    "Besoin d’aide ? Voir la démo": "Need help? Watch the demo",
    "Retrouvez vos fichiers en 4 étapes": "Find your files in 4 simple steps",
    "1. Choisissez vos dossiers.": "1. Choose your folders.",
    "2. Lancez l’analyse locale.": "2. Run a local analysis.",
    "3. Consultez le bilan.": "3. Review the summary.",
    "4. Décrivez ce que vous cherchez.": "4. Describe what you are looking for.",
    "1. Choisissez vos dossiers. 2. Lancez l’analyse locale. 3. Consultez le bilan. 4. Décrivez ce que vous cherchez.": "1. Choose your folders. 2. Run a local analysis. 3. Review the summary. 4. Describe what you are looking for.",
    "Votre ordinateur ne peut pas lire cette vidéo.": "Your computer cannot play this video.",
    "J’ai compris": "Got it",
    "Nettoyer vos doublons en 3 étapes": "Remove duplicate files in 3 steps",
    "1. Retrio repère les fichiers strictement identiques.": "1. Retrio identifies truly identical files.",
    "2. Vous choisissez quelle copie garder.": "2. You choose which copy to keep.",
    "3. Les autres partent à la corbeille en un clic.": "3. Send the others to the Recycle Bin in one click.",
    "1. Retrio repère les fichiers strictement identiques. 2. Vous choisissez quelle copie garder. 3. Les autres partent à la corbeille en un clic.": "1. Retrio identifies truly identical files. 2. You choose which copy to keep. 3. Send the others to the Recycle Bin in one click.",
    "Aidez-nous à améliorer Retrio": "Help us improve Retrio",
    "Retrio peut envoyer des statistiques anonymes d’utilisation et des catégories d’erreurs techniques. Aucun nom, chemin, contenu de fichier, recherche ou adresse email n’est transmis.": "Retrio can send anonymous usage statistics and technical error categories. Filenames, paths, file contents, searches and email addresses are never included.",
    "Vous pourrez modifier ce choix à tout moment via « Confidentialité » en bas à gauche.": "You can change this choice at any time under Privacy in the bottom-left corner.",
    "Accepter les statistiques anonymes": "Allow anonymous analytics",
    "Refuser": "Decline",
    "Débloquez tout le potentiel de Retrio": "Unlock the full potential of Retrio",
    "Fini les limites sur les fonctions déjà disponibles : rangement, doublons exacts et nettoyage approfondi.": "Remove the limits from Retrio’s organisation, exact duplicate and deep clean-up tools.",
    "Rangement et renommage proposés, avec validation": "Smart organisation and naming suggestions, always reviewed by you",
    "Classement par type ou par date, sans limite": "Unlimited organisation by file type or date",
    "Détection et nettoyage des doublons exacts, sans limite": "Unlimited exact duplicate detection and clean-up",
    "Nettoyage approfondi : fichiers anciens, temporaires et oubliés": "Deep clean-up for old, temporary and forgotten files",
    "Quasi-doublons de documents et photos en rafale": "Near-duplicate documents and burst photos",
    "/ mois": "/ month",
    "Résiliable à tout moment, sans engagement": "Cancel anytime",
    "S'abonner maintenant — 4,99 €/mois": "Subscribe now — €4.99/month",
    "Déjà abonné ?": "Already subscribed?",
    "Vérifier mon abonnement": "Verify my subscription",
    "Fermer": "Close",
    "Réduire": "Minimise",
    "Agrandir": "Maximise",
    "Choisir la langue": "Choose language",
    "L'email utilisé lors du paiement": "Email address used for payment",
    "Une facture, un contrat, un souvenir…": "A bill, a contract, a memory…",
    "Aperçu mode visiteur — vous êtes en réalité Pro.": "Free-version preview — your Pro access is still active.",
    "Revenir en Pro": "Return to Pro",
    "Vos fichiers, en un instant": "Find your files in seconds",
    "Recherche": "Search",
    "Doublons": "Duplicates",
    "Ranger vos documents": "Organise documents",
    "Nettoyage": "Clean up",
    "Vos données restent ici.": "Your data stays here.",
    "Documents et recherches restent sur ce PC.": "Documents and searches stay on this PC.",
    "Confidentialité": "Privacy",
    "Passer à Retrio Pro": "Upgrade to Retrio Pro",
    "Doublons, rangement automatique et plus encore.": "Duplicates, smart organisation and more.",
    "Découvrir": "Discover",
    "Retrio Pro actif — merci !": "Retrio Pro is active — thank you!",
    "Aperçu mode visiteur": "Preview free version",
    "Fichiers analysés": "Files analysed",
    "PDF trouvés": "PDFs found",
    "Photos trouvées": "Photos found",
    "Espace occupé": "Space used",
    "1. Choisissez où chercher": "1. Choose where to search",
    "Vous pouvez modifier cette sélection à tout moment, puis relancer l’analyse.": "You can change this selection at any time and run the analysis again.",
    "Dossiers à analyser": "Folders to analyse",
    "+ Ajouter un autre dossier…": "+ Add another folder…",
    "2. Analysez pour mieux identifier vos documents": "2. Analyse your files so Retrio can understand them",
    "Les dossiers techniques Codex et Claude sont exclus. Vos fichiers restent sur cet ordinateur.": "Technical Codex and Claude folders are excluded. Your files remain on this computer.",
    "▶  Analyse": "▶  Analyse",
    "Arrêter": "Stop",
    "Sélectionnez au moins un dossier, puis cliquez sur Analyse.": "Select at least one folder, then click Analyse.",
    "4. Retrouvez votre fichier avec vos mots": "4. Describe the file you want to find",
    "Rechercher": "Search",
    "Essayez :": "Try:",
    "facture EDF": "electricity bill",
    "photo vacances": "holiday photo",
    "devis": "quote",
    "assurance": "insurance",
    "Tous (0)": "All (0)",
    "Images (0)": "Images (0)",
    "Documents (0)": "Documents (0)",
    "Chercher dans": "Search in",
    "Tous les dossiers analysés": "All analysed folders",
    "Choisir un sous-dossier…": "Choose a subfolder…",
    "Ces résultats vous conviennent-ils ?": "Are these results helpful?",
    "Oui": "Yes",
    "Non, affiner": "No, refine",
    "Choisissez un dossier et un type de fichier ci-dessus. Ajoutez un fournisseur, un objet ou un détail distinctif à votre recherche.": "Choose a folder and file type above. Add a company, subject or distinctive detail to your search.",
    "Lancez une recherche pour voir vos fichiers.": "Start a search to see your files.",
    "Par type": "By type",
    "Par type de fichier": "By file type",
    "Par date (année / mois)": "By date (year / month)",
    "Par type, puis par année": "By type, then year",
    "Nom (A à Z)": "Name (A to Z)",
    "Nom (A → Z)": "Name (A to Z)",
    "Date (récent d'abord)": "Date (newest first)",
    "Taille (plus gros d'abord)": "Size (largest first)",
    "Photos & images": "Photos & images",
    "Vidéos": "Videos",
    "Musique & audio": "Music & audio",
    "Autres": "Other",
    "Autres documents": "Other documents",
    "Archives": "Archives",
    "Autres fichiers": "Other files",
    "Nom peu explicite": "Unclear filename",
    "Classement par type": "Organise by file type",
    "Fichier temporaire ou cache": "Temporary or cache file",
    "Gros fichier non ouvert depuis longtemps": "Large file not opened recently",
    "Excellent": "Excellent",
    "Bon": "Good",
    "Moyen": "Fair",
    "À nettoyer": "Needs attention",
    "PDF lu": "PDF read",
    "PDF > 100 Mo : contenu non analysé": "PDF over 100 MB: contents not analysed",
    "Limite de 2 millions de caractères atteinte": "Two-million-character limit reached",
    "Lecture limitée aux 300 premières pages": "Reading limited to the first 300 pages",
    "Aucun texte lisible — PDF scanné, vide ou OCR indisponible": "No readable text — scanned or empty PDF, or OCR unavailable",
    "PDF partiellement lu": "PDF partially read",
    "PDF lu avec OCR local": "PDF read using local OCR",
    "PDF protégé, endommagé ou inaccessible": "Protected, damaged or inaccessible PDF",
    "PDF modifié pendant la lecture : relancer": "PDF changed while being read — run the analysis again",
    "Lecture interrompue": "Reading stopped",
    "Délai de lecture dépassé ou lecteur interrompu": "Reading timed out or was interrupted",
    "Texte indexé": "Text indexed",
    "Récupérez de l'espace disque en un clic.": "Reclaim disk space in one click.",
    "Retrio repère les fichiers strictement identiques sur votre ordinateur et vous laisse choisir lesquels garder.": "Retrio finds truly identical files on your computer and lets you choose which copies to keep.",
    "Détection des doublons stricts, sans aucune limite": "Unlimited exact duplicate detection",
    "Aperçu et comparaison avant toute suppression": "Preview and compare before removing anything",
    "Suppression groupée, toujours envoyée à la corbeille": "Batch removal, always through the Recycle Bin",
    "Un classement automatique, sans effort.": "Effortless file organisation.",
    "Vos fichiers rangés par type, par date ou par fournisseur — sans jamais rien déplacer sans votre accord.": "Organise files by type, date or company — nothing moves without your approval.",
    "Classement par type, par date ou par type puis année": "Organise by type, date, or type then year",
    "Vous validez chaque déplacement, rien n'est automatique": "You approve every move; nothing happens automatically",
    "Renommage intelligent selon des règles simples (date, fournisseur, contenu…)": "Smarter filenames based on clear rules such as date, company and content",
    "Un nettoyage plus profond qu'un simple vide-cache.": "Go beyond a basic cache clean-up.",
    "Retrio traque ce qui encombre vraiment votre disque, bien au-delà des doublons évidents.": "Retrio finds what is really taking up space, not only obvious duplicates.",
    "Quasi-doublons repérés par le contenu, pas juste le nom": "Near duplicates identified from contents, not only filenames",
    "Score de santé de votre PC à chaque analyse": "A PC health score after every analysis",
    "Sans engagement · Vos fichiers restent sur votre ordinateur": "Cancel anytime · Your files stay on your computer",
    "Analysez d'abord vos dossiers": "Analyse your folders first",
    "Retrio utilise la dernière analyse pour préparer le rangement. Revenez à Recherche, choisissez vos dossiers et lancez l'analyse.": "Retrio uses your latest analysis to prepare organisation suggestions. Return to Search, choose your folders and run the analysis.",
    "Retrio utilise la dernière analyse pour repérer les doublons. Revenez à Recherche, choisissez vos dossiers et lancez l'analyse.": "Retrio uses your latest analysis to identify duplicates. Return to Search, choose your folders and run the analysis.",
    "Retrio utilise la dernière analyse pour repérer les fichiers à nettoyer. Revenez à Recherche, choisissez vos dossiers et lancez l'analyse.": "Retrio uses your latest analysis to identify files you may want to remove. Return to Search, choose your folders and run the analysis.",
    "Retour à la recherche": "Back to Search",
    "Préparation du rangement…": "Preparing organisation suggestions…",
    "RANGEMENT · BÊTA": "ORGANISE · BETA",
    "Classer": "Organise by",
    "Trier par": "Sort by",
    "Valider": "Approve",
    "Passez à Retrio Pro pour ranger tous vos fichiers en un clic, sans limite.": "Upgrade to Retrio Pro to organise all your files without limits.",
    "Chaque déplacement est affiché avant validation. Aucun fichier existant n'est écrasé.": "Every move is shown for your approval. Existing files are never overwritten.",
    "Tout sélectionner": "Select all",
    "Valider la sélection": "Approve selected files",
    "Aucun fichier à classer dans cette catégorie.": "No files to organise in this category.",
    "Découvrir Retrio Pro": "Discover Retrio Pro",
    "✓ Fichier classé": "✓ File organised",
    "Classement en cours…": "Organising files…",
    "Recherche des doublons…": "Looking for duplicates…",
    "DOUBLONS · BÊTA": "DUPLICATES · BETA",
    "Aucun doublon exact trouvé dans la dernière analyse.": "No exact duplicates were found in the latest analysis.",
    "Passez à Retrio Pro pour nettoyer tous vos doublons en un clic, sans limite.": "Upgrade to Retrio Pro to clean up all exact duplicates without limits.",
    "copies identiques": "identical copies",
    "Voir la démo": "Watch the demo",
    "Supprimer la sélection (corbeille)": "Move selected files to Recycle Bin",
    "Rien à nettoyer pour le moment.": "Nothing to clean up right now.",
    "À conserver": "Keep",
    "Suppression en cours…": "Moving files to the Recycle Bin…",
    "Téléchargements oubliés": "Forgotten downloads",
    "Fichiers temporaires": "Temporary files",
    "Fichiers temporaires & caches": "Temporary files & caches",
    "Gros fichiers anciens": "Large old files",
    "Quasi-doublons (analyse de contenu)": "Near duplicates (content analysis)",
    "Quasi-doublons": "Near duplicates",
    "Photos en rafale": "Burst photos",
    "NETTOYAGE · BÊTA": "CLEAN UP · BETA",
    "Nettoyage profond": "Deep clean-up",
    "Basé sur les fichiers temporaires, quasi-doublons, téléchargements oubliés et photos en rafale détectés dans votre dernière analyse.": "Based on temporary files, near duplicates, forgotten downloads and burst photos found during your latest analysis.",
    "Analyse approfondie en cours (contenu, doublons, photos)…": "Running a deep analysis of contents, duplicates and photos…",
    "Rien à signaler pour le moment : votre PC est propre.": "Nothing to report right now — your PC is clean.",
    "Aucun fichier temporaire, quasi-doublon ou oublié détecté.": "No temporary, near-duplicate or forgotten files detected.",
    "Quasi-doublons repérés par le contenu des documents, pas juste leur nom": "Near duplicates identified from document contents, not only filenames",
    "Quasi-doublons repérés par le": "Near duplicates identified from document",
    "contenu": "contents",
    "des documents, pas juste leur nom": "rather than filenames alone",
    "Retrio Pro va plus loin qu'un simple nettoyeur de cache :": "Retrio Pro goes beyond a basic cache cleaner:",
    "Téléchargements oubliés depuis des mois": "Downloads forgotten for months",
    "Photos en rafale regroupées automatiquement": "Burst photos grouped automatically",
    "Score de santé complet, mis à jour à chaque analyse": "A complete health score updated after each analysis",
    "Arrêt en cours… Les fichiers déjà lus resteront disponibles.": "Stopping… Files already processed will remain available.",
    "Sélectionnez au moins un dossier avant de lancer l'analyse.": "Select at least one folder before starting the analysis.",
    "Une analyse est déjà en cours ou la sélection est invalide.": "An analysis is already running or the selection is invalid.",
    "Impossible de démarrer l’analyse. Réessayez.": "Unable to start the analysis. Please try again.",
    "▶ Relancer l'analyse": "▶ Run analysis again",
    "Tous les dossiers analysés": "All analysed folders",
    "Retirer ce dossier de la prochaine analyse": "Remove this folder from the next analysis",
    "Relancer l’analyse": "Run analysis again",
    "Lancez d'abord une analyse pour pouvoir rechercher.": "Run an analysis before searching.",
    "Essayez un fournisseur ou moins de mots. Vérifiez que le dossier du PDF est sélectionné, puis relancez l’analyse. Le bilan PDF signale les documents non lisibles.": "Try a company name or fewer words. Make sure the PDF folder is selected, then run the analysis again. The PDF summary highlights unreadable documents.",
    "★ Meilleure correspondance parmi les résultats": "★ Best match",
    "Parfait, vous pouvez ouvrir votre fichier.": "Great — you can open your file.",
    "Impossible d’ouvrir ce fichier. Vérifiez qu’il existe encore et qu’une application compatible est installée.": "Unable to open this file. Make sure it still exists and that a compatible app is installed.",
    "Impossible d’ouvrir le dossier de ce fichier.": "Unable to open this file’s folder.",
    "Impossible de copier le chemin de ce fichier.": "Unable to copy this file path.",
    "Indiquez l'email utilisé lors du paiement.": "Enter the email address used for payment.",
    "Vérification en cours…": "Checking your subscription…",
    "Abonnement Retrio Pro actif — merci !": "Retrio Pro subscription active — thank you!",
    "Aucun abonnement actif trouvé pour cet email.": "No active subscription was found for this email address.",
    "Impossible de vérifier pour le moment (hors ligne ?).": "Unable to check right now. Are you offline?",
    "Revenir en mode Pro": "Return to Pro mode",
    "VOIR LA DÉMO": "WATCH THE DEMO",
    "Vidéo indisponible pour le moment.": "Video unavailable right now.",
    "Plein écran": "Full screen",
    "Démo vidéo bientôt disponible": "Video demo coming soon",
    "Passer à Retrio Pro — 4,99 €/mois": "Upgrade to Retrio Pro — €4.99/month"
  };

  const ATTRS = ["placeholder", "title", "aria-label"];
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  let language = localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "fr";
  let applying = false;

  function preserveWhitespace(original, translated) {
    const leading = original.match(/^\s*/)[0];
    const trailing = original.match(/\s*$/)[0];
    return leading + translated + trailing;
  }

  function translateVariable(value) {
    const rules = [
      [/^(\d+) sélectionné\(s\)$/, "$1 selected"],
      [/^(\d+) proposition\(s\) de classement$/, "$1 organisation suggestion(s)"],
      [/^(\d+) fichier\(s\) sélectionné\(s\)$/, "$1 file(s) selected"],
      [/^(\d+) copies identiques$/, "$1 identical copies"],
      [/^(\d+) doublons se cachent dans votre ordinateur\.$/, "$1 duplicate files are hiding on your computer."],
      [/^(\d+) fichiers traînent, mal rangés\.$/, "$1 files could be better organised."],
      [/^(.+) d'espace disque à récupérer\.$/, "$1 of disk space could be reclaimed."],
      [/^(\d+) groupe\(s\) de doublons détecté\(s\)$/, "$1 duplicate group(s) found"],
      [/^Espace récupérable estimé : (.+)\.$/, "Estimated recoverable space: $1."],
      [/^(\d+) fichier\(s\) repérés · espace récupérable estimé : (.+)\.$/, "$1 file(s) found · estimated recoverable space: $2."],
      [/^Score de santé : (.+)$/, "PC health score: $1"],
      [/^\+(\d+) autre\(s\) fichier\(s\) à classer$/, "+$1 more file(s) to organise"],
      [/^\+(\d+) autre\(s\) groupe\(s\) de doublons$/, "+$1 more duplicate group(s)"],
      [/^\+(\d+) élément\(s\) supplémentaire\(s\) détecté\(s\)$/, "+$1 additional item(s) found"],
      [/^(\d+) fichiers analysés — (.+)$/, "$1 files analysed — $2"],
      [/^(\d+) résultat\(s\) pour « (.+) »$/, "$1 result(s) for “$2”"],
      [/^(\d+) fichier\(s\)$/, "$1 file(s)"],
      [/^(.+) — 60 premiers affichés$/, "$1 — first 60 shown"],
      [/^Analyse terminée : (.+)$/, "Analysis complete: $1"],
      [/^Analyse arrêtée : (.+)$/, "Analysis stopped: $1"],
      [/^(\d+) PDF lus, dont (\d+) par OCR local\./, "$1 PDFs read, including $2 using local OCR."],
      [/^Page (\d+) : OCR indisponible \((.+)\)$/, "Page $1: OCR unavailable ($2)"],
      [/^Page (\d+) illisible \((.+)\)$/, "Page $1 unreadable ($2)"],
      [/^Analyse visuelle locale : (.+)$/, "Local visual analysis: $1"],
      [/^PDF inaccessible : (.+)$/, "PDF inaccessible: $1"],
      [/^(\d+) élément\(s\) inaccessible\(s\) ou non disponible\(s\) localement\./, "$1 item(s) inaccessible or unavailable locally."],
      [/^Aucun résultat pour « (.+) »\.$/, "No results for “$1”."],
      [/^Envoyer (\d+) fichier\(s\) à la corbeille \?$/, "Move $1 file(s) to the Recycle Bin?"],
      [/^(\d+) fichier\(s\) n'ont pas pu être déplacés\.$/, "$1 file(s) could not be moved."],
      [/^(\d+) fichier\(s\) n'ont pas pu être supprimés\.$/, "$1 file(s) could not be moved to the Recycle Bin."],
      [/^(.+) chacune · (.+) récupérables$/, "$1 each · $2 recoverable"]
      ,[/^Quasi-doublon de « (.+) » \(contenu (\d+)% similaire\)$/, "Near duplicate of “$1” ($2% similar content)"],
      [/^Dans Téléchargements depuis (\d+) jours, jamais déplacé$/, "Left in Downloads for $1 days"],
      [/^Photo en rafale, proche de « (.+) » \((\d+) photos prises à quelques secondes d'écart\)$/, "Burst photo similar to “$1” ($2 photos taken seconds apart)"],
      [/^Ce fichier ne fait pas partie de la dernière analyse\.$/, "This file was not included in the latest analysis."],
      [/^Suppression annulée ou impossible\.$/, "Removal was cancelled or could not be completed."],
      [/^Destination de classement non autorisée\.$/, "This organisation destination is not allowed."],
      [/^Déplacement impossible : (.+)$/, "Unable to move file: $1"]
    ];
    for (const [pattern, replacement] of rules) if (pattern.test(value)) return value.replace(pattern, replacement);
    return TEXT[value] || value;
  }

  function translated(value) {
    return language === "en" ? translateVariable(value) : value;
  }

  function processTextNode(node) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const source = originalText.get(node);
    const trimmed = source.trim().replace(/\s+/g, " ");
    if (!trimmed) return;
    const desired = language === "fr" ? source : preserveWhitespace(source, translated(trimmed));
    if (node.nodeValue !== desired) node.nodeValue = desired;
  }

  function processElement(element) {
    if (element.closest && element.closest("script,style")) return;
    let saved = originalAttrs.get(element);
    if (!saved) { saved = {}; originalAttrs.set(element, saved); }
    for (const attr of ATTRS) {
      if (!element.hasAttribute || !element.hasAttribute(attr)) continue;
      if (!(attr in saved)) saved[attr] = element.getAttribute(attr);
      element.setAttribute(attr, language === "fr" ? saved[attr] : translated(saved[attr]));
    }
    for (const child of element.childNodes || []) {
      if (child.nodeType === Node.TEXT_NODE) processTextNode(child);
      else if (child.nodeType === Node.ELEMENT_NODE) processElement(child);
    }
  }

  function updateSuggestions() {
    const queries = {
      "facture edf": "electricity bill",
      "photo vacances": "holiday photo",
      "devis": "quote",
      "assurance": "insurance"
    };
    document.querySelectorAll("[data-q]").forEach((button) => {
      if (!button.dataset.qFr) button.dataset.qFr = button.dataset.q;
      button.dataset.q = language === "en" ? (queries[button.dataset.qFr] || button.dataset.qFr) : button.dataset.qFr;
    });
  }

  function applyLanguage(nextLanguage) {
    language = nextLanguage === "en" ? "en" : "fr";
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    applying = true;
    processElement(document.body);
    updateSuggestions();
    document.querySelectorAll("#languageSwitch [data-lang]").forEach((button) => {
      button.classList.toggle("active", button.dataset.lang === language);
      button.setAttribute("aria-pressed", button.dataset.lang === language ? "true" : "false");
    });
    applying = false;
    window.dispatchEvent(new CustomEvent("retrio-language-changed", { detail: { language } }));
  }

  const nativeAlert = window.alert.bind(window);
  const nativeConfirm = window.confirm.bind(window);
  window.alert = (message) => nativeAlert(translated(String(message)));
  window.confirm = (message) => nativeConfirm(translated(String(message)));

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("#languageSwitch [data-lang]").forEach((button) => {
      button.addEventListener("click", () => applyLanguage(button.dataset.lang));
    });
    applyLanguage(language);
    const observer = new MutationObserver((records) => {
      if (applying) return;
      applying = true;
      for (const record of records) {
        if (record.type === "characterData") processTextNode(record.target);
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) processTextNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE) processElement(node);
        }
      }
      applying = false;
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  });

  window.retrioI18n = {
    get language() { return language; },
    get locale() { return language === "en" ? "en-GB" : "fr-FR"; },
    t: (value) => translated(String(value)),
    setLanguage: applyLanguage
  };
})();
