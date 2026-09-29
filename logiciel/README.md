# Retrio — Logiciel Windows

Application de bureau Retrio : recherche documentaire locale, avec une interface
web (HTML/CSS/JS) affichée dans une fenêtre native via **pywebview** (WebView2).

Le traitement des dossiers, l'index et les recherches se fait entièrement sur
la machine de l'utilisateur : aucun document, nom de fichier, chemin, contenu
extrait ou texte de recherche n'est envoyé. Lorsque la télémétrie est configurée
au déploiement, le logiciel peut transmettre des mesures techniques et d'usage
pseudonymes. Il contacte aussi le service de licence Retrio lorsque l'utilisateur
renseigne une adresse de licence. Aucune clé de service n'est intégrée au code.

## Fichiers

- `retrio_web.py` — logique métier + pont vers l'interface (classe `Api`)
- `app.html`, `app.css`, `app.js` — interface (design "Claude Design")
- `fonts/` — polices utilisées par l'interface
- `icon.ico` — icône de l'application
- `build_web.bat` — compile `RetrioWeb.exe` avec PyInstaller (mode dossier / `--onedir`)

## Compiler

Prérequis : Python 3 installé sur Windows.

```
build_web.bat
```

Ce script installe les dépendances (`pywebview`, `pythonnet`), nettoie les
anciens builds, puis compile l'application avec PyInstaller en mode
`--onedir` (démarrage rapide, pas de décompression à chaque lancement).

Le résultat se trouve dans `dist\RetrioWeb\RetrioWeb.exe` (accompagné de son
dossier `_internal`).

## Distribution

Le dossier `dist\RetrioWeb` est ensuite compressé en `RetrioWeb.zip` et publié
comme asset de la Release GitHub. C'est l'installateur (voir le dossier
`installateur/`) qui télécharge ce zip, l'extrait sur la machine de
l'utilisateur et crée le raccourci sur le Bureau — l'utilisateur final ne
télécharge et n'exécute qu'un seul fichier : `Installateur_Retrio.exe`.
