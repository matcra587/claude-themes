import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { digest, fixture, rejectedWithoutWrites, snapshot, write } from "./fixtures.mjs";

test("an empty initial bundle leaves the repository untouched", (t) => {
  const f = fixture(t);
  f.manifest([]);
  const before = snapshot(f.root);
  const expected = { changed: false, png: { updated: 0, unchanged: 0, removed: 0 } };
  assert.deepEqual(f.run({ checkOnly: true }), expected);
  assert.deepEqual(f.run(), expected);
  assert.deepEqual(snapshot(f.root), before);
  assert.equal(existsSync(join(f.root, "previews/manifest.json")), false);
});

test("onboarding a Regular/ANSI pair preserves manual previews and other families", (t) => {
  const f = fixture(t);
  const intro = "# Existing previews\n\nA useful introduction.\n\n";
  const manual = "## Manual\n\n![Manual](renders/manual.png)\n";
  write(f.root, "plugins/sample/PREVIEWS.md", intro + manual);
  write(f.root, "plugins/sample/renders/manual.png", "manual image");
  write(f.root, "plugins/unrelated/PREVIEWS.md", "Unrelated gallery\n");
  write(f.root, "plugins/unrelated/renders/other.png", "other image");
  write(f.root, "README.md", "Unrelated documentation\n");
  write(f.root, "previews/source-commit.txt", "existing publication checkpoint\n");
  const unrelated = snapshot(join(f.root, "plugins/unrelated"));
  const entries = [f.entry(), f.entry("sample-ansi")];
  f.bundleFor(entries);

  assert.deepEqual(f.run(), { changed: true, png: { updated: 2, unchanged: 0, removed: 0 } });
  const document = readFileSync(join(f.root, "plugins/sample/PREVIEWS.md"), "utf8");
  assert.ok(document.startsWith(intro));
  assert.ok(document.includes(manual.trim()));
  for (const entry of entries) {
    assert.ok(document.includes(`renders/${entry.image.split("/").at(-1)}`));
    assert.deepEqual(readFileSync(join(f.root, entry.image)), readFileSync(join(f.bundle, entry.image)));
  }
  assert.equal(readFileSync(join(f.root, "plugins/sample/renders/manual.png"), "utf8"), "manual image");
  assert.deepEqual(snapshot(join(f.root, "plugins/unrelated")), unrelated);
  assert.equal(readFileSync(join(f.root, "README.md"), "utf8"), "Unrelated documentation\n");
  assert.equal(readFileSync(join(f.root, "previews/source-commit.txt"), "utf8"), "existing publication checkpoint\n");
  assert.deepEqual(readFileSync(join(f.root, "previews/manifest.json")), readFileSync(join(f.bundle, "manifest.json")));
  const before = snapshot(f.root);
  const unchanged = { changed: false, png: { updated: 0, unchanged: 2, removed: 0 } };
  assert.deepEqual(f.run(), unchanged);
  assert.deepEqual(f.run({ checkOnly: true }), unchanged);
  assert.deepEqual(snapshot(f.root), before);
});

test("a regenerated fingerprint with identical PNG bytes counts as unchanged", (t) => {
  const f = fixture(t);
  f.bundleFor([f.entry()]);
  assert.equal(f.run().changed, true);
  const updated = f.entry("sample", { base: "light" });
  f.bundleFor([updated]);
  const before = snapshot(f.root);
  const expected = { changed: true, png: { updated: 0, unchanged: 1, removed: 0 } };
  assert.deepEqual(f.run({ checkOnly: true }), expected);
  assert.deepEqual(snapshot(f.root), before);
  assert.deepEqual(f.run(), expected);
  assert.equal(JSON.parse(readFileSync(join(f.root, "previews/manifest.json"))).themes[0].syntax_theme, "GitHub");
});

test("PNG counts distinguish changed bytes from unchanged bundle images", (t) => {
  const f = fixture(t);
  const entries = [f.entry("first"), f.entry("second"), f.entry("third")];
  f.bundleFor(entries);
  f.run();
  const image = Buffer.from("new PNG bytes for second");
  write(f.bundle, entries[1].image, image);
  entries[1].image_sha256 = digest(image);
  f.bundleFor(entries);
  const before = snapshot(f.root);
  const expected = { changed: true, png: { updated: 1, unchanged: 2, removed: 0 } };
  assert.deepEqual(f.run({ checkOnly: true }), expected);
  assert.deepEqual(snapshot(f.root), before);
  assert.deepEqual(f.run(), expected);
  assert.deepEqual(readFileSync(join(f.root, entries[1].image)), image);
  assert.deepEqual(f.run(), { changed: false, png: { updated: 0, unchanged: 3, removed: 0 } });
});

test("one bundle can remove a family and update another with the same theme filename", (t) => {
  const f = fixture(t);
  const removed = f.entry("shared", { family: "first" });
  const kept = f.entry("shared", { family: "second" });
  f.bundleFor([removed, kept]);
  f.run();

  rmSync(join(f.root, removed.theme));
  rmSync(join(f.bundle, "plugins/first"), { recursive: true });
  const updated = f.entry("shared", { family: "second", base: "light" });
  f.bundleFor([updated]);
  const before = snapshot(f.root);
  const expected = { changed: true, png: { updated: 0, unchanged: 1, removed: 1 } };
  assert.deepEqual(f.run({ checkOnly: true }), expected);
  assert.deepEqual(snapshot(f.root), before);
  assert.deepEqual(f.run(), expected);
  assert.equal(existsSync(join(f.root, removed.image)), false);
  assert.equal(existsSync(join(f.root, "plugins/first/PREVIEWS.md")), false);
  assert.deepEqual(readFileSync(join(f.root, kept.image)), readFileSync(join(f.bundle, kept.image)));
  assert.equal(readFileSync(join(f.root, "plugins/second/PREVIEWS.md"), "utf8"),
    readFileSync(join(f.bundle, "plugins/second/PREVIEWS.md"), "utf8"));
  assert.deepEqual(JSON.parse(readFileSync(join(f.root, "previews/manifest.json"))).themes, [updated]);
  assert.equal(f.run().changed, false);
});

test("an existing managed theme cannot be omitted from a later bundle", (t) => {
  const f = fixture(t);
  const entry = f.entry();
  f.manifest([entry], join(f.root, "previews"));
  rmSync(join(f.bundle, "plugins"), { recursive: true });
  f.manifest([]);
  rejectedWithoutWrites(f, /omits|missing|managed/i);
});

test("deleting a managed theme preserves manual images, introduction and prose", (t) => {
  const f = fixture(t);
  const entry = f.entry();
  f.bundleFor([entry]);
  f.run();
  const intro = "# Custom previews\n\nKeep this introduction.\n\n";
  const notes = "## Notes\n\nKeep these contributor notes.\n\n";
  const manual = "## Manual\n\n![Manual](renders/manual.png)\n";
  write(f.root, "plugins/sample/PREVIEWS.md", `${intro}${notes}## sample\n\n![sample](renders/sample.png)\n\n${manual}`);
  write(f.root, "plugins/sample/renders/manual.png", "manual image");
  rmSync(join(f.root, entry.theme));
  rmSync(join(f.bundle, "plugins"), { recursive: true });
  f.manifest([]);
  const before = snapshot(f.root);
  const expected = { changed: true, png: { updated: 0, unchanged: 0, removed: 1 } };
  assert.deepEqual(f.run({ checkOnly: true }), expected);
  assert.deepEqual(snapshot(f.root), before);
  assert.deepEqual(f.run(), expected);
  assert.equal(existsSync(join(f.root, entry.image)), false);
  const document = readFileSync(join(f.root, "plugins/sample/PREVIEWS.md"), "utf8");
  assert.ok(document.startsWith(intro));
  assert.ok(document.includes(notes.trim()));
  assert.ok(document.includes(manual.trim()));
  assert.ok(!document.includes("renders/sample.png"));
  assert.equal(readFileSync(join(f.root, "plugins/sample/renders/manual.png"), "utf8"), "manual image");
});

test("deleting the last managed preview removes only its generated gallery and images", (t) => {
  const f = fixture(t);
  const entry = f.entry();
  f.bundleFor([entry]);
  f.run();
  rmSync(join(f.root, entry.theme));
  rmSync(join(f.bundle, "plugins"), { recursive: true });
  f.manifest([]);
  assert.equal(f.run().changed, true);
  assert.equal(existsSync(join(f.root, "plugins/sample/PREVIEWS.md")), false);
  assert.equal(existsSync(join(f.root, "plugins/sample/renders")), false);
  assert.deepEqual(JSON.parse(readFileSync(join(f.root, "previews/manifest.json"))), { format: 1, themes: [] });
  assert.equal(f.run().changed, false);
});

test("a custom introduction survives removal of its last managed section", (t) => {
  const f = fixture(t);
  const entry = f.entry();
  f.bundleFor([entry]);
  f.run();
  write(f.root, "plugins/sample/PREVIEWS.md", "# Custom previews\n\nKeep this explanation.\n\n## sample\n\n![sample](renders/sample.png)\n");
  rmSync(join(f.root, entry.theme));
  rmSync(join(f.bundle, "plugins"), { recursive: true });
  f.manifest([]);
  assert.equal(f.run().changed, true);
  assert.equal(readFileSync(join(f.root, "plugins/sample/PREVIEWS.md"), "utf8"), "# Custom previews\n\nKeep this explanation.\n");
});

for (const [kind, reference] of [
  ["reference-style image", "![Managed][preview]\n\n[preview]: renders/sample.png"],
  ["titled image", '![Managed](renders/sample.png "Preview")'],
  ["escaped image label", "![Managed\\] image](renders/sample.png)"],
  ["HTML image", '<img src="renders/sample.png" alt="Managed">'],
  ["ordinary link", "[Open preview](renders/sample.png)"],
]) {
  test(`a retained ${kind} prevents deleting its managed image`, (t) => {
    const f = fixture(t);
    const entry = f.entry();
    f.bundleFor([entry]);
    f.run();
    write(f.root, "plugins/sample/PREVIEWS.md", `# Custom previews\n\n## Manual notes\n\n${reference}\n`);
    rmSync(join(f.root, entry.theme));
    rmSync(join(f.bundle, "plugins"), { recursive: true });
    f.manifest([]);
    rejectedWithoutWrites(f, /gallery.*removed preview/i, { checkOnly: true });
    rejectedWithoutWrites(f, /gallery.*removed preview/i);
  });
}

for (const [kind, manual] of [
  ["local", "![Manual](renders/manual.png)"],
  ["remote", "![Manual](https://example.com/manual.png)"],
  ["reference-style", "![Manual][manual]\n\n[manual]: renders/manual.png"],
  ["HTML", '<img src="renders/manual.png" alt="Manual">'],
]) {
  test(`a managed section containing a ${kind} manual image cannot disappear`, (t) => {
    const f = fixture(t);
    f.bundleFor([f.entry()]);
    write(f.root, "plugins/sample/PREVIEWS.md", `# Previews\n\n## Mixed\n\n![sample](renders/sample.png) ${manual}\n`);
    write(f.root, "plugins/sample/renders/manual.png", "manual image");
    rejectedWithoutWrites(f, /mixed|manual|unmanaged/i);
  });
}

for (const problem of ["missing image", "outdated image", "outdated gallery"]) {
  test(`check-only detects ${problem} without changing files`, (t) => {
    const f = fixture(t);
    const entry = f.entry();
    f.bundleFor([entry]);
    f.run();
    if (problem === "missing image") rmSync(join(f.root, entry.image));
    else if (problem === "outdated image") write(f.root, entry.image, "outdated image");
    else write(f.root, "plugins/sample/PREVIEWS.md", "# sample theme previews\n\n## sample\n\n![Old](renders/sample.png)\n");
    const before = snapshot(f.root);
    const updated = problem === "outdated gallery" ? 0 : 1;
    assert.deepEqual(f.run({ checkOnly: true }), {
      changed: true, png: { updated, unchanged: 1 - updated, removed: 0 },
    });
    assert.deepEqual(snapshot(f.root), before);
  });
}

for (const input of ["image", "theme"]) {
  test(`a bad final ${input} hash fails before any earlier preview is updated`, (t) => {
    const f = fixture(t);
    const first = f.entry("first");
    const last = f.entry("last");
    f.bundleFor([first, last]);
    write(f.root, first.image, "existing first image");
    write(input === "image" ? f.bundle : f.root, last[input], "changed after generation");
    rejectedWithoutWrites(f, /hash|fingerprint|JSON/i);
    rejectedWithoutWrites(f, /hash|fingerprint|JSON/i, { checkOnly: true });
  });
}

for (const file of ["plugins/sample/palettes/sample.json", "assets/fonts/GeistMono-Regular.otf", ".mise/tasks/previews/render.py", "previews/runtime.json", "schemas/theme.schema.json"]) {
  test(`changed ${file} invalidates a previously generated bundle`, (t) => {
    const f = fixture(t);
    f.bundleFor([f.entry()]);
    write(f.root, file, readFileSync(join(f.root, file), "utf8") + "\n");
    rejectedWithoutWrites(f, /fingerprint|input|hash/i);
  });
}

test("palette fingerprint uses the longest family-local prefix at a hyphen boundary", (t) => {
  const f = fixture(t);
  const entry = f.entry("sample-dark-soft-ansi", { palette: "sample-dark" });
  write(f.root, "plugins/sample/palettes/sample.json", "shorter palette");
  write(f.root, "plugins/sample/palettes/sample-dark-so.json", "not a prefix boundary");
  write(f.root, "plugins/other/palettes/sample-dark-soft.json", "other family palette");
  f.bundleFor([entry]);
  assert.equal(f.run().changed, true);
});

for (const field of ["name", "source", "claude_code", "syntax_theme"]) {
  test(`forged ${field} metadata fails before writes`, (t) => {
    const f = fixture(t);
    const entry = f.entry();
    entry[field] = field === "source" ? { url: "https://example.com/wrong" } : "forged";
    f.bundleFor([entry]);
    rejectedWithoutWrites(f, /metadata|name|source|runtime|version|syntax/i);
  });
}

for (const problem of ["extra image", "missing image", "extra file", "missing gallery"]) {
  test(`${problem} rejects an incomplete or unexpected bundle`, (t) => {
    const f = fixture(t);
    const entry = f.entry();
    f.bundleFor([entry]);
    if (problem === "extra image") write(f.bundle, "plugins/sample/renders/extra.png", "extra");
    if (problem === "extra file") write(f.bundle, "unexpected.txt", "extra");
    if (problem === "missing image") rmSync(join(f.bundle, entry.image));
    if (problem === "missing gallery") rmSync(join(f.bundle, "plugins/sample/PREVIEWS.md"));
    rejectedWithoutWrites(f, /bundle|file|image|gallery/i);
  });
}

for (const problem of ["missing reference", "extra reference"]) {
  test(`a gallery with ${problem === "extra reference" ? "an" : "a"} ${problem} is rejected before writes`, (t) => {
    const f = fixture(t);
    f.bundleFor([f.entry()]);
    const image = problem === "missing reference" ? "" : "![sample](renders/sample.png) ![extra](renders/extra.png)";
    write(f.bundle, "plugins/sample/PREVIEWS.md", `# Previews\n\n## sample\n\n${image}\n`);
    rejectedWithoutWrites(f, /gallery|document|image|reference/i);
  });
}

for (const destination of ["bundle", "previous"]) {
  for (const problem of ["format", "themes", "duplicate", "theme path", "trailing newline", "image path", "digest"]) {
    test(`${destination} manifest rejects invalid ${problem}`, (t) => {
      const f = fixture(t);
      const entry = f.entry();
      f.bundleFor([entry]);
      const manifest = { format: 1, themes: [entry] };
      if (problem === "format") manifest.format = 2;
      if (problem === "themes") manifest.themes = {};
      if (problem === "duplicate") manifest.themes.push(entry);
      if (problem === "theme path") entry.theme = "../../outside.json";
      if (problem === "trailing newline") entry.theme += "\n";
      if (problem === "image path") entry.image = "plugins/other/renders/sample.png";
      if (problem === "digest") entry.input_sha256 = "not a digest";
      write(destination === "bundle" ? f.bundle : join(f.root, "previews"), "manifest.json", JSON.stringify(manifest));
      rejectedWithoutWrites(f, /manifest|format|theme|path|image|digest|hash/i);
    });
  }
}

for (const path of ["", "plugins", "plugins/nested", "previews", "previews/nested"]) {
  test(`bundle input cannot overlap ${path || "the repository root"}`, (t) => {
    const f = fixture(t);
    const directory = join(f.root, path);
    f.manifest([], directory);
    rejectedWithoutWrites(f, /outside|overlap|destination/i, { directory });
  });
}

for (const [location, name] of [
  ["bundle", "manifest.json"],
  ["bundle", "plugins/sample/renders/sample.png"],
  ["bundle", "plugins/sample/PREVIEWS.md"],
  ["bundle", "plugins/sample"],
  ["root", "plugins/sample/themes/sample.json"],
  ["root", "plugins/sample/palettes/sample.json"],
  ["root", "plugins/sample"],
  ["root", "assets/fonts/GeistMono-Regular.otf"],
  ["root", "previews/manifest.json"],
  ["root", "plugins/sample/renders/sample.png"],
  ["root", "plugins/sample/PREVIEWS.md"],
]) {
  test(`${location} symlink at ${name} is rejected before writes`, (t) => {
    const f = fixture(t);
    f.bundleFor([f.entry()]);
    f.run();
    const target = join(f[location], name);
    const outside = join(f.temporary, "outside");
    renameSync(target, outside);
    symlinkSync(outside, target);
    rejectedWithoutWrites(f, /symlink|symbolic/i);
  });
}

test("a dangling destination symlink is rejected before writes", (t) => {
  const f = fixture(t);
  const entry = f.entry();
  f.bundleFor([entry]);
  mkdirSync(join(f.root, "plugins/sample/renders"));
  symlinkSync(join(f.temporary, "missing"), join(f.root, entry.image));
  rejectedWithoutWrites(f, /symlink|symbolic/i);
});

test("obsolete image symlinks are rejected instead of removed", (t) => {
  const f = fixture(t);
  const entry = f.entry();
  f.bundleFor([entry]);
  f.run();
  rmSync(join(f.root, entry.theme));
  rmSync(join(f.root, entry.image));
  const outside = write(f.temporary, "outside.png", "outside image");
  symlinkSync(outside, join(f.root, entry.image));
  rmSync(join(f.bundle, "plugins"), { recursive: true });
  f.manifest([]);
  rejectedWithoutWrites(f, /symlink|symbolic/i);
});
