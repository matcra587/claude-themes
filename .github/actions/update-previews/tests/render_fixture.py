"""Generate a real preview bundle without starting Claude or Docker."""

import importlib
import json
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

root, output = map(Path, sys.argv[1:])
sys.path.insert(0, str(root / ".mise/tasks/previews"))
renderer = importlib.import_module("render")
palettes = root / "plugins/sample/palettes"
themes = root / "plugins/sample/themes"
palettes.mkdir(parents=True)
themes.mkdir()

for name in ("sample", "sample-dark", "sample-dark-so", "sample-light"):
    (palettes / f"{name}.json").write_text(
        json.dumps(
            {
                "source": {"url": f"https://example.com/{name}"},
                "vhs": dict.fromkeys(renderer.PALETTE_KEYS, "#123456"),
            }
        )
    )

for slug, name, base in (
    ("sample-dark-soft", "Sample Dark", "dark"),
    ("sample-dark-soft-ansi", "Sample Dark (ANSI)", "dark-ansi"),
    ("sample-light", "Sample Light", "light"),
):
    (themes / f"{slug}.json").write_text(json.dumps({"name": name, "base": base}))


def capture_image(item: dict, _executable: Path, destination: Path) -> None:
    image = destination / item["image"]
    image.parent.mkdir(parents=True, exist_ok=True)
    renderer.Image.new("RGB", (2, 2), "#123456").save(image)


def inspect_image(
    command: list[str], **_kwargs: object
) -> subprocess.CompletedProcess[bytes]:
    if command != ["docker", "image", "inspect", renderer.IMAGE]:
        raise AssertionError(f"Unexpected external command: {command!r}")
    return subprocess.CompletedProcess(command, 0)


with (
    patch.object(renderer, "claude_binary", return_value=root / "unused"),
    patch.object(renderer, "capture", new=capture_image),
    patch.object(renderer.subprocess, "run", new=inspect_image),
):
    renderer.generate(
        {path.relative_to(root).as_posix() for path in themes.glob("*.json")},
        {},
        output,
        jobs=1,
        binary=None,
        check=False,
    )
