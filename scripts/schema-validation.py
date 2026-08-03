#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = [
#   "jsonschema>=4.23",
# ]
# ///
"""Validate theme files against schemas/theme.schema.json.

--all validates every theme file in the repository. --changed takes the
repo-relative paths changed in a PR (zero or more), keeps only theme files,
and validates those; a theme file that is listed but missing on disk fails.

Emits GitHub Actions error annotations for failures and exits non-zero if
any file is invalid. When SUMMARY_PATH is set, also writes a markdown
summary there for the PR comment upsert.
"""

import argparse
import json
import os
import sys
from pathlib import Path, PurePath

import jsonschema

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schemas" / "theme.schema.json"
THEME_PATTERN = "plugins/*/themes/*.json"


def annotate(path: Path, message: str) -> None:
    escaped = message.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    print(f"::error file={path.relative_to(ROOT)}::{escaped}")


def write_summary(results: dict[Path, list[str]]) -> None:
    """Write a GitHub-Flavored Markdown summary for the PR comment upsert."""
    summary_path = os.environ.get("SUMMARY_PATH")
    if not summary_path:
        return
    if not results:
        Path(summary_path).write_text("No theme files changed.\n")
        return

    failed = {path: errors for path, errors in results.items() if errors}
    if failed:
        headline = f"❌ {len(failed)} of {len(results)} theme files failed validation."
    else:
        headline = f"✅ All {len(results)} checked theme files pass validation."

    lines = [headline, "", "| Theme file | Result |", "| --- | --- |"]
    for path, errors in results.items():
        result = f"❌ {len(errors)} error(s)" if errors else "✅ pass"
        lines.append(f"| `{path.relative_to(ROOT)}` | {result} |")

    if failed:
        # GFM renders markdown inside an HTML block only after a blank line.
        lines.extend(["", "<details><summary>Error details</summary>", ""])
        for path, errors in failed.items():
            lines.extend([f"**`{path.relative_to(ROOT)}`**", ""])
            lines.extend(f"- `{error}`" for error in errors)
            lines.append("")
        lines.append("</details>")
    Path(summary_path).write_text("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--all", action="store_true", help="validate every theme file")
    mode.add_argument(
        "--changed",
        nargs="*",
        metavar="PATH",
        help="changed repo-relative paths; non-theme paths are ignored",
    )
    args = parser.parse_args()

    schema = json.loads(SCHEMA_PATH.read_text())
    validator_cls = jsonschema.validators.validator_for(schema)
    try:
        validator_cls.check_schema(schema)
    except jsonschema.SchemaError as exc:
        annotate(SCHEMA_PATH, f"invalid schema: {exc.message}")
        return 1
    validator = validator_cls(schema)

    if args.all:
        theme_files = sorted(ROOT.glob(THEME_PATTERN))
        if not theme_files:
            print(f"::error::no theme files found under {THEME_PATTERN}")
            return 1
    else:
        theme_files = sorted(
            ROOT / p for p in args.changed if PurePath(p).full_match(THEME_PATTERN)
        )

    results: dict[Path, list[str]] = {}
    for path in theme_files:
        try:
            theme = json.loads(path.read_text())
            errors = sorted(validator.iter_errors(theme), key=lambda e: e.json_path)
            messages = [f"{e.json_path}: {e.message}" for e in errors]
        except FileNotFoundError:
            messages = ["listed as changed but missing on disk"]
        except json.JSONDecodeError as exc:
            messages = [f"invalid JSON: {exc}"]
        results[path] = messages
        for message in messages:
            annotate(path, message)

    write_summary(results)
    if not results:
        print("No theme files changed")
        return 0
    failed = sum(1 for errors in results.values() if errors)
    print(
        f"Checked {len(results)} theme files: {len(results) - failed} passed, {failed} failed"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
