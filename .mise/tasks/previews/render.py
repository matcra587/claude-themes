#!/usr/bin/env -S uv run --script
# [MISE] description = "Generate previews for changed themes or a selected family"
# [USAGE] unknown_flags "error"
# [USAGE] flag "--changed" bool_value=#true conflicts="--family" required_unless="--family" requires="--base" help="Select previews affected by changes since --base"
# [USAGE] flag "--family <family>" help="Select all themes in one plugin family"
# [USAGE] flag "--base <revision>" help="Git comparison revision; required with --changed"
# [USAGE] flag "--output <dir>" default="preview-output" help="New directory for the preview bundle"
# [USAGE] flag "--jobs <count>" default="2" help="Concurrent captures" { choices "1" "2" "3" "4" }
# [USAGE] flag "--claude-bin <file>" help="Use an existing copy of the pinned Linux x64 binary"
# [USAGE] flag "--check" bool_value=#true conflicts="--plan" help="Validate selected inputs without captures"
# [USAGE] flag "--plan" bool_value=#true help="Print planned captures and reuse as JSON without writing files"
# /// script
# requires-python = ">=3.14"
# dependencies = ["jsonschema==4.25.1", "pillow==12.3.0"]
# ///
"""Capture compact Claude Code previews with a pinned, isolated terminal."""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import jsonschema
from PIL import Image, ImageChops
from preview_gallery import write_gallery
from preview_selection import THEME, changed_paths, select_themes

ROOT = Path(__file__).resolve().parents[3]
FONT = ROOT / "assets/fonts/GeistMono-Regular.otf"
RUNTIME = json.loads((ROOT / "previews/runtime.json").read_text(encoding="utf-8"))
IMAGE = RUNTIME["vhs_image"]
CLAUDE_VERSION = RUNTIME["claude_version"]
CLAUDE_ARCHIVE_SHA256 = RUNTIME["claude_archive_sha256"]
WIDTH, HEIGHT = 2160, 1000
# Raw terminal canvas produced by the pinned viewport and font.
CANVAS_SIZE = (2071, 897)
COMPACT_SIZE = (1120, 644)
MODES = ("manual", "accept-edits", "plan", "auto")
SCENES = ("picker", "colours", *MODES, "shell")
SLOTS = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"]
SLOTS += ["bright" + name.capitalize() for name in SLOTS]
PALETTE_KEYS = {*SLOTS, "background", "foreground"}
OPTIONAL_PALETTE_KEYS = {"cursor", "selection"}
HEX = re.compile(r"#[0-9a-fA-F]{6}")


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def read_json(path: Path) -> dict:
    def unique(pairs: list[tuple[str, object]]) -> dict:
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"{path.name}: duplicate JSON key")
            result[key] = value
        return result

    value = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique)
    if not isinstance(value, dict):
        raise ValueError(f"{path.name}: expected a JSON object")
    return value


def safe_label(value: object) -> str:
    if not isinstance(value, str) or not value or len(value) > 80:
        raise ValueError("theme name must contain 1–80 characters")
    if "@" in value or any(
        unicodedata.category(char).startswith("C") for char in value
    ):
        raise ValueError("theme name contains an email address or control character")
    if any(char in value for char in "<>[]|`\\"):
        raise ValueError("theme name contains unsupported markup")
    return value


def palette_for(path: Path) -> tuple[Path, dict]:
    variant = path.stem.removesuffix("-ansi")
    matches = [
        candidate
        for candidate in (path.parent.parent / "palettes").glob("*.json")
        if variant == candidate.stem or variant.startswith(candidate.stem + "-")
    ]
    if not matches:
        raise ValueError(f"{path.name}: missing terminal palette")
    palette_path = max(matches, key=lambda candidate: len(candidate.stem))
    palette = read_json(palette_path)
    colours = palette.get("vhs", {})
    if not isinstance(colours, dict) or PALETTE_KEYS - colours.keys():
        raise ValueError(f"{palette_path.name}: incomplete terminal palette")
    if set(colours) - PALETTE_KEYS - OPTIONAL_PALETTE_KEYS - {"name"}:
        raise ValueError(f"{palette_path.name}: unknown terminal palette fields")
    for key in set(colours) - {"name"}:
        if not isinstance(colours[key], str) or not HEX.fullmatch(colours[key]):
            raise ValueError("terminal palette colours must be six-digit hex values")
    extended = palette.get("extended", {})
    if not isinstance(extended, dict):
        raise ValueError("extended terminal palette must be an object")
    for slot, colour in extended.items():
        if not re.fullmatch(
            r"(?:1[6-9]|[2-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])", slot
        ):
            raise ValueError("invalid extended terminal palette slot")
        if not isinstance(colour, str) or not HEX.fullmatch(colour):
            raise ValueError("invalid extended terminal palette colour")
    source = palette.get("source", {})
    if not isinstance(source, dict) or not str(source.get("url", "")).startswith(
        "https://"
    ):
        raise ValueError("terminal palette needs a source URL")
    return palette_path, palette


def inputs(name: str) -> dict:
    if not THEME.fullmatch(name):
        raise ValueError("invalid theme path")
    path = ROOT / name
    if any(part.is_symlink() for part in (path, *path.parents)):
        raise ValueError("preview inputs cannot be symlinks")
    theme = read_json(path)
    jsonschema.Draft202012Validator(
        read_json(ROOT / "schemas/theme.schema.json")
    ).validate(theme)
    label = safe_label(theme["name"])
    palette_path, palette = palette_for(path)
    files = [
        path,
        palette_path,
        FONT,
        Path(__file__),
        ROOT / "previews/runtime.json",
        ROOT / "schemas/theme.schema.json",
    ]
    fingerprint = hashlib.sha256(
        "\n".join(digest(file) for file in files).encode()
    ).hexdigest()
    return {
        "theme": name,
        "name": label,
        "theme_data": theme,
        "theme_sha256": digest(path),
        "palette": palette,
        "input_sha256": fingerprint,
        "image": f"plugins/{path.parts[-3]}/renders/{path.stem}.png",
    }


def cached_entries() -> dict[str, dict]:
    path = ROOT / "previews/manifest.json"
    if not path.exists():
        return {}
    manifest = read_json(path)
    if manifest.get("format") != 1 or not isinstance(manifest.get("themes"), list):
        raise ValueError("unsupported preview manifest")
    result = {}
    for entry in manifest["themes"]:
        name = entry["theme"]
        match = THEME.fullmatch(name)
        if not match or name in result:
            raise ValueError("invalid or duplicate theme path in preview manifest")
        if entry["image"] != f"plugins/{match[1]}/renders/{match[2]}.png":
            raise ValueError("unexpected preview image path")
        result[name] = entry
    return result


def claude_binary(supplied: Path | None) -> Path:
    """Resolve the binary from the same verified archive used by setup-previews."""
    cache = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache")
    directory = cache / "claude-themes" / CLAUDE_VERSION
    directory.mkdir(parents=True, exist_ok=True)
    archive = directory / "claude-linux-x64.tar.gz"
    binary = supplied.resolve() if supplied is not None else directory / "claude"
    with tempfile.TemporaryDirectory(prefix=".claude-", dir=directory) as temporary:
        staging = Path(temporary)
        if not archive.is_file() or digest(archive) != CLAUDE_ARCHIVE_SHA256:
            download = staging / archive.name
            subprocess.run(
                [
                    "gh",
                    "release",
                    "download",
                    f"v{CLAUDE_VERSION}",
                    "--repo",
                    "anthropics/claude-code",
                    "--pattern",
                    archive.name,
                    "--output",
                    str(download),
                ],
                check=True,
                timeout=180,
            )
            if digest(download) != CLAUDE_ARCHIVE_SHA256:
                raise ValueError("Claude Code archive checksum mismatch")
            download.replace(archive)
        with tarfile.open(archive, "r:gz") as package:
            member = package.getmember("claude")
            if not member.isfile():
                raise ValueError(
                    "Claude Code archive must contain a regular executable"
                )
            source = package.extractfile(member)
            if source is None:
                raise ValueError("Claude Code archive is missing its executable")
            extracted = staging / "claude"
            with source, extracted.open("wb") as destination:
                shutil.copyfileobj(source, destination)
            if supplied is not None:
                if digest(binary) != digest(extracted):
                    raise ValueError(
                        f"expected the official Claude Code {CLAUDE_VERSION} Linux x64 binary"
                    )
            else:
                extracted.chmod(0o755)
                extracted.replace(binary)
    return binary


def syntax_theme(theme: dict) -> str:
    base = theme.get("base", "dark")
    if base.endswith("-ansi"):
        return "ansi"
    return "GitHub" if base.startswith("light") else "Monokai Extended"


def snapshot(name: str) -> list[str]:
    return [
        "Show",
        "Sleep 1100ms",
        f'Screenshot "{name}.png"',
        "Sleep 1100ms",
        "Hide",
    ]


def capture_tape(item: dict) -> str:
    palette = {
        key: value for key, value in item["palette"]["vhs"].items() if key != "name"
    }
    selected = re.escape(item["name"]).replace("/", r"\/")
    commands = [
        "Set Shell bash",
        'Set FontFamily "Geist Mono"',
        "Set FontSize 30",
        f"Set Width {WIDTH}",
        f"Set Height {HEIGHT}",
        "Set Padding 32",
        "Set Framerate 1",
        "Set CursorBlink false",
        "Set TypingSpeed 0.1ms",
        "Set Theme " + json.dumps(palette),
        'Env COLORTERM "truecolor"',
        'Env CLAUDE_CONFIG_DIR "/vhs/config"',
        'Env CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC "1"',
        # The dummy provider opens the UI offline. No prompt is submitted.
        'Env ANTHROPIC_API_KEY "preview-only-unused"',
        'Env ANTHROPIC_BASE_URL "http://127.0.0.1:9"',
        "Hide",
        'Type "exec bash show.sh"',
        "Enter",
        "Wait+Screen@15s /Choose the text style/",
        *["Down"] * 6,
        f"Wait+Screen@15s /❯.*{selected}.*\\(custom\\)/",
        f"Wait+Screen@15s /Syntax theme: {syntax_theme(item['theme_data'])}/",
        *snapshot("picker"),
        "Enter",
        "Wait+Screen@15s /Detected a custom API key/",
        "Sleep 200ms",
        "Up",
        "Wait+Screen@5s /❯.*Yes/",
        "Enter",
        "Wait+Screen@15s /Security notes/",
        "Sleep 200ms",
        "Enter",
        "Wait+Screen@15s /No, exit/",
        "Sleep 200ms",
        "Down",
        "Wait+Screen@5s /❯.*Yes, I trust this folder/",
        "Enter",
        "Wait+Screen@15s /manual mode on/",
        "Sleep 3s",
        'Type "/theme"',
        "Enter",
        "Wait+Screen@15s /New custom theme/",
        "Ctrl+E",
        "Wait+Screen@15s /Filter color tokens/",
        'Type "FOR_SUBAGENTS_ONLY"',
        "Wait+Screen@15s /cyan_FOR_SUBAGENTS_ONLY/",
        *snapshot("colours"),
        "Escape",
        "Wait+Screen@15s /manual mode on/",
        'Type "Explain the structure of this project."',
        *snapshot("manual"),
    ]
    for mode, indicator in (
        ("accept-edits", "accept edits on"),
        ("plan", "plan mode on"),
        ("auto", "auto mode on"),
    ):
        commands += ["Shift+Tab", f"Wait+Screen@15s /{indicator}/", *snapshot(mode)]
    commands += [
        "Ctrl+U",
        r"Wait+Screen@5s /❯[[:space:]\x{00a0}]*\n/",
        'Type "!"',
        "Wait+Screen@15s /! for shell mode/",
        'Type "printf hello"',
        "Wait+Screen@5s /!.*printf hello/",
        *snapshot("shell"),
    ]
    return "\n".join(commands) + "\n"


def capture_screens(item: dict, binary: Path) -> dict[str, Image.Image]:
    """Capture every scene in one offline session using fresh configuration."""
    with tempfile.TemporaryDirectory(prefix="theme-preview-") as temporary:
        directory = Path(temporary) / "capture"
        directory.mkdir()
        identifier = Path(temporary) / "container.id"
        (directory / "config/themes").mkdir(parents=True)
        (directory / "config/themes/preview.json").write_text(
            json.dumps(item["theme_data"])
        )
        (directory / "workspace").mkdir()
        (directory / "fonts").mkdir()
        shutil.copyfile(FONT, directory / "fonts/font.otf")
        (directory / "fonts.conf").write_text(
            "<fontconfig><dir>/vhs/fonts</dir><dir>/usr/share/fonts</dir>"
            "<cachedir>/tmp/font-cache</cachedir></fontconfig>\n"
        )
        prelude = "".join(
            f"\x1b]4;{slot};{colour}\x07"
            for slot, colour in item["palette"].get("extended", {}).items()
        )
        (directory / "palette.ansi").write_text(prelude)
        (directory / "show.sh").write_text(
            "set -euo pipefail\nprintf '\\e[2J\\e[H'\ncat palette.ansi\n"
            "cd /vhs/workspace\nexec /opt/claude --bare\n"
        )
        (directory / "capture.sh").write_text(
            "set -euo pipefail\n"
            "[[ $(fc-match -f '%{family[0]}' 'Geist Mono') == 'Geist Mono' ]]\n"
            "export PATH=/vhs/bin:$PATH\nexec vhs scene.tape\n"
        )
        (directory / "bin").mkdir()
        # Preserve the raw terminal canvas; FFmpeg composition changes RGB values.
        ffmpeg = directory / "bin/ffmpeg"
        ffmpeg.write_text(
            "#!/bin/bash\nset -euo pipefail\n"
            "if [[ ${!#} == *.png ]]; then\n"
            "  [[ $1 == -y && $2 == -i ]]\n"
            '  cp -- "$3" "/vhs/${!#}"\n'
            'else\n  exec /usr/bin/ffmpeg "$@"\nfi\n'
        )
        ffmpeg.chmod(0o755)
        (directory / "scene.tape").write_text(capture_tape(item))
        command = [
            "docker",
            "run",
            "--rm",
            "--cidfile",
            str(identifier),
            "--user",
            f"{os.getuid()}:{os.getgid()}",
            "--network",
            "none",
            "--read-only",
            "--cap-drop",
            "ALL",
            "--security-opt",
            "no-new-privileges",
            "--tmpfs",
            "/tmp:rw,exec,size=512m",
            "--shm-size",
            "256m",
            "--mount",
            f"type=bind,src={directory},dst=/vhs",
            "--mount",
            f"type=bind,src={binary},dst=/opt/claude,readonly",
            "--env",
            "FONTCONFIG_FILE=/vhs/fonts.conf",
            "--env",
            "XDG_CACHE_HOME=/tmp/cache",
            "--env",
            "XDG_CONFIG_HOME=/tmp/config",
            "--entrypoint",
            "/bin/bash",
            IMAGE,
            "capture.sh",
        ]
        try:
            result = subprocess.run(
                command, capture_output=True, timeout=180, check=False
            )
        finally:
            if identifier.is_file():
                subprocess.run(
                    ["docker", "rm", "--force", identifier.read_text().strip()],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=15,
                    check=False,
                )
        if result.returncode:
            detail = result.stderr.decode(errors="replace")[-2000:].replace(
                str(directory), "<capture>"
            )
            raise ValueError(f"{item['theme']}: capture failed: {detail.strip()}")
        background = item["palette"]["vhs"]["background"]
        expected = tuple(bytes.fromhex(background[1:]))
        screens = {}
        for name in SCENES:
            with Image.open(directory / f"{name}.png") as content:
                if content.size != CANVAS_SIZE:
                    raise ValueError(
                        f"{name}: native terminal dimensions changed: {content.size}"
                    )
                if content.convert("RGB").getpixel((0, 0)) != expected:
                    raise ValueError(f"{name}: wrong terminal background")
                picture = Image.new("RGB", (WIDTH, HEIGHT), background)
                picture.paste(content, (32, 32))
                screens[name] = picture
        return screens


def editor_origin(picture: Image.Image) -> int:
    """Locate the editor separator before the effort badge on its right."""
    background = picture.getpixel((0, 0))
    rows = [
        y
        for y in range(200, 400)
        if picture.getpixel((40, y))
        == picture.getpixel((500, y))
        == picture.getpixel((1000, y))
        != background
    ]
    if not rows or rows != list(range(rows[0], rows[-1] + 1)):
        raise ValueError("cannot locate the native theme editor panel")
    return rows[0]


def compose(screens: dict[str, Image.Image], mode: str = "auto") -> Image.Image:
    """Arrange exact native crops without resampling or recolouring."""
    if mode not in MODES:
        raise ValueError("unsupported preview permission mode")
    background = screens["picker"].getpixel((0, 0))
    origin = editor_origin(screens["colours"])
    # The effort badge above the title extends five pixels into the crop's padding.
    title = screens["colours"].crop((88, origin + 39, 2128, origin + 82))
    bounds = ImageChops.difference(
        title, Image.new("RGB", title.size, background)
    ).getbbox()
    if not bounds or bounds[2] > 984:
        raise ValueError("theme title does not fit the compact preview")
    picture = Image.new("RGB", COMPACT_SIZE, background)
    crops = [
        ("colours", (88, origin + 34, 1072, origin + 82), (52, 24)),
        *[
            (
                "colours",
                (127, origin + 195 + 39 * row, 165, origin + 234 + 39 * row),
                (52 + 64 * row, 86),
            )
            for row in range(8)
        ],
        ("picker", (32, 644, 1088, 826), (32, 146)),
        (mode, (32, 790, 1088, 930), (32, 328)),
        ("shell", (32, 790, 1088, 928), (32, 482)),
    ]
    for name, box, position in crops:
        picture.paste(screens[name].crop(box), position)
    return picture


def capture(item: dict, binary: Path, output: Path) -> None:
    picture = compose(capture_screens(item, binary))
    destination = output / item["image"]
    destination.parent.mkdir(parents=True, exist_ok=True)
    picture.save(destination)


def plan_captures(
    selected: set[str], cache: dict[str, dict]
) -> tuple[list[dict], list[dict]]:
    """Validate inputs and classify captures and reusable entries without writes."""
    items = [inputs(name) for name in sorted(selected)]
    entries = []
    pending = []
    for name, entry in sorted(cache.items()):
        if not (ROOT / name).is_file() or name in selected:
            continue
        source = ROOT / entry["image"]
        if (
            not source.is_file()
            or digest(source) != entry["image_sha256"]
            or digest(ROOT / name) != entry["theme_sha256"]
        ):
            raise ValueError(
                f"{name}: an unselected preview changed; use the correct comparison base"
            )
        entries.append(entry)
    for item in items:
        entry = cache.get(item["theme"])
        source = ROOT / item["image"]
        if (
            entry
            and source.is_file()
            and entry["input_sha256"] == item["input_sha256"]
            and entry["theme_sha256"] == item["theme_sha256"]
            and digest(source) == entry["image_sha256"]
        ):
            entries.append(entry)
        else:
            pending.append(item)
    return pending, sorted(entries, key=lambda entry: entry["theme"])


def generate(
    selected: set[str],
    cache: dict[str, dict],
    output: Path,
    *,
    jobs: int,
    binary: Path | None,
    check: bool,
) -> None:
    if check:
        for name in sorted(selected):
            inputs(name)
        print(f"Validated {len(selected)} selected themes.")
        return
    if output.exists():
        raise ValueError("preview output must be a new directory")
    pending, entries = plan_captures(selected, cache)
    output.mkdir(parents=True)
    for entry in entries:
        destination = output / entry["image"]
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / entry["image"], destination)
    if pending:
        executable = claude_binary(binary)
        image = subprocess.run(
            ["docker", "image", "inspect", IMAGE], capture_output=True, timeout=30
        )
        if image.returncode:
            subprocess.run(
                ["docker", "pull", IMAGE], check=True, capture_output=True, timeout=180
            )

        def worker(item: dict) -> dict:
            capture(item, executable, output)
            return {
                key: item[key]
                for key in ("theme", "name", "image", "theme_sha256", "input_sha256")
            } | {
                "image_sha256": digest(output / item["image"]),
                "claude_code": CLAUDE_VERSION,
                "syntax_theme": syntax_theme(item["theme_data"]),
                "source": item["palette"]["source"],
            }

        with ThreadPoolExecutor(max_workers=jobs) as pool:
            for entry in pool.map(worker, pending, buffersize=jobs):
                entries.append(entry)
                print(f"Rendered {Path(entry['theme']).stem}")
    write_gallery(output, sorted(entries, key=lambda entry: entry["theme"]))
    print(f"Rendered {len(pending)}; reused {len(entries) - len(pending)} previews.")


def main() -> int:
    try:
        changed_mode = os.environ.get("usage_changed") == "true"
        family = os.environ.get("usage_family")
        base = os.environ.get("usage_base")
        if not changed_mode and not family:
            raise ValueError("Run with mise: mise run previews:render --help")
        if family and not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", family):
            raise ValueError("invalid theme family")
        available = {
            path.relative_to(ROOT).as_posix()
            for path in ROOT.glob("plugins/*/themes/*.json")
        }
        cache = cached_entries()
        if changed_mode:
            if not base:
                raise ValueError("--changed requires --base")
            changed = changed_paths(ROOT, base)
            selected = select_themes(
                available,
                changed,
                set(cache),
                deleted={name for name in changed if not (ROOT / name).exists()},
            )
        else:
            selected = {name for name in available if Path(name).parts[1] == family}
        if family and not selected:
            raise ValueError("theme family contains no themes")
        if os.environ.get("usage_plan") == "true":
            pending, entries = plan_captures(selected, cache)
            print(
                json.dumps(
                    {
                        "capture": [item["theme"] for item in pending],
                        "reuse": [entry["theme"] for entry in entries],
                    }
                )
            )
            return 0
        print("Selected themes: " + ", ".join(sorted(selected)))
        binary = os.environ.get("usage_claude_bin")
        generate(
            selected,
            cache,
            Path(os.environ.get("usage_output", ROOT / "preview-output")),
            jobs=int(os.environ.get("usage_jobs", "2")),
            binary=Path(binary) if binary else None,
            check=os.environ.get("usage_check") == "true",
        )
    except (
        ValueError,
        OSError,
        KeyError,
        TypeError,
        subprocess.SubprocessError,
        tarfile.TarError,
        jsonschema.ValidationError,
    ) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
