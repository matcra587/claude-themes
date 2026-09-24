import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { fixture, snapshot, write } from "./fixtures.mjs";

const action = readFileSync(new URL("../action.yml", import.meta.url), "utf8");
const blocks = [...action.matchAll(/^([ ]+)script: \|\n((?:\1  .*\n|\n)+)/gm)];
assert.equal(blocks.length, 1, "Expected one literal script block.");
const script = blocks[0][2].split("\n").map((line) => line.slice(blocks[0][1].length + 2)).join("\n");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction("core", "process", "require", script);

async function runAction(f, checkOnly = "false") {
  const outputs = {};
  const failures = [];
  const messages = [];
  const summaries = [];
  const core = {
    setOutput(key, value) { outputs[key] = value; },
    setFailed(error) { failures.push(error); },
    info(message) { messages.push(message); },
    summary: {
      addHeading(...args) { summaries.push(args); return this; },
      addRaw(...args) { summaries.push(args); return this; },
      async write() { summaries.push("written"); return this; },
    },
  };
  await run(core, { env: {
    ACTION_PATH: fileURLToPath(new URL("..", import.meta.url)),
    GITHUB_WORKSPACE: f.root,
    PREVIEW_DIRECTORY: f.bundle,
    CHECK_ONLY: checkOnly,
  } }, createRequire(import.meta.url));
  assert.deepEqual(summaries[0], ["Preview update", 2]);
  assert.deepEqual(summaries[1], [`${messages[0]}\n`]);
  assert.equal(summaries.at(-1), "written");
  return { outputs, failures, messages };
}

test("the action reports check-only, applied and unchanged bundles in job summaries", async (t) => {
  const f = fixture(t);
  f.bundleFor([f.entry()]);
  const before = snapshot(f.root);
  const checked = await runAction(f, "true");
  assert.deepEqual(checked.failures, []);
  assert.deepEqual(checked.outputs, { changed: true });
  assert.deepEqual(checked.messages, ["Preview bundle verified; plugin previews need updating.\n\nPNG files: 1 added or changed, 0 unchanged, 0 removed."]);
  assert.deepEqual(snapshot(f.root), before);
  const applied = await runAction(f);
  assert.deepEqual(applied.failures, []);
  assert.deepEqual(applied.outputs, { changed: true });
  assert.deepEqual(applied.messages, ["Updated plugin previews.\n\nPNG files: 1 added or changed, 0 unchanged, 0 removed."]);
  const unchanged = await runAction(f);
  assert.deepEqual(unchanged.failures, []);
  assert.deepEqual(unchanged.outputs, { changed: false });
  assert.deepEqual(unchanged.messages, ["Preview bundle verified; plugin previews are up to date.\n\nPNG files: 0 added or changed, 1 unchanged, 0 removed."]);
});

test("an empty bundle reports zero PNG counts without writing files", async (t) => {
  const f = fixture(t);
  f.manifest([]);
  const before = snapshot(f.root);
  for (const checkOnly of ["true", "false"]) {
    const result = await runAction(f, checkOnly);
    assert.deepEqual(result.failures, []);
    assert.deepEqual(result.outputs, { changed: false });
    assert.deepEqual(result.messages, ["Preview bundle verified; plugin previews are up to date.\n\nPNG files: 0 added or changed, 0 unchanged, 0 removed."]);
    assert.deepEqual(snapshot(f.root), before);
  }
});

for (const problem of ["invalid boolean", "invalid bundle"]) {
  test(`${problem} fails the action without successful outputs or writes`, async (t) => {
    const f = fixture(t);
    const entry = f.entry();
    f.bundleFor([entry]);
    if (problem === "invalid bundle") write(f.bundle, entry.image, "tampered image");
    const before = snapshot(f.root);
    const result = await runAction(f, problem === "invalid boolean" ? "yes" : "false");
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, problem === "invalid boolean" ? /check-only/ : /hash/);
    assert.deepEqual(result.outputs, {});
    assert.deepEqual(result.messages, ["Preview update failed. See the annotations and job log for details."]);
    assert.deepEqual(snapshot(f.root), before);
  });
}
