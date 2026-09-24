import { execFileSync } from "node:child_process";
import { chmodSync, lstatSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const INPUT = /^plugins\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(themes|palettes)\/([^/]+\.json)$/;
const MANIFEST = /^plugins\/([a-z0-9]+(?:-[a-z0-9]+)*)\/\.claude-plugin\/plugin\.json$/;

function version(value, file) {
  if (typeof value !== "string" || value.trim() !== value || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`${file}: version must be MAJOR.MINOR.PATCH without a prerelease suffix.`);
  }
  const parts = value.split(".").map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error(`${file}: version is too large.`);
  return parts;
}

function compare(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return Math.sign(a[i] - b[i]);
  }
  return 0;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function parse(bytes, file) {
  const value = JSON.parse(bytes);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${file}: expected a JSON object.`);
  }
  return value;
}

function localManifest(root, file) {
  let path = root;
  for (const part of ["", ...file.split("/")]) {
    path = join(path, part);
    if (lstatSync(path).isSymbolicLink()) throw new Error(`${file}: symlinks are not supported.`);
  }
  if (!lstatSync(path).isFile()) throw new Error(`${file}: expected a regular file.`);
  return path;
}

/** Bump committed theme changes, leaving Git staging and publication to the caller. */
export function versionThemes({ root, baseSha, sourceSha, checkOnly = false }) {
  if (typeof checkOnly !== "boolean") throw new Error("checkOnly must be a boolean.");
  root = resolve(root);
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" });
  for (const sha of [baseSha, sourceSha]) {
    if (typeof sha !== "string" || !/^[a-f0-9]{40}$/.test(sha)) throw new Error("Expected full commit SHAs.");
    git("cat-file", "-e", `${sha}^{commit}`);
  }
  if (git("rev-parse", "HEAD").trim() !== sourceSha) throw new Error("The checkout does not match source-sha.");

  const snapshots = new Map();
  const snapshot = (sha) => {
    if (snapshots.has(sha)) return snapshots.get(sha);
    const families = new Map();
    for (const entry of git("ls-tree", "-r", "-z", sha, "--", "plugins").split("\0").filter(Boolean)) {
      const separator = entry.indexOf("\t");
      const header = entry.slice(0, separator);
      const file = entry.slice(separator + 1);
      const input = INPUT.exec(file);
      const manifest = MANIFEST.exec(file);
      if (!input && !manifest) continue;
      const [mode, type, oid] = header.split(" ");
      const family = (input ?? manifest)[1];
      if (!families.has(family)) families.set(family, { inputs: new Map() });
      const record = families.get(family);
      const blob = { file, mode, type, oid };
      if (manifest) record.manifest = blob;
      else record.inputs.set(file, { ...blob, theme: input[2] === "themes" });
    }
    snapshots.set(sha, families);
    return families;
  };
  const before = snapshot(baseSha);
  const after = snapshot(sourceSha);
  const blobs = new Map();
  const read = (blob) => {
    if (!["100644", "100755"].includes(blob.mode) || blob.type !== "blob") {
      throw new Error(`${blob.file}: committed inputs must be regular files.`);
    }
    if (!blobs.has(blob.oid)) {
      const bytes = git("cat-file", "blob", blob.oid);
      const value = parse(bytes, blob.file);
      blobs.set(blob.oid, { bytes, value, key: JSON.stringify(canonical(value)) });
    }
    return blobs.get(blob.oid);
  };
  const differences = (previous, current) => {
    const result = { changed: false, addedTheme: false, needsDecision: false };
    for (const name of new Set([...previous.inputs.keys(), ...current.inputs.keys()])) {
      const oldInput = previous.inputs.get(name);
      const newInput = current.inputs.get(name);
      if (oldInput?.oid === newInput?.oid) continue;
      const oldData = oldInput ? read(oldInput) : null;
      const newData = newInput ? read(newInput) : null;
      if (oldData?.key === newData?.key) continue;
      result.changed = true;
      if (newInput?.theme && !oldInput) result.addedTheme = true;
      if (oldInput?.theme && (!newInput || oldData.value.name !== newData.value.name)) result.needsDecision = true;
    }
    return result;
  };
  const minimumVersion = (previous, addedTheme, file) => version((addedTheme
    ? [previous[0], previous[1] + 1, 0]
    : [previous[0], previous[1], previous[2] + 1]).join("."), file);
  const changes = [];
  for (const [family, current] of after) {
    const previous = before.get(family);
    const names = new Set([...(previous?.inputs.keys() ?? []), ...current.inputs.keys()]);
    if (previous?.manifest?.oid === current.manifest?.oid
        && [...names].every((name) => previous?.inputs.get(name)?.oid === current.inputs.get(name)?.oid)) continue;
    if (!current.manifest) throw new Error(`${family}: plugin manifest is missing.`);
    const { file } = current.manifest;
    const { bytes, value } = read(current.manifest);
    const currentVersion = version(value.version, file);
    const path = localManifest(root, file);
    if (readFileSync(path, "utf8") !== bytes) throw new Error(`${file}: uncommitted changes would be overwritten.`);
    if (!previous) continue;
    if (!previous.manifest) throw new Error(`${family}: comparison commit has no plugin manifest.`);
    let baseline = previous;
    let baselineVersion = version(read(previous.manifest).value.version, file);
    if (compare(currentVersion, baselineVersion) < 0) throw new Error(`${file}: version cannot decrease.`);
    if (compare(currentVersion, baselineVersion) > 0) {
      // A version-only commit can ship before the next preview checkpoint.
      // First-parent history treats a merged contribution as one decision.
      const commits = git("log", "--first-parent", "--full-history", "--reverse", "--format=%H", `${baseSha}..${sourceSha}`, "--", file);
      for (const sha of commits.trim().split("\n").filter(Boolean)) {
        const published = snapshot(sha).get(family);
        if (!published?.manifest) throw new Error(`${file}: version history has a missing manifest.`);
        const publishedVersion = version(read(published.manifest).value.version, file);
        const order = compare(publishedVersion, baselineVersion);
        if (order < 0) throw new Error(`${file}: version cannot decrease.`);
        if (order === 0) continue;
        const delta = differences(baseline, published);
        if (delta.changed && !delta.needsDecision) {
          const minimum = minimumVersion(baselineVersion, delta.addedTheme, file);
          if (compare(publishedVersion, minimum) < 0) throw new Error(`${file}: this change requires version ${minimum.join(".")} or higher.`);
        }
        baseline = published;
        baselineVersion = publishedVersion;
      }
      if (compare(currentVersion, baselineVersion) !== 0) throw new Error(`${file}: could not establish its version history.`);
    }

    const { changed, addedTheme, needsDecision } = differences(baseline, current);
    if (!changed) continue;
    if (needsDecision) throw new Error(`${file}: removing, renaming or changing a theme's display name requires an explicit version bump.`);
    const next = minimumVersion(baselineVersion, addedTheme, file).join(".");
    changes.push({ file, path, from: value.version, to: next, content: `${JSON.stringify({ ...value, version: next }, null, 2)}\n` });
  }

  // Validate and prepare every family before replacing any manifest.
  const prepared = [];
  try {
    if (!checkOnly) {
      for (const change of changes) {
        const temporary = join(dirname(change.path), `.version-${randomUUID()}.tmp`);
        const mode = lstatSync(change.path).mode & 0o777;
        writeFileSync(temporary, change.content, { flag: "wx", mode });
        prepared.push({ ...change, temporary });
        chmodSync(temporary, mode);
      }
      for (const change of prepared) renameSync(change.temporary, change.path);
    }
  } finally {
    for (const change of prepared) rmSync(change.temporary, { force: true });
  }
  return changes.map(({ file, from, to }) => ({ file, from, to }))
    .sort((a, b) => {
      if (a.file === b.file) return 0;
      return a.file < b.file ? -1 : 1;
    });
}
