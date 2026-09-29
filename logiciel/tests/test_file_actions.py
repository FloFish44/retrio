import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from retrio_web import Api, FileEntry


class FileActionSecurityTests(unittest.TestCase):
    def _api_with_file(self, path):
        api = Api()
        api.scan_result.entries.append(
            FileEntry(
                path=str(path),
                name=path.name,
                stem=path.stem,
                ext=path.suffix,
                size=path.stat().st_size,
                category="documents",
                badly_named=False,
            )
        )
        return api

    def test_arbitrary_path_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            known = root / "known.txt"
            unknown = root / "unknown.txt"
            known.write_text("known", encoding="utf-8")
            unknown.write_text("unknown", encoding="utf-8")
            api = self._api_with_file(known)

            self.assertFalse(api.open_path(unknown))
            self.assertFalse(api.open_folder(unknown))
            self.assertFalse(api.copy_path(unknown))
            self.assertFalse(api.move_to_trash(unknown)["ok"])

    def test_organization_destination_is_confined(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "known.txt"
            source.write_text("known", encoding="utf-8")
            api = self._api_with_file(source)

            escaped = root.parent / "escaped.txt"
            result = api.apply_organization(source, escaped)

            self.assertFalse(result["ok"])
            self.assertTrue(source.exists())
            self.assertFalse(escaped.exists())


if __name__ == "__main__":
    unittest.main()
