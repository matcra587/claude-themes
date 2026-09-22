import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import test from "node:test";

const action = readFileSync(new URL("../action.yml", import.meta.url), "utf8");
const blocks = [...action.matchAll(/^([ ]+)script: \|\n((?:\1  .*\n|\n)+)/gm)];
assert.equal(blocks.length, 1, "Expected one literal script block.");
const script = blocks[0][2].split("\n").map((line) => line.slice(blocks[0][1].length + 2)).join("\n");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction("core", "exec", "process", "require", script);

function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), "preview-render-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  return async function render(failure) {
    const outputs = {};
    const failures = [];
    const summaries = [];
    const messages = [];
    const calls = [];
    const summary = {
      addHeading(...args) { summaries.push(args); return this; },
      addRaw(...args) { summaries.push(args); return this; },
      async write() { summaries.push("written"); return this; },
    };
    const core = {
      setOutput(key, value) { outputs[key] = value; },
      setFailed(error) { failures.push(error); },
      info(message) { messages.push(message); },
      summary,
    };
    const exec = {
      async exec(command, args) {
        calls.push({ command, args });
        assert.equal(command, "mise");
        assert.deepEqual(args.slice(0, -1), [
          "run", "--quiet", "--output", "interleave", "previews:render",
          "--changed", "--base", "abc123", "--output",
        ]);
        const directory = args.at(-1);
        assert.equal(basename(directory), "bundle");
        assert.ok(!relative(temporary, directory).startsWith(".."));
        assert.equal(existsSync(directory), false, "The renderer needs a new output directory.");
        if (failure === "command") throw new Error("mise generation failed");
        mkdirSync(directory);
        if (failure !== "missing manifest") {
          writeFileSync(join(directory, "manifest.json"), failure === "invalid manifest" ? "not JSON" : JSON.stringify({ themes: [{ theme: "sample" }, { theme: "sample-ansi" }] }));
        }
        return 0;
      },
    };
    await run(core, exec, { env: { BASE_SHA: "abc123", RUNNER_TEMP: temporary } }, createRequire(import.meta.url));
    assert.equal(calls.length, 1);
    return { outputs, failures, summaries, messages };
  };
}

test("generation invokes mise and reports its new bundle only after success", async (t) => {
  const render = fixture(t);
  const first = await render();
  const second = await render();
  for (const result of [first, second]) {
    assert.deepEqual(result.failures, []);
    assert.deepEqual(Object.keys(result.outputs), ["output-directory"]);
    assert.equal(existsSync(join(result.outputs["output-directory"], "manifest.json")), true);
    assert.ok(result.messages.includes("Preview bundle ready: 2 previews, including reused images."));
    assert.ok(result.summaries.some((entry) => Array.isArray(entry) && entry[0] === "Preview generation"));
    assert.ok(result.summaries.includes("written"));
  }
  assert.notEqual(first.outputs["output-directory"], second.outputs["output-directory"]);
});

for (const failure of ["command", "missing manifest", "invalid manifest"]) {
  test(`${failure} failure emits a job summary without a successful bundle output`, async (t) => {
    const result = await fixture(t)(failure);
    assert.equal(result.failures.length, 1);
    assert.deepEqual(result.outputs, {});
    assert.ok(result.messages.includes("Preview generation failed. See the annotations and job log for details."));
    assert.ok(result.summaries.some((entry) => Array.isArray(entry) && /Preview generation failed/.test(entry[0])));
    assert.ok(result.summaries.includes("written"));
  });
}
