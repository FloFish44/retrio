import json
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest import mock


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import telemetry


class FakePosthog:
    instances = []

    def __init__(self, *_args, **_kwargs):
        self.events = []
        self.closed = False
        self.__class__.instances.append(self)

    def capture(self, **payload):
        self.events.append(payload)

    def shutdown(self):
        self.closed = True


class TelemetryConsentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = mock.patch.dict(os.environ, {"LOCALAPPDATA": self.temp.name})
        self.env.start()
        FakePosthog.instances.clear()
        self.posthog = mock.patch.dict(sys.modules, {"posthog": types.SimpleNamespace(Posthog=FakePosthog)})
        self.posthog.start()

    def tearDown(self):
        self.posthog.stop()
        self.env.stop()
        self.temp.cleanup()

    def test_consent_is_required_before_events_are_sent(self):
        client = telemetry.Telemetry()
        self.assertIsNone(client.get_consent())
        client.start_session("test")
        self.assertEqual(FakePosthog.instances, [])

        self.assertTrue(client.set_consent(True))
        self.assertTrue(client.get_consent())
        self.assertEqual([event["event"] for event in FakePosthog.instances[0].events],
                         ["app_first_launch", "app_open"])

        self.assertFalse(client.set_consent(False))
        self.assertTrue(FakePosthog.instances[0].closed)
        saved = json.loads((Path(self.temp.name) / "Retrio" / "telemetry.json").read_text())
        self.assertIs(saved["consent"], False)


if __name__ == "__main__":
    unittest.main()
