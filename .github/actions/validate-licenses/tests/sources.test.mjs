import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { blob, digest, fixture, license, manifestPath, rejected, revision, source, successful } from "./fixtures.mjs";

test("a nested source is verified against the pinned commit's child tree", async (t) => {
  const f = fixture(t);
  const child = "b".repeat(40);
  f.files.delete("palette.json");
  f.files.set("themes/palette.json", source);
  f.tree[0] = { path: "themes", mode: "040000", type: "tree", sha: child };
  f.trees.set(child, [{ path: "palette.json", mode: "100644", type: "blob", sha: blob(source) }]);
  f.updateManifest((manifest) => { manifest.metadata.upstream[0].path = "themes/palette.json"; });
  f.palette("sample", "sample", f.record({ path: "themes/palette.json" }));
  successful(f, await f.run());
  assert.ok(f.calls.some((call) => call.name === "tree" && call.tree_sha === child));
});

for (const [name, change] of [
  ["metadata", (manifest) => { delete manifest.metadata; }],
  ["upstream records", (manifest) => { manifest.metadata.upstream = []; }],
]) {
  test(`missing ${name} fails with a manifest annotation`, async (t) => {
    const f = fixture(t);
    f.updateManifest(change);
    const result = await f.run();
    rejected(f, result, /metadata|upstream|license/i);
    assert.ok(result.failures.some((failure) => failure.file === manifestPath("sample")));
  });
}

for (const field of ["repository", "revision", "path", "sha256", "licensePath", "licenseSha256"]) {
  test(`missing upstream ${field} fails validation`, async (t) => {
    const f = fixture(t);
    f.updateManifest((manifest) => { delete manifest.metadata.upstream[0][field]; });
    rejected(f, await f.run(), new RegExp(field, "i"));
  });
}

test("an existing family without a manifest fails", async (t) => {
  const f = fixture(t);
  rmSync(join(f.root, manifestPath("sample")));
  rejected(f, await f.run(), /manifest|plugin\.json|ENOENT/i);
});

test("a local manifest symlink is rejected", async (t) => {
  const f = fixture(t);
  const manifest = join(f.root, manifestPath("sample"));
  const outside = join(f.temporary, "plugin.json");
  writeFileSync(outside, readFileSync(manifest));
  rmSync(manifest);
  symlinkSync(outside, manifest);
  rejected(f, await f.run(), /symlink|symbolic/i);
});

test("a failed upstream record does not skip verification of later records", async (t) => {
  const f = fixture(t);
  f.updateManifest((manifest) => {
    manifest.metadata.upstream = [f.record({ license: "GPL-3.0-only" }), f.record()];
  });
  rejected(f, await f.run(), /GPL-3\.0-only|allow|license/i);
  assert.ok(f.calls.some((call) => call.name === "content" && call.path === "palette.json"));
  assert.ok(f.calls.some((call) => call.name === "license"));
});

for (const field of ["sha256", "licenseSha256"]) {
  test(`${field} must match the fetched bytes`, async (t) => {
    const f = fixture(t);
    f.updateManifest((manifest) => { manifest.metadata.upstream[0][field] = "0".repeat(64); });
    const kind = field === "sha256" ? "source" : "license";
    rejected(f, await f.run(), new RegExp(`Upstream ${kind} SHA-256 checksum mismatch`));
  });
}

test("a branch name cannot substitute for the pinned upstream commit", async (t) => {
  const f = fixture(t);
  f.updateManifest((manifest) => { manifest.metadata.upstream[0].revision = "main"; });
  rejected(f, await f.run(), /revision|commit|40/i);
  assert.deepEqual(f.calls, []);
});

for (const [name, field, status] of [["source", "contentError", 404], ["license", "licenseError", 403], ["tree", "treeError", 500]]) {
  test(`${name} API errors fail validation`, async (t) => {
    const f = fixture(t);
    f.api[field] = Object.assign(new Error(`Fixture ${name} request failed (${status})`), { status });
    rejected(f, await f.run(), /request failed|403|404|500/i);
  });
}

for (const [field, value] of [["path", "../palette.json"], ["licensePath", "/LICENSE"], ["notice", "../../outside.txt"]]) {
  test(`${field} rejects an escaping path`, async (t) => {
    const f = fixture(t);
    f.updateManifest((manifest) => { manifest.metadata.upstream[0][field] = value; });
    rejected(f, await f.run(), /path|relative|travers|notice/i);
    assert.deepEqual(f.calls, []);
  });
}

for (const directory of [false, true]) {
  test(`a local notice ${directory ? "directory" : "file"} symlink is rejected`, async (t) => {
    const f = fixture(t);
    const outside = join(f.temporary, "outside");
    mkdirSync(outside);
    writeFileSync(join(outside, "upstream.txt"), license);
    const path = join(f.root, "plugins/sample/LICENSES", ...(directory ? [] : ["upstream.txt"]));
    rmSync(path, { recursive: true });
    symlinkSync(directory ? outside : join(outside, "upstream.txt"), path);
    rejected(f, await f.run(), /symlink|symbolic|notice|outside/i);
  });
}

for (const path of ["palette.json", "LICENSE"]) {
  test(`an upstream ${path} symlink is rejected even when Contents resolves it`, async (t) => {
    const f = fixture(t);
    f.tree.find((entry) => entry.path === path).mode = "120000";
    rejected(f, await f.run(), /symlink|symbolic|regular|mode|file/i);
  });
}

test("an upstream submodule cannot substitute for a source file", async (t) => {
  const f = fixture(t);
  Object.assign(f.tree.find((entry) => entry.path === "palette.json"), { mode: "160000", type: "commit" });
  rejected(f, await f.run(), /submodule|regular|file|mode/i);
});

test("Contents data must match the pinned Git tree blob", async (t) => {
  const f = fixture(t);
  f.api.transformContent = (data) => ({ ...data, sha: "f".repeat(40) });
  rejected(f, await f.run(), /sha|blob|tree|match/i);
});

test("a truncated tree cannot establish upstream file provenance", async (t) => {
  const f = fixture(t);
  f.api.truncated = true;
  rejected(f, await f.run(), /truncat|tree/i);
});

test("a deleted family is skipped", async (t) => {
  const f = fixture(t);
  rmSync(join(f.root, "plugins/sample"), { recursive: true });
  successful(f, await f.run(), []);
  assert.deepEqual(f.calls, []);
});

test("an invalid family name fails even when its directory does not exist", async (t) => {
  const f = fixture(t);
  rejected(f, await f.run(["plugins/Bad_Name/themes/file.json"]), /family|path/i);
  assert.deepEqual(f.calls, []);
});

test("tooling and generated preview changes do not enroll unchanged families", async (t) => {
  const f = fixture(t);
  successful(f, await f.run([
    ".github/actions/validate-licenses/validate.mjs",
    ".github/workflows/validate.yml",
    ".mise/tasks/tasks.toml",
    ".github/actions/validate-licenses/tests/licenses.test.mjs",
    ".github/actions/validate-licenses/tests/sources.test.mjs",
    "assets/palettes/sample.json",
    "plugins/sample/PREVIEWS.md",
    "plugins/sample/renders/sample.png",
  ]), []);
  assert.deepEqual(f.calls, []);
});

test("an unrelated plugin file still selects its existing family", async (t) => {
  const f = fixture(t);
  successful(f, await f.run(["plugins/sample/README.md"]));
});

test("renders documentation selects its family while PNG output skips", async (t) => {
  const f = fixture(t);
  successful(f, await f.run(["plugins/sample/renders/sample.png"]), []);
  assert.deepEqual(f.calls, []);
  successful(f, await f.run(["plugins/sample/renders/README.md"]));
});

test("a palette change selects only its own family, even with shared theme names", async (t) => {
  const f = fixture(t);
  f.addFamily("another", ["sample"]);
  f.updateManifest((manifest) => { delete manifest.metadata; });
  successful(f, await f.run(["plugins/another/palettes/sample.json"]), ["another"]);
});

test("an unused palette change still selects its own family", async (t) => {
  const f = fixture(t);
  f.palette("sample", "unused");
  successful(f, await f.run(["plugins/sample/palettes/unused.json"]));
});

test("local palettes use the longest hyphen prefix, including ANSI variants", async (t) => {
  const f = fixture(t);
  f.addFamily("specific", ["ocean-deep-dark-ansi"], [f.record()], ["ocean", "ocean-deep"]);
  f.palette("specific", "ocean", f.record({ sha256: "0".repeat(64) }));
  successful(f, await f.run(["plugins/specific/palettes/ocean-deep.json"]), ["specific"]);
});

test("a longer prefix in another family cannot shadow a local palette", async (t) => {
  const f = fixture(t);
  f.addFamily("base", ["ocean-deep-dark-ansi"], [f.record()], ["ocean"]);
  f.addFamily("specific", ["ocean-deep-dark-ansi"], [f.record()], ["ocean-deep"]);
  f.palette("specific", "ocean-deep", f.record({ sha256: "0".repeat(64) }));
  successful(f, await f.run(["plugins/base/themes/ocean-deep-dark-ansi.json"]), ["base"]);
});

test("a palette prefix must end at a hyphen boundary", async (t) => {
  const f = fixture(t);
  f.addFamily("compact", ["oceandark"], [f.record()], ["ocean"]);
  const result = await f.run(["plugins/compact/themes/oceandark.json"]);
  rejected(f, result, /missing its terminal palette/);
  assert.deepEqual(result.checked, ["compact"]);
});

test("a deleted palette selects its own family and fails when no local palette remains", async (t) => {
  const f = fixture(t);
  f.addFamily("another", ["sample"]);
  rmSync(join(f.root, "plugins/sample/palettes/sample.json"));
  const result = await f.run(["plugins/sample/palettes/sample.json"]);
  rejected(f, result, /missing its terminal palette/);
  assert.deepEqual(result.checked, ["sample"]);
  assert.equal(result.failures[0].file, "plugins/sample/themes/sample.json");
});

test("a deleted palette can use a shorter prefix from the same family", async (t) => {
  const f = fixture(t);
  f.addFamily("specific", ["ocean-deep-dark-ansi"], [f.record()], ["ocean", "ocean-deep"]);
  rmSync(join(f.root, "plugins/specific/palettes/ocean-deep.json"));
  successful(f, await f.run(["plugins/specific/palettes/ocean-deep.json"]), ["specific"]);
});

test("a deleted family is skipped when its palette changes", async (t) => {
  const f = fixture(t);
  rmSync(join(f.root, "plugins/sample"), { recursive: true });
  successful(f, await f.run(["plugins/sample/palettes/sample.json"]), []);
  assert.deepEqual(f.calls, []);
});

test("a canonical pinned raw palette URL matches its upstream record", async (t) => {
  const f = fixture(t);
  f.write("plugins/sample/palettes/sample.json", JSON.stringify({ source: {
    url: `https://raw.githubusercontent.com/upstream/palette/${revision}/palette.json`,
    sha256: digest(source),
  } }));
  successful(f, await f.run());
});

for (const [name, metadata] of [
  ["missing source", {}],
  ["missing source URL", { source: { sha256: digest(source) } }],
  ["missing source checksum", { source: { url: `https://github.com/upstream/palette/blob/${revision}/palette.json` } }],
  ["a different source repository", { source: { url: `https://github.com/another/palette/blob/${revision}/palette.json`, sha256: digest(source) } }],
  ["a different source checksum", { source: { url: `https://github.com/upstream/palette/blob/${revision}/palette.json`, sha256: "0".repeat(64) } }],
  ["a mutable source ref", { source: { url: "https://github.com/upstream/palette/blob/main/palette.json", sha256: digest(source) } }],
]) {
  test(`effective palette evidence rejects ${name}`, async (t) => {
    const f = fixture(t);
    f.write("plugins/sample/palettes/sample.json", JSON.stringify(metadata));
    const result = await f.run();
    rejected(f, result, /source URL and SHA-256 must match a pinned metadata\.upstream record/);
    assert.equal(result.failures[0].file, "plugins/sample/palettes/sample.json");
  });
}

test("a selected family must have an effective terminal palette", async (t) => {
  const f = fixture(t);
  rmSync(join(f.root, "plugins/sample/palettes/sample.json"));
  rejected(f, await f.run(), /missing its terminal palette/);
});

test("another family cannot supply a missing local palette", async (t) => {
  const f = fixture(t);
  f.addFamily("another", ["sample"]);
  rmSync(join(f.root, "plugins/sample/palettes"), { recursive: true });
  const result = await f.run();
  rejected(f, result, /missing its terminal palette/);
  assert.equal(result.failures[0].file, "plugins/sample/themes/sample.json");
});

test("a legacy global palette cannot supply a missing local palette", async (t) => {
  const f = fixture(t);
  const palette = join(f.root, "plugins/sample/palettes/sample.json");
  f.write("assets/palettes/sample.json", readFileSync(palette));
  rmSync(palette);
  rejected(f, await f.run(), /missing its terminal palette/);
});

test("duplicate upstream evidence across changed families reuses API responses", async (t) => {
  const f = fixture(t);
  f.addFamily("another");
  successful(f, await f.run([
    "plugins/sample/themes/sample.json",
    "plugins/another/themes/another.json",
    manifestPath("sample"),
  ]), ["another", "sample"]);
  assert.equal(f.calls.filter((call) => call.name === "content" && call.path === "palette.json").length, 1);
  assert.equal(f.calls.filter((call) => call.name === "license").length, 1);
  assert.equal(f.calls.filter((call) => call.name === "tree").length, 1);
});
