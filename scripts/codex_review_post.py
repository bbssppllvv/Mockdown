#!/usr/bin/env python3
"""Post Codex CI review findings and always leave a visible summary comment."""

from __future__ import annotations

import argparse
import json
import os
import re
import string
import subprocess
from collections import Counter
from pathlib import Path


SEVERITY_LEVELS = ("critical", "high", "medium", "low", "praise")
BLOCKING_SEVERITIES = ("critical", "high")
SEVERITY_ANNOTATION_MAP = {
    "critical": "error",
    "high": "error",
    "medium": "warning",
    "low": "notice",
    "praise": "notice",
}
SEVERITY_PREFIX_RE = re.compile(
    r"^\*\*\[(critical|high|medium|low|praise)\]\*\*\s*",
    re.IGNORECASE,
)
LEGACY_SEVERITY_PREFIX_RE = re.compile(
    r"^\*\*(Blocker|Must fix|Should fix)\*\*\s*(?:[-:]\s*)?",
    re.IGNORECASE,
)
BOT_FOOTER_RE = re.compile(
    r"\n*\*Automated review by[^*]*\*\.?\s*$",
    re.IGNORECASE,
)
JACCARD_SIMILARITY_THRESHOLD = 0.4


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Parse Codex review output, post inline comments, and add a summary comment."
    )
    parser.add_argument(
        "--review-output",
        default="/tmp/codex-review/review-output.json",
        help="Path to the Codex output file.",
    )
    parser.add_argument(
        "--existing-comments",
        default="/tmp/codex-review/existing_comments.json",
        help="Path to existing PR review comments JSON.",
    )
    parser.add_argument(
        "--diff-ranges",
        default="/tmp/codex-review/diff_ranges.json",
        help="Path to the diff range JSON emitted by the prepare step.",
    )
    parser.add_argument(
        "--metadata",
        default="/tmp/codex-review/review-metadata.json",
        help="Path to review metadata JSON.",
    )
    parser.add_argument(
        "--strict-inline-posting",
        action="store_true",
        help="Return a non-zero exit code if any inline comment cannot be posted.",
    )
    parser.add_argument(
        "--skip-reason",
        default="",
        help="Optional reason explaining why the review was skipped before Codex ran.",
    )
    return parser.parse_args(argv)


def parse_review_output(raw: str) -> list[dict[str, object]] | None:
    attempts = [raw]
    stripped_fences = re.sub(r"```[\w-]*\n?", "", raw)
    attempts.append(stripped_fences.strip())

    for candidate in attempts:
        try:
            parsed = json.loads(candidate)
        except (json.JSONDecodeError, ValueError):
            continue
        if isinstance(parsed, list):
            return parsed

    for fence_match in re.finditer(r"```(?:json)?\s*\n(.*?)```", raw, re.DOTALL):
        try:
            parsed = json.loads(fence_match.group(1))
        except (json.JSONDecodeError, ValueError):
            continue
        if isinstance(parsed, list):
            return parsed

    for match in re.finditer(r"\[[\s\S]*\]", stripped_fences):
        try:
            parsed = json.loads(match.group(0))
        except (json.JSONDecodeError, ValueError):
            continue
        if isinstance(parsed, list):
            return parsed

    return None


def validate_comments(comments: list[object]) -> list[dict[str, object]]:
    valid: list[dict[str, object]] = []
    for comment in comments:
        if not isinstance(comment, dict):
            continue
        path = comment.get("path")
        body = comment.get("body")
        if not isinstance(path, str) or not path.strip():
            continue
        if not isinstance(body, str) or not body.strip():
            continue
        try:
            line = int(comment.get("line"))
        except (TypeError, ValueError):
            continue
        if line < 1:
            continue
        side = comment.get("side")
        severity = _normalize_severity(comment.get("severity"))
        valid.append(
            {
                "path": path.strip(),
                "line": line,
                "side": side if side in {"LEFT", "RIGHT"} else "RIGHT",
                "severity": severity,
                "body": body.strip(),
            }
        )
    return valid


def deduplicate(
    comments: list[dict[str, object]],
    existing: list[object],
) -> list[dict[str, object]]:
    bot_bodies_by_path: dict[str, list[str]] = {}

    for item in existing:
        if not isinstance(item, dict):
            continue
        if item.get("user") != "github-actions[bot]":
            continue
        body = item.get("body")
        if not isinstance(body, str):
            continue
        normalized_body = _normalize_existing_body(body)
        path = item.get("path")
        if isinstance(path, str) and path.strip():
            bot_bodies_by_path.setdefault(path.strip(), []).append(normalized_body)

    filtered: list[dict[str, object]] = []
    for comment in comments:
        normalized_new = _normalize_existing_body(str(comment["body"]))
        path = str(comment["path"]).strip()
        same_path_bodies = bot_bodies_by_path.get(path, [])
        if normalized_new in same_path_bodies:
            continue
        if any(
            _jaccard_similarity(normalized_new, existing_body) >= JACCARD_SIMILARITY_THRESHOLD
            for existing_body in same_path_bodies
        ):
            continue
        filtered.append(comment)
    return filtered


def load_json_file(path: str, default: object) -> object:
    file_path = Path(path)
    if not file_path.exists():
        return default
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, ValueError):
        return default


def build_diff_details(metadata: dict[str, object]) -> str:
    parts: list[str] = []
    original = metadata.get("original_diff_bytes")
    reviewed = metadata.get("review_diff_bytes")
    if isinstance(original, int) and metadata.get("diff_truncated") and isinstance(reviewed, int):
        parts.append(f"Diff: {original} bytes total; reviewed {reviewed} bytes after truncation.")
    elif isinstance(reviewed, int):
        parts.append(f"Diff: {reviewed} bytes reviewed; not truncated.")
    else:
        parts.append("Diff size unavailable.")

    excluded_files_count = metadata.get("excluded_files_count")
    if isinstance(excluded_files_count, int):
        noun = "file" if excluded_files_count == 1 else "files"
        parts.append(f"Excluded files: {excluded_files_count} {noun}.")

    return " ".join(parts)


def build_response_details(
    metadata: dict[str, object],
    *,
    valid_json: bool | None = None,
    findings_count: int | None = None,
) -> str:
    parts: list[str] = []
    review_exit_code = metadata.get("review_exit_code")
    output_bytes = metadata.get("review_output_bytes")

    if valid_json is True:
        if isinstance(findings_count, int):
            noun = "finding" if findings_count == 1 else "findings"
            parts.append(
                f"Response: Codex returned a valid JSON array with {findings_count} {noun}."
            )
        else:
            parts.append("Response: Codex returned a valid JSON array.")
    elif valid_json is False:
        parts.append("Response: Codex did not return a valid JSON array.")
    elif isinstance(review_exit_code, int):
        parts.append(f"Response: Codex exited with code {review_exit_code}.")

    if isinstance(output_bytes, int):
        parts.append(f"Output: {output_bytes} bytes.")

    return " ".join(parts)


def post_summary(
    message: str,
    metadata: dict[str, object],
    *,
    valid_json: bool | None = None,
    findings_count: int | None = None,
    runner=subprocess.run,
    env: dict[str, str] | None = None,
) -> bool:
    env_values = env or os.environ
    commit_sha = env_values.get("COMMIT_SHA", "")
    response_details = build_response_details(
        metadata,
        valid_json=valid_json,
        findings_count=findings_count,
    )
    lines = [
        "## Codex Review Summary",
        "",
        f"Commit: `{commit_sha[:7]}`" if commit_sha else "Commit: unavailable",
        build_diff_details(metadata),
    ]
    if response_details:
        lines.extend(["", response_details])
    lines.extend(["", message])
    result = runner(
        [
            "gh",
            "pr",
            "comment",
            env_values["PR_NUMBER"],
            "--repo",
            env_values["REPO"],
            "--body",
            "\n".join(lines),
        ],
        text=True,
        check=False,
    )
    return result.returncode == 0


def post_inline(
    comments: list[dict[str, object]],
    repo: str,
    pr_number: str,
    commit_sha: str,
    runner=subprocess.run,
) -> list[dict[str, object]]:
    failed: list[dict[str, object]] = []
    for comment in comments:
        payload = {
            "body": _format_body(comment),
            "commit_id": commit_sha,
            "path": comment["path"],
            "line": comment["line"],
            "side": comment["side"],
        }
        result = runner(
            [
                "gh",
                "api",
                f"repos/{repo}/pulls/{pr_number}/comments",
                "--method",
                "POST",
                "--input",
                "-",
            ],
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode != 0:
            failed.append(comment)
    return failed


def _normalize_line_ranges(raw_ranges: object) -> list[tuple[int, int]]:
    if not isinstance(raw_ranges, list):
        return []
    normalized_ranges: list[tuple[int, int]] = []
    for line_range in raw_ranges:
        if not isinstance(line_range, (list, tuple)) or len(line_range) != 2:
            continue
        start, end = line_range
        if not isinstance(start, int) or not isinstance(end, int):
            continue
        normalized_ranges.append((start, end))
    return normalized_ranges


def load_diff_ranges(path: str) -> dict[str, dict[str, list[tuple[int, int]]]] | None:
    file_path = Path(path)
    if not file_path.exists():
        return None
    try:
        raw = json.loads(file_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, ValueError):
        return None
    if not isinstance(raw, dict):
        return None

    diff_ranges: dict[str, dict[str, list[tuple[int, int]]]] = {}
    for filepath_key, raw_ranges in raw.items():
        if not isinstance(filepath_key, str):
            continue

        if isinstance(raw_ranges, list):
            normalized_ranges = _normalize_line_ranges(raw_ranges)
            if normalized_ranges:
                diff_ranges[filepath_key] = {"RIGHT": normalized_ranges}
            continue

        if not isinstance(raw_ranges, dict):
            continue

        side_ranges: dict[str, list[tuple[int, int]]] = {}
        for side in ("LEFT", "RIGHT"):
            normalized_ranges = _normalize_line_ranges(raw_ranges.get(side))
            if normalized_ranges:
                side_ranges[side] = normalized_ranges
        if side_ranges:
            diff_ranges[filepath_key] = side_ranges
    return diff_ranges


def validate_line_in_diff_range(
    comment: dict[str, object],
    diff_ranges: dict[str, dict[str, list[tuple[int, int]]]],
) -> bool:
    path = comment.get("path")
    line = comment.get("line")
    if not isinstance(path, str):
        return False
    if not isinstance(line, int):
        return False
    side = comment.get("side")
    if side not in {"LEFT", "RIGHT"}:
        side = "RIGHT"
    ranges = diff_ranges.get(path, {}).get(side)
    if not ranges:
        return False
    return any(start <= line <= end for start, end in ranges)


def post_fallback_comment(
    failed_comments: list[dict[str, object]],
    runner=subprocess.run,
    env: dict[str, str] | None = None,
) -> bool:
    env_values = env or os.environ
    body_parts = ["## Codex Review (inline posting failed)", "", "<!-- codex-review-fallback -->", ""]
    for comment in failed_comments:
        body_parts.append(f"**{comment['path']}:{comment['line']}**")
        body_parts.append(_format_body(comment))
        body_parts.append("")
    result = runner(
        [
            "gh",
            "pr",
            "comment",
            env_values["PR_NUMBER"],
            "--repo",
            env_values["REPO"],
            "--body",
            "\n".join(body_parts).rstrip(),
        ],
        text=True,
        check=False,
    )
    return result.returncode == 0


def _normalize_severity(value: object) -> str:
    candidate = value.strip().lower() if isinstance(value, str) else ""
    if candidate in SEVERITY_LEVELS:
        return candidate
    if candidate:
        print(f"::notice::Unknown severity '{candidate}' defaulted to medium.")
    else:
        print("::notice::Missing severity defaulted to medium.")
    return "medium"


def _normalize_existing_body(body: str) -> str:
    stripped = body.strip()
    stripped = SEVERITY_PREFIX_RE.sub("", stripped)
    stripped = LEGACY_SEVERITY_PREFIX_RE.sub("", stripped)
    stripped = BOT_FOOTER_RE.sub("", stripped)
    return stripped.strip()


def _format_body(comment: dict[str, object]) -> str:
    return f"**[{comment['severity']}]** {comment['body']}"


def _tokenize_for_similarity(value: str) -> set[str]:
    translator = str.maketrans("", "", string.punctuation)
    return {
        token.translate(translator)
        for token in value.lower().split()
        if token.translate(translator)
    }


def _jaccard_similarity(a: str, b: str) -> float:
    tokens_a = _tokenize_for_similarity(a)
    tokens_b = _tokenize_for_similarity(b)
    union = tokens_a | tokens_b
    if not union:
        return 0.0
    return len(tokens_a & tokens_b) / len(union)


def _escape_annotation(value: str) -> str:
    """Escape special characters for GitHub Actions workflow commands."""
    return (
        value.replace("%", "%25")
        .replace("\r", "%0D")
        .replace("\n", "%0A")
        .replace(":", "%3A")
        .replace(",", "%2C")
    )


def emit_annotations(comments: list[dict[str, object]]) -> None:
    for comment in comments:
        severity = str(comment.get("severity", "medium"))
        level = SEVERITY_ANNOTATION_MAP.get(severity, "warning")
        message = re.sub(r"\s+", " ", str(comment["body"]).strip())
        if len(message) > 200:
            message = f"{message[:197].rstrip()}..."
        escaped_path = _escape_annotation(str(comment["path"]))
        escaped_message = _escape_annotation(message)
        print(f"::{level} file={escaped_path},line={comment['line']}::{escaped_message}")


def emit_dropped_comment_notices(comments: list[dict[str, object]]) -> None:
    for comment in comments:
        escaped_path = _escape_annotation(str(comment["path"]))
        escaped_message = _escape_annotation(
            "Dropped model comment outside changed diff lines."
        )
        print(f"::notice file={escaped_path},line={comment['line']}::{escaped_message}")


def build_severity_summary(comments: list[dict[str, object]]) -> str:
    counts = Counter(str(comment.get("severity", "medium")) for comment in comments)
    parts = [f"{counts[level]} {level}" for level in SEVERITY_LEVELS if counts[level]]
    if not parts:
        return "Findings: none."
    return f"Findings: {', '.join(parts)}."


def has_blocking_findings(comments: list[dict[str, object]]) -> bool:
    return any(str(comment.get("severity")) in BLOCKING_SEVERITIES for comment in comments)


def warn_visible_outcome(message: str) -> int:
    print(f"::warning::{message}")
    return 0


def require_summary_posted(posted: bool, context: str) -> int:
    if posted:
        return 0
    return warn_visible_outcome(f"Failed to post summary comment for {context}.")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    env = os.environ
    metadata = load_json_file(args.metadata, {})
    if not isinstance(metadata, dict):
        metadata = {}

    if args.skip_reason.strip():
        return require_summary_posted(
            post_summary(
                f"Review skipped before execution. {args.skip_reason.strip()}",
                metadata,
            ),
            "skipped review outcome",
        )

    review_exit_code = metadata.get("review_exit_code")
    timeout_seconds = metadata.get("review_timeout_seconds", 300)

    if review_exit_code == 124:
        return require_summary_posted(
            post_summary(
                f"Review timed out after {timeout_seconds}s. No findings were posted.",
                metadata,
            ),
            "timeout outcome",
        )

    if isinstance(review_exit_code, int) and review_exit_code not in {0, 124}:
        return require_summary_posted(
            post_summary(
                f"Review failed (exit code {review_exit_code}). No findings were posted.",
                metadata,
            ),
            "error outcome",
        )

    output_path = Path(args.review_output)
    if not output_path.exists() or not output_path.read_text(encoding="utf-8").strip():
        return require_summary_posted(
            post_summary(
                "Review produced no output file. No findings were posted.",
                metadata,
            ),
            "missing output outcome",
        )

    raw = output_path.read_text(encoding="utf-8")
    comments = parse_review_output(raw)
    if comments is None:
        return require_summary_posted(
            post_summary(
                "Review ran, but the response was not a parseable JSON comment array.",
                metadata,
                valid_json=False,
            ),
            "unparseable output outcome",
        )

    if not comments:
        return require_summary_posted(
            post_summary(
                "Review ran, no findings.",
                metadata,
                valid_json=True,
                findings_count=0,
            ),
            "empty findings outcome",
        )

    valid_comments = validate_comments(comments)
    if not valid_comments:
        return require_summary_posted(
            post_summary(
                "Review ran, but none of the returned items were valid inline review comments.",
                metadata,
                valid_json=True,
                findings_count=len(comments),
            ),
            "invalid findings outcome",
        )

    diff_ranges = load_diff_ranges(args.diff_ranges)
    dropped_out_of_range: list[dict[str, object]] = []
    ranged_comments = valid_comments
    if diff_ranges is not None:
        ranged_comments = []
        for comment in valid_comments:
            if validate_line_in_diff_range(comment, diff_ranges):
                ranged_comments.append(comment)
            else:
                dropped_out_of_range.append(comment)

    if dropped_out_of_range:
        emit_dropped_comment_notices(dropped_out_of_range)

    if not ranged_comments:
        return require_summary_posted(
            post_summary(
                f"Review ran, but all {len(dropped_out_of_range)} finding(s) pointed outside changed diff lines and were dropped.",
                metadata,
                valid_json=True,
                findings_count=len(comments),
            ),
            "out-of-range findings outcome",
        )

    existing_comments = load_json_file(args.existing_comments, [])
    if not isinstance(existing_comments, list):
        existing_comments = []
    fresh_comments = deduplicate(ranged_comments, existing_comments)
    if not fresh_comments:
        message = "Review ran, but every finding matched an existing bot comment or resolved thread."
        if dropped_out_of_range:
            message = (
                f"Review ran, dropped {len(dropped_out_of_range)} out-of-range finding(s), "
                "and every remaining finding matched an existing bot comment or resolved thread."
            )
        return require_summary_posted(
            post_summary(
                message,
                metadata,
                valid_json=True,
                findings_count=len(ranged_comments),
            ),
            "deduplicated findings outcome",
        )

    failed_inline = post_inline(
        fresh_comments,
        repo=env["REPO"],
        pr_number=env["PR_NUMBER"],
        commit_sha=env["COMMIT_SHA"],
    )

    if failed_inline:
        fallback_posted = post_fallback_comment(failed_inline)
        emit_annotations(fresh_comments)
        severity_summary = build_severity_summary(fresh_comments)
        if fallback_posted:
            summary_message = (
                f"Posted {len(fresh_comments) - len(failed_inline)} inline finding(s); "
                f"{len(failed_inline)} finding(s) fell back to a PR comment. {severity_summary}"
            )
        else:
            summary_message = (
                f"Posted {len(fresh_comments) - len(failed_inline)} inline finding(s); "
                f"{len(failed_inline)} finding(s) could not be posted inline or as a fallback comment. "
                f"{severity_summary}"
            )
        summary_posted = post_summary(
            summary_message,
            metadata,
            valid_json=True,
            findings_count=len(valid_comments),
        )
        if not fallback_posted and not summary_posted:
            warn_visible_outcome(
                "Failed to post any visible review outcome after inline comment failures."
            )
        elif not fallback_posted:
            warn_visible_outcome(
                "Failed to post fallback PR comment for inline comment failures."
            )
        elif not summary_posted:
            warn_visible_outcome(
                "Failed to post summary comment after inline comment failures."
            )
        exit_code = 0
        if args.strict_inline_posting:
            print("::error::Inline posting failed (strict mode).")
            exit_code = 1
        if has_blocking_findings(fresh_comments):
            print("::error::Blocking severity findings")
            exit_code = 1
        return exit_code

    emit_annotations(fresh_comments)
    severity_summary = build_severity_summary(fresh_comments)
    require_summary_posted(
        post_summary(
            f"Posted {len(fresh_comments)} inline finding(s). {severity_summary}",
            metadata,
            valid_json=True,
            findings_count=len(valid_comments),
        ),
        "successful review outcome",
    )
    if has_blocking_findings(fresh_comments):
        print("::error::Blocking severity findings")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
