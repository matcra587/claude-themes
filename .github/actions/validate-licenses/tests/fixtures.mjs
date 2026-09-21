import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { validateLicenses } from "../validate.mjs";

const revision = "0123456789abcdef0123456789abcdef01234567";
const source = Buffer.from('{"background":"#112233"}\n');
const license = Buffer.from("MIT License\n\nCopyright (c) Fixture contributors\n\nPermission is hereby granted.\n");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const blob = (bytes) => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
const manifestPath = (family) => `plugins/${family}/.claude-plugin/plugin.json`;

function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), "license-validation-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = join(temporary, "repository");
  mkdirSync(root);
  const files = new Map([
    ["palette.json", source],
    ["LICENSE", license],
  ]);
  const tree = [...files].map(([path, bytes]) => ({
    path, mode: "100644", type: "blob", sha: blob(bytes),
  }));
  const trees = new Map([[revision, tree]]);
  const calls = [];
  const errors = [];
  const failed = [];
  const summaries = [];
  const api = { detectedLicense: "MIT", contentError: null, licenseError: null, treeError: null };
  const summary = {
    addHeading(...args) { summaries.push(args); return this; },
    addRaw(...args) { summaries.push(args); return this; },
    async write() { summaries.push("written"); return this; },
  };
  const core = {
    error(message, properties) { errors.push({ message, properties }); },
    setFailed(message) { failed.push(message); },
    info() {}, summary,
  };
  function write(path, content) {
    const destination = join(root, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, content);
    return destination;
  }
  function record(overrides = {}) {
    return {
      repository: "upstream/palette",
      revision,
      path: "palette.json",
      sha256: digest(source),
      license: "MIT",
      licensePath: "LICENSE",
      licenseSha256: digest(license),
      notice: "LICENSES/upstream.txt",
      ...overrides,
    };
  }
  function palette(family, name, evidence = record()) {
    return write(`plugins/${family}/palettes/${name}.json`, JSON.stringify({ source: {
      url: `https://github.com/${evidence.repository}/blob/${evidence.revision}/${evidence.path}`,
      sha256: evidence.sha256,
    } }));
  }
  function addFamily(family = "sample", stems = [family], upstream = [record()], paletteNames = stems.map((stem) => stem.replace(/-ansi$/, ""))) {
    write(manifestPath(family), JSON.stringify({ name: family, license: "MIT", metadata: { upstream } }));
    write(`plugins/${family}/LICENSES/upstream.txt`, license);
    for (const stem of stems) write(`plugins/${family}/themes/${stem}.json`, "{}\n");
    for (const name of paletteNames) palette(family, name, upstream[0]);
  }
  function updateManifest(change, family = "sample") {
    const manifest = JSON.parse(readFileSync(join(root, manifestPath(family)), "utf8"));
    change(manifest);
    write(manifestPath(family), JSON.stringify(manifest));
  }
  function content(path) {
    assert.ok(files.has(path), `Unexpected upstream file: ${path}`);
    const bytes = files.get(path);
    return {
      type: "file", path, name: path.split("/").at(-1), sha: blob(bytes), encoding: "base64",
      content: bytes.toString("base64"),
      git_url: `https://api.github.com/repos/upstream/palette/git/blobs/${blob(bytes)}`,
    };
  }
  function checkRequest(name, request) {
    calls.push({ name, ...request });
    assert.equal(request.owner, "upstream");
    assert.equal(request.repo, "palette");
    if (name === "tree") assert.ok(trees.has(request.tree_sha), "Git tree must come from the pinned revision.");
    else assert.equal(request.ref, revision);
  }
  const github = { rest: {
    repos: {
      async getContent(request) {
        checkRequest("content", request);
        if (api.contentError) throw api.contentError;
        const data = content(request.path);
        return { data: api.transformContent ? api.transformContent(data) : data };
      },
    },
    licenses: {
      async getForRepo(request) {
        checkRequest("license", request);
        if (api.licenseError) throw api.licenseError;
        const data = { ...content("LICENSE"), license: { spdx_id: api.detectedLicense } };
        return { data: api.transformLicense ? api.transformLicense(data) : data };
      },
    },
    git: {
      async getTree(request) {
        checkRequest("tree", request);
        if (api.treeError) throw api.treeError;
        return { data: { tree: trees.get(request.tree_sha), truncated: Boolean(api.truncated) } };
      },
    },
  } };
  addFamily();
  return {
    root, temporary, write, record, palette, addFamily, updateManifest, files, tree, trees, api, calls, errors, failed, summaries,
    run(files = ["plugins/sample/themes/sample.json"]) {
      return validateLicenses({ github, core, root, files });
    },
  };
}

function successful(f, result, checked = ["sample"]) {
  assert.deepEqual(result, { checked, failures: [] });
  assert.deepEqual(f.errors, []);
  assert.deepEqual(f.failed, []);
}

function rejected(f, result, pattern) {
  assert.ok(result.failures.length > 0, "Invalid license evidence must fail validation.");
  assert.match(result.failures.map((failure) => failure.message).join("\n"), pattern);
  assert.ok(result.failures.every((failure) => typeof failure.file === "string" && failure.file.length > 0));
  assert.ok(f.errors.length > 0, "Validation failures must create GitHub annotations.");
  assert.ok(f.failed.length > 0, "Validation failures must fail the action.");
}

export { blob, digest, fixture, license, manifestPath, rejected, revision, source, successful };
