"""Unit tests for scripts/security_ci_guard.py."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import security_ci_guard  # noqa: E402


class SecurityCIGuardTests(unittest.TestCase):
    def test_pull_request_target_is_flagged(self) -> None:
        text = """name: bad
on:
  pull_request_target:
    branches: [main]

jobs:
  noop:
    runs-on: ubuntu-latest
    steps:
      - run: echo hi
"""
        self.assertTrue(security_ci_guard.uses_pull_request_target(text))

    def test_secret_bearing_pr_workflow_requires_gates(self) -> None:
        text = """name: bad
on:
  pull_request:
    branches: [main]
permissions:
  pull-requests: write
jobs:
  job-x:
    runs-on: ubuntu-latest
    steps:
      - run: echo OPENAI_API_KEY
"""
        self.assertTrue(security_ci_guard.is_secret_bearing(text))
        self.assertFalse(security_ci_guard.has_trusted_author_gate(text))

    def test_npm_ci_without_ignore_scripts_is_detected(self) -> None:
        line = "          run: npm ci"
        self.assertTrue(security_ci_guard.is_local_npm_install(line))
        self.assertFalse(security_ci_guard.has_ignore_scripts(line))

    def test_npm_ci_with_ignore_scripts_passes(self) -> None:
        line = "          run: npm ci --ignore-scripts"
        self.assertTrue(security_ci_guard.is_local_npm_install(line))
        self.assertTrue(security_ci_guard.has_ignore_scripts(line))

    def test_head_sha_ref_is_flagged(self) -> None:
        text = "uses: actions/checkout@v6\nwith:\n  ref: $HEAD_SHA\n  some_param: ?ref=$HEAD_SHA"
        self.assertIsNotNone(security_ci_guard.HEAD_SHA_REF_RE.search(text))


if __name__ == "__main__":
    unittest.main()
