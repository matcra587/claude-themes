import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ACCEPTED_LICENSES = new Set([
  "MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD",
  "Zlib", "Unlicense", "CC0-1.0", "CC-BY-4.0",
]);
const FAMILY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA = /^[a-f0-9]{40}$/i;
const SHA256 = /^[a-f0-9]{64}$/i;

function relativePath(value, label) {
  if (
    typeof value !== "string"
    || !value
    || /[\\:%?#\x00-\x1f\x7f]/.test(value)
    || value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`${label} must be a relative path without traversal or URL encoding.`);
  }
  return value;
}

function localPath(root, name, optional = false) {
  relativePath(name, "Local path");
  let path = root;
  for (const part of ["", ...name.split("/")]) {
    path = join(path, part);
    let stat;
    try {
      stat = lstatSync(path);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw new Error(`Cannot read local path ${name}: ${error.code ?? "filesystem error"}.`);
      }
      if (optional) {
        return null;
      }
      throw new Error(`Required file is missing: ${name}.`);
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`Local symlinks are not supported: ${name}.`);
    }
  }
  return path;
}

function localFile(root, name) {
  const path = localPath(root, name);
  if (!lstatSync(path).isFile()) {
    throw new Error(`Expected a regular file: ${name}.`);
  }
  return readFileSync(path);
}

function selectedFamilies(root, files, fail) {
  const families = new Set();
  for (const file of files) {
    try {
      if (typeof file !== "string") {
        throw new Error("Changed files must be repository-relative paths.");
      }
      if (!file.startsWith("plugins/")) {
        continue;
      }
      relativePath(file, "Changed plugin path");
      const [, family, ...parts] = file.split("/");
      if (!FAMILY.test(family) || parts.length === 0) {
        throw new Error("Invalid plugin family path.");
      }
      const child = parts.join("/");
      if (child === "PREVIEWS.md" || /^renders\/[^/]+\.png$/.test(child)) {
        continue;
      }
      families.add(family);
      localPath(root, file, true);
    } catch (error) {
      fail(typeof file === "string" ? file : ".", error.message);
    }
  }
  return [...families].sort();
}

function validateUpstreamRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Upstream record must be an object.");
  }
  if (
    typeof record.repository !== "string"
    || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\/[a-z0-9._-]+$/i.test(record.repository)
    || [".", ".."].includes(record.repository.split("/")[1])
  ) {
    throw new Error("Upstream repository must be owner/repo on GitHub.");
  }
  if (typeof record.revision !== "string" || !SHA.test(record.revision)) {
    throw new Error("Upstream revision must be a full 40-character commit SHA.");
  }
  for (const key of ["sha256", "licenseSha256"]) {
    if (typeof record[key] !== "string" || !SHA256.test(record[key])) {
      throw new Error(`Upstream ${key} must be a SHA-256 checksum.`);
    }
  }
  for (const key of ["path", "licensePath", "notice"]) {
    relativePath(record[key], `Upstream ${key}`);
  }
  if (!ACCEPTED_LICENSES.has(record.license)) {
    throw new Error(`Upstream license is not accepted: ${record.license ?? "missing"}.`);
  }
}

function decodeFile(data, path, sha) {
  if (
    !data
    || data.type !== "file"
    || data.path !== path
    || data.sha !== sha
    || Object.hasOwn(data, "target")
    || Object.hasOwn(data, "submodule_git_url")
  ) {
    throw new Error(`Upstream verification expected the regular file ${path} at its recorded Git blob.`);
  }
  if (data.encoding !== "base64" || typeof data.content !== "string") {
    throw new Error(`Upstream verification could not read base64 file content: ${path}.`);
  }
  const encoded = data.content.replace(/\s/g, "");
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded) {
    throw new Error(`Upstream verification returned invalid base64: ${path}.`);
  }
  return bytes;
}

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const normalizedNotice = (bytes) => bytes.toString("latin1").replace(/\r\n/g, "\n");

function verifyPalettes(root, family, records, fail) {
  const themes = localPath(root, `plugins/${family}/themes`, true);
  if (!themes) {
    return;
  }
  const directory = localPath(root, `plugins/${family}/palettes`, true);
  const candidates = directory
    ? readdirSync(directory)
      .filter((name) => name.endsWith(".json"))
      .sort((left, right) => right.length - left.length)
    : [];
  const checkedPalettes = new Set();
  for (const name of readdirSync(themes).filter((name) => name.endsWith(".json"))) {
    const theme = `plugins/${family}/themes/${name}`;
    let file = theme;
    try {
      localFile(root, theme);
      const variant = name.slice(0, -5).replace(/-ansi$/, "");
      const paletteName = candidates.find((candidate) => {
        const stem = candidate.slice(0, -5);
        return variant === stem || variant.startsWith(`${stem}-`);
      });
      if (!paletteName) {
        throw new Error("Theme is missing its terminal palette and upstream license evidence.");
      }
      file = `plugins/${family}/palettes/${paletteName}`;
      if (checkedPalettes.has(file)) {
        continue;
      }
      checkedPalettes.add(file);
      let source;
      try {
        const palette = JSON.parse(localFile(root, file).toString("utf8"));
        source = palette?.source;
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error("Terminal palette must contain valid JSON.");
        }
        throw error;
      }
      const hasMatchingSource = records.some((record) => {
        if (
          typeof record?.repository !== "string"
          || typeof record.revision !== "string"
          || typeof record.path !== "string"
          || typeof record.sha256 !== "string"
        ) {
          return false;
        }
        const path = record.path.split("/").map(encodeURIComponent).join("/");
        const urls = [
          `https://github.com/${record.repository}/blob/${record.revision}/${path}`,
          `https://raw.githubusercontent.com/${record.repository}/${record.revision}/${path}`,
        ];
        return urls.includes(source?.url)
          && typeof source.sha256 === "string"
          && source.sha256.toLowerCase() === record.sha256.toLowerCase();
      });
      if (!hasMatchingSource) {
        throw new Error("Terminal palette source URL and SHA-256 must match a pinned metadata.upstream record.");
      }
    } catch (error) {
      fail(file, error.message);
    }
  }
}

export async function validateLicenses({ github, core, root = process.cwd(), files }) {
  root = resolve(root);
  const checked = [];
  const failures = [];
  const cache = new Map();
  const fail = (file, message) => {
    failures.push({ file, message });
    core.error(message, { file });
  };
  async function request(key, get) {
    if (!cache.has(key)) {
      cache.set(key, Promise.resolve().then(get));
    }
    try {
      return (await cache.get(key)).data;
    } catch (error) {
      throw new Error(`Upstream verification unavailable: GitHub ${error.status ? `HTTP ${error.status}` : "request failed"}.`);
    }
  }
  async function resolveFileBlobSha(repository, revision, path) {
    // GitHub's Contents API can dereference symlinks, so check Git tree modes before accepting bytes.
    const [owner, repo] = repository.split("/");
    const parts = path.split("/");
    let sha = revision;
    for (let index = 0; index < parts.length; index++) {
      const tree = await request(`tree/${repository}/${sha}`, () => (
        github.rest.git.getTree({ owner, repo, tree_sha: sha })
      ));
      if (!Array.isArray(tree?.tree) || tree.truncated) {
        throw new Error("Upstream verification returned an incomplete Git tree.");
      }
      const entries = tree.tree.filter((entry) => entry.path === parts[index]);
      const entry = entries.length === 1 ? entries[0] : null;
      const isFile = index === parts.length - 1;
      const expectedType = isFile ? "blob" : "tree";
      const allowedModes = isFile ? ["100644", "100755"] : ["040000"];
      if (
        !entry
        || !SHA.test(entry.sha)
        || entry.type !== expectedType
        || !allowedModes.includes(entry.mode)
      ) {
        throw new Error(`Upstream path must resolve to a regular file without symlinks or submodules: ${path}.`);
      }
      sha = entry.sha;
    }
    return sha;
  }
  async function verifyUpstreamRecord(record, family) {
    validateUpstreamRecord(record);
    const repository = record.repository.toLowerCase();
    const revision = record.revision.toLowerCase();
    const [owner, repo] = repository.split("/");
    const notice = localFile(root, `plugins/${family}/${record.notice}`);
    const sourceSha = await resolveFileBlobSha(repository, revision, record.path);
    const licenseSha = await resolveFileBlobSha(repository, revision, record.licensePath);
    const source = await request(`file/${repository}/${revision}/${record.path}`, () => (
      github.rest.repos.getContent({ owner, repo, ref: revision, path: record.path })
    ));
    if (digest(decodeFile(source, record.path, sourceSha)) !== record.sha256.toLowerCase()) {
      throw new Error(`Upstream source SHA-256 checksum mismatch: ${record.path}.`);
    }
    const license = await request(`license/${repository}/${revision}`, () => (
      github.rest.licenses.getForRepo({ owner, repo, ref: revision })
    ));
    if (license?.path !== record.licensePath) {
      throw new Error(`Detected upstream license path does not match licensePath: ${record.licensePath}.`);
    }
    const detected = license.license?.spdx_id;
    if (!ACCEPTED_LICENSES.has(detected) || detected !== record.license) {
      throw new Error(`Detected upstream license ${detected ?? "unknown"} does not match accepted declaration ${record.license}.`);
    }
    const bytes = decodeFile(license, record.licensePath, licenseSha);
    if (digest(bytes) !== record.licenseSha256.toLowerCase()) {
      throw new Error("Upstream license SHA-256 checksum mismatch.");
    }
    if (normalizedNotice(notice) !== normalizedNotice(bytes)) {
      throw new Error(`Packaged notice does not match upstream license text: ${record.notice}.`);
    }
  }
  for (const family of selectedFamilies(root, files, fail)) {
    const manifest = `plugins/${family}/.claude-plugin/plugin.json`;
    try {
      const directory = localPath(root, `plugins/${family}`, true);
      if (!directory) {
        continue;
      }
      checked.push(family);
      if (!lstatSync(directory).isDirectory()) {
        throw new Error("Plugin family must be a directory.");
      }
      let plugin;
      const bytes = localFile(root, manifest);
      try {
        plugin = JSON.parse(bytes.toString("utf8"));
      } catch {
        throw new Error("Plugin manifest must contain valid JSON.");
      }
      if (!plugin || typeof plugin !== "object" || Array.isArray(plugin)) {
        throw new Error("Plugin manifest must be an object.");
      }
      if (!ACCEPTED_LICENSES.has(plugin.license)) {
        fail(manifest, `Plugin license is not accepted: ${plugin.license ?? "missing"}.`);
      }
      const records = plugin.metadata?.upstream;
      if (!Array.isArray(records) || records.length === 0) {
        throw new Error("Plugin metadata.upstream must contain at least one upstream license record.");
      }
      for (const [index, record] of records.entries()) {
        try {
          await verifyUpstreamRecord(record, family);
        } catch (error) {
          fail(manifest, `Upstream record ${index + 1}: ${error.message}`);
        }
      }
      verifyPalettes(root, family, records, fail);
    } catch (error) {
      fail(manifest, error.message);
    }
  }
  const summary = `Checked ${checked.length} changed theme ${checked.length === 1 ? "family" : "families"}; ${failures.length} license verification ${failures.length === 1 ? "failure" : "failures"}.`;
  core.info(summary);
  if (failures.length > 0) {
    core.setFailed("License verification failed. See the annotated files for details.");
  }
  await core.summary.addHeading("License verification", 2).addRaw(`${summary}\n`).write();
  return { checked, failures };
}
