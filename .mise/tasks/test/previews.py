#!/usr/bin/env -S uv run --script
# [MISE] description = "Run preview selection and rendering regressions"
# [MISE] raw_args = true
# /// script
# requires-python = ">=3.14"
# dependencies = ["jsonschema==4.25.1", "pillow==12.3.0"]
# ///
"""Regression tests for incremental selection and gallery generation."""

import hashlib
import importlib.util
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path
from types import ModuleType
from typing import ClassVar
from unittest.mock import patch

from PIL import Image


def load_preview_module(name: str) -> ModuleType:
    path = Path(__file__).resolve().parents[1] / "previews" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


load_preview_module("preview_gallery")
selection = load_preview_module("preview_selection")
changed_paths, select_themes = selection.changed_paths, selection.select_themes
renderer = load_preview_module("render")


class SelectionTests(unittest.TestCase):
    regular = "plugins/sample/themes/sample.json"
    ansi = "plugins/sample/themes/sample-ansi.json"
    other = "plugins/other/themes/other.json"
    available: ClassVar[set[str]] = {regular, ansi, other}

    def test_tooling_setup_does_not_enroll_existing_themes(self):
        self.assertEqual(
            select_themes(self.available, {".mise/tasks/previews/render.py"}, set()),
            set(),
        )

    def test_shared_input_refreshes_only_managed_themes(self):
        for shared in selection.SHARED_INPUTS:
            for managed in (set(), {self.regular, self.ansi}):
                with self.subTest(shared=shared, managed=managed):
                    self.assertEqual(
                        select_themes(self.available, {shared}, managed), managed
                    )

    def test_runtime_change_refreshes_only_managed_themes(self):
        for managed in (set(), {self.regular}):
            with self.subTest(managed=managed):
                self.assertEqual(
                    select_themes(self.available, {"previews/runtime.json"}, managed),
                    managed,
                )

    def test_regular_edit_selects_ansi_counterpart(self):
        self.assertEqual(
            select_themes(self.available, {self.regular}, set()),
            {self.regular, self.ansi},
        )

    def test_first_ansi_edit_enrolls_its_regular_gallery_partner(self):
        self.assertEqual(
            select_themes(self.available, {self.ansi}, set()),
            {self.regular, self.ansi},
        )

    def test_managed_ansi_edit_is_scoped_to_ansi(self):
        self.assertEqual(
            select_themes(self.available, {self.ansi}, {self.regular, self.ansi}),
            {self.ansi},
        )

    def test_managed_image_edit_selects_only_that_image(self):
        self.assertEqual(
            select_themes(
                self.available,
                {"plugins/sample/renders/sample.png"},
                {self.regular, self.ansi},
            ),
            {self.regular},
        )

    def test_palette_change_is_scoped_and_does_not_enroll(self):
        for managed in (set(), {self.regular}):
            with self.subTest(managed=managed):
                self.assertEqual(
                    select_themes(
                        self.available,
                        {"plugins/sample/palettes/sample.json"},
                        managed,
                    ),
                    managed,
                )

    def test_palette_change_does_not_refresh_same_variant_in_another_family(self):
        other = "plugins/other/themes/sample.json"
        available = self.available | {other}
        self.assertEqual(
            select_themes(
                available,
                {"plugins/sample/palettes/sample.json"},
                available,
            ),
            {self.regular, self.ansi},
        )

    def test_palette_change_matches_hyphen_prefixes_within_its_family(self):
        regular = "plugins/sample/themes/sample-soft.json"
        ansi = "plugins/sample/themes/sample-soft-ansi.json"
        nonprefix = "plugins/sample/themes/samples.json"
        other = "plugins/other/themes/sample-soft.json"
        available = self.available | {regular, ansi, nonprefix, other}
        self.assertEqual(
            select_themes(
                available,
                {"plugins/sample/palettes/sample.json"},
                available,
            ),
            {self.regular, self.ansi, regular, ansi},
        )

    def test_deleted_theme_cannot_be_selected(self):
        self.assertEqual(
            select_themes({self.other}, {self.regular}, {self.regular}), set()
        )

    def test_unrelated_changes_do_not_select_themes(self):
        for name in (
            "README.md",
            ".mise/tasks/previews/preview_gallery.py",
            ".mise/tasks/previews/preview_selection.py",
            ".github/actions/setup-previews/action.yml",
            "previews/runtime.json.clover.yaml",
        ):
            with self.subTest(name=name):
                self.assertEqual(
                    select_themes(self.available, {name}, self.available), set()
                )


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        cache = self.root / "cache"
        self.enterContext(patch.dict(os.environ, XDG_CACHE_HOME=str(cache)))
        directory = cache / "claude-themes" / renderer.CLAUDE_VERSION
        directory.mkdir(parents=True)
        self.archive = directory / "claude-linux-x64.tar.gz"
        self.binary = directory / "claude"
        self.executable = b"Verified executable fixture"
        self.package = self.make_archive()
        self.enterContext(
            patch.object(
                renderer,
                "CLAUDE_ARCHIVE_SHA256",
                hashlib.sha256(self.package).hexdigest(),
            )
        )
        self.download = self.enterContext(
            patch.object(subprocess, "run", side_effect=self.write_download)
        )

    def make_archive(self, *, symlink=False):
        buffer = io.BytesIO()
        with tarfile.open(fileobj=buffer, mode="w:gz") as package:
            member = tarfile.TarInfo("claude")
            if symlink:
                member.type = tarfile.SYMTYPE
                member.linkname = "outside"
                package.addfile(member)
            else:
                member.size = len(self.executable)
                package.addfile(member, io.BytesIO(self.executable))
        return buffer.getvalue()

    def write_download(self, command, **_kwargs):
        self.assertEqual(command[:3], ["gh", "release", "download"])
        Path(command[command.index("--output") + 1]).write_bytes(self.package)
        return subprocess.CompletedProcess(command, 0)

    def assert_clean_staging(self):
        self.assertEqual(list(self.archive.parent.glob(".claude-*")), [])

    def test_download_installs_verified_executable(self):
        self.assertEqual(renderer.claude_binary(None), self.binary)
        self.assertEqual(self.archive.read_bytes(), self.package)
        self.assertEqual(self.binary.read_bytes(), self.executable)
        self.assertEqual(self.binary.stat().st_mode & 0o777, 0o755)
        self.download.assert_called_once()
        self.assert_clean_staging()

    def test_verified_cached_archive_repairs_binary_without_download(self):
        self.archive.write_bytes(self.package)
        self.binary.write_bytes(b"Damaged executable")
        self.assertEqual(renderer.claude_binary(None), self.binary)
        self.assertEqual(self.binary.read_bytes(), self.executable)
        self.download.assert_not_called()
        self.assert_clean_staging()

    def test_corrupt_cached_archive_is_replaced(self):
        self.archive.write_bytes(b"Damaged archive")
        self.assertEqual(renderer.claude_binary(None), self.binary)
        self.assertEqual(self.archive.read_bytes(), self.package)
        self.assertEqual(self.binary.read_bytes(), self.executable)
        self.download.assert_called_once()
        self.assert_clean_staging()

    def test_failed_download_preserves_existing_archive_and_binary(self):
        self.archive.write_bytes(b"Previous archive")
        self.binary.write_bytes(b"Previous executable")
        self.binary.chmod(0o700)

        def failed_download(command, **_kwargs):
            Path(command[command.index("--output") + 1]).write_bytes(
                b"Partial download"
            )
            raise subprocess.CalledProcessError(1, command)

        self.download.side_effect = failed_download
        with self.assertRaises(subprocess.CalledProcessError):
            renderer.claude_binary(None)
        self.assertEqual(self.archive.read_bytes(), b"Previous archive")
        self.assertEqual(self.binary.read_bytes(), b"Previous executable")
        self.assertEqual(self.binary.stat().st_mode & 0o777, 0o700)
        self.assert_clean_staging()

    def test_checksum_mismatch_preserves_existing_archive_and_binary(self):
        self.archive.write_bytes(b"Previous archive")
        self.binary.write_bytes(b"Previous executable")
        self.package = b"Incorrect download"
        with self.assertRaisesRegex(ValueError, "archive checksum mismatch"):
            renderer.claude_binary(None)
        self.assertEqual(self.archive.read_bytes(), b"Previous archive")
        self.assertEqual(self.binary.read_bytes(), b"Previous executable")
        self.assert_clean_staging()

    def test_archive_symlink_cannot_replace_binary(self):
        self.package = self.make_archive(symlink=True)
        self.binary.write_bytes(b"Previous executable")
        with (
            patch.object(
                renderer,
                "CLAUDE_ARCHIVE_SHA256",
                hashlib.sha256(self.package).hexdigest(),
            ),
            self.assertRaisesRegex(ValueError, "must contain a regular executable"),
        ):
            renderer.claude_binary(None)
        self.assertEqual(self.binary.read_bytes(), b"Previous executable")
        self.assert_clean_staging()

    def test_supplied_binary_must_match_verified_archive(self):
        supplied = self.root / "supplied-claude"
        supplied.write_bytes(self.executable)
        self.assertEqual(renderer.claude_binary(supplied), supplied)
        self.assertFalse(self.binary.exists())
        self.download.assert_called_once()
        supplied.write_bytes(b"Different executable")
        with self.assertRaisesRegex(ValueError, "expected the official Claude Code"):
            renderer.claude_binary(supplied)
        self.assertEqual(supplied.read_bytes(), b"Different executable")
        self.download.assert_called_once()
        self.assert_clean_staging()


class CompositionTests(unittest.TestCase):
    def setUp(self):
        background = (24, 24, 24)
        self.origin = 260
        self.screens = {
            name: Image.new("RGB", (renderer.WIDTH, renderer.HEIGHT), background)
            for name in renderer.SCENES
        }
        editor = self.screens["colours"]
        editor.paste((100, 100, 100), (32, self.origin, 2128, self.origin + 2))
        editor.paste(background, (1800, self.origin - 3, 2080, self.origin + 3))
        # The right-side badge interrupts the divider and descends into title padding.
        editor.paste((190, 190, 190), (1900, self.origin + 34, 2001, self.origin + 39))
        editor.paste((220, 220, 220), (88, self.origin + 40, 400, self.origin + 70))
        editor.putpixel((90, self.origin + 34), (70, 150, 230))

    def test_effort_badge_does_not_hide_editor_divider(self):
        self.assertEqual(renderer.editor_origin(self.screens["colours"]), self.origin)

    def test_badge_descenders_allow_title_and_preserve_its_original_pixels(self):
        picture = renderer.compose(self.screens)
        expected = self.screens["colours"].crop(
            (88, self.origin + 34, 1072, self.origin + 82)
        )
        self.assertEqual(picture.size, renderer.COMPACT_SIZE)
        self.assertEqual(picture.crop((52, 24, 1036, 72)).tobytes(), expected.tobytes())

    def test_oversized_title_is_rejected(self):
        self.screens["colours"].putpixel((1072, self.origin + 50), (220, 220, 220))
        with self.assertRaisesRegex(ValueError, "theme title does not fit"):
            renderer.compose(self.screens)


class GenerationTests(unittest.TestCase):
    """Exercise real manifests and Git diffs with only terminal capture replaced."""

    regular = "plugins/sample/themes/sample.json"
    ansi = "plugins/sample/themes/sample-ansi.json"

    def setUp(self):
        self.enterContext(patch.object(sys, "stdout", io.StringIO()))
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name) / "repository"
        self.root.mkdir()
        source = Path(__file__).resolve().parents[3]
        for name in (
            ".mise/tasks/previews/render.py",
            "schemas/theme.schema.json",
            "previews/runtime.json",
        ):
            destination = self.root / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source / name, destination)
        for name, label, base in (
            (self.regular, "Sample", "dark"),
            (self.ansi, "Sample (ANSI)", "dark-ansi"),
        ):
            destination = self.root / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(
                json.dumps({"name": label, "base": base, "overrides": {}})
            )
        palette = self.root / "plugins/sample/palettes/sample.json"
        palette.parent.mkdir(parents=True)
        palette.write_text(
            json.dumps(
                {
                    "source": {"url": "https://example.invalid/palette.json"},
                    "vhs": {
                        "background": "#181818",
                        "foreground": "#eeeeee",
                        "black": "#000000",
                        "red": "#aa0000",
                        "green": "#00aa00",
                        "yellow": "#aaaa00",
                        "blue": "#0000aa",
                        "magenta": "#aa00aa",
                        "cyan": "#00aaaa",
                        "white": "#aaaaaa",
                        "brightBlack": "#555555",
                        "brightRed": "#ff5555",
                        "brightGreen": "#55ff55",
                        "brightYellow": "#ffff55",
                        "brightBlue": "#5555ff",
                        "brightMagenta": "#ff55ff",
                        "brightCyan": "#55ffff",
                        "brightWhite": "#ffffff",
                    },
                }
            )
        )
        font = self.root / "assets/fonts/GeistMono-Regular.otf"
        font.parent.mkdir(parents=True)
        font.write_bytes(b"Font fixture; terminal capture is replaced in these tests.")
        for name, value in (
            ("ROOT", self.root),
            ("FONT", font),
            ("__file__", str(self.root / ".mise/tasks/previews/render.py")),
        ):
            self.enterContext(patch.object(renderer, name, value))
        self.git("init", "--quiet", "--initial-branch=main")
        self.git("add", ".")
        self.commit("Initial fixture")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.available = {self.regular, self.ansi}
        self.rendered = []
        self.docker_commands = []
        self.image_available = True
        self.pull_returncode = 0

        def capture(item, _binary, output):
            self.rendered.append(item["theme"])
            destination = output / item["image"]
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(item["input_sha256"].encode())

        run = subprocess.run

        def run_without_docker(command, **kwargs):
            if command[0] != "docker":
                return run(command, **kwargs)
            self.docker_commands.append(command)
            if command[:3] == ["docker", "image", "inspect"]:
                returncode = 0 if self.image_available else 1
            elif command[:2] == ["docker", "pull"]:
                returncode = self.pull_returncode
            else:
                raise AssertionError(f"unexpected Docker command: {command}")
            if returncode and kwargs.get("check"):
                raise subprocess.CalledProcessError(returncode, command)
            return subprocess.CompletedProcess(command, returncode)

        self.enterContext(patch.object(renderer, "capture", side_effect=capture))
        self.binary = self.enterContext(patch.object(renderer, "claude_binary"))
        self.enterContext(
            patch.object(subprocess, "run", side_effect=run_without_docker)
        )

    def git(self, *args):
        return subprocess.run(
            ["git", *args],
            cwd=self.root,
            capture_output=True,
            text=True,
            check=True,
        ).stdout

    def generate(self, selected, name, *, check=False) -> Path:
        output = self.root.parent / name
        renderer.generate(
            selected,
            renderer.cached_entries(),
            output,
            jobs=2,
            binary=None,
            check=check,
        )
        return output

    def generate_changed(self, name) -> Path:
        output = self.root.parent / name
        self.assertEqual(
            self.run_task(changed="true", base=self.base, output=str(output)), 0
        )
        return output

    def run_task(self, **flags):
        options = {
            "output": str(self.root.parent / "preview-output"),
            "jobs": "2",
        } | flags
        with patch.dict(os.environ):
            for name in (
                "changed",
                "family",
                "base",
                "output",
                "jobs",
                "claude_bin",
                "check",
                "plan",
            ):
                os.environ.pop(f"usage_{name}", None)
            os.environ.update(
                {f"usage_{name}": value for name, value in options.items()}
            )
            return renderer.main()

    def manual_image(self) -> Path:
        image = self.root / "plugins/sample/renders/sample.png"
        image.parent.mkdir(parents=True, exist_ok=True)
        image.write_bytes(b"Historical preview")
        self.git("add", str(image))
        return image

    def commit(self, message):
        self.git(
            "-c",
            "user.name=Preview tests",
            "-c",
            "user.email=tests@example.invalid",
            "commit",
            "--quiet",
            "-m",
            message,
        )

    def plan(self, **flags):
        def files():
            return {
                path.relative_to(self.root.parent): hashlib.sha256(
                    path.read_bytes()
                ).hexdigest()
                for path in self.root.parent.rglob("*")
                if path.is_file() and ".git" not in path.parts
            }

        before = files()
        stdout, stderr = io.StringIO(), io.StringIO()
        with patch.object(sys, "stdout", stdout), patch.object(sys, "stderr", stderr):
            status = self.run_task(
                plan="true",
                output=str(self.root.parent / "planned-output"),
                **flags,
            )
        self.assertEqual(files(), before)
        self.assertFalse((self.root.parent / "planned-output").exists())
        self.binary.assert_not_called()
        self.assertEqual(self.rendered, [])
        self.assertEqual(self.docker_commands, [])
        return status, stdout.getvalue(), stderr.getvalue()

    def assert_bundle(self, output, expected):
        manifest = json.loads((output / "manifest.json").read_text())
        self.assertEqual(manifest["format"], 1)
        entries = {entry["theme"]: entry for entry in manifest["themes"]}
        self.assertEqual(set(entries), expected)
        self.assertEqual(len(entries), len(manifest["themes"]))
        for entry in entries.values():
            self.assertEqual(
                hashlib.sha256((output / entry["image"]).read_bytes()).hexdigest(),
                entry["image_sha256"],
            )
        return entries

    def enroll(self):
        output = self.generate(self.available, "first")
        self.assert_bundle(output, self.available)
        shutil.copytree(output / "plugins", self.root / "plugins", dirs_exist_ok=True)
        shutil.copyfile(output / "manifest.json", self.root / "previews/manifest.json")
        self.git("add", ".")
        self.commit("Enroll previews")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.rendered.clear()
        self.docker_commands.clear()
        self.binary.reset_mock()

    def test_tooling_setup_does_not_download_or_render_previews(self):
        selected = select_themes(
            self.available, {".mise/tasks/previews/render.py"}, set()
        )
        output = self.generate(selected, "empty")
        self.assert_bundle(output, set())
        self.binary.assert_not_called()
        self.assertEqual(self.rendered, [])
        self.assertEqual(self.docker_commands, [])
        self.assertFalse((self.root / "previews/manifest.json").exists())
        self.assertEqual(list(self.root.glob("plugins/*/PREVIEWS.md")), [])
        self.assertFalse((output / "plugins").exists())

    def test_check_validates_inputs_without_capture_or_writes(self):
        output = self.generate(self.available, "check", check=True)
        self.binary.assert_not_called()
        self.assertEqual(self.rendered, [])
        self.assertEqual(self.docker_commands, [])
        self.assertFalse(output.exists())
        self.assertEqual(self.git("status", "--porcelain"), "")

    def test_palette_lookup_uses_each_themes_family(self):
        local = self.root / "plugins/sample/palettes/sample.json"
        other = self.root / "plugins/other/palettes/sample.json"
        other.parent.mkdir(parents=True)
        palette = json.loads(local.read_text())
        palette["vhs"]["background"] = "#123456"
        other.write_text(json.dumps(palette))
        for family, expected in (("sample", local), ("other", other)):
            for variant in ("sample", "sample-ansi"):
                with self.subTest(family=family, variant=variant):
                    path, actual = renderer.palette_for(
                        self.root / f"plugins/{family}/themes/{variant}.json"
                    )
                    self.assertEqual(path, expected)
                    self.assertEqual(actual, json.loads(expected.read_text()))

    def test_palette_lookup_uses_longest_local_hyphen_prefix(self):
        local = self.root / "plugins/sample/palettes/sample.json"
        longer = local.with_stem("sample-soft")
        shutil.copyfile(local, longer)
        foreign = self.root / "plugins/other/palettes/sample-soft-extra.json"
        foreign.parent.mkdir(parents=True)
        shutil.copyfile(local, foreign)
        for variant, expected in (
            ("sample", local),
            ("sample-ansi", local),
            ("sample-soft", longer),
            ("sample-soft-extra", longer),
            ("sample-soft-extra-ansi", longer),
            ("sample-softer", local),
        ):
            with self.subTest(variant=variant):
                path, _palette = renderer.palette_for(
                    self.root / f"plugins/sample/themes/{variant}.json"
                )
                self.assertEqual(path, expected)
        with self.assertRaisesRegex(ValueError, "missing terminal palette"):
            renderer.palette_for(self.root / "plugins/sample/themes/samples.json")

    def test_missing_local_palette_does_not_borrow_from_another_family(self):
        local = self.root / "plugins/sample/palettes/sample.json"
        foreign = self.root / "plugins/other/palettes/sample.json"
        foreign.parent.mkdir(parents=True)
        local.rename(foreign)
        with self.assertRaisesRegex(ValueError, "missing terminal palette"):
            renderer.palette_for(self.root / self.regular)

    def test_check_rejects_invalid_palette_without_capture_or_writes(self):
        path = self.root / "plugins/sample/palettes/sample.json"
        palette = json.loads(path.read_text())
        del palette["vhs"]["foreground"]
        path.write_text(json.dumps(palette))
        before = self.git("diff")
        with self.assertRaisesRegex(ValueError, "incomplete terminal palette"):
            self.generate(self.available, "invalid-check", check=True)
        self.binary.assert_not_called()
        self.assertEqual(self.rendered, [])
        self.assertEqual(self.docker_commands, [])
        self.assertFalse((self.root.parent / "invalid-check").exists())
        self.assertEqual(self.git("diff"), before)
        self.assertEqual(
            self.git("status", "--porcelain").splitlines(),
            [" M plugins/sample/palettes/sample.json"],
        )

    def test_check_does_not_require_cached_images(self):
        self.enroll()
        (self.root / "plugins/sample/renders/sample.png").unlink()
        output = self.generate(self.available, "check-without-image", check=True)
        self.assertFalse(output.exists())
        self.binary.assert_not_called()
        self.assertEqual(self.rendered, [])
        self.assertEqual(self.docker_commands, [])

    def test_plan_missing_image_reports_only_that_capture_as_json(self):
        self.enroll()
        (self.root / "plugins/sample/renders/sample.png").unlink()
        status, stdout, stderr = self.plan(changed="true", base=self.base)
        expected = {"capture": [self.regular], "reuse": [self.ansi]}
        self.assertEqual(status, 0)
        self.assertEqual(stdout, json.dumps(expected) + "\n")
        self.assertEqual(stderr, "")
        selected = select_themes(
            self.available, changed_paths(self.root, self.base), self.available
        )
        output = self.generate(selected, "after-plan")
        self.assert_bundle(output, self.available)
        self.assertEqual(self.rendered, expected["capture"])

    def test_plan_reuses_all_matching_cached_images(self):
        self.enroll()
        status, stdout, stderr = self.plan(family="sample")
        self.assertEqual(status, 0)
        self.assertEqual(
            json.loads(stdout), {"capture": [], "reuse": sorted(self.available)}
        )
        self.assertEqual(stderr, "")

    def test_plan_ignores_deleted_unmanaged_image(self):
        image = self.manual_image()
        self.commit("Add historical preview")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.git("rm", str(image))
        self.commit("Remove historical preview")

        status, stdout, stderr = self.plan(changed="true", base=self.base)

        self.assertEqual(status, 0)
        self.assertEqual(json.loads(stdout), {"capture": [], "reuse": []})
        self.assertEqual(stderr, "")

    def test_plan_omits_deleted_themes_from_reuse(self):
        self.enroll()
        (self.root / self.regular).unlink()
        status, stdout, stderr = self.plan(changed="true", base=self.base)
        self.assertEqual(status, 0)
        self.assertEqual(json.loads(stdout), {"capture": [], "reuse": [self.ansi]})
        self.assertEqual(stderr, "")

    def test_plan_rejects_invalid_inputs_without_side_effects(self):
        for name, key, value, message in (
            (self.regular, "base", "invalid", "is not one of"),
            (
                "plugins/sample/palettes/sample.json",
                "vhs",
                {},
                "incomplete terminal palette",
            ),
        ):
            with self.subTest(name=name):
                path = self.root / name
                original = path.read_bytes()
                document = json.loads(original)
                document[key] = value
                path.write_text(json.dumps(document))
                try:
                    status, stdout, stderr = self.plan(family="sample")
                    self.assertEqual(status, 1)
                    self.assertEqual(stdout, "")
                    self.assertIn(message, stderr)
                finally:
                    path.write_bytes(original)

    def test_plan_rejects_unselected_image_or_theme_changes(self):
        self.enroll()
        for name in (self.regular, "plugins/sample/renders/sample.png"):
            with self.subTest(name=name):
                path = self.root / name
                original = path.read_bytes()
                path.write_bytes(original + b"\n")
                try:
                    with self.assertRaisesRegex(
                        ValueError, "unselected preview changed"
                    ):
                        renderer.plan_captures(set(), renderer.cached_entries())
                finally:
                    path.write_bytes(original)
        self.binary.assert_not_called()
        self.assertEqual(self.rendered, [])
        self.assertEqual(self.docker_commands, [])

    def test_plan_does_not_reuse_an_incorrect_cached_theme_digest(self):
        self.enroll()
        cache = renderer.cached_entries()
        cache[self.regular]["theme_sha256"] = "0" * 64
        pending, reused = renderer.plan_captures(self.available, cache)
        self.assertEqual([item["theme"] for item in pending], [self.regular])
        self.assertEqual([entry["theme"] for entry in reused], [self.ansi])
        self.binary.assert_not_called()
        self.assertEqual(self.rendered, [])
        self.assertEqual(self.docker_commands, [])

    def test_runtime_change_invalidates_cached_captures(self):
        self.enroll()
        before = renderer.cached_entries()
        path = self.root / "previews/runtime.json"
        runtime = json.loads(path.read_text())
        runtime["vhs_image"] = "ghcr.io/charmbracelet/vhs@sha256:" + "0" * 64
        path.write_text(json.dumps(runtime))
        selected = select_themes(
            self.available, changed_paths(self.root, self.base), set(before)
        )
        self.assertEqual(selected, self.available)
        output = self.generate(selected, "runtime-change")
        entries = self.assert_bundle(output, self.available)
        self.assertEqual(set(self.rendered), self.available)
        for name, entry in entries.items():
            self.assertNotEqual(entry["input_sha256"], before[name]["input_sha256"])
            self.assertEqual(entry["theme_sha256"], before[name]["theme_sha256"])

    def test_renderer_and_font_changes_invalidate_managed_captures(self):
        self.enroll()
        for name in (
            ".mise/tasks/previews/render.py",
            "assets/fonts/GeistMono-Regular.otf",
        ):
            with self.subTest(name=name):
                path = self.root / name
                original = path.read_bytes()
                path.write_bytes(original + b"\n")
                try:
                    status, stdout, stderr = self.plan(changed="true", base=self.base)
                    self.assertEqual(status, 0)
                    self.assertEqual(
                        json.loads(stdout),
                        {"capture": sorted(self.available), "reuse": []},
                    )
                    self.assertEqual(stderr, "")
                finally:
                    path.write_bytes(original)

    def test_palette_change_captures_only_matching_family(self):
        shutil.copytree(self.root / "plugins/sample", self.root / "plugins/other")
        other = {
            name.replace("plugins/sample/", "plugins/other/") for name in self.available
        }
        self.available |= other
        self.enroll()
        before = renderer.cached_entries()
        path = self.root / "plugins/sample/palettes/sample.json"
        palette = json.loads(path.read_text())
        palette["vhs"]["background"] = "#123456"
        path.write_text(json.dumps(palette))

        output = self.generate_changed("palette-change")

        entries = self.assert_bundle(output, self.available)
        self.assertEqual(set(self.rendered), {self.regular, self.ansi})
        for name in other:
            self.assertEqual(entries[name], before[name])

    def test_deleted_palette_fails_plan_without_borrowing_from_another_family(self):
        self.enroll()
        path = self.root / "plugins/sample/palettes/sample.json"
        foreign = self.root / "plugins/other/palettes/sample.json"
        foreign.parent.mkdir(parents=True)
        path.rename(foreign)

        status, stdout, stderr = self.plan(changed="true", base=self.base)

        self.assertEqual(status, 1)
        self.assertEqual(stdout, "")
        self.assertIn("missing terminal palette", stderr)

    def test_capture_reuses_prepared_image(self):
        output = self.generate(self.available, "prepared")
        self.assert_bundle(output, self.available)
        self.assertEqual(set(self.rendered), self.available)
        self.assertEqual(
            self.docker_commands, [["docker", "image", "inspect", renderer.IMAGE]]
        )

    def test_capture_pulls_missing_image(self):
        self.image_available = False
        output = self.generate(self.available, "missing-image")
        self.assert_bundle(output, self.available)
        self.assertEqual(set(self.rendered), self.available)
        self.assertIn(["docker", "pull", renderer.IMAGE], self.docker_commands)

    def test_failed_image_pull_stops_before_capture(self):
        self.image_available = False
        self.pull_returncode = 1
        with self.assertRaises(subprocess.CalledProcessError) as error:
            self.generate(self.available, "failed-pull")
        self.assertEqual(error.exception.cmd, ["docker", "pull", renderer.IMAGE])
        self.assertEqual(self.rendered, [])
        self.assertFalse((self.root / "previews/manifest.json").exists())
        self.assertFalse((self.root.parent / "failed-pull/manifest.json").exists())

    def test_capture_cleanup_uses_container_id_outside_writable_mount(self):
        commands = []

        def docker(command, **_kwargs):
            commands.append(command)
            if command[:2] == ["docker", "run"]:
                identifier = Path(command[command.index("--cidfile") + 1])
                mount = command[command.index("--mount") + 1]
                directory = Path(
                    mount.removeprefix("type=bind,src=").removesuffix(",dst=/vhs")
                )
                self.assertFalse(identifier.is_relative_to(directory))
                identifier.write_text("capture-container\n")
                (directory / "container.id").write_text("unrelated-container\n")
                return subprocess.CompletedProcess(
                    command, 1, stderr=b"fixture capture failed"
                )
            return subprocess.CompletedProcess(command, 0)

        with (
            patch.object(subprocess, "run", side_effect=docker),
            self.assertRaisesRegex(
                ValueError, "capture failed: fixture capture failed"
            ),
        ):
            renderer.capture_screens(
                renderer.inputs(self.regular), self.root / "claude"
            )
        self.assertEqual(
            commands[1:], [["docker", "rm", "--force", "capture-container"]]
        )

    def test_gallery_only_change_reuses_images_and_generates_document(self):
        self.enroll()
        document = self.root / "plugins/sample/PREVIEWS.md"
        expected = document.read_text()
        document.write_text(expected.replace("[!TIP]", "[!NOTE]"))
        before = {
            name: (self.root / item["image"]).read_bytes()
            for name, item in renderer.cached_entries().items()
        }
        selected = select_themes(
            self.available,
            {".mise/tasks/previews/preview_gallery.py"},
            self.available,
        )
        output = self.generate(selected, "gallery")
        entries = self.assert_bundle(output, self.available)
        self.binary.assert_not_called()
        self.assertEqual(self.rendered, [])
        self.assertEqual(self.docker_commands, [])
        self.assertEqual((output / "plugins/sample/PREVIEWS.md").read_text(), expected)
        self.assertEqual(document.read_text(), expected.replace("[!TIP]", "[!NOTE]"))
        for name, item in entries.items():
            self.assertEqual((output / item["image"]).read_bytes(), before[name])

    def test_missing_image_captures_only_that_image(self):
        self.enroll()
        (self.root / "plugins/sample/renders/sample.png").unlink()
        output = self.generate_changed("missing")
        self.assert_bundle(output, self.available)
        self.assertEqual(self.rendered, [self.regular])

    def test_modified_managed_image_captures_only_that_image(self):
        self.enroll()
        (self.root / "plugins/sample/renders/sample.png").write_bytes(b"Changed image")
        output = self.generate_changed("changed-image")
        self.assert_bundle(output, self.available)
        self.assertEqual(self.rendered, [self.regular])

    def test_deleted_unmanaged_image_does_not_enroll_or_capture(self):
        image = self.manual_image()
        self.commit("Add historical preview")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.git("rm", str(image))
        self.commit("Remove historical preview")

        output = self.generate_changed("deleted-manual-image")

        self.assert_bundle(output, set())
        self.binary.assert_not_called()
        self.assertEqual(self.rendered, [])
        self.assertEqual(self.docker_commands, [])

    def test_unmanaged_image_moved_outside_gallery_does_not_enroll(self):
        image = self.manual_image()
        self.commit("Add historical preview")
        self.base = self.git("rev-parse", "HEAD").strip()
        self.git("mv", str(image), str(self.root / "old-preview.png"))

        output = self.generate_changed("moved-manual-image")

        self.assert_bundle(output, set())
        self.binary.assert_not_called()
        self.assertEqual(self.rendered, [])
        self.assertEqual(self.docker_commands, [])

    def test_added_unmanaged_image_enrolls_its_gallery_pair(self):
        self.manual_image()

        output = self.generate_changed("added-manual-image")

        self.assert_bundle(output, self.available)
        self.assertEqual(set(self.rendered), self.available)

    def test_edited_unmanaged_image_enrolls_its_gallery_pair(self):
        image = self.manual_image()
        self.commit("Add historical preview")
        self.base = self.git("rev-parse", "HEAD").strip()
        image.write_bytes(b"Updated historical preview")

        output = self.generate_changed("edited-manual-image")

        self.assert_bundle(output, self.available)
        self.assertEqual(set(self.rendered), self.available)

    def test_theme_change_captures_only_changed_input(self):
        self.enroll()
        path = self.root / self.regular
        theme = json.loads(path.read_text())
        theme["overrides"]["text"] = "#ffffff"
        path.write_text(json.dumps(theme))
        selected = select_themes(
            self.available,
            changed_paths(self.root, self.base),
            self.available,
        )
        output = self.generate(selected, "edited")
        self.assert_bundle(output, self.available)
        self.assertEqual(self.rendered, [self.regular])

    def test_identical_inputs_reuse_cached_bundle(self):
        self.enroll()
        output = self.generate(self.available, "repeat")
        self.assert_bundle(output, self.available)
        self.binary.assert_not_called()
        self.assertEqual(self.rendered, [])
        self.assertEqual(self.docker_commands, [])
        self.assertEqual(
            (output / "manifest.json").read_bytes(),
            (self.root / "previews/manifest.json").read_bytes(),
        )
        self.assertEqual(
            (output / "plugins/sample/PREVIEWS.md").read_bytes(),
            (self.root / "plugins/sample/PREVIEWS.md").read_bytes(),
        )

    def test_explicit_generation_does_not_require_git(self):
        shutil.rmtree(self.root / ".git")
        output = self.generate(self.available, "without-git")
        self.assert_bundle(output, self.available)
        self.assertEqual(set(self.rendered), self.available)


if __name__ == "__main__":
    unittest.main()
