import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { updatePreviews } from "../update.mjs";

test("the real renderer and updater agree on palettes, fingerprints, metadata and galleries", (t) => {
  const temporary = mkdtempSync(join(tmpdir(), "preview-contract-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, "repository");
  const directory = join(temporary, "bundle");
  const repository = fileURLToPath(new URL("../../../../", import.meta.url));
  for (const name of [
    ".mise/tasks/previews/render.py", ".mise/tasks/previews/preview_selection.py", ".mise/tasks/previews/preview_gallery.py",
    "schemas/theme.schema.json", "previews/runtime.json", "assets/fonts/GeistMono-Regular.otf",
  ]) {
    const destination = join(root, name);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(repository, name), destination);
  }
  const renderer = readFileSync(join(root, ".mise/tasks/previews/render.py"), "utf8");
  const metadata = renderer.match(/^# \/\/\/ script\n(?:#.*\n)+?# \/\/\/$/m);
  assert.ok(metadata, "The fixture must use the renderer's PEP 723 dependencies.");
  const fixture = join(temporary, "render_fixture.py");
  writeFileSync(fixture, `${metadata[0]}\n${readFileSync(new URL("./render_fixture.py", import.meta.url), "utf8")}`);
  execFileSync("uv", [
    "run", "--no-config", "--no-project", "--no-env-file", "--python", "3.14", "--no-python-downloads",
    "--script", fixture, root, directory,
  ], {
    cwd: temporary,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      UV_PYTHON_INSTALL_DIR: process.env.UV_PYTHON_INSTALL_DIR,
      UV_CACHE_DIR: join(temporary, "uv-cache"),
      XDG_CONFIG_HOME: join(temporary, "config"),
    },
    stdio: "pipe",
    timeout: 120_000,
  });
  const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
  assert.equal(manifest.themes.length, 3);
  assert.deepEqual(manifest.themes.map((entry) => entry.syntax_theme).sort(), ["GitHub", "Monokai Extended", "ansi"]);
  for (const entry of manifest.themes) {
    const palette = entry.theme.includes("sample-light") ? "sample-light" : "sample-dark";
    assert.equal(entry.source.url, `https://example.com/${palette}`);
  }
  const expected = { changed: true, png: { updated: 3, unchanged: 0, removed: 0 } };
  assert.deepEqual(updatePreviews({ root, directory, checkOnly: true }), expected);
  assert.deepEqual(updatePreviews({ root, directory }), expected);
  assert.deepEqual(readFileSync(join(root, "previews/manifest.json")), readFileSync(join(directory, "manifest.json")));
  assert.deepEqual(readFileSync(join(root, "plugins/sample/PREVIEWS.md")), readFileSync(join(directory, "plugins/sample/PREVIEWS.md")));
  for (const entry of manifest.themes) {
    assert.deepEqual(readFileSync(join(root, entry.image)), readFileSync(join(directory, entry.image)));
  }
  assert.deepEqual(updatePreviews({ root, directory }), {
    changed: false, png: { updated: 0, unchanged: 3, removed: 0 },
  });
});
