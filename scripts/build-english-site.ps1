$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$en = Join-Path $root "en"

function New-EnglishPage {
  param(
    [string]$Source,
    [string]$Destination,
    [hashtable]$Replacements,
    [string]$FrenchUrl,
    [string]$EnglishUrl
  )

  $content = [IO.File]::ReadAllText((Join-Path $root $Source), [Text.Encoding]::UTF8)
  $content = [regex]::Replace($content, '<link rel="alternate" hreflang="(?:fr|en|x-default)" href="[^"]+"\s*/>\s*', '')
  $content = $content.Replace('<html lang="fr">', '<html lang="en">')
  $content = $content.Replace('href="./favicon.png"', 'href="../favicon.png"')
  $content = $content.Replace('href="./site.webmanifest"', 'href="../site.webmanifest"')
  $content = $content.Replace('src="./assets/', 'src="../assets/')
  $content = $content.Replace('href="./assets/', 'href="../assets/')
  $content = $content.Replace('srcset="./assets/', 'srcset="../assets/').Replace(', ./assets/', ', ../assets/')
  $content = $content.Replace('href="./telecharger.html"', 'href="./download.html"')
  $content = $content.Replace('href="./retrio-pro.html"', 'href="./retrio-pro.html"')
  $content = $content.Replace('href="./guides.html"', 'href="./guides.html"')
  $content = $content.Replace('href="./index.html', 'href="./index.html')
  $content = $content.Replace('href="./informations-legales.html', 'href="./legal-information.html')
  $content = $content.Replace('href="./politique-confidentialite.html', 'href="./privacy-policy.html')
  $content = $content.Replace('href="./cgu.html', 'href="./terms.html')
  $content = $content.Replace('href="./assistance.html', 'href="./support.html')
  $content = $content.Replace('href="./retrouver-fichier-perdu.html"', 'href="./how-to-find-lost-file-windows.html"')
  $content = $content.Replace('href="./retrouver-dossier-perdu-windows.html"', 'href="./find-lost-folder-windows.html"')
  $content = $content.Replace('href="./retrouver-fichier-telecharge.html"', 'href="./find-downloaded-file.html"')
  $content = $content.Replace('href="./retrouver-facture-ordinateur.html"', 'href="./find-invoice-on-computer.html"')
  $content = $content.Replace('href="./retrouver-photo-ordinateur.html"', 'href="./find-photo-on-computer.html"')
  $content = $content.Replace('href="./rechercher-texte-dans-pdf.html"', 'href="./search-text-inside-pdf-files.html"')
  $content = $content.Replace('href="/politique-confidentialite.html"', 'href="/en/privacy-policy.html"')
  $content = $content.Replace('href="/cgu.html"', 'href="/en/terms.html"')
  $content = $content.Replace('href="/informations-legales.html"', 'href="/en/legal-information.html"')
  $content = $content.Replace('property="og:locale" content="fr_FR"', 'property="og:locale" content="en_GB"')

  foreach ($key in ($Replacements.Keys | Sort-Object Length -Descending)) { $content = $content.Replace($key, $Replacements[$key]) }
  $content = $content.Replace($FrenchUrl, $EnglishUrl)

  $alternates = '<link rel="alternate" hreflang="fr" href="' + $FrenchUrl + '" />' + "`r`n" +
    '<link rel="alternate" hreflang="en" href="' + $EnglishUrl + '" />' + "`r`n" +
    '<link rel="alternate" hreflang="x-default" href="' + $FrenchUrl + '" />'
  if ($content -notmatch 'hreflang="en"') { $content = $content.Replace('</head>', $alternates + "`r`n</head>") }
  [IO.File]::WriteAllText((Join-Path $en $Destination), $content.TrimEnd() + "`r`n", [Text.UTF8Encoding]::new($false))
}

$homeText = [ordered]@{
  '<title>Retrio — Retrouvez vos fichiers</title>'='<title>Retrio — Find the file you have in mind</title>'
  'content="Retrio retrouve vos documents et vos photos à partir de quelques mots, même lorsque leur nom ne veut rien dire. Vos fichiers restent sur votre ordinateur."'='content="Find documents and photos using the details you remember, even when the filename is meaningless. Retrio keeps your files on your computer."'
  'href="https://retrio.eu/"'='href="https://retrio.eu/en/"'
  'content="https://retrio.eu/"'='content="https://retrio.eu/en/"'
  'Comment ça marche ?'='How it works'
  'Conseils pratiques ▾'='Practical guides ▾'
  'Tous les guides'='All guides'
  'Retrouver un fichier perdu'='Find a lost file'
  'Retrouver un dossier perdu'='Find a lost folder'
  'Retrouver un téléchargement'='Find a download'
  'Retrouver une facture'='Find an invoice'
  'Retrouver une photo'='Find a photo'
  'Rechercher dans des PDF'='Search inside PDFs'
  'Guides in English'='Guides en français'
  'href="./en/guides.html" lang="en"'='href="../guides.html" lang="fr"'
  'Confidentialité'='Privacy'
  'Télécharger Retrio gratuitement'='Download Retrio for free'
  'Retrouvez n''importe quel document'='Find any document'
  'sur votre ordinateur.'='on your computer.'
  'Même si vous avez oublié son nom. Écrivez simplement ce dont vous vous souvenez : Retrio lit le contenu de vos documents et retrouve le bon fichier en quelques secondes.'='Even when you cannot remember its name. Describe what you do remember: Retrio understands the contents of your documents and brings the right file to the top.'
  'Par exemple : « ma facture EDF de février », « la photo du chien à la plage » ou « mon contrat d''assurance ».'='For example: “my February electricity bill”, “the photo of the dog at the beach” or “my insurance policy”.'
  'Pour Windows 10/11 · Sans compte · Vos fichiers restent sur votre ordinateur'='For Windows 10/11 · No account required · Your files stay on your computer'
  'Vous hésitez encore ? Regardez Retrio retrouver un fichier sous vos yeux.'='Want to see it first? Watch Retrio find a file in seconds.'
  '▶ Voir Retrio en action'='▶ See Retrio in action'
  'Voici le logiciel'='Meet the app'
  'Pour bien comprendre l''intérêt de Retrio, rien ne vaut une vraie capture du logiciel en train de retrouver un fichier.'='The easiest way to understand Retrio is to see the real app finding a file.'
  'Ici, Retrio vient de chercher « facture edf » et a retrouvé le bon document, même mal nommé, en le mettant en avant comme meilleure correspondance.'='Here, Retrio searched for “electricity bill” and surfaced the right document as the best match, despite its unhelpful filename.'
  'Le vrai logiciel'='The real app'
  'Voir d''autres captures ↓'='See more screenshots ↓'
  'Découvrez Retrio en action'='See Retrio in action'
  'Fermer la démonstration'='Close the demo'
  'Votre navigateur ne peut pas lire cette vidéo.'='Your browser cannot play this video.'
  'Télécharger la démonstration'='Download the demo'
  'Simple dès la première utilisation'='Simple from the first launch'
  'Fini les heures passées à ouvrir des dossiers et des fichiers un par un.'='Stop opening folders and files one by one just to find what you need.'
  'Choisissez où chercher'='Choose where to search'
  'Sélectionnez simplement vos dossiers : Documents, Bureau, Images ou un disque.'='Select the folders you want Retrio to understand: Documents, Desktop, Pictures or an entire drive.'
  'Lancez l''analyse'='Build your private index'
  'Retrio lit vos documents et reconnaît vos photos pour comprendre ce qu''ils contiennent.'='Retrio reads your documents and recognises your photos to understand what they contain.'
  'Décrivez votre fichier'='Describe the file'
  'Tapez ce dont vous vous souvenez avec vos propres mots, sans connaître le nom exact.'='Use your own words and whatever details you remember. You do not need the exact filename.'
  'Ouvrez le bon résultat'='Open the right result'
  'Retrio classe les fichiers les plus pertinents et vous montre immédiatement le meilleur.'='Retrio ranks the most relevant files and immediately highlights the best match.'
  'L''expérience'='The experience'
  'Le fichier s''appelle peut-être'='The filename might be'
  'Vous cherchez une facture, mais son nom est incompréhensible ? Écrivez « facture EDF de mars ». Retrio reconnaît les informations dans le PDF et retrouve le bon document. Regardez la démonstration ci-dessous.'='Looking for a bill with a meaningless filename? Type “March electricity bill”. Retrio recognises the information inside the PDF and finds the right document. Watch it happen below.'
  'Démonstration automatique'='Automatic demo'
  'Qu''est-ce qu''on retrouve ?'='What are you looking for?'
  'La démo joue seule — regardez la recherche se faire'='The demo runs automatically — watch the search unfold'
  'Rechercher'='Search'
  'Aperçu →'='Preview →'
  'Démonstration automatique, en boucle · Recherche en langage naturel prévue dans le logiciel'='Looping automatic demo · Natural-language search as designed in the app'
  'L''interface'='The interface'
  'Ce n''est pas une maquette.'='This is not a mock-up.'
  'C''est le vrai logiciel.'='It is the real app.'
  'Deux écrans, deux instants : Retrio vient de terminer l''analyse de vos dossiers, puis retrouve le bon fichier dès que vous décrivez ce que vous cherchez.'='Two real moments: Retrio finishes analysing your chosen folders, then finds the right file as soon as you describe it.'
  '1 · L''analyse'='1 · Analysis complete'
  '2 · Le résultat'='2 · The result'
  'Une confiance simple'='Privacy you can understand'
  'Vos documents restent'='Your documents stay'
  'privés.'='private.'
  'Retrio fonctionne directement sur votre ordinateur. Vos fichiers, vos photos et vos recherches ne sont jamais envoyés sur Internet.'='Retrio runs directly on your computer. Your files, photos and searches are never uploaded to Retrio.'
  'Vous choisissez les dossiers.'='You choose the folders.'
  'Au premier lancement, indiquez ce que vous souhaitez analyser. Vous gardez la main sur le périmètre, à tout moment.'='At first launch, choose what Retrio may analyse. You remain in control of that scope at all times.'
  'Le traitement reste en local.'='Processing stays local.'
  'Extraction du contenu, index et recherche : tout est traité sur votre ordinateur, sans envoi de vos fichiers ni de vos requêtes.'='Content extraction, indexing and search all happen on your computer. Your files and queries are not sent to us.'
  'Vos originaux restent intacts.'='Your originals remain intact.'
  'Cette première version recherche et vous guide. Elle ne renomme, ne déplace et ne supprime aucun document.'='The free search experience helps you find files without renaming, moving or deleting the originals.'
  'Disponible dès maintenant'='Available now'
  'Version bêta gratuite — vos retours nous aident à l''améliorer.'='Free beta — your feedback helps us improve it.'
  'Cette version est fonctionnelle, mais certaines recherches peuvent encore être améliorées.'='The app is fully usable, although some searches may still improve during the beta.'
  'Internet sert uniquement à télécharger et installer Retrio. L''analyse et la recherche fonctionnent ensuite directement sur votre ordinateur. · Windows 10/11'='Internet is only required to download and install Retrio. Analysis and search then run locally on your computer. · Windows 10/11'
  'Moins de dossiers à fouiller. Plus de temps pour vous.'='Less time digging through folders. More time for what matters.'
  '« Ah,'='“There'
  'le voilà.'='it is.'
  '»'='”'
  'Voir comment Retrio retrouve un fichier →'='See how Retrio finds a file →'
  'Disponible dès maintenant, pour Windows'='Available now for Windows'
  'Questions fréquentes'='Frequently asked questions'
  'Je n''arrive pas à télécharger Retrio.'='I cannot download Retrio.'
  'Vérifiez que votre antivirus ou votre navigateur n''a pas bloqué le fichier téléchargé. Si le problème persiste, écrivez-nous et nous vous enverrons le fichier directement.'='Check whether your browser or antivirus blocked the download. If it still fails, email us and we will help you get the installer.'
  'Le logiciel ne s''ouvre pas ou plante au lancement.'='The app does not open or crashes at launch.'
  'Assurez-vous d''utiliser Windows 10 ou 11. Redémarrez votre ordinateur puis relancez Retrio. Si le problème continue, contactez-nous en décrivant ce qui se passe.'='Make sure you are using Windows 10 or 11. Restart your computer and try again. If the issue continues, contact us and describe what happens.'
  'Retrio ne trouve pas un de mes fichiers.'='Retrio cannot find one of my files.'
  'Vérifiez que le dossier contenant ce fichier a bien été sélectionné lors de la configuration. Vous pouvez à tout moment ajouter ou retirer des dossiers depuis les réglages.'='Make sure the folder containing that file was selected during setup. You can add or remove folders at any time in Settings.'
  'Une autre question ?'='Another question?'
  'Écrivez-nous à'='Email us at'
  ', nous répondons rapidement.'=', and we will get back to you as soon as possible.'
  'Guides pour retrouver vos fichiers'='File-finding guides'
  'Mentions légales'='Legal information'
  'Politique de confidentialité'='Privacy policy'
  'Conditions d''utilisation'='Terms of use'
  'Contact et assistance'='Contact and support'
  'Comment désinstaller Retrio'='How to uninstall Retrio'
  'Retrio — Simplicité. Rapidité. Confidentialité.'='Retrio — Simple. Fast. Private.'
  'Recherche « facture edf » dans Retrio : le bon fichier trouvé et mis en avant en meilleure correspondance'='“electricity bill” search in Retrio, with the right file highlighted as the best match'
  'Recherche « facture edf » dans Retrio : le bon fichier trouvé et mis en avant'='“electricity bill” search in Retrio, with the right file highlighted'
  'Fermer l''aperçu'='Close preview'
  "Aperçu agrandi d’une capture du logiciel Retrio"='Enlarged screenshot of the Retrio app'
  'Bilan de l''analyse Retrio : 1284 fichiers analysés, 340 PDF, 610 photos, 2,3 Go'='Retrio analysis summary: 1,284 files analysed, including 340 PDFs and 610 photos'
  'Retrouvez vos documents et vos photos à partir de quelques mots, même lorsque leur nom ne veut rien dire.'='Find documents and photos using a few remembered details, even when their filenames are meaningless.'
  'Retrio retrouve vos documents et vos photos à partir de quelques mots, même lorsque leur nom ne veut rien dire.'='Retrio finds documents and photos from the details you remember, even when their filenames are meaningless.'
  'Retrouvez un document ou une photo avec quelques mots, même si son nom est incompréhensible.'='Find a document or photo using your own words, even when its filename is meaningless.'
  'Logiciel de recherche locale qui retrouve des documents et des photos à partir de quelques mots, même lorsque leur nom est incompréhensible.'='Local file-search software that finds documents and photos from remembered details, even when their filenames are unclear.'
  'Mes fichiers sont-ils envoyés sur Internet ?'='Are my files uploaded to the Internet?'
  'Vérifiez que votre antivirus ou votre navigateur n''a pas bloqué le fichier téléchargé. Si le problème persiste, contactez l''assistance Retrio.'='Check whether your browser or antivirus blocked the download. If the issue continues, contact Retrio support.'
  'Vérifiez que le dossier contenant ce fichier a été sélectionné, puis relancez l''analyse.'='Make sure the folder containing the file is selected, then run the analysis again.'
  'Non. L''analyse, l''index et la recherche fonctionnent localement sur votre ordinateur.'='No. Analysis, indexing and search all run locally on your computer.'
  'Le devis de déménagement'='The moving quote'
  'La facture du lave-linge'='The washing machine invoice'
  'L''attestation d''assurance'='The insurance certificate'
  'Vente & réparation d''électroménager'='Home appliance sales and repair'
  'Facture n°'='Invoice no.'
  'Désignation'='Description'
  'Qté'='Qty'
  'Prix'='Price'
  'Lave-linge frontal 9kg — Modèle Zenith 900'='Front-loading washing machine — Zenith 900'
  'Installation et mise en service'='Installation and setup'
  'Reprise ancien appareil'='Old appliance collection'
  'Total TTC'='Total incl. tax'
  'Document fictif généré pour la démonstration — ne correspond à aucune facture réelle.'='Fictional document created for this demo — it does not represent a real invoice.'
  'Fournisseur d''électricité'='Electricity supplier'
  'Mars 2024'='March 2024'
  'Consommation électricité — mars'='Electricity usage — March'
  'Abonnement mensuel'='Monthly standing charge'
  '1 document trouvé — sur les données de démonstration'='1 document found — using demo data'
  'ÉlectroPlus'='Home Appliances Ltd'
  '18 mars 2024'='18 March 2024'
  'href="./rechercher-texte-dans-pdf.html"'='href="./search-text-inside-pdf-files.html"'
  'href="./legal-information.html#mentions"'='href="./legal-information.html"'
  'href="./legal-information.html#confidentialite"'='href="./privacy-policy.html"'
  'href="./legal-information.html#conditions"'='href="./terms.html"'
  'href="./legal-information.html#assistance"'='href="./support.html"'
  'href="./legal-information.html#desinstallation"'='href="./legal-information.html#uninstall"'
  '>CGU<'='>Terms<'
}

New-EnglishPage 'index.html' 'index.html' $homeText 'https://retrio.eu/' 'https://retrio.eu/en/'

$download = [ordered]@{
  '<title>Téléchargement – Retrio</title>'='<title>Download Retrio for Windows</title>'
  "Téléchargez Retrio gratuitement pour Windows 10 et 11 et suivez les étapes simples d’installation."='Download Retrio for Windows 10 and 11 and follow three simple installation steps.'
  'Votre téléchargement commence.'='Your download is starting.'
  'Plus que 3 étapes pour utiliser Retrio sur votre ordinateur.'='Three quick steps and Retrio will be ready on your computer.'
  'Téléchargements'='Downloads'
  'Terminé'='Complete'
  'Ouvrez le fichier'='Open the installer'
  'Cliquez sur'='Open'
  'dans vos téléchargements.'='from your Downloads folder.'
  'Windows a protégé votre ordinateur'='Windows protected your PC'
  'Informations complémentaires'='More info'
  'Exécuter quand même'='Run anyway'
  'Ne pas exécuter'='Do not run'
  "Autorisez l’installation"='Allow the installation'
  'Cliquez sur « Oui ». Si Windows affiche un écran bleu : « Informations complémentaires », puis « Exécuter quand même ».'='Click “Yes”. If Windows displays a blue protection screen, choose “More info”, then “Run anyway”.'
  'Retrio est prêt'='Retrio is ready'
  'Installez et ouvrez'='Install and open'
  "Suivez les étapes de l’installateur. Retrio est ensuite gratuit à utiliser."='Follow the installer steps, then open Retrio and start searching for free.'
  'Vous avez Retrio Pro ?'='Already have Retrio Pro?'
  "Dans Retrio, ouvrez l’onglet Pro et saisissez l’e-mail utilisé lors du paiement. Aucun code nécessaire."='Open the Pro tab in Retrio and enter the email address used for payment. No activation code is required.'
  'Télécharger Retrio gratuitement'='Download Retrio for free'
  'Version bêta 0.5.2 pour Windows 10/11 ·'='Beta 0.5.2 for Windows 10/11 ·'
  'Retour à retrio.eu'='Back to retrio.eu'
}
New-EnglishPage 'telecharger.html' 'download.html' $download 'https://retrio.eu/telecharger.html' 'https://retrio.eu/en/download.html'

$pro = [ordered]@{
  '<title>Retrio Pro — Débloquez toutes les fonctions</title>'='<title>Retrio Pro — Unlock every Pro feature</title>'
  'Retrio Pro : 9,99 € par mois, sans engagement. 15 jours offerts en créant un compte avec votre adresse e-mail. Rangement, doublons et nettoyage sans limite.'='Retrio Pro: €9.99 per month, cancel anytime. 15 days free when you sign up with your email address. Unlimited organising, duplicate detection and clean-up.'
  'Comment ça marche ?'='How it works'
  'Conseils pratiques'='Practical guides'
  '>Télécharger<'='>Download<'
  '/ mois, sans engagement'='/ month, cancel anytime'
  'Passez à Retrio Pro'='Upgrade to Retrio Pro'
  'Débloquez sans limite les propositions de rangement, les doublons exacts et le nettoyage approfondi. Vous gardez la main avant chaque déplacement ou suppression. Résiliable à tout moment depuis votre espace Stripe.'='Unlock unlimited organisation suggestions, exact duplicate detection and deep clean-up tools. Nothing is moved or deleted without your approval. Cancel anytime through Stripe.'
  'S''abonner — 9,99 €/mois'='Subscribe — €9.99/month'
  'Paiement sécurisé par Stripe. Retrio ne stocke jamais vos données de carte bancaire.'='Secure payment through Stripe. Retrio never stores your card details.'
  'Facture EDF – mars 2026.pdf'='Electricity bill – March 2026.pdf'
  'Factures / 2026'='Bills / 2026'
  'Rangement et renommage proposés'='Smart organisation and naming suggestions'
  'Retrio propose un nom plus clair pour les documents mal nommés et un classement par type ou par date, avant votre validation.'='Retrio suggests clearer names for poorly named documents and useful folders by type or date. You review every suggestion first.'
  'Valider (2)'='Approve (2)'
  'Classement sans limite'='Unlimited organisation'
  'Validez autant de propositions de classement que nécessaire, une par une ou par sélection.'='Approve as many organisation suggestions as you need, individually or in batches.'
  'Conservée'='Keep'
  '→ Corbeille'='→ Recycle Bin'
  'Doublons exacts, sans limite'='Unlimited exact duplicate detection'
  'Repérez les fichiers strictement identiques, choisissez la copie à conserver et envoyez les autres à la corbeille.'='Spot truly identical files, choose the copy you want to keep and send the others to the Recycle Bin.'
  'Espace libérable'='Space you can reclaim'
  'Fichiers temporaires'='Temporary files'
  'Gros fichiers anciens'='Large old files'
  'Téléchargements oubliés'='Forgotten downloads'
  'Nettoyage approfondi, sans limite'='Unlimited deep clean-up'
  'Analysez les fichiers temporaires, gros fichiers anciens, téléchargements oubliés, quasi-doublons de documents et photos en rafale.'='Review temporary files, large old files, forgotten downloads, near-duplicate documents and burst photos.'
  'Prêt à gagner du temps ?'='Ready to save time?'
  '9,99 € par mois. Annulable à tout moment, sans engagement.'='€9.99 per month. Cancel anytime.'
  'S''abonner maintenant'='Subscribe now'
  'Comment activer Retrio Pro dans le logiciel ?'='How do I activate Retrio Pro in the app?'
  'Une fois abonné, ouvrez Retrio, cliquez sur « Découvrir » dans la barre latérale, puis « Vous êtes déjà abonné » et indiquez l''email utilisé lors du paiement. Les fonctions Pro se débloquent immédiatement.'='After subscribing, open Retrio, select “Discover” in the sidebar, then “Already subscribed”, and enter the email used for payment. Your Pro features unlock immediately.'
  'Comment résilier mon abonnement ?'='How do I cancel my subscription?'
  'Vous pouvez résilier à tout moment depuis le lien de gestion envoyé par Stripe après votre premier paiement, sans justification ni pénalité.'='You can cancel anytime from the management link Stripe sends after your first payment. There is no penalty and no explanation required.'
  'Mes fichiers sont-ils envoyés sur Internet ?'='Are my files uploaded to the Internet?'
  'Non. L''analyse et la recherche restent 100 % locales. Seul le statut de votre abonnement est vérifié en ligne, via votre email.'='No. Analysis and search remain entirely local. Only your subscription status is checked online using your email address.'
  'Guides pour retrouver vos fichiers'='File-finding guides'
  'Mentions légales'='Legal information'
  'Politique de confidentialité'='Privacy policy'
  'Conditions d''utilisation'='Terms of use'
  'Contact et assistance'='Contact and support'
  '>Confidentialité<'='>Privacy<'
  '>CGU<'='>Terms<'
  'Retrio — Simplicité. Rapidité. Confidentialité.'='Retrio — Simple. Fast. Private.'
}
New-EnglishPage 'retrio-pro.html' 'retrio-pro.html' $pro 'https://retrio.eu/retrio-pro.html' 'https://retrio.eu/en/retrio-pro.html'

$support = [ordered]@{
  '<title>Assistance et remboursements | Retrio</title>'='<title>Support and refunds | Retrio</title>'
  "Obtenez de l’aide pour installer, utiliser ou activer Retrio Pro et découvrez la procédure de remboursement."='Get help installing, using or activating Retrio Pro, and learn how cancellations and refunds work.'
  '>Accueil<'='>Home<'
  '› Assistance'='› Support'
  'Assistance Retrio'='Retrio support'
  "Une difficulté avec l’installation, la recherche ou Retrio Pro ? Écrivez-nous à"='Need help with installation, search or Retrio Pro? Email us at'
  'Pour obtenir une réponse rapidement'='Help us answer quickly'
  "Indiquez votre version de Windows, la version de Retrio et les étapes qui provoquent le problème. Vous pouvez joindre une capture d’écran, mais ne transmettez jamais de document personnel, de mot de passe ou de donnée bancaire."='Tell us your Windows version, your Retrio version and the steps that trigger the issue. You may attach a screenshot, but never send personal documents, passwords or banking information.'
  'Questions fréquentes'='Frequently asked questions'
  'Le téléchargement ne démarre pas'='The download does not start'
  'Retournez sur la'='Go back to the'
  'page de téléchargement'='download page'
  'et cliquez sur le bouton vert. Vérifiez ensuite le dossier Téléchargements de Windows.'='and click the green button. Then check your Windows Downloads folder.'
  'Windows affiche un écran de protection'='Windows displays a protection screen'
  "Vérifiez que l’installateur provient bien de retrio.eu. Cliquez ensuite sur « Informations complémentaires », puis « Exécuter quand même »."='Make sure the installer came from retrio.eu. Then choose “More info”, followed by “Run anyway”.'
  "Retrio Pro ne s’active pas"='Retrio Pro will not activate'
  "Dans l’onglet Pro du logiciel, saisissez exactement l’adresse e-mail utilisée lors du paiement Stripe. Vérifiez aussi votre connexion Internet. Si le problème continue, envoyez-nous cette adresse e-mail, sans aucune donnée bancaire."='In the Pro tab of the app, enter exactly the same email address you used for the Stripe payment. Also check your Internet connection. If the issue continues, send us that email address — never your card details.'
  'Mes fichiers sont-ils envoyés en ligne ?'='Are my files uploaded?'
  "Non. L’analyse, l’index et la recherche restent sur votre ordinateur. Seule l’adresse saisie pour Pro est envoyée au service de licence afin de vérifier l’abonnement."='No. Analysis, indexing and search remain on your computer. Only the address entered for Pro is sent to the licence service to verify your subscription.'
  'Résiliation et remboursement'='Cancellation and refunds'
  "Vous pouvez résilier l’abonnement depuis le lien de gestion Stripe reçu après le paiement. Pour demander un remboursement, écrivez à"='You can cancel your subscription from the Stripe management link received after payment. To request a refund, email'
  "avec l’adresse utilisée lors du paiement, la date approximative et le motif. N’envoyez jamais votre numéro de carte bancaire."='with the address used for payment, the approximate date and the reason. Never send your card number.'
  "Nous vérifions le paiement dans Stripe, confirmons la demande par e-mail puis effectuons, lorsqu’il est accepté, le remboursement sur le moyen de paiement d’origine. Les délais d’affichage dépendent ensuite de la banque."='We verify the payment in Stripe, confirm the request by email and, when approved, issue the refund to the original payment method. The time it takes to appear then depends on your bank.'
  'Signaler un bug'='Report a bug'
  "Décrivez ce que vous faisiez, ce que vous attendiez et ce qui s’est produit. Précisez si le problème revient après redémarrage. Une capture d’écran masquant les informations privées est utile."='Describe what you were doing, what you expected and what happened. Tell us whether the issue returns after a restart. A screenshot with private information hidden is helpful.'
  '>Confidentialité<'='>Privacy<'
  '>CGU<'='>Terms<'
  'Nous contacter'='Contact us'
}
New-EnglishPage 'assistance.html' 'support.html' $support 'https://retrio.eu/assistance.html' 'https://retrio.eu/en/support.html'

$privacy = [ordered]@{
  '<title>Politique de confidentialité | Retrio</title>'='<title>Privacy policy | Retrio</title>'
  'Découvrez quelles données Retrio traite et quelles informations restent exclusivement sur votre ordinateur.'='Learn what data Retrio processes and what information always remains on your computer.'
  'content="Politique de confidentialité | Retrio"'='content="Privacy policy | Retrio"'
  'Données locales et fonctionnement de Retrio.'='How Retrio handles local data and optional anonymous analytics.'
  '>Accueil<'='>Home<'
  '› Politique de confidentialité'='› Privacy policy'
  '>Politique de confidentialité<'='>Privacy policy<'
  'Dernière mise à jour : 29 septembre 2026.'='Last updated: 29 September 2026.'
  'Le principe essentiel'='The essential principle'
  'Retrio analyse uniquement les dossiers que vous choisissez. Les documents, photos, noms et chemins de fichiers, contenus extraits, index et textes de recherche restent sur votre ordinateur et ne sont pas transmis au site Retrio.'='Retrio analyses only the folders you choose. Documents, photos, filenames and paths, extracted content, indexes and search text remain on your computer and are not sent to the Retrio website.'
  'Données de licence'='Licence data'
  "Si vous renseignez une adresse pour activer Retrio Pro, elle est transmise au service de licence Retrio afin de vérifier l’état de l’abonnement."='If you enter an email address to activate Retrio Pro, it is sent to the Retrio licence service to verify the subscription status.'
  'Statistiques anonymes du logiciel'='Anonymous app analytics'
  "Avec votre accord explicite, Retrio transmet à PostHog des événements techniques anonymes : lancement de l’application, version, système d’exploitation, fin d’indexation, utilisation des grandes fonctions et catégorie d’une éventuelle erreur. Aucun nom, chemin ou contenu de fichier, texte recherché, résultat OCR ou adresse email de licence n’est transmis. Vous pouvez refuser ou retirer votre accord à tout moment depuis « Confidentialité » dans le logiciel."='With your explicit consent, Retrio sends anonymous technical events to PostHog: app launch, version, operating system, completed indexing, use of major features and the category of any error. No filename, path, file content, search text, OCR result or licence email is sent. You may decline or withdraw consent at any time from Privacy in the app.'
  "PostHog traite ces événements pour le compte de Retrio. Un identifiant aléatoire propre à l’installation est conservé localement afin de calculer le nombre d’utilisateurs actifs sans connaître leur identité."='PostHog processes these events on behalf of Retrio. A random installation identifier is stored locally so we can count active users without knowing their identity.'
  'Statistiques du site web'='Website analytics'
  "Avec votre accord, le site transmet à PostHog des événements d’audience pseudonymes : pages consultées, clic sur le téléchargement, clic vers le paiement et clic vers l’assistance. Aucun document, texte de recherche, adresse e-mail ou donnée bancaire n’est transmis. Le choix et un identifiant aléatoire sont conservés dans le stockage local du navigateur. Vous pouvez effacer ces données depuis les paramètres de votre navigateur."='With your consent, the website sends pseudonymous analytics events to PostHog: pages viewed, download clicks, payment clicks and support clicks. No document, search text, email address or banking information is sent. Your choice and a random identifier are kept in local browser storage and can be cleared from your browser settings.'
  "Le clic de téléchargement mesure l’intention de télécharger. Le premier lancement anonyme du logiciel permet ensuite de mesurer séparément les installations réellement ouvertes."='A download click measures intent to download. The anonymous first-launch event from the app separately measures installations that were actually opened.'
  'Vos droits'='Your rights'
  "Vous pouvez demander l’accès, la rectification ou la suppression des données associées à votre adresse de licence en écrivant à"='You may request access to, correction of or deletion of data associated with your licence address by emailing'
  'Sécurité et mises à jour'='Security and updates'
  'Le site utilise HTTPS. Cette politique peut évoluer avec les fonctionnalités et prestataires de Retrio ; sa date de révision figure en haut de page.'='The website uses HTTPS. This policy may change as the features and service providers used by Retrio evolve; the revision date appears at the top of this page.'
  '>CGU<'='>Terms<'
  'Mentions légales'='Legal information'
}
New-EnglishPage 'politique-confidentialite.html' 'privacy-policy.html' $privacy 'https://retrio.eu/politique-confidentialite.html' 'https://retrio.eu/en/privacy-policy.html'

$terms = [ordered]@{
  "<title>Conditions générales d’utilisation | Retrio</title>"='<title>Terms of use | Retrio</title>'
  "Consultez les conditions générales d’utilisation du site et du logiciel Retrio pour Windows."='Read the terms governing the Retrio website and Windows app.'
  "Conditions d’utilisation du site et du logiciel Retrio."='Terms governing the Retrio website and Windows app.'
  '>Accueil<'='>Home<'
  '› CGU'='› Terms'
  "Conditions générales d’utilisation"='Terms of use'
  'Dernière mise à jour : 29 septembre 2026.'='Last updated: 29 September 2026.'
  '>Objet<'='>Purpose<'
  "Ces conditions encadrent l’utilisation du site retrio.eu et du logiciel Retrio pour Windows. Utiliser Retrio implique d’accepter ces conditions."='These terms govern use of the retrio.eu website and the Retrio app for Windows. By using Retrio, you agree to these terms.'
  'Accès et compatibilité'='Access and compatibility'
  'Retrio est destiné aux ordinateurs compatibles indiqués sur la page de téléchargement. Certaines fonctions nécessitent Windows, WebView2 et un espace disque suffisant. Le service peut évoluer ou être temporairement indisponible.'='Retrio is intended for the compatible computers listed on the download page. Some features require Windows, WebView2 and sufficient disk space. The service may change or be temporarily unavailable.'
  'Utilisation autorisée'='Permitted use'
  "Vous devez utiliser Retrio uniquement sur des fichiers auxquels vous êtes autorisé à accéder. Toute tentative de contournement, de perturbation du service de licence ou d’usage illégal est interdite."='You may use Retrio only with files you are authorised to access. Attempts to bypass or disrupt the licence service, and any unlawful use, are prohibited.'
  'Fichiers et sauvegardes'='Files and backups'
  "Retrio est un outil de recherche et d’organisation, pas une solution de sauvegarde. Vérifiez les propositions avant toute suppression ou réorganisation et conservez une sauvegarde adaptée de vos données importantes."='Retrio is a search and organisation tool, not a backup service. Review suggestions before deleting or reorganising anything, and keep an appropriate backup of important data.'
  'Version bêta et responsabilité'='Beta software and liability'
  "La version bêta peut comporter des erreurs ou produire des résultats incomplets. Retrio ne garantit pas qu’un fichier sera toujours trouvé ou correctement classé. Dans les limites permises par la loi, l’utilisateur reste responsable de ses fichiers et décisions."='The beta may contain errors or return incomplete results. Retrio does not guarantee that every file will be found or classified correctly. To the extent permitted by law, users remain responsible for their files and decisions.'
  "Les fonctionnalités payantes, leur prix et leur durée sont présentés avant paiement. Le statut d’abonnement est vérifié par le service de licence. Les droits légaux applicables aux consommateurs demeurent inchangés."='Paid features, price and billing period are shown before payment. Subscription status is verified by the licence service. Applicable statutory consumer rights remain unchanged.'
  'Propriété intellectuelle'='Intellectual property'
  "Le logiciel, le site, les textes, la marque et les éléments visuels Retrio sont protégés. Aucun droit de reproduction ou de redistribution n’est accordé en dehors de l’usage normal du service."='The Retrio software, website, copy, brand and visual assets are protected. No reproduction or redistribution rights are granted beyond normal use of the service.'
  '>Contact<'='>Contact<'
  'Pour toute question :'='For any question:'
  '. Consultez aussi la'='. You can also read the'
  'politique de confidentialité'='privacy policy'
  '>Confidentialité<'='>Privacy<'
  'Mentions légales'='Legal information'
}
New-EnglishPage 'cgu.html' 'terms.html' $terms 'https://retrio.eu/cgu.html' 'https://retrio.eu/en/terms.html'

$notFound = [ordered]@{
  '<title>Page introuvable | Retrio</title>'='<title>Page not found | Retrio</title>'
  "Cette page Retrio n’existe pas ou a été déplacée."='This Retrio page does not exist or has moved.'
  'Cette page est introuvable.'='We cannot find this page.'
  "Le lien est peut-être ancien ou l’adresse comporte une erreur. Revenez à l’accueil pour retrouver le bon chemin."='The link may be outdated or the address may contain a mistake. Return to the homepage to get back on track.'
  "Retourner à l’accueil"='Return to the homepage'
  'href="/"'='href="/en/"'
}
New-EnglishPage '404.html' '404.html' $notFound 'https://retrio.eu/404.html' 'https://retrio.eu/en/404.html'

function Add-FrenchAlternates {
  param([string]$File, [string]$FrenchUrl, [string]$EnglishUrl)
  $path = Join-Path $root $File
  $content = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
  if ($content -match 'hreflang="en"') { return }
  $tags = '<link rel="alternate" hreflang="fr" href="' + $FrenchUrl + '" />' + "`r`n" +
    '<link rel="alternate" hreflang="en" href="' + $EnglishUrl + '" />' + "`r`n" +
    '<link rel="alternate" hreflang="x-default" href="' + $FrenchUrl + '" />'
  $content = $content.Replace('</head>', $tags + "`r`n</head>")
  [IO.File]::WriteAllText($path, $content, [Text.UTF8Encoding]::new($false))
}

Add-FrenchAlternates 'index.html' 'https://retrio.eu/' 'https://retrio.eu/en/'
Add-FrenchAlternates 'telecharger.html' 'https://retrio.eu/telecharger.html' 'https://retrio.eu/en/download.html'
Add-FrenchAlternates 'retrio-pro.html' 'https://retrio.eu/retrio-pro.html' 'https://retrio.eu/en/retrio-pro.html'
Add-FrenchAlternates 'assistance.html' 'https://retrio.eu/assistance.html' 'https://retrio.eu/en/support.html'
Add-FrenchAlternates 'politique-confidentialite.html' 'https://retrio.eu/politique-confidentialite.html' 'https://retrio.eu/en/privacy-policy.html'
Add-FrenchAlternates 'cgu.html' 'https://retrio.eu/cgu.html' 'https://retrio.eu/en/terms.html'
Add-FrenchAlternates 'informations-legales.html' 'https://retrio.eu/informations-legales.html' 'https://retrio.eu/en/legal-information.html'
Add-FrenchAlternates '404.html' 'https://retrio.eu/404.html' 'https://retrio.eu/en/404.html'

# Keep the pre-existing English guides inside the English visitor journey.
Get-ChildItem -Path $en -Filter '*.html' | ForEach-Object {
  $content = [IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8)
  $content = $content.Replace('href="../telecharger.html"', 'href="./download.html"')
  $content = $content.Replace('href="../"', 'href="./"')
  $content = $content.Replace('href="/"', 'href="/en/"')
  $content = $content.Replace('href="/politique-confidentialite.html"', 'href="/en/privacy-policy.html"')
  $content = $content.Replace('href="/cgu.html"', 'href="/en/terms.html"')
  $content = $content.Replace('href="/informations-legales.html"', 'href="/en/legal-information.html"')
  [IO.File]::WriteAllText($_.FullName, $content.TrimEnd() + "`r`n", [Text.UTF8Encoding]::new($false))
}

Write-Host "English core pages generated."
