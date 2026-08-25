from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

CONTRACT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CONTRACT_ROOT))

from probe.contract_probe import ProbeConfig, run_probe  # noqa: E402


class ContractProbeTests(unittest.TestCase):
    def run_mode(self, mode: str):
        with tempfile.TemporaryDirectory() as temp:
            temp_path = Path(temp)
            home = temp_path / "mirror-home"
            home.mkdir()
            command = [
                sys.executable,
                str(CONTRACT_ROOT / "tests" / "fake_mirror.py"),
                "--mode",
                mode,
                "--state-dir",
                str(temp_path / "state"),
            ]
            return run_probe(
                ProbeConfig(
                    mirror_command=command,
                    mirror_home=home,
                    journey_fixture=CONTRACT_ROOT / "fixtures" / "journey",
                    contract_root=CONTRACT_ROOT,
                    production_home=None,
                )
            )

    def test_conformant_adapter_passes(self):
        result = self.run_mode("conformant")
        self.assertEqual("passed", result["result"])
        self.assertEqual("open", result["gate"])

    def test_missing_capability_is_bounded_unavailable(self):
        result = self.run_mode("unavailable")
        self.assertEqual("contract_unavailable", result["result"])
        self.assertEqual("blocked", result["gate"])

    def test_wrong_version_is_nonconformant(self):
        result = self.run_mode("wrong-version")
        self.assertEqual("nonconformant", result["result"])
        self.assertIn("contract version", result["diagnostic"])

    def test_malformed_operational_projection_is_nonconformant(self):
        result = self.run_mode("malformed-operational")
        self.assertEqual("nonconformant", result["result"])
        self.assertIn("Operational", result["diagnostic"])

    def test_accepted_unsafe_projection_name_is_unsafe(self):
        result = self.run_mode("unsafe-path")
        self.assertEqual("unsafe", result["result"])
        self.assertEqual("blocked", result["gate"])

    def test_foreign_namespace_acceptance_is_unsafe(self):
        result = self.run_mode("unsafe-namespace")
        self.assertEqual("unsafe", result["result"])
        self.assertEqual("blocked", result["gate"])

    def test_partial_publication_is_nonconformant(self):
        result = self.run_mode("partial-publication")
        self.assertEqual("nonconformant", result["result"])
        self.assertIn("last valid", result["diagnostic"])

    def test_subprocess_failure_is_probe_error(self):
        result = self.run_mode("subprocess-error")
        self.assertEqual("probe_error", result["result"])

    def test_machine_result_is_json_serializable(self):
        result = self.run_mode("conformant")
        parsed = json.loads(json.dumps(result))
        self.assertEqual("1.0", parsed["contractVersion"])


class ProductionSafetyTests(unittest.TestCase):
    def test_probe_refuses_production_home_without_return_mode(self):
        with tempfile.TemporaryDirectory() as temp:
            production = Path(temp).resolve()
            result = run_probe(
                ProbeConfig(
                    mirror_command=[sys.executable, "unused.py"],
                    mirror_home=production,
                    journey_fixture=CONTRACT_ROOT / "fixtures" / "journey",
                    contract_root=CONTRACT_ROOT,
                    production_home=production,
                )
            )
        self.assertEqual("probe_error", result["result"])
        self.assertIn("production", result["diagnostic"])


if __name__ == "__main__":
    unittest.main()
