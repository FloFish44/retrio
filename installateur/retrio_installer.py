import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
import zipfile
import traceback

APP_NAME = "Retrio"
EXE_NAME = "RetrioWeb.exe"
DOWNLOAD_URL = "https://github.com/FloFish44/retrio/releases/download/v0.5.2-beta/RetrioWeb.zip"
DOWNLOAD_SHA256 = "E531B35EAB60C76D487A60161D5940930C3BDA33A38B26DA460CB513A34A4156"
INSTALL_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Programs" / "Retrio"


def resource_path(name):
    return Path(getattr(sys, "_MEIPASS", Path(__file__).parent)) / name


def desktop_path():
    if sys.platform == "win32":
        import ctypes
        buffer = ctypes.create_unicode_buffer(260)
        if ctypes.windll.shell32.SHGetFolderPathW(None, 0x10, None, 0, buffer) == 0:
            return Path(buffer.value)
    return Path.home() / "Desktop"


def create_shortcut(shortcut_path, target_path, working_dir, icon_path):
    def ps(value):
        return str(value).replace("'", "''")
    script = (
        "$w=New-Object -ComObject WScript.Shell;"
        f"$s=$w.CreateShortcut('{ps(shortcut_path)}');"
        f"$s.TargetPath='{ps(target_path)}';"
        f"$s.WorkingDirectory='{ps(working_dir)}';"
        f"$s.IconLocation='{ps(icon_path)}';$s.Save()"
    )
    subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
                   check=True, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))


class Api:
    def __init__(self):
        self.window = None
        self.running = False
        self.target = None
        self._maximized = False
        self._status_lock = threading.Lock()
        self._status = {"state": "ready", "progress": 0,
                        "message": "Prêt à installer la version 0.5.2."}

    def set_status(self, state, progress, message):
        with self._status_lock:
            self._status = {"state": state, "progress": progress, "message": message}

    def get_status(self):
        with self._status_lock:
            return dict(self._status)

    def start_install(self):
        if self.running:
            return False
        self.running = True
        self.set_status("running", 2, "Préparation du téléchargement…")
        threading.Thread(target=self.install, daemon=True).start()
        return True

    def install(self):
        archive = INSTALL_DIR / "retrio-download.zip"
        staging = INSTALL_DIR / "app-new"
        current = INSTALL_DIR / "app"
        previous = INSTALL_DIR / "app-previous"
        try:
            INSTALL_DIR.mkdir(parents=True, exist_ok=True)
            opener = urllib.request.build_opener()
            opener.addheaders = [("User-Agent", "Retrio-Installer/0.5.2 (Windows)")]
            self.set_status("running", 4, "Connexion au serveur Retrio…")
            with opener.open(DOWNLOAD_URL, timeout=30) as response, archive.open("wb") as destination:
                total = int(response.headers.get("Content-Length", 0))
                downloaded = 0
                started_at = time.monotonic()
                last_update = 0.0
                while True:
                    chunk = response.read(4 * 1024 * 1024)
                    if not chunk:
                        break
                    destination.write(chunk)
                    downloaded += len(chunk)
                    percent = min(68, 5 + int(downloaded * 63 / total)) if total else 12
                    now = time.monotonic()
                    if now - last_update >= 0.2 or (total and downloaded >= total):
                        last_update = now
                        speed = downloaded / max(now - started_at, 0.1) / (1024 * 1024)
                        current_mb = downloaded / (1024 * 1024)
                        if total:
                            total_mb = total / (1024 * 1024)
                            detail = f"Téléchargement… {current_mb:.0f}/{total_mb:.0f} Mo · {speed:.1f} Mo/s"
                        else:
                            detail = f"Téléchargement… {current_mb:.0f} Mo · {speed:.1f} Mo/s"
                        self.set_status("running", percent, detail)

            digest = hashlib.sha256()
            archive_size = max(archive.stat().st_size, 1)
            verified = 0
            with archive.open("rb") as source:
                for chunk in iter(lambda: source.read(4 * 1024 * 1024), b""):
                    digest.update(chunk)
                    verified += len(chunk)
                    self.set_status("running", 69 + int(verified * 6 / archive_size),
                                    "Vérification de l’intégrité du téléchargement…")
            if digest.hexdigest().upper() != DOWNLOAD_SHA256:
                raise RuntimeError("Le téléchargement est incomplet ou ne correspond pas à la version officielle.")
            self.set_status("running", 76, "Téléchargement vérifié. Installation des fichiers…")

            if staging.exists():
                shutil.rmtree(staging)
            staging.mkdir()
            with zipfile.ZipFile(archive) as package:
                base = staging.resolve()
                members = package.infolist()
                for index, member in enumerate(members, 1):
                    destination = (staging / member.filename).resolve()
                    if os.path.commonpath([base, destination]) != str(base):
                        raise RuntimeError("L’archive contient un chemin invalide.")
                    package.extract(member, staging)
                    if index == len(members) or index % 20 == 0:
                        progress = 77 + int(index * 17 / max(len(members), 1))
                        self.set_status("running", progress,
                                        f"Installation des fichiers… {index}/{len(members)}")
            archive.unlink(missing_ok=True)

            found = next(staging.rglob(EXE_NAME), None)
            if not found:
                raise RuntimeError("Le programme Retrio est absent de l’archive.")
            relative_exe = found.relative_to(staging)
            if previous.exists():
                shutil.rmtree(previous)
            if current.exists():
                current.replace(previous)
            staging.replace(current)
            self.target = current / relative_exe

            self.set_status("running", 96, "Création du raccourci sur le Bureau…")
            icon = INSTALL_DIR / "retrio_icon.ico"
            shutil.copy2(resource_path("retrio_icon.ico"), icon)
            create_shortcut(desktop_path() / "Retrio.lnk", self.target, self.target.parent, icon)
            if previous.exists():
                shutil.rmtree(previous, ignore_errors=True)
            self.set_status("done", 100, "Retrio 0.5.2 est installé.")
        except Exception as exc:
            archive.unlink(missing_ok=True)
            try:
                (INSTALL_DIR / "installer.log").write_text(traceback.format_exc(), encoding="utf-8")
            except Exception:
                pass
            self.set_status("error", 0, f"Installation impossible : {exc}")
        finally:
            self.running = False

    def launch(self):
        if self.target and self.target.exists():
            subprocess.Popen([str(self.target)], cwd=str(self.target.parent))
        self.window.destroy()

    def close(self):
        self.window.destroy()

    def minimize(self):
        self.window.minimize()

    def toggle_maximize(self):
        if self._maximized:
            self.window.restore()
        else:
            self.window.maximize()
        self._maximized = not self._maximized


def main():
    import webview
    if sys.platform == "win32":
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("Retrio.Installer")
    api = Api()
    api.window = webview.create_window("Installation de Retrio", url=str(resource_path("installer.html")),
                                       js_api=api, frameless=True, easy_drag=False,
                                       width=620, height=680, min_size=(580, 640), resizable=True,
                                       background_color="#FBF8F0")
    webview.start(icon=str(resource_path("retrio_icon.ico")))


if __name__ == "__main__":
    main()
