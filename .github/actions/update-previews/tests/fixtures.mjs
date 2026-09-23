import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { updatePreviews } from "../update.mjs";

export const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function write(root, name, content) {
  const file = join(root, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

export function snapshot(root) {
  const entries = [];
  function walk(directory) {
    for (const name of readdirSync(directory).sort()) {
      const file = join(directory, name);
      const stat = lstatSync(file);
      const content = stat.isSymbolicLink() ? { link: readlinkSync(file) }
        : stat.isDirectory() ? null : readFileSync(file).toString("base64");
      entries.push([relative(root, file), content]);
      if (stat.isDirectory()) walk(file);
    }
  }
  walk(root);
  return entries;
}

export function rejectedWithoutWrites(f, pattern = /./, options = {}) {
  const before = snapshot(f.temporary);
  assert.throws(() => f.run(options), pattern);
  assert.deepEqual(snapshot(f.temporary), before, "Invalid bundles must not change any files.");
}

export function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), "update-previews-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, "repository");
  const bundle = join(temporary, "bundle");
  mkdirSync(root);
  mkdirSync(bundle);
  write(root, "assets/fonts/GeistMono-Regular.otf", "fixture font");
  write(root, ".mise/tasks/previews/render.py", "fixture renderer\n");
  write(root, "schemas/theme.schema.json", "{}\n");
  write(root, "previews/runtime.json", JSON.stringify({ claude_version: "2.1.278" }));

  function entry(slug = "sample", { family = "sample", base, palette = slug.replace(/-ansi$/, "") } = {}) {
    const theme = `plugins/${family}/themes/${slug}.json`;
    const image = `plugins/${family}/renders/${slug}.png`;
    const palettePath = `plugins/${family}/palettes/${palette}.json`;
    const name = slug.endsWith("-ansi") ? `${slug.slice(0, -5)} (ANSI)` : slug;
    const themeBytes = JSON.stringify({ name, base: base ?? (slug.endsWith("-ansi") ? "dark-ansi" : "dark") });
    const source = { url: "https://example.com/palette", sha256: digest("upstream palette") };
    write(root, theme, themeBytes);
    write(root, palettePath, JSON.stringify({ source, vhs: {} }));
    const imageBytes = Buffer.from(`verified image ${family}/${slug}`);
    write(bundle, image, imageBytes);
    const files = [theme, palettePath, "assets/fonts/GeistMono-Regular.otf", ".mise/tasks/previews/render.py", "previews/runtime.json", "schemas/theme.schema.json"];
    const selectedBase = JSON.parse(themeBytes).base;
    return {
      theme, image, name, source,
      theme_sha256: digest(themeBytes),
      image_sha256: digest(imageBytes),
      input_sha256: digest(files.map((file) => digest(readFileSync(join(root, file)))).join("\n")),
      claude_code: "2.1.278",
      syntax_theme: selectedBase.endsWith("-ansi") ? "ansi" : selectedBase.startsWith("light") ? "GitHub" : "Monokai Extended",
    };
  }

  function manifest(entries, destination = bundle) {
    write(destination, "manifest.json", JSON.stringify({ format: 1, themes: entries }));
  }

  function gallery(entries, destination = bundle) {
    for (const family of new Set(entries.map((item) => item.theme.split("/")[1]))) {
      const familyEntries = entries.filter((item) => item.theme.split("/")[1] === family);
      const slugs = new Set(familyEntries.map((item) => basename(item.theme, ".json").replace(/-ansi$/, "")));
      const sections = [...slugs].map((slug) => {
        const images = [slug, `${slug}-ansi`].map((variant) => {
          const item = familyEntries.find((item) => basename(item.theme, ".json") === variant);
          return item ? `[![${item.name}](renders/${variant}.png)](renders/${variant}.png)` : "Not supplied";
        });
        return `## ${slug}\n\n| Regular | ANSI |\n| --- | --- |\n| ${images.join(" | ")} |\n`;
      });
      write(destination, `plugins/${family}/PREVIEWS.md`, `# ${family} theme previews\n\n> [!TIP]\n> Open a preview for a larger view. Expand **Capture details** for rendering information and palette sources.\n\n${sections.join("\n")}`);
    }
  }

  function bundleFor(entries) {
    manifest(entries);
    gallery(entries);
  }

  return {
    temporary, root, bundle, entry, manifest, gallery, bundleFor,
    run(options = {}) { return updatePreviews({ root, directory: bundle, ...options }); },
  };
}
