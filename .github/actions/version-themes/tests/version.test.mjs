import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { versionThemes } from "../version.mjs";

for (const key of Object.keys(process.env)) {
  if (key.startsWith("GIT_")) delete process.env[key];
}
process.env.GIT_CONFIG_GLOBAL = "/dev/null";
process.env.GIT_CONFIG_NOSYSTEM = "1";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "theme-versions-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.invalid", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.invalid" },
  }).trim();
  git("init", "--quiet", "--initial-branch=main");
  git("config", "core.hooksPath", "/dev/null");
  const write = (file, value) => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
  };
  const manifest = (family = "sample", version = "1.2.3") => write(`plugins/${family}/.claude-plugin/plugin.json`, { name: family, version });
  const theme = (family = "sample", overrides = { text: "#abcdef" }) => write(`plugins/${family}/themes/${family}.json`, { name: family, base: "dark", overrides });
  const commit = () => {
    git("add", "--all");
    git("commit", "--quiet", "--allow-empty", "-m", "Fixture");
    return git("rev-parse", "HEAD");
  };
  manifest();
  theme();
  const baseSha = commit();
  const run = (options = {}) => versionThemes({ root, baseSha, sourceSha: git("rev-parse", "HEAD"), ...options });
  const version = (family = "sample") => JSON.parse(readFileSync(join(root, `plugins/${family}/.claude-plugin/plugin.json`))).version;
  return { root, git, write, manifest, theme, commit, baseSha, run, version };
}

test("a colour correction bumps only the affected plugin patch", (t) => {
  const f = fixture(t);
  f.theme("sample", { text: "#fedcba" });
  f.commit();
  assert.deepEqual(f.run(), [{ file: "plugins/sample/.claude-plugin/plugin.json", from: "1.2.3", to: "1.2.4" }]);
  assert.equal(f.version(), "1.2.4");
  assert.equal(f.git("diff", "--name-only"), "plugins/sample/.claude-plugin/plugin.json");
});

for (const [mode, mask] of [[0o755, 0o077], [0o600, 0o022]]) {
  test(`a version bump preserves manifest mode ${mode.toString(8)} with umask ${mask.toString(8)}`, (t) => {
    const f = fixture(t);
    const path = join(f.root, "plugins/sample/.claude-plugin/plugin.json");
    chmodSync(path, mode);
    f.theme("sample", { text: "#fedcba" });
    f.commit();
    const previousMask = process.umask(mask);
    try {
      f.run({ checkOnly: true });
      assert.equal(f.version(), "1.2.3");
      assert.equal(lstatSync(path).mode & 0o777, mode);
      f.run();
    } finally {
      process.umask(previousMask);
    }
    assert.equal(f.version(), "1.2.4");
    assert.equal(lstatSync(path).mode & 0o777, mode);
  });
}

test("formatting and object key order do not bump a version", (t) => {
  const f = fixture(t);
  f.write("plugins/sample/themes/sample.json", '{"overrides":{"text":"#abcdef"},"base":"dark","name":"sample"}\n');
  f.commit();
  assert.deepEqual(f.run(), []);
  assert.equal(f.version(), "1.2.3");
});

for (const field of ["vhs", "source"]) {
  test(`terminal palette ${field} changes cause a patch bump`, (t) => {
    const f = fixture(t);
    f.write("plugins/sample/palettes/sample.json", { vhs: { red: "#ff0000" }, source: { revision: "old" } });
    const baseSha = f.commit();
    f.write("plugins/sample/palettes/sample.json", { vhs: { red: field === "vhs" ? "#ee0000" : "#ff0000" }, source: { revision: field === "source" ? "new" : "old" } });
    f.commit();
    f.run({ baseSha });
    assert.equal(f.version(), "1.2.4");
  });
}

test("an added theme requires a minor bump, even alongside a colour correction", (t) => {
  const f = fixture(t);
  f.theme("sample", { text: "#fedcba" });
  f.write("plugins/sample/themes/sample-light.json", { name: "Sample Light", base: "light" });
  f.commit();
  f.run();
  assert.equal(f.version(), "1.3.0");
});

test("a new family keeps its chosen initial version", (t) => {
  const f = fixture(t);
  f.manifest("new", "0.1.0");
  f.theme("new");
  f.commit();
  assert.deepEqual(f.run(), []);
  assert.equal(f.version("new"), "0.1.0");
});

for (const version of ["1.2.4", "1.3.0", "2.0.0"]) {
  test(`an explicit sufficient version ${version} is preserved`, (t) => {
    const f = fixture(t);
    f.theme("sample", { text: "#fedcba" });
    f.manifest("sample", version);
    f.commit();
    assert.deepEqual(f.run(), []);
    assert.equal(f.version(), version);
  });
}

test("an explicit patch cannot hide a required minor bump", (t) => {
  const f = fixture(t);
  f.write("plugins/sample/themes/sample-light.json", { name: "Light", base: "light" });
  f.manifest("sample", "1.2.4");
  f.commit();
  assert.throws(() => f.run(), /requires version 1\.3\.0 or higher/);
  assert.equal(f.git("status", "--porcelain"), "");
});

for (const change of ["remove", "rename", "display name"]) {
  test(`a theme ${change} requires an explicit version decision`, (t) => {
    const f = fixture(t);
    const file = join(f.root, "plugins/sample/themes/sample.json");
    if (change === "remove") rmSync(file);
    if (change === "rename") renameSync(file, join(dirname(file), "renamed.json"));
    if (change === "display name") f.write("plugins/sample/themes/sample.json", { name: "Renamed", base: "dark" });
    f.commit();
    assert.throws(() => f.run(), /requires an explicit version bump/);
    assert.equal(f.version(), "1.2.3");
  });
}

test("an explicit version permits a removed theme without guessing a major bump", (t) => {
  const f = fixture(t);
  rmSync(join(f.root, "plugins/sample/themes/sample.json"));
  f.manifest("sample", "1.2.4");
  f.commit();
  assert.deepEqual(f.run(), []);
});

test("a theme rename accepts an explicit patch instead of inferring a minor bump", (t) => {
  const f = fixture(t);
  renameSync(join(f.root, "plugins/sample/themes/sample.json"), join(f.root, "plugins/sample/themes/renamed.json"));
  f.manifest("sample", "1.2.4");
  f.commit();
  assert.deepEqual(f.run(), []);
  assert.equal(f.version(), "1.2.4");
});

test("version decreases fail even without a theme change", (t) => {
  const f = fixture(t);
  f.manifest("sample", "1.2.2");
  f.commit();
  assert.throws(() => f.run(), /version cannot decrease/);
});

test("documentation, images and manifest licence records do not bump versions", (t) => {
  const f = fixture(t);
  f.write("plugins/sample/README.md", "Documentation\n");
  f.write("plugins/sample/renders/sample.png", "Image fixture");
  f.write("plugins/sample/LICENSES/upstream.txt", "Licence fixture");
  f.write("plugins/sample/.claude-plugin/plugin.json", { name: "sample", version: "1.2.3", license: "MIT", metadata: { upstream: [] } });
  f.commit();
  assert.deepEqual(f.run(), []);
});

test("check-only reports exact proposed paths without writing", (t) => {
  const f = fixture(t);
  f.theme("sample", { text: "#fedcba" });
  f.commit();
  assert.deepEqual(f.run({ checkOnly: true }), [{ file: "plugins/sample/.claude-plugin/plugin.json", from: "1.2.3", to: "1.2.4" }]);
  assert.equal(f.version(), "1.2.3");
  assert.equal(f.git("status", "--porcelain"), "");
  assert.throws(() => f.run({ checkOnly: "false" }), /checkOnly must be a boolean/);
});

test("all families are validated before any version is changed", (t) => {
  const f = fixture(t);
  f.manifest("zebra");
  f.theme("zebra");
  const baseSha = f.commit();
  f.theme("sample", { text: "#fedcba" });
  f.theme("zebra", { text: "#fedcba" });
  f.manifest("zebra", "1.2.2");
  f.commit();
  assert.throws(() => f.run({ baseSha }), /version cannot decrease/);
  assert.equal(f.version(), "1.2.3");
  assert.equal(f.git("status", "--porcelain"), "");
});

test("uncommitted manifest edits are preserved and rejected", (t) => {
  const f = fixture(t);
  f.theme("sample", { text: "#fedcba" });
  f.commit();
  f.manifest("sample", "9.0.0");
  assert.throws(() => f.run(), /uncommitted changes would be overwritten/);
  assert.equal(f.version(), "9.0.0");
});

test("unrelated families with local edits are not inspected or overwritten", (t) => {
  const f = fixture(t);
  f.manifest("other");
  f.theme("other");
  const baseSha = f.commit();
  f.theme("sample", { text: "#fedcba" });
  f.commit();
  f.manifest("other", "9.0.0");
  assert.deepEqual(f.run({ baseSha }), [{ file: "plugins/sample/.claude-plugin/plugin.json", from: "1.2.3", to: "1.2.4" }]);
  assert.equal(f.version("other"), "9.0.0");
});

for (const target of ["theme", "manifest"]) {
  test(`a committed ${target} symlink is rejected`, (t) => {
    const f = fixture(t);
    const file = target === "theme" ? "plugins/sample/themes/sample.json" : "plugins/sample/.claude-plugin/plugin.json";
    f.write("external.json", { name: "sample", version: "1.2.3", base: "dark" });
    rmSync(join(f.root, file));
    symlinkSync("../../../external.json", join(f.root, file));
    f.commit();
    assert.throws(() => f.run(), /committed inputs must be regular files/);
    assert.equal(f.git("status", "--porcelain"), "");
  });
}

for (const target of ["manifest", "directory"]) {
  test(`a working ${target} symlink cannot redirect a version write`, (t) => {
    const f = fixture(t);
    f.theme("sample", { text: "#fedcba" });
    f.commit();
    const file = join(f.root, "plugins/sample/.claude-plugin", target === "manifest" ? "plugin.json" : "");
    const saved = join(f.root, "saved");
    renameSync(file, saved);
    symlinkSync(saved, file);
    assert.throws(() => f.run(), /symlinks are not supported/);
    assert.equal(f.version(), "1.2.3");
  });
}

test("invalid commits and a checkout mismatch fail before writes", (t) => {
  const f = fixture(t);
  f.theme("sample", { text: "#fedcba" });
  f.commit();
  assert.throws(() => f.run({ baseSha: "main" }), /full commit SHAs/);
  assert.throws(() => f.run({ baseSha: "a".repeat(40) }));
  assert.throws(() => f.run({ sourceSha: f.baseSha }), /checkout does not match/);
  assert.equal(f.version(), "1.2.3");
});

test("the supplied publication checkpoint includes changes skipped by an earlier run", (t) => {
  const f = fixture(t);
  f.theme("sample", { text: "#fedcba" });
  f.commit();
  f.write("README.md", "Later unrelated change\n");
  f.commit();
  f.run();
  assert.equal(f.version(), "1.2.4");
});

test("a previously shipped version-only bump cannot hide a later colour correction", (t) => {
  const f = fixture(t);
  f.manifest("sample", "1.2.4");
  f.commit();
  f.theme("sample", { text: "#fedcba" });
  f.commit();
  f.write("plugins/sample/.claude-plugin/plugin.json", { name: "sample", version: "1.2.4", license: "MIT" });
  f.commit();
  assert.deepEqual(f.run(), [{ file: "plugins/sample/.claude-plugin/plugin.json", from: "1.2.4", to: "1.2.5" }]);
  assert.equal(f.version(), "1.2.5");
});

test("an added theme after a shipped version bump still receives a minor bump", (t) => {
  const f = fixture(t);
  f.manifest("sample", "1.3.0");
  f.commit();
  f.write("plugins/sample/themes/sample-light.json", { name: "Light", base: "light" });
  f.commit();
  f.run();
  assert.equal(f.version(), "1.4.0");
});

test("an explicit bump covering its own colour correction remains sufficient after a later docs commit", (t) => {
  const f = fixture(t);
  f.manifest("sample", "1.2.4");
  f.theme("sample", { text: "#fedcba" });
  f.commit();
  f.write("README.md", "Documentation\n");
  f.commit();
  assert.deepEqual(f.run(), []);
  assert.equal(f.version(), "1.2.4");
});

test("a merge treats its branch version and theme edits as one explicit decision", (t) => {
  const f = fixture(t);
  f.git("switch", "--quiet", "--create", "contribution");
  f.manifest("sample", "1.2.4");
  f.commit();
  f.theme("sample", { text: "#fedcba" });
  f.commit();
  f.git("switch", "--quiet", "main");
  f.git("merge", "--quiet", "--no-ff", "--no-edit", "contribution");
  assert.deepEqual(f.run(), []);
  assert.equal(f.version(), "1.2.4");
});

test("a patch after an unversioned theme addition cannot bypass the minor minimum", (t) => {
  const f = fixture(t);
  f.write("plugins/sample/themes/sample-light.json", { name: "Light", base: "light" });
  f.commit();
  f.manifest("sample", "1.2.4");
  f.commit();
  assert.throws(() => f.run(), /requires version 1\.3\.0 or higher/);
});

test("later explicit bumps are checked against the most recently shipped version", (t) => {
  const f = fixture(t);
  f.manifest("sample", "1.3.0");
  f.commit();
  f.manifest("sample", "1.3.1");
  f.write("plugins/sample/themes/sample-light.json", { name: "Light", base: "light" });
  f.commit();
  assert.throws(() => f.run(), /requires version 1\.4\.0 or higher/);
});

for (const version of ["01.2.3", "1.2.4-beta", "1.2.3\n", "9007199254740992.0.0"]) {
  test(`unsupported version ${JSON.stringify(version)} fails before writes`, (t) => {
    const f = fixture(t);
    f.manifest("sample", version);
    f.commit();
    assert.throws(() => f.run(), /version (must be|is too large)/);
  });
}

const actionPath = fileURLToPath(new URL("../", import.meta.url));
const action = readFileSync(join(actionPath, "action.yml"), "utf8");
const script = action.split("        script: |\n")[1].replace(/^ {10}/gm, "");
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

async function runAction(f, checkOnly = "false") {
  const outputs = {};
  const failures = [];
  const summaries = [];
  const messages = [];
  const core = {
    setOutput(name, value) { outputs[name] = value; },
    setFailed(error) { failures.push(String(error)); },
    info(message) { messages.push(message); },
    summary: { addHeading() { return this; }, addRaw(value) { summaries.push(value); return this; }, async write() {} },
  };
  await new AsyncFunction("require", "core", "process", script)(createRequire(import.meta.url), core, { env: {
    ACTION_PATH: actionPath,
    GITHUB_WORKSPACE: f.root,
    BASE_SHA: f.baseSha,
    SOURCE_SHA: f.git("rev-parse", "HEAD"),
    CHECK_ONLY: checkOnly,
  } });
  return { outputs, failures, summaries: summaries.join(""), messages };
}

test("the action reports exact changed paths and a successful summary", async (t) => {
  const f = fixture(t);
  f.theme("sample", { text: "#fedcba" });
  f.commit();
  const result = await runAction(f);
  assert.deepEqual(result.outputs, { changed: true, manifests: '["plugins/sample/.claude-plugin/plugin.json"]' });
  assert.deepEqual(result.failures, []);
  const expected = "Updated 1 plugin version.\n\n- sample 1.2.3 -> 1.2.4";
  assert.equal(result.summaries, `${expected}\n`);
  assert.deepEqual(result.messages, [expected]);
});

test("the action reports a check-only update without changing files", async (t) => {
  const f = fixture(t);
  f.theme("sample", { text: "#fedcba" });
  f.commit();
  const result = await runAction(f, "true");
  assert.equal(result.outputs.changed, true);
  assert.equal(f.version(), "1.2.3");
  const expected = "Would update 1 plugin version.\n\n- sample 1.2.3 -> 1.2.4";
  assert.equal(result.summaries, `${expected}\n`);
  assert.deepEqual(result.messages, [expected]);
});

for (const checkOnly of ["true", "false"]) {
  test(`the action lists patch and minor changes in logs and summary with check-only=${checkOnly}`, async (t) => {
    const f = fixture(t);
    f.manifest("zebra", "2.3.4");
    f.theme("zebra");
    f.manifest("untouched", "4.5.6");
    f.theme("untouched");
    const baseSha = f.commit();
    f.theme("sample", { text: "#fedcba" });
    f.write("plugins/zebra/themes/zebra-light.json", { name: "Zebra Light", base: "light" });
    f.commit();
    const result = await runAction({ ...f, baseSha }, checkOnly);
    const manifests = ["plugins/sample/.claude-plugin/plugin.json", "plugins/zebra/.claude-plugin/plugin.json"];
    assert.deepEqual(result.outputs, { changed: true, manifests: JSON.stringify(manifests) });
    assert.deepEqual(result.failures, []);
    const expected = `${checkOnly === "true" ? "Would update" : "Updated"} 2 plugin versions.\n\n- sample 1.2.3 -> 1.2.4\n- zebra 2.3.4 -> 2.4.0`;
    assert.equal(result.summaries, `${expected}\n`);
    assert.deepEqual(result.messages, [expected]);
    assert.equal(f.version("untouched"), "4.5.6");
    if (checkOnly === "true") {
      assert.equal(f.version(), "1.2.3");
      assert.equal(f.version("zebra"), "2.3.4");
      assert.equal(f.git("status", "--porcelain"), "");
    } else {
      assert.equal(f.version(), "1.2.4");
      assert.equal(f.version("zebra"), "2.4.0");
      assert.deepEqual(f.git("diff", "--name-only").split("\n"), manifests);
    }
  });
}

test("the action reports a no-op with an empty manifest list", async (t) => {
  const result = await runAction(fixture(t));
  assert.deepEqual(result.outputs, { changed: false, manifests: "[]" });
  assert.deepEqual(result.failures, []);
  assert.equal(result.summaries, "Plugin versions already cover these changes.\n");
  assert.deepEqual(result.messages, ["Plugin versions already cover these changes."]);
});

test("the action publishes no success outputs for validation failures", async (t) => {
  const f = fixture(t);
  f.manifest("sample", "1.0.0");
  f.commit();
  const result = await runAction(f);
  assert.deepEqual(result.outputs, {});
  assert.match(result.failures[0], /version cannot decrease/);
  assert.equal(result.summaries, "Plugin versioning failed. See the annotations and job log for details.\n");
  assert.deepEqual(result.messages, ["Plugin versioning failed. See the annotations and job log for details."]);
});

test("the action rejects an invalid check-only value", async (t) => {
  const result = await runAction(fixture(t), "sometimes");
  assert.deepEqual(result.outputs, {});
  assert.match(result.failures[0], /check-only must be true or false/);
});
