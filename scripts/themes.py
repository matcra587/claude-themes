#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# ///
"""Install or remove marketplace themes in Claude Code's themes directory.

Themes are symlinked into ~/.claude/themes (or $CLAUDE_CONFIG_DIR/themes) so
installed themes stay in sync with the repository and removal is unambiguous:
uninstall only ever removes links that point back into this repository, never
real files (such as a hand-written theme) or symlinks to somewhere else.

Usage:
    uv run scripts/themes.py install [family ...] [--dry-run] [--force]
    uv run scripts/themes.py uninstall [family ...] [--dry-run]
    uv run scripts/themes.py list

Stdlib only; plain python3 works too. A bare family name (e.g. nord) restricts
the operation to that plugin family; no family means every family.
"""

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def family_glob(family: str) -> str:
    return f"plugins/{family}/themes/*.json"


def themes_dir() -> Path:
    base = os.environ.get("CLAUDE_CONFIG_DIR") or (Path.home() / ".claude")
    return Path(base) / "themes"


def theme_files(families: list[str]) -> list[Path]:
    globs = [family_glob(fam) for fam in families] or [family_glob("*")]
    return sorted({p for glob in globs for p in ROOT.glob(glob)})


def warn_unmatched(families: list[str], files: list[Path]) -> None:
    found = {p.relative_to(ROOT).parts[1] for p in files}
    for fam in sorted(set(families) - found):
        print(f"warning: no themes for family {fam!r}", file=sys.stderr)


def links_into_repo(link: Path) -> bool:
    """True when link is a symlink resolving to a path inside this repository."""
    if not link.is_symlink():
        return False
    try:
        return link.resolve().is_relative_to(ROOT)
    except OSError:
        return False


def install(families: list[str], dry_run: bool, force: bool) -> int:
    dest_dir = themes_dir()
    if not dry_run:
        dest_dir.mkdir(parents=True, exist_ok=True)
    files = theme_files(families)
    warn_unmatched(families, files)
    count = 0
    for src in files:
        dest = dest_dir / src.name
        # Replace our own links freely; guard anything else (a real file or a
        # symlink pointing elsewhere) behind --force.
        occupied = (dest.is_symlink() or dest.exists()) and not links_into_repo(dest)
        if occupied and not force:
            kind = "a foreign symlink" if dest.is_symlink() else "a real file"
            print(
                f"skip: {src.name} ({kind} exists; use --force to replace)",
                file=sys.stderr,
            )
            continue
        if dry_run:
            print(f"would link: {src.name}")
        else:
            dest.unlink(missing_ok=True)
            dest.symlink_to(src)
            print(f"linked: {src.name}")
        count += 1
    verb = "would install" if dry_run else "installed"
    print(f"{verb} {count} theme(s) into {dest_dir}")
    return 0


def uninstall(families: list[str], dry_run: bool) -> int:
    dest_dir = themes_dir()
    if not dest_dir.is_dir():
        print(f"nothing to remove: {dest_dir} does not exist")
        return 0
    files = theme_files(families)
    warn_unmatched(families, files)
    count = 0
    for src in files:
        dest = dest_dir / src.name
        if not links_into_repo(dest):
            continue
        if dry_run:
            print(f"would remove: {src.name}")
        else:
            dest.unlink()
            print(f"removed: {src.name}")
        count += 1
    verb = "would remove" if dry_run else "removed"
    print(f"{verb} {count} theme(s) from {dest_dir}")
    return 0


def list_installed() -> int:
    dest_dir = themes_dir()
    installed = (
        sorted(p.name for p in dest_dir.glob("*.json") if links_into_repo(p))
        if dest_dir.is_dir()
        else []
    )
    if installed:
        print("\n".join(installed))
    else:
        print(f"no marketplace themes installed in {dest_dir}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Install or remove marketplace themes")
    sub = parser.add_subparsers(dest="command", required=True)

    p_install = sub.add_parser("install", help="symlink themes into the themes dir")
    p_install.add_argument("family", nargs="*", help="plugin families (default: all)")
    p_install.add_argument("--dry-run", action="store_true", help="print, don't change")
    p_install.add_argument("--force", action="store_true", help="replace a real file")

    p_uninstall = sub.add_parser("uninstall", help="remove this repo's theme links")
    p_uninstall.add_argument("family", nargs="*", help="plugin families (default: all)")
    p_uninstall.add_argument(
        "--dry-run", action="store_true", help="print, don't change"
    )

    sub.add_parser("list", help="show installed marketplace themes")

    args = parser.parse_args()
    match args.command:
        case "install":
            return install(args.family, args.dry_run, args.force)
        case "uninstall":
            return uninstall(args.family, args.dry_run)
        case _:
            return list_installed()


if __name__ == "__main__":
    sys.exit(main())
