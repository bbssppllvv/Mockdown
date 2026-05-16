#!/usr/bin/env python3
"""Render changed PR head files into a markdown bundle for CI review prompts."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path
from urllib.parse import quote


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build markdown previews for changed files in a PR head commit."
    )
    parser.add_argument("--repo", required=True, help="GitHub repo in owner/name form.")
    parser.add_argument(
        "--head-sha-file",
        required=True,
        help="Path to a file containing the PR head SHA.",
    )
    parser.add_argument(
        "--changed-files-file",
        required=True,
        help="Path to a newline-delimited file list.",
    )
    parser.add_argument("--output", required=True, help="Output markdown path.")
    parser.add_argument("--max-files", type=int, default=12)
    parser.add_argument("--max-chars", type=int, default=12000)
    return parser.parse_args()


def read_lines(path: str) -> list[str]:
    return [
        line.strip()
        for line in Path(path).read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def format_process_output(data: bytes | str | None) -> str:
    if data is None:
        return ""
    if isinstance(data, bytes):
        return data.decode("utf-8", errors="replace").strip()
    return data.strip()


def is_probably_binary(data: bytes) -> bool:
    if not data:
        return False

    sample = data[:1024]
    if sample.startswith((b"PK\x03\x04", b"%PDF-")):
        return True
    if b"\x00" in sample:
        return True

    suspicious = 0
    for byte in sample:
        if byte in (7, 8, 9, 10, 12, 13, 27):
            continue
        if 32 <= byte <= 126:
            continue
        if byte >= 160:
            continue
        suspicious += 1

    return suspicious / len(sample) > 0.3


def decode_content_for_preview(data: bytes) -> str:
    if not data:
        return ""

    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        if is_probably_binary(data):
            return f"[binary file omitted: {len(data)} bytes]"
        return data.decode("utf-8", errors="replace")


def clamp_preview(content: str, max_chars: int) -> str:
    if len(content) <= max_chars:
        return content
    return content[:max_chars] + "\n... [truncated]\n"


def fetch_file_content(repo: str, path: str, head_sha: str) -> str:
    encoded_path = quote(path, safe="/")
    cmd = [
        "gh",
        "api",
        "-H",
        "Accept: application/vnd.github.raw",
        f"repos/{repo}/contents/{encoded_path}?ref={head_sha}",
    ]
    try:
        result = subprocess.run(cmd, check=True, capture_output=True)
        return decode_content_for_preview(result.stdout)
    except subprocess.CalledProcessError as exc:
        detail = (
            format_process_output(exc.stderr)
            or format_process_output(exc.stdout)
            or "unable to fetch file snapshot"
        )
        return f"[unavailable: {detail}]"


def render_markdown(repo: str, head_sha: str, changed_files: list[str], max_files: int, max_chars: int) -> str:
    rendered: list[str] = []
    for path in changed_files[:max_files]:
        content = clamp_preview(fetch_file_content(repo, path, head_sha), max_chars)
        rendered.append(f"## {path}\n```\n{content.rstrip()}\n```")

    if len(changed_files) > max_files:
        rendered.append(
            f"## Additional changed files omitted\nOnly the first {max_files} changed files are included here for context. "
            "Use the diff as the source of truth for the full change set."
        )

    return "\n\n".join(rendered).strip() + "\n"


def main() -> int:
    args = parse_args()
    head_sha = Path(args.head_sha_file).read_text(encoding="utf-8").strip()
    changed_files = read_lines(args.changed_files_file)
    output = render_markdown(
        repo=args.repo,
        head_sha=head_sha,
        changed_files=changed_files,
        max_files=args.max_files,
        max_chars=args.max_chars,
    )
    Path(args.output).write_text(output, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
