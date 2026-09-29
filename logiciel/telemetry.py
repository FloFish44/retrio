#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Retrio — télémétrie produit (PostHog), application Windows.

Point d'entrée UNIQUE pour tous les événements analytiques de l'app
desktop : `get_telemetry()` retourne un singleton `Telemetry` dont les
méthodes `capture(...)` / `track_*(...)` sont appelées depuis
`retrio_web.py`. Rien n'appelle le SDK PostHog directement ailleurs dans
le code — toute la logique de télémétrie (identifiant anonyme, propriétés
communes, anti-doublon des événements « une seule fois », protection
contre les erreurs réseau) vit ici et nulle part ailleurs.

Règles absolues, appliquées partout dans ce module :

  1. Ne JAMAIS bloquer ni ralentir Retrio. Le SDK PostHog envoie les
     événements en tâche de fond (file d'attente interne + thread dédié,
     `sync_mode=False`) ; chaque fonction PUBLIQUE de ce module est en
     plus protégée par un try/except large : une erreur réseau, une
     absence de connexion Internet, une dépendance manquante ou une
     exception quelconque du SDK ne doit jamais remonter à l'appelant ni
     interrompre une recherche, une indexation ou le lancement de l'app.

  2. Ne JAMAIS envoyer de donnée personnelle : pas de texte de recherche,
     pas de nom ou de chemin de fichier/dossier, pas de contenu de
     document, pas de texte OCR, pas de clé de licence ni de token de
     paiement. Pour les erreurs, on ne transmet QUE le nom de la classe
     d'exception (ex. "FileNotFoundError") — jamais son message ni sa
     trace, qui peuvent contenir un chemin Windows ou un nom de fichier.

  3. Un seul identifiant anonyme (UUID v4), généré une fois au premier
     lancement, stocké localement dans %LOCALAPPDATA%\\Retrio\\telemetry.json
     et réutilisé à chaque ouverture — jamais l'email de licence — pour
     que PostHog puisse calculer DAU/WAU/MAU et la rétention.
"""

import json
import os
import platform
import sys
import threading
import uuid
from pathlib import Path

# Aucun identifiant de service n'est embarqué dans le code ou l'exécutable.
# La télémétrie desktop reste désactivée si la variable n'est pas fournie par
# un environnement de déploiement sécurisé.
POSTHOG_PROJECT_API_KEY = os.environ.get("RETRIO_POSTHOG_KEY", "")
POSTHOG_HOST = "https://us.i.posthog.com"

# Tenu synchronisé avec retrio_web.APP_VERSION (passé explicitement par
# start_session() pour éviter toute dérive entre les deux fichiers).
_DEFAULT_APP_VERSION = "0.5.0 (bêta)"


def _data_dir() -> Path:
    base = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
    d = Path(base) / "Retrio"
    try:
        d.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    return d


def _state_path() -> Path:
    return _data_dir() / "telemetry.json"


def _load_state() -> dict:
    try:
        with open(_state_path(), "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data
    except Exception:
        pass
    return {}


def _save_state(state: dict) -> None:
    try:
        with open(_state_path(), "w", encoding="utf-8") as f:
            json.dump(state, f)
    except Exception:
        pass


def _sanitize_error_type(exc: BaseException) -> str:
    """Ne renvoie jamais que le NOM de la classe d'exception — jamais son
    message ni sa trace, qui peuvent contenir un chemin de fichier local
    ou tout autre détail propre à l'utilisateur."""
    try:
        name = type(exc).__name__
        return name or "UnknownError"
    except Exception:
        return "UnknownError"


class Telemetry:
    """Point d'entrée unique pour tous les événements produit Retrio."""

    def __init__(self):
        self._client = None
        self._enabled = False
        self._distinct_id = None
        self._is_pro = False
        self._app_version = _DEFAULT_APP_VERSION
        self._lock = threading.RLock()
        self._init_client()

    # -- initialisation du SDK ----------------------------------------------
    def _init_client(self):
        if not POSTHOG_PROJECT_API_KEY:
            return
        try:
            from posthog import Posthog
            self._client = Posthog(
                POSTHOG_PROJECT_API_KEY,
                host=POSTHOG_HOST,
                disable_geoip=True,
                sync_mode=False,  # jamais bloquant : file d'attente + thread dédié
                on_error=lambda *_a, **_k: None,
            )
            self._enabled = True
        except Exception:
            # Dépendance manquante, erreur d'initialisation, environnement
            # restreint... : la télémétrie est simplement désactivée et
            # toutes les méthodes publiques deviennent des no-op. Retrio
            # continue de fonctionner normalement dans tous les cas.
            self._client = None
            self._enabled = False

    def _common_properties(self) -> dict:
        return {
            "app_version": self._app_version,
            "os": platform.system(),
            "os_release": platform.release(),
            "architecture": platform.machine(),
            "is_pro": self._is_pro,
        }

    # -- identifiant anonyme persistant --------------------------------------
    def _ensure_distinct_id(self):
        """Charge (ou crée une seule fois) l'UUID anonyme persistant.
        Retourne (distinct_id, is_first_launch)."""
        with self._lock:
            state = _load_state()
            is_first_launch = "distinct_id" not in state
            if is_first_launch:
                state["distinct_id"] = str(uuid.uuid4())
                _save_state(state)
            self._distinct_id = state["distinct_id"]
            return self._distinct_id, is_first_launch

    def set_is_pro(self, is_pro: bool):
        self._is_pro = bool(is_pro)

    # -- capture bas niveau ---------------------------------------------------
    def capture(self, event: str, properties: dict = None):
        """Envoie un événement. Ne lève jamais d'exception, ne bloque
        jamais : si la télémétrie n'est pas disponible (pas d'Internet,
        SDK non installé, etc.), c'est un no-op silencieux."""
        if not self._enabled or not self._client or not self._distinct_id:
            return
        try:
            props = self._common_properties()
            if properties:
                props.update(properties)
            self._client.capture(
                distinct_id=self._distinct_id,
                event=event,
                properties=props,
            )
        except Exception:
            pass  # la télémétrie ne doit jamais perturber Retrio

    # -- cycle de vie de l'application ----------------------------------------
    def start_session(self, app_version: str, is_pro: bool = False):
        """À appeler une seule fois, tout au début de main(). Gère
        app_first_launch (une seule fois par installation), app_open
        (à chaque lancement) et app_version_updated (si la version a
        changé depuis le dernier lancement connu)."""
        self._app_version = app_version or _DEFAULT_APP_VERSION
        self.set_is_pro(is_pro)
        try:
            _distinct_id, is_first_launch = self._ensure_distinct_id()
            with self._lock:
                state = _load_state()
                previous_version = state.get("last_seen_version")

                if is_first_launch:
                    self.capture("app_first_launch")

                self.capture("app_open")

                if previous_version and previous_version != self._app_version:
                    self.capture("app_version_updated", {
                        "from_version": previous_version,
                        "to_version": self._app_version,
                    })

                state["last_seen_version"] = self._app_version
                _save_state(state)
        except Exception:
            pass

    def install_crash_handler(self):
        """Intercepte les exceptions non gérées du thread principal pour
        envoyer app_crash, SANS modifier le comportement existant (le
        gestionnaire précédent — impression de la trace, etc. — est
        toujours appelé juste après)."""
        try:
            previous_hook = sys.excepthook

            def _hook(exc_type, exc_value, exc_tb):
                try:
                    self.capture("app_crash", {
                        "error_type": exc_type.__name__ if exc_type else "UnknownError",
                    })
                except Exception:
                    pass
                previous_hook(exc_type, exc_value, exc_tb)

            sys.excepthook = _hook
        except Exception:
            pass

    # -- onboarding (une seule fois par installation) --------------------------
    def track_onboarding_started(self):
        self._track_once("onboarding_started_sent", "onboarding_started")

    def track_onboarding_completed(self):
        self._track_once("onboarding_completed_sent", "onboarding_completed")

    def _track_once(self, state_key: str, event: str, properties: dict = None):
        try:
            with self._lock:
                state = _load_state()
                if state.get(state_key):
                    return
                state[state_key] = True
                _save_state(state)
            self.capture(event, properties)
        except Exception:
            pass

    # -- erreurs -----------------------------------------------------------
    def track_error(self, context: str, exc: BaseException, extra: dict = None):
        props = {"context": context, "error_type": _sanitize_error_type(exc)}
        if extra:
            props.update(extra)
        self.capture("app_error", props)


_instance = None
_instance_lock = threading.Lock()


def get_telemetry() -> Telemetry:
    """Singleton process-wide — un seul client PostHog pour toute l'app."""
    global _instance
    if _instance is None:
        with _instance_lock:
            if _instance is None:
                _instance = Telemetry()
    return _instance
