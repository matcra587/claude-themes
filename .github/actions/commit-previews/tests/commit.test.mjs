import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

const action = readFileSync(new URL("../action.yml", import.meta.url), "utf8");
const steps = Object.fromEntries(action.split(/^    - name: /m).slice(1).map((step) => {
  const id = step.match(/^      id: (\w+)$/m)[1];
  const block = step.match(/^([ ]+)(?:run|script): \|\n((?:\1  .*\n|\n)+)/m);
  assert.ok(block, `Expected a literal script for ${id}.`);
  return [id, block[2].split("\n").map((line) => line.slice(block[1].length + 2)).join("\n")];
}));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const messageScript = new AsyncFunction("core", "exec", steps.message);
const image = "plugins/sample/renders/sample.png";
const gallery = "plugins/sample/PREVIEWS.md";
const manifest = "previews/manifest.json";
const checkpoint = "previews/source-commit.txt";
const bot = Object.fromEntries([...action.matchAll(/^        (GIT_(?:AUTHOR|COMMITTER)_(?:NAME|EMAIL)): (.+)$/gm)].map((match) => match.slice(1)));

function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), "preview-commit-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, "repository");
  const remote = join(temporary, "remote.git");
  mkdirSync(root);
  const environment = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: temporary,
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
    GH_CONFIG_DIR: join(temporary, "gh"),
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
  function write(path, content) {
    const destination = join(root, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, content);
  }
  function commit(message) {
    git("add", "--all");
    git("commit", "--quiet", "-m", message);
    return git("rev-parse", "HEAD");
  }
  git("init", "--quiet", "--initial-branch=main");
  git("init", "--quiet", "--bare", "--initial-branch=main", remote);
  write(image, "Original image\n");
  write(gallery, "Original gallery\n");
  write(manifest, "{}\n");
  write(checkpoint, "Previous checkpoint\n");
  write("README.md", "Original README\n");
  const source = commit("Initial fixture");
  git("remote", "add", "origin", remote);
  git("push", "--quiet", "origin", "main");
  let sequence = 0;
  return {
    root, remote, source, git, write, commit,
    read(path) { return readFileSync(join(root, path), "utf8"); },
    remoteHead() { return git("--git-dir", remote, "rev-parse", "main"); },
    advanceRemote() {
      const other = join(temporary, `other-${sequence++}`);
      git("clone", "--quiet", remote, other);
      writeFileSync(join(other, "README.md"), "A newer main commit\n");
      git("-C", other, "add", "README.md");
      git("-C", other, "commit", "--quiet", "-m", "Advance main");
      git("-C", other, "push", "--quiet", "origin", "main");
      return git("-C", other, "rev-parse", "HEAD");
    },
    run(step, env = {}) {
      const output = join(temporary, `output-${sequence++}`);
      const summary = `${output}-summary`;
      const result = command("bash", ["--noprofile", "--norc", "-euo", "pipefail", "-c", steps[step]], {
        SOURCE_SHA: source,
        GH_TOKEN: "local-test-placeholder",
        GITHUB_OUTPUT: output,
        GITHUB_STEP_SUMMARY: summary,
        ...bot,
        ...env,
      });
      return {
        ...result,
        outputs: Object.fromEntries((existsSync(output) ? readFileSync(output, "utf8") : "").trim().split("\n").filter(Boolean).map((line) => line.split("="))),
        summary: existsSync(summary) ? readFileSync(summary, "utf8") : "",
      };
    },
    async message() {
      const outputs = {};
      await messageScript({ setOutput(key, value) { outputs[key] = value; } }, {
        async getExecOutput(binary, args) {
          const result = command(binary, args);
          assert.equal(result.status, 0, result.stderr);
          return { stdout: result.stdout };
        },
      });
      return outputs.message;
    },
  };
}

function successful(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.outputs;
}

test("publication commits only generated outputs with the bot identity and a source checkpoint", async (t) => {
  const f = fixture(t);
  f.write(image, "Generated image\n");
  f.write(gallery, "Generated gallery\n");
  f.write(manifest, '{"updated":true}\n');
  for (const path of ["README.md", "plugins/sample/themes/sample.json", "plugins/sample/palettes/sample.json", "plugins/sample/renders/notes.md", "plugins/sample/renders/nested/image.png", "assets/image.png"]) {
    f.write(path, "Unrelated content\n");
  }
  assert.deepEqual(successful(f.run("source")), { current: "true" });
  assert.deepEqual(successful(f.run("stage")), { changed: "true" });
  const message = await f.message();
  assert.equal(message, "chore: update sample theme previews");
  const result = f.run("push", { COMMIT_MESSAGE: message });
  assert.deepEqual(successful(result), { status: "published" });
  assert.equal(f.remoteHead(), f.git("rev-parse", "HEAD"));
  assert.equal(f.git("rev-parse", "HEAD^"), f.source);
  assert.equal(f.read(checkpoint), `${f.source}\n`);
  assert.deepEqual(f.git("show", "--format=", "--name-only", "HEAD").split("\n"), [gallery, image, manifest, checkpoint]);
  assert.equal(f.git("show", "-s", "--format=%an%n%ae%n%cn%n%ce%n%B"), `github-actions[bot]\n41898282+github-actions[bot]@users.noreply.github.com\ngithub-actions[bot]\n41898282+github-actions[bot]@users.noreply.github.com\n${message}\n\n[skip ci]`);
  assert.match(result.summary, /## Updated plugin previews/);
  assert.match(f.git("status", "--porcelain"), /README\.md/);
  assert.doesNotMatch(f.git("config", "--local", "--list"), /credential\.helper|local-test-placeholder/);
});

test("unchanged outputs do not stage a checkpoint-only change or create a commit", (t) => {
  const f = fixture(t);
  f.write(checkpoint, "Unrelated checkpoint edit\n");
  assert.deepEqual(successful(f.run("source")), { current: "true" });
  const result = f.run("stage");
  assert.deepEqual(successful(result), {});
  assert.match(result.summary, /already up to date/);
  assert.equal(f.git("diff", "--cached", "--name-only"), "");
  assert.equal(f.git("rev-parse", "HEAD"), f.source);
  assert.equal(f.remoteHead(), f.source);
});

test("main advancing before staging skips publication with a notice", (t) => {
  const f = fixture(t);
  f.write(image, "Generated image\n");
  const newer = f.advanceRemote();
  const result = f.run("source");
  assert.deepEqual(successful(result), { status: "stale" });
  assert.match(result.stdout, /::notice::Main changed/);
  assert.match(result.summary, /Skipped: main changed/);
  assert.equal(f.git("diff", "--cached", "--name-only"), "");
  assert.equal(f.git("rev-parse", "HEAD"), f.source);
  assert.equal(f.remoteHead(), newer);
});

test("main advancing after the source check cannot be overwritten by the preview push", async (t) => {
  const f = fixture(t);
  f.write(image, "Generated image\n");
  successful(f.run("source"));
  successful(f.run("stage"));
  const newer = f.advanceRemote();
  const result = f.run("push", { COMMIT_MESSAGE: await f.message() });
  assert.deepEqual(successful(result), { status: "stale" });
  assert.match(result.stdout, /::notice::Main changed before previews could be published/);
  assert.equal(f.remoteHead(), newer);
  assert.equal(f.git("--git-dir", f.remote, "show", `main:${checkpoint}`), "Previous checkpoint");
});

test("a push failure without a newer main remains an error", async (t) => {
  const f = fixture(t);
  f.write(image, "Generated image\n");
  successful(f.run("source"));
  successful(f.run("stage"));
  f.git("remote", "set-url", "--push", "origin", join(f.root, "missing.git"));
  const result = f.run("push", { COMMIT_MESSAGE: await f.message() });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /::error::Could not push/);
  assert.deepEqual(result.outputs, {});
  assert.equal(f.remoteHead(), f.source);
});

for (const problem of ["wrong checkout", "pre-staged file"]) {
  test(`${problem} fails before publication`, (t) => {
    const f = fixture(t);
    if (problem === "pre-staged file") {
      f.write("README.md", "Already staged\n");
      f.git("add", "README.md");
    }
    const before = f.git("diff", "--cached");
    const result = f.run("source", problem === "wrong checkout" ? { SOURCE_SHA: "0".repeat(40) } : {});
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, problem === "wrong checkout" ? /checkout does not match/ : /already contains staged changes/);
    assert.equal(f.git("diff", "--cached"), before);
    assert.equal(f.remoteHead(), f.source);
  });
}

test("a checkpoint symlink cannot overwrite another file", async (t) => {
  const f = fixture(t);
  f.write(image, "Generated image\n");
  rmSync(join(f.root, checkpoint));
  symlinkSync("../README.md", join(f.root, checkpoint));
  successful(f.run("source"));
  successful(f.run("stage"));
  const result = f.run("push", { COMMIT_MESSAGE: await f.message() });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /checkpoint must not be a symlink/);
  assert.equal(f.read("README.md"), "Original README\n");
  assert.equal(f.remoteHead(), f.source);
});

for (const [change, expected] of [
  ["add", "chore: generate sample theme previews"],
  ["delete", "chore: remove sample theme previews"],
  ["mixed", "chore: update sample theme previews"],
  ["gallery", "chore: update sample theme previews"],
  ["manifest", "chore: update theme preview gallery"],
  ["families", "chore: generate alpha, zulu theme previews"],
  ["many families", "chore: generate previews for 3 theme families"],
]) {
  test(`${change} produces the appropriate commit message`, async (t) => {
    const f = fixture(t);
    if (["add", "mixed"].includes(change)) f.write("plugins/sample/renders/new.png", "New image\n");
    if (["delete", "mixed"].includes(change)) rmSync(join(f.root, image));
    if (change === "gallery") f.write(gallery, "Changed gallery\n");
    if (change === "manifest") f.write(manifest, '{"updated":true}\n');
    if (change === "families") {
      for (const name of ["zulu", "alpha"]) f.write(`plugins/${name}/renders/${name}.png`, "New image\n");
    }
    if (change === "many families") {
      for (const name of ["a-very-long-family-name", "another-long-family-name", "third-long-family-name"]) {
        f.write(`plugins/${name}/renders/${name}.png`, "New image\n");
      }
    }
    assert.deepEqual(successful(f.run("stage")), { changed: "true" });
    assert.equal(await f.message(), expected);
    assert.ok(expected.length <= 72);
  });
}
