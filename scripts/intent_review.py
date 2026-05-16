#!/usr/bin/env python3
"""Heuristic PR intent review for advisory CI checks."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path


COMMON_TERMS = {
    "a",
    "an",
    "and",
    "app",
    "body",
    "change",
    "changes",
    "check",
    "code",
    "description",
    "diff",
    "doc",
    "file",
    "files",
    "fix",
    "for",
    "in",
    "is",
    "it",
    "job",
    "jobs",
    "lane",
    "of",
    "or",
    "pr",
    "review",
    "the",
    "to",
    "update",
}
IGNORED_SCOPE_AREAS = {
    "docs",
    "tests",
}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare PR intent against changed files and post an advisory summary."
    )
    parser.add_argument("--pr-number", required=True, type=int, help="Pull request number.")
    parser.add_argument("--repo", required=True, help="GitHub repo in owner/name form.")
    parser.add_argument(
        "--report-path",
        default="",
        help="Optional JSON report output path.",
    )
    return parser.parse_args(argv)


def run_command(command: list[str]) -> str:
    result = subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def extract_scope_terms(text: str) -> set[str]:
    lower = text.lower()
    terms = set(re.findall(r"[a-z0-9][a-z0-9._/-]{1,}", lower))
    expanded: set[str] = set()
    for term in terms:
        expanded.add(term)
        for part in re.split(r"[/_.-]+", term):
            if len(part) >= 3:
                expanded.add(part)
                if part.endswith("s") and len(part) >= 4:
                    expanded.add(part[:-1])
    return {term for term in expanded if term not in COMMON_TERMS}


def changed_area(path: str) -> str:
    parts = [part.lower() for part in Path(path).parts if part]
    if not parts:
        return path.lower()
    if parts[0] == ".github" and len(parts) >= 2 and parts[1] == "workflows":
        return ".github/workflows"
    return parts[0]


def area_terms(area: str) -> set[str]:
    return extract_scope_terms(area)


def summarize_paths(paths: list[str], limit: int = 3) -> str:
    if len(paths) <= limit:
        return ", ".join(f"`{path}`" for path in paths)
    shown = ", ".join(f"`{path}`" for path in paths[:limit])
    return f"{shown}, and {len(paths) - limit} more"


def assess_intent_alignment(title: str, body: str, changed_files: list[str]) -> list[str]:
    findings: list[str] = []
    combined_text = f"{title}\n{body}".strip()
    scope_terms = extract_scope_terms(combined_text)

    if not body.strip():
        findings.append(
            "PR body is empty, so this check can only compare the title against the changed files."
        )

    unmatched_areas: dict[str, list[str]] = {}
    for path in changed_files:
        area = changed_area(path)
        if area in IGNORED_SCOPE_AREAS:
            continue
        if area_terms(area) & scope_terms:
            continue
        unmatched_areas.setdefault(area, []).append(path)

    if unmatched_areas:
        area_summaries = [
            f"`{area}` ({summarize_paths(paths)})"
            for area, paths in sorted(unmatched_areas.items())
        ]
        findings.append(
            "These changed areas are not mentioned in the PR title/body: "
            f"{', '.join(area_summaries)}."
        )

    return findings


def fetch_pr_context(repo: str, pr_number: int) -> tuple[str, str, list[str], str]:
    raw = run_command(
        [
            "gh",
            "pr",
            "view",
            str(pr_number),
            "--repo",
            repo,
            "--json",
            "title,body,files,headRefOid",
        ]
    )
    payload = json.loads(raw)
    changed_files = [
        file_info["path"]
        for file_info in payload.get("files", [])
        if isinstance(file_info, dict) and isinstance(file_info.get("path"), str)
    ]
    return (
        str(payload.get("title") or ""),
        str(payload.get("body") or ""),
        changed_files,
        str(payload.get("headRefOid") or ""),
    )


def build_comment_body(
    findings: list[str],
    changed_files: list[str],
    head_sha: str,
) -> str:
    lines = [
        "## Intent Review Summary",
        "",
        f"Commit: `{head_sha[:7]}`" if head_sha else "Commit: unavailable",
        f"Changed files reviewed: {len(changed_files)}",
        "",
    ]
    if findings:
        lines.append("Potential scope mismatches:")
        for finding in findings:
            lines.append(f"- {finding}")
    else:
        lines.append("Intent looks aligned with the diff.")
    lines.extend(["", "_Heuristic advisory check; not an LLM review._"])
    return "\n".join(lines)


def find_existing_comment(repo: str, pr_number: int) -> int | None:
    """Find an existing Intent Review Summary comment posted by github-actions bot."""
    try:
        raw = run_command(
            [
                "gh",
                "api",
                f"repos/{repo}/issues/{pr_number}/comments",
                "--jq",
                '.[] | select(.user.login == "github-actions[bot]" and (.body | startswith("## Intent Review Summary"))) | .id',
            ]
        )
        ids = [int(line) for line in raw.strip().splitlines() if line.strip()]
        return ids[0] if ids else None
    except (subprocess.CalledProcessError, ValueError):
        return None


def post_comment(repo: str, pr_number: int, body: str) -> bool:
    existing_id = find_existing_comment(repo, pr_number)
    if existing_id:
        result = subprocess.run(
            [
                "gh",
                "api",
                "--method",
                "PATCH",
                f"repos/{repo}/issues/comments/{existing_id}",
                "-f",
                f"body={body}",
            ],
            text=True,
            check=False,
        )
        return result.returncode == 0
    result = subprocess.run(
        [
            "gh",
            "pr",
            "comment",
            str(pr_number),
            "--repo",
            repo,
            "--body",
            body,
        ],
        text=True,
        check=False,
    )
    return result.returncode == 0


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    title, body, changed_files, head_sha = fetch_pr_context(args.repo, args.pr_number)
    findings = assess_intent_alignment(title, body, changed_files)
    comment_body = build_comment_body(findings, changed_files, head_sha)
    post_comment(args.repo, args.pr_number, comment_body)

    if args.report_path:
        report_path = Path(args.report_path)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(
            json.dumps(
                {
                    "head_sha": head_sha,
                    "changed_files": changed_files,
                    "findings": findings,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    # Always exit 0: this is an advisory check. Findings are reported
    # via PR comment, not via exit code. A non-zero exit makes the check
    # show as "failing" in the GitHub UI, which is misleading for advisory lanes.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
