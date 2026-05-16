#!/usr/bin/env python3
"""Workflow security guard for sketch2md.

Adapted from doc2md. Enforces:
- `pull_request_target:` is banned
- secret-bearing PR workflows must use environment gate, trusted-author check,
  same-repo head check, and base-SHA checkout (not HEAD)
- npm installs in secret-bearing PR workflows must use `--ignore-scripts`
- repo content fetched via `?ref=$HEAD_SHA` is rejected
- no broad write permissions on PR workflows
- no committed private key material
"""

from __future__ import annotations

import re
from pathlib import Path


WORKFLOW_DIR = Path(".github/workflows")
TRUSTED_AUTHOR_SNIPPETS = {
    "github.event.pull_request.user.login == 'KjellKod'",
    'github.event.pull_request.user.login == "KjellKod"',
}
SAME_REPO_SNIPPET = "github.event.pull_request.head.repo.full_name == github.repository"
BASE_SHA_SNIPPET = "ref: ${{ github.event.pull_request.base.sha }}"
SECRET_BEARING_SNIPPETS = (
    "OPENAI_API_KEY",
    "secrets.OPENAI_API_KEY",
    "pull-requests: write",
    "issues: write",
)
BROAD_WRITE_SNIPPETS = (
    "contents: write",
    "actions: write",
    "packages: write",
    "deployments: write",
    "attestations: write",
    "checks: write",
)
NPM_SECRET_TOKEN_RE = re.compile(
    r"(?<![A-Za-z0-9_])OPENAI_API_KEY(?![A-Za-z0-9_])"
)
ID_TOKEN_WRITE_RE = re.compile(r"^\s*id-token:\s*write\s*(?:#.*)?$", re.MULTILINE)
NPM_INSTALL_RE = re.compile(r"\bnpm\s+install\b")
NPM_CI_RE = re.compile(r"\bnpm\s+ci\b")
NPM_GLOBAL_RE = re.compile(r"(?<!\S)(?:-g|--global)(?!\S)")
IGNORE_SCRIPTS_FALSE_RE = re.compile(r"--ignore-scripts=false(?:\s|$)")
IGNORE_SCRIPTS_RE = re.compile(r"(?<!\S)--ignore-scripts(?!\S)")
HEAD_SHA_REF_RE = re.compile(
    r"\?ref=(?:\$HEAD_SHA"
    r"|\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\}\})"
)
JOB_HEADER_RE = re.compile(r"^  ([A-Za-z0-9_-]+):\s*(?:#.*)?$")
SECRET_MATERIAL_MARKERS = (
    "-----BEGIN " + "PRIVATE KEY-----",
    "-----BEGIN " + "ENCRYPTED PRIVATE KEY-----",
    "-----BEGIN " + "EC PRIVATE KEY-----",
)
SECRET_SCAN_EXCLUDED_PARTS = {
    ".git",
    ".next",
    "node_modules",
    "__pycache__",
    "dist",
    "build",
    "out",
    "coverage",
}


def strip_yaml_comments(line: str) -> str:
    return line.split("#", 1)[0]


def uses_pull_request_event(text: str) -> bool:
    return "pull_request:" in text


def uses_pull_request_target(text: str) -> bool:
    return "pull_request_target:" in text


def uses_checkout(text: str) -> bool:
    return "actions/checkout@" in text


def is_secret_bearing(text: str) -> bool:
    return any(snippet in text for snippet in SECRET_BEARING_SNIPPETS)


def has_trusted_author_gate(text: str) -> bool:
    return any(snippet in text for snippet in TRUSTED_AUTHOR_SNIPPETS)


def references_npm_sensitive_secret(job_text: str) -> bool:
    return any(
        NPM_SECRET_TOKEN_RE.search(strip_yaml_comments(line))
        for line in job_text.splitlines()
    )


def has_ignore_scripts(line: str) -> bool:
    if IGNORE_SCRIPTS_FALSE_RE.search(line):
        return False
    return IGNORE_SCRIPTS_RE.search(line) is not None


def is_global_npm_install(line: str) -> bool:
    line_without_comments = strip_yaml_comments(line)
    return NPM_INSTALL_RE.search(line_without_comments) is not None and (
        NPM_GLOBAL_RE.search(line_without_comments) is not None
    )


def is_local_npm_install(line: str) -> bool:
    line_without_comments = strip_yaml_comments(line)
    if NPM_CI_RE.search(line_without_comments):
        return True
    return (
        NPM_INSTALL_RE.search(line_without_comments) is not None
        and not is_global_npm_install(line_without_comments)
    )


def workflow_jobs(text: str) -> dict[str, str]:
    lines = text.splitlines(keepends=True)
    jobs: dict[str, str] = {}
    in_jobs = False
    current_name: str | None = None
    current_lines: list[str] = []

    for line in lines:
        if not in_jobs:
            if line.strip() == "jobs:":
                in_jobs = True
            continue

        match = JOB_HEADER_RE.match(line)
        if match:
            if current_name is not None:
                jobs[current_name] = "".join(current_lines)
            current_name = match.group(1)
            current_lines = [line]
            continue

        if current_name is not None:
            current_lines.append(line)

    if current_name is not None:
        jobs[current_name] = "".join(current_lines)

    return jobs


def workflow_level_text(text: str) -> str:
    before_jobs, _separator, _after_jobs = text.partition("\njobs:")
    return before_jobs


def supply_chain_failures(path: Path, text: str) -> list[str]:
    failures: list[str] = []

    if ID_TOKEN_WRITE_RE.search(workflow_level_text(text)):
        failures.append(
            f"{path}: id-token: write is not allowed at the workflow level."
        )

    for job_name, job_text in workflow_jobs(text).items():
        if references_npm_sensitive_secret(job_text):
            for line in job_text.splitlines():
                line_without_comments = strip_yaml_comments(line)
                if is_global_npm_install(line_without_comments):
                    if not has_ignore_scripts(line_without_comments):
                        failures.append(
                            f"{path}: job {job_name} global npm installs must use --ignore-scripts."
                        )
                    continue
                if is_local_npm_install(line_without_comments) and not has_ignore_scripts(
                    line_without_comments
                ):
                    failures.append(
                        f"{path}: job {job_name} npm installs must use --ignore-scripts."
                    )

        if ID_TOKEN_WRITE_RE.search(job_text):
            failures.append(
                f"{path}: job {job_name} id-token: write is not allowlisted."
            )

    return failures


def scan_workflow(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    failures: list[str] = []

    if uses_pull_request_target(text):
        failures.append(f"{path}: pull_request_target is banned in this repository.")

    failures.extend(supply_chain_failures(path, text))

    if not uses_pull_request_event(text):
        return failures

    if any(snippet in text for snippet in BROAD_WRITE_SNIPPETS):
        failures.append(f"{path}: PR workflow requests overly broad write permissions.")

    if not is_secret_bearing(text):
        return failures

    if "permissions:" not in text:
        failures.append(
            f"{path}: secret-bearing PR workflow must declare explicit permissions."
        )
    if "environment:" not in text:
        failures.append(
            f"{path}: secret-bearing PR workflow must use an environment gate."
        )
    if not has_trusted_author_gate(text):
        failures.append(
            f"{path}: secret-bearing PR workflow must gate execution to KjellKod."
        )
    if SAME_REPO_SNIPPET not in text:
        failures.append(
            f"{path}: secret-bearing PR workflow must require same-repo PRs."
        )
    if uses_checkout(text) and BASE_SHA_SNIPPET not in text:
        failures.append(
            f"{path}: secret-bearing PR workflow must checkout the trusted base SHA, not PR head code."
        )

    if HEAD_SHA_REF_RE.search(text):
        failures.append(
            f"{path}: secret-bearing PR workflow must not fetch repo content from PR HEAD "
            f"(?ref=$HEAD_SHA / ?ref=${{{{ github.event.pull_request.head.sha }}}}). "
            f"Use the base checkout instead."
        )

    return failures


def is_secret_scan_allowed(path: Path) -> bool:
    normalized = Path(*path.parts)
    return any(part in SECRET_SCAN_EXCLUDED_PARTS for part in normalized.parts)


def scan_repo_for_secret_material(root: Path = Path(".")) -> list[str]:
    failures: list[str] = []

    for path in sorted(root.rglob("*")):
        if not path.is_file() or is_secret_scan_allowed(path.relative_to(root)):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for marker in SECRET_MATERIAL_MARKERS:
            if marker in text:
                failures.append(f"{path}: possible committed private key material.")
                break

    return failures


def main() -> int:
    failures: list[str] = []
    for path in sorted(WORKFLOW_DIR.glob("*.y*ml")):
        failures.extend(scan_workflow(path))
    failures.extend(scan_repo_for_secret_material())

    if not failures:
        print("workflow security guard passed")
        return 0

    print("workflow security guard failed:")
    for failure in failures:
        print(f"- {failure}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
