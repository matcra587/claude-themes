import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

function block(name) {
  const action = readFileSync(new URL("../action.yml", import.meta.url), "utf8");
  const matches = [...action.matchAll(new RegExp(`^([ ]+)${name}: \\|\\n((?:\\1  .*\\n|\\n)+)`, "gm"))];
  assert.equal(matches.length, 1, `Expected one literal ${name} block.`);
  return matches[0][2].split("\n").map((line) => line.slice(matches[0][1].length + 2)).join("\n");
}

const comparison = block("run");
const planning = block("script");
const checkpoint = "previews/source-commit.txt";
const theme = "plugins/sample/themes/sample.json";
const image = "plugins/sample/renders/sample.png";

function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), "preview-plan-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, "repository");
  mkdirSync(root);
  const environment = {
    ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_"))),
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_COUNT: "3",
    GIT_CONFIG_KEY_0: "core.hooksPath",
    GIT_CONFIG_VALUE_0: "/dev/null",
    GIT_CONFIG_KEY_1: "commit.gpgsign",
    GIT_CONFIG_VALUE_1: "false",
    GIT_CONFIG_KEY_2: "maintenance.auto",
    GIT_CONFIG_VALUE_2: "false",
    GIT_ALLOW_PROTOCOL: "file",
    GIT_TERMINAL_PROMPT: "0",
    GIT_AUTHOR_NAME: "Preview tests",
    GIT_AUTHOR_EMAIL: "tests@example.invalid",
    GIT_COMMITTER_NAME: "Preview tests",
    GIT_COMMITTER_EMAIL: "tests@example.invalid",
  };
  function command(binary, args, env = {}) {
    const result = spawnSync(binary, args, { cwd: root, env: { ...environment, ...env }, encoding: "utf8" });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    return result;
  }
  function git(...args) {
    const result = command("git", args);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return result.stdout.trim();
  }
  function write(name, content) {
    const path = join(root, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  function commit(message) {
    git("add", "--all");
    git("commit", "--quiet", "-m", message);
    return git("rev-parse", "HEAD");
  }
  git("init", "--quiet", "--initial-branch=main");
  write(theme, "{}\n");
  write(image, "Existing preview\n");
  const initial = commit("Initial fixture");
  let sequence = 0;
  return {
    initial, git, write, commit,
    run(base, env = {}) {
      const output = join(temporary, `output-${sequence++}`);
      const summary = `${output}-summary`;
      const head = git("rev-parse", "HEAD");
      const status = git("status", "--porcelain");
      const result = command("bash", ["--noprofile", "--norc", "-euo", "pipefail", "-c", comparison], {
        BASE_SHA: base,
        EVENT_NAME: "push",
        SOURCE_REF: "refs/heads/main",
        GITHUB_OUTPUT: output,
        GITHUB_STEP_SUMMARY: summary,
        ...env,
      });
      assert.equal(git("rev-parse", "HEAD"), head, "Planning must not create commits.");
      assert.equal(git("status", "--porcelain"), status, "Planning must not change repository files.");
      return {
        ...result,
        outputs: Object.fromEntries((existsSync(output) ? readFileSync(output, "utf8") : "").trim().split("\n").filter(Boolean).map((line) => line.split("="))),
        summary: existsSync(summary) ? readFileSync(summary, "utf8") : "",
      };
    },
  };
}

function successful(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.outputs;
}

test("push comparison uses the event base when no checkpoint exists", (t) => {
  const f = fixture(t);
  f.write(theme, '{"changed":true}\n');
  const head = f.commit("Change theme");
  assert.deepEqual(successful(f.run(f.initial)), { "base-sha": f.initial, "source-sha": head });
});

test("push to main includes changes left unpublished after the checkpoint", (t) => {
  const f = fixture(t);
  f.write(checkpoint, `${f.initial}\n`);
  const published = f.commit("Record published previews");
  f.write(theme, '{"changed":true}\n');
  const before = f.commit("Change theme without publishing");
  f.write(image, "Changed preview\n");
  f.commit("Change image");
  const outputs = successful(f.run(before));
  assert.equal(outputs["base-sha"], published);
  assert.deepEqual(f.git("diff", "--name-only", outputs["base-sha"], "HEAD").split("\n"), [image, theme]);
});

for (const [event, ref] of [["pull_request", "refs/pull/1/merge"], ["push", "refs/heads/feature"]]) {
  test(`${event} on ${ref} keeps its supplied base despite an older checkpoint`, (t) => {
    const f = fixture(t);
    f.write(checkpoint, `${f.initial}\n`);
    f.commit("Record published previews");
    f.write(theme, '{"changed":true}\n');
    const base = f.commit("Advance comparison base");
    f.write(image, "Incoming image change\n");
    f.commit("Change image");
    assert.equal(successful(f.run(base, { EVENT_NAME: event, SOURCE_REF: ref }))["base-sha"], base);
  });
}

for (const strategy of ["squash", "merge"]) {
  test(`an incoming ${strategy} checkpoint cannot hide a deleted image`, (t) => {
    const f = fixture(t);
    f.git("switch", "--quiet", "-c", "incoming");
    f.write(checkpoint, `${f.initial}\n`);
    f.git("rm", image);
    f.commit("Delete image and add incoming checkpoint");
    f.git("switch", "--quiet", "main");
    if (strategy === "squash") {
      f.git("merge", "--squash", "incoming");
      f.commit("Squash incoming changes");
    } else {
      f.git("merge", "--no-ff", "--no-edit", "incoming");
    }
    const base = successful(f.run(f.initial))["base-sha"];
    assert.equal(base, f.initial);
    assert.equal(f.git("diff", "--name-status", base, "HEAD", "--", image), `D\t${image}`);
  });
}

for (const [label, base] of [["empty", ""], ["invalid", "not-a-commit"]]) {
  test(`${label} comparison bases fail without success outputs`, (t) => {
    const f = fixture(t);
    f.write(checkpoint, `${f.initial}\n`);
    f.commit("Record published previews");
    const result = f.run(base);
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /::error::Could not determine the preview comparison base/);
    assert.deepEqual(result.outputs, {});
    assert.match(result.summary, /## Preview plan/);
    assert.match(result.summary, /Could not determine the comparison base/);
  });
}

async function runPlan(result) {
  const outputs = {};
  const messages = [];
  const failures = [];
  const summaries = [];
  const summary = {
    addHeading(...args) { summaries.push(args); return this; },
    addRaw(...args) { summaries.push(args); return this; },
    async write() { summaries.push("written"); return this; },
  };
  const core = {
    setOutput(key, value) { outputs[key] = value; },
    setFailed(message) { failures.push(message); },
    info(message) { messages.push(message); },
    debug() {}, summary,
  };
  const calls = [];
  const exec = {
    async getExecOutput(command, args, options) {
      calls.push({ command, args, options });
      if (result instanceof Error) throw result;
      return result;
    },
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await new AsyncFunction("core", "exec", "process", planning)(core, exec, { env: { BASE_SHA: "abc123" } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "mise");
  assert.deepEqual(calls[0].args, ["run", "--quiet", "--output", "interleave", "previews:render", "--changed", "--base", "abc123", "--plan"]);
  assert.equal(calls[0].options.ignoreReturnCode, true);
  return { outputs, messages, failures, summaries };
}

for (const { capture, reuse } of [{ capture: [], reuse: [theme] }, { capture: [theme], reuse: [] }]) {
  test(`planning reports capture-needed=${capture.length > 0} from the renderer plan`, async () => {
    const result = await runPlan({ exitCode: 0, stdout: JSON.stringify({ capture, reuse }), stderr: "" });
    assert.deepEqual(result.outputs, { "capture-needed": capture.length > 0 });
    assert.deepEqual(result.failures, []);
    assert.ok(result.summaries.some((entry) => Array.isArray(entry) && entry[0] === "Preview plan"));
    assert.ok(result.summaries.some((entry) => Array.isArray(entry) && entry[0] === `${capture.length} previews need capture; ${reuse.length} can be reused.\n`));
    assert.ok(result.summaries.includes("written"));
  });
}

test("failed planning retains renderer diagnostics without success outputs", async () => {
  const diagnostic = "error: sample.json: missing terminal palette";
  const result = await runPlan({ exitCode: 1, stdout: "", stderr: `${diagnostic}\n` });
  assert.ok(result.messages.includes(diagnostic));
  assert.equal(result.failures.length, 1);
  assert.deepEqual(result.outputs, {});
  assert.ok(result.summaries.some((entry) => Array.isArray(entry) && /Preview planning failed/.test(entry[0])));
  assert.ok(result.summaries.includes("written"));
});

for (const [name, response] of [
  ["an unavailable mise executable", new Error("mise unavailable")],
  ["invalid plan JSON", { exitCode: 0, stdout: "not JSON", stderr: "" }],
]) {
  test(`${name} fails planning with a job summary and no success output`, async () => {
    const result = await runPlan(response);
    assert.equal(result.failures.length, 1);
    assert.deepEqual(result.outputs, {});
    assert.ok(result.summaries.includes("written"));
  });
}
