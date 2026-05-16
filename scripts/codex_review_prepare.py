#!/usr/bin/env python3
"""Prepare Codex CI review inputs for a pull request."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


EXCLUDED_EXTENSIONS = (
    ".pdf",
    ".docx",
    ".xlsx",
    ".pptx",
    ".tgz",
    ".png",
    ".jpg",
    ".gif",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
)
UNTRUSTED_DELIMITER_RE = re.compile(r"</?\s*untrusted_content\s*>", re.IGNORECASE)
DIFF_HEADER_RE = re.compile(r"^diff --git a/(.+?) b/(.+)$")
HUNK_HEADER_RE = re.compile(
    r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@"
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch PR context, build a Codex review prompt, and write review metadata."
    )
    parser.add_argument("--pr-number", required=True, type=int, help="Pull request number.")
    parser.add_argument("--repo", required=True, help="GitHub repo in owner/name form.")
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory where review inputs and metadata should be written.",
    )
    parser.add_argument(
        "--prompt-template",
        default=".github/codex-review-prompt.md",
        help="Prompt template path with placeholder markers.",
    )
    parser.add_argument(
        "--build-pr-head-files-script",
        default="scripts/build_pr_head_files.py",
        help="Path to the build_pr_head_files helper script.",
    )
    parser.add_argument(
        "--max-diff-bytes",
        default=100000,
        type=int,
        help="Maximum diff payload size before truncation.",
    )
    parser.add_argument(
        "--github-output",
        default="",
        help="Optional GitHub Actions output file path.",
    )
    return parser.parse_args(argv)


def run_command(command: list[str]) -> str:
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout


def load_pr_details(repo: str, pr_number: int) -> dict[str, object]:
    raw = run_command(
        [
            "gh",
            "pr",
            "view",
            str(pr_number),
            "--repo",
            repo,
            "--json",
            "title,body,headRefOid,files",
        ]
    )
    return json.loads(raw)


def fetch_existing_comments(repo: str, pr_number: int) -> list[dict[str, object]]:
    raw = run_command(
        [
            "gh",
            "api",
            "--paginate",
            "--slurp",
            f"repos/{repo}/pulls/{pr_number}/comments",
        ]
    )
    pages = json.loads(raw)
    flattened: list[dict[str, object]] = []
    for page in pages:
        if not isinstance(page, list):
            continue
        for item in page:
            if not isinstance(item, dict):
                continue
            flattened.append(
                {
                    "id": item.get("id"),
                    "in_reply_to_id": item.get("in_reply_to_id"),
                    "user": (item.get("user") or {}).get("login"),
                    "path": item.get("path"),
                    "line": item.get("line"),
                    "body": item.get("body"),
                }
            )
    return flattened


def fetch_diff(repo: str, pr_number: int) -> str:
    return run_command(
        [
            "gh",
            "pr",
            "diff",
            str(pr_number),
            "--repo",
            repo,
            "--patch",
        ]
    )


def is_excluded_path(path: str) -> bool:
    lowered = path.lower()
    return lowered.endswith(tuple(extension.lower() for extension in EXCLUDED_EXTENSIONS))


def filter_excluded_diff_sections(diff_text: str) -> str:
    sections = re.split(r"(?=^diff --git )", diff_text, flags=re.MULTILINE)
    if len(sections) <= 1:
        return diff_text

    kept_sections: list[str] = []
    for section in sections:
        if not section.strip():
            continue
        first_line = section.splitlines()[0] if section.splitlines() else ""
        match = re.match(r"diff --git a/(.+?) b/(.+)", first_line)
        if match and is_excluded_path(match.group(2)):
            continue
        kept_sections.append(section.rstrip("\n"))

    if not kept_sections:
        return ""
    return "\n".join(kept_sections) + "\n"


def filter_binary_files(paths: list[str]) -> list[str]:
    return [path for path in paths if not is_excluded_path(path)]


def truncate_diff(diff_text: str, max_diff_bytes: int) -> tuple[str, dict[str, object]]:
    encoded = diff_text.encode("utf-8")
    original_bytes = len(encoded)
    truncated = original_bytes > max_diff_bytes
    if not truncated:
        return (
            diff_text,
            {
                "original_diff_bytes": original_bytes,
                "review_diff_bytes": original_bytes,
                "diff_truncated": False,
            },
        )

    truncated_text = encoded[:max_diff_bytes].decode("utf-8", errors="ignore")
    marker = (
        "\n\n--- DIFF TRUNCATED "
        f"(original: {original_bytes} bytes, showing first {max_diff_bytes} bytes) ---\n"
    )
    final_text = truncated_text + marker
    return (
        final_text,
        {
            "original_diff_bytes": original_bytes,
            "review_diff_bytes": len(final_text.encode("utf-8")),
            "diff_truncated": True,
        },
    )


def sanitize_untrusted(text: str) -> str:
    return UNTRUSTED_DELIMITER_RE.sub("", text)


def parse_diff_ranges(diff_text: str) -> dict[str, dict[str, list[tuple[int, int]]]]:
    ranges: dict[str, dict[str, list[tuple[int, int]]]] = {}
    current_path = ""

    for line in diff_text.splitlines():
        diff_match = DIFF_HEADER_RE.match(line)
        if diff_match:
            current_path = diff_match.group(2)
            continue

        if line.startswith("rename to "):
            current_path = line[len("rename to ") :].strip()
            continue

        if line.startswith("+++ "):
            if line == "+++ /dev/null":
                current_path = ""
            elif line.startswith("+++ b/"):
                current_path = line[6:]
            continue

        hunk_match = HUNK_HEADER_RE.match(line)
        if not hunk_match or not current_path:
            continue

        old_start = int(hunk_match.group(1))
        old_count = int(hunk_match.group(2) or "1")
        new_start = int(hunk_match.group(3))
        new_count = int(hunk_match.group(4) or "1")

        side_ranges = ranges.setdefault(current_path, {})
        if old_count > 0:
            side_ranges.setdefault("LEFT", []).append(
                (old_start, old_start + old_count - 1)
            )
        if new_count > 0:
            side_ranges.setdefault("RIGHT", []).append(
                (new_start, new_start + new_count - 1)
            )

    return ranges


def build_prompt(
    template_text: str,
    pr_description: str,
    existing_comments_json: str,
    pr_head_files: str,
    diff_text: str,
) -> str:
    prompt = template_text.replace(
        "{PLACEHOLDER_PR_DESCRIPTION}", sanitize_untrusted(pr_description)
    )
    prompt = prompt.replace(
        "{PLACEHOLDER_EXISTING_COMMENTS}", sanitize_untrusted(existing_comments_json)
    )
    prompt = prompt.replace("{PLACEHOLDER_PR_HEAD_FILES}", sanitize_untrusted(pr_head_files))
    prompt = prompt.replace("{PLACEHOLDER_DIFF}", sanitize_untrusted(diff_text))
    return prompt


def write_lines(path: Path, lines: list[str]) -> None:
    content = "\n".join(lines).rstrip()
    path.write_text(f"{content}\n" if content else "", encoding="utf-8")


def write_github_output(path: str, metadata: dict[str, object]) -> None:
    if not path:
        return
    output_path = Path(path)
    lines = [
        f"diff_size={metadata['review_diff_bytes']}",
        f"original_diff_size={metadata['original_diff_bytes']}",
        f"diff_truncated={str(metadata['diff_truncated']).lower()}",
        f"reviewable_files={metadata['reviewable_files_count']}",
        f"prompt_size={metadata['prompt_bytes']}",
    ]
    with output_path.open("a", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    pr_details = load_pr_details(args.repo, args.pr_number)
    diff_text = filter_excluded_diff_sections(fetch_diff(args.repo, args.pr_number))
    existing_comments = fetch_existing_comments(args.repo, args.pr_number)

    changed_files_raw = [
        file_info["path"]
        for file_info in pr_details.get("files", [])
        if isinstance(file_info, dict) and isinstance(file_info.get("path"), str)
    ]
    changed_files = filter_binary_files(changed_files_raw)
    excluded_files_count = len(changed_files_raw) - len(changed_files)

    pr_description = (
        f"{pr_details.get('title', '')}\n\n{pr_details.get('body') or ''}".strip() + "\n"
    )
    head_sha = str(pr_details["headRefOid"]).strip()

    pr_head_sha_path = output_dir / "pr_head_sha.txt"
    changed_files_path = output_dir / "changed_files.txt"
    pr_head_sha_path.write_text(f"{head_sha}\n", encoding="utf-8")
    write_lines(output_dir / "changed_files_raw.txt", changed_files_raw)
    write_lines(changed_files_path, changed_files)
    (output_dir / "pr_description.txt").write_text(pr_description, encoding="utf-8")
    (output_dir / "existing_comments.json").write_text(
        json.dumps(existing_comments, indent=2) + "\n",
        encoding="utf-8",
    )

    diff_ranges_path = output_dir / "diff_ranges.json"
    diff_ranges_path.write_text(
        json.dumps(parse_diff_ranges(diff_text), indent=2) + "\n",
        encoding="utf-8",
    )

    truncated_diff, diff_metadata = truncate_diff(diff_text, args.max_diff_bytes)
    (output_dir / "pr.diff").write_text(truncated_diff, encoding="utf-8")

    subprocess.run(
        [
            sys.executable,
            args.build_pr_head_files_script,
            "--repo",
            args.repo,
            "--head-sha-file",
            str(pr_head_sha_path),
            "--changed-files-file",
            str(changed_files_path),
            "--output",
            str(output_dir / "pr_head_files.md"),
        ],
        check=True,
    )

    template_text = Path(args.prompt_template).read_text(encoding="utf-8")
    prompt_text = build_prompt(
        template_text=template_text,
        pr_description=pr_description.rstrip(),
        existing_comments_json=(output_dir / "existing_comments.json").read_text(
            encoding="utf-8"
        ).rstrip(),
        pr_head_files=(output_dir / "pr_head_files.md").read_text(encoding="utf-8").rstrip(),
        diff_text=truncated_diff.rstrip(),
    )
    prompt_path = output_dir / "review-prompt.md"
    prompt_path.write_text(prompt_text + "\n", encoding="utf-8")

    metadata: dict[str, object] = {
        "pr_number": args.pr_number,
        "repo": args.repo,
        "head_sha": head_sha,
        "max_diff_bytes": args.max_diff_bytes,
        "reviewable_files_count": len(changed_files),
        "changed_files_count": len(changed_files_raw),
        "excluded_files_count": excluded_files_count,
        "prompt_bytes": len((prompt_text + "\n").encode("utf-8")),
        "prompt_lines": (prompt_text + "\n").count("\n"),
        "review_exit_code": None,
        "review_timeout_seconds": 300,
    }
    metadata.update(diff_metadata)

    metadata_path = output_dir / "review-metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    write_github_output(args.github_output, metadata)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
