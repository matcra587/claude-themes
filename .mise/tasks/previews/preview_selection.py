"""Select preview inputs without enrolling unchanged themes."""

import re
import subprocess
from pathlib import Path

THEME = re.compile(r"plugins/([a-z0-9-]+)/themes/([a-z0-9-]+)\.json")
IMAGE = re.compile(r"plugins/([a-z0-9-]+)/renders/([a-z0-9-]+)\.png")
PALETTE = re.compile(r"plugins/([a-z0-9-]+)/palettes/([a-z0-9-]+)\.json")
SHARED_INPUTS = {
    ".mise/tasks/previews/render.py",
    "previews/runtime.json",
    "schemas/theme.schema.json",
    "assets/fonts/GeistMono-Regular.otf",
}


def changed_paths(root: Path, base: str) -> set[str]:
    """Compare against the common ancestor, including local tracked edits."""
    revision = subprocess.run(
        ["git", "rev-parse", "--verify", "--end-of-options", f"{base}^{{commit}}"],
        cwd=root,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    ancestor = subprocess.run(
        ["git", "merge-base", revision, "HEAD"],
        cwd=root,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    result = subprocess.run(
        ["git", "diff", "--name-only", "--no-renames", "-z", ancestor, "--"],
        cwd=root,
        capture_output=True,
        check=True,
    )
    return set(result.stdout.decode().split("\0")) - {""}


def select_themes(
    available: set[str],
    changed: set[str],
    managed: set[str],
    *,
    deleted: set[str] | None = None,
) -> set[str]:
    """Direct theme/image edits enroll previews; shared edits only refresh managed ones.

    A regular theme and its ANSI variant share a gallery section. Enroll both
    together so replacing that section never removes an existing manual image.
    Once enrolled, an image-only edit selects only that image. Deleted images
    select repairs only for managed themes; removing a manual image never enrolls it.
    """
    selected = available & changed
    for name in changed:
        if match := IMAGE.fullmatch(name):
            theme = f"plugins/{match[1]}/themes/{match[2]}.json"
            if deleted is None or name not in deleted or theme in managed:
                selected.add(theme)
        elif (match := THEME.fullmatch(name)) and not match[2].endswith("-ansi"):
            selected.add(f"plugins/{match[1]}/themes/{match[2]}-ansi.json")
    if SHARED_INPUTS & changed:
        selected.update(managed)
    palettes = [
        match.groups() for name in changed if (match := PALETTE.fullmatch(name))
    ]
    for name in managed:
        path = Path(name)
        variant = path.stem.removesuffix("-ansi")
        if any(
            path.parts[1] == family
            and (variant == key or variant.startswith(key + "-"))
            for family, key in palettes
        ):
            selected.add(name)
    selected &= available
    for name in selected - managed:
        path = Path(name)
        regular = path.with_name(path.stem.removesuffix("-ansi") + ".json")
        selected.update(
            {regular.as_posix(), regular.with_stem(regular.stem + "-ansi").as_posix()}
            & available
        )
    return selected
