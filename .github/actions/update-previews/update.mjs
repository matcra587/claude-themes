import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";

const themePath = /^plugins\/([a-z0-9-]+)\/themes\/([a-z0-9-]+)\.json$/;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

// Check ancestors as well as leaves, including dangling symlinks.
function inspect(file, kind, optional = false) {
  const absolute = resolve(file);
  const parts = absolute.slice(parse(absolute).root.length).split(sep).filter(Boolean);
  let current = parse(absolute).root;
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const stat = lstatSync(current, { throwIfNoEntry: false });
    if (!stat && optional) return undefined;
    if (!stat) throw new Error(`Missing preview file or directory: ${current}`);
    if (stat.isSymbolicLink()) throw new Error(`Preview paths cannot be symlinks: ${current}`);
    const directory = index < parts.length - 1 || kind === "directory";
    if (directory ? !stat.isDirectory() : !stat.isFile()) {
      throw new Error(`Expected a regular ${directory ? "directory" : "file"}: ${current}`);
    }
  }
  return true;
}

function read(file) {
  inspect(file, "file");
  return readFileSync(file);
}

function readManifest(bytes) {
  const manifest = JSON.parse(bytes);
  if (manifest?.format !== 1 || !Array.isArray(manifest.themes)) {
    throw new Error("Unsupported preview manifest.");
  }
  const entries = new Map();
  for (const item of manifest.themes) {
    const match = typeof item?.theme === "string" && themePath.exec(item.theme);
    if (!match || entries.has(item.theme)) {
      throw new Error("Invalid or duplicate theme path in preview manifest.");
    }
    if (item.image !== `plugins/${match[1]}/renders/${match[2]}.png`) {
      throw new Error("Unexpected preview image path.");
    }
    for (const key of ["theme_sha256", "image_sha256", "input_sha256"]) {
      if (typeof item[key] !== "string" || !/^[a-f0-9]{64}$/.test(item[key]) || item[key].length !== 64) {
        throw new Error(`Invalid ${key} in preview manifest.`);
      }
    }
    entries.set(item.theme, item);
  }
  return entries;
}

function contains(parent, child) {
  const path = relative(parent, child);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

function bundleFiles(directory, prefix = "") {
  inspect(directory, "directory");
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix + entry.name;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return bundleFiles(path, `${name}/`);
    inspect(path, "file");
    return [name];
  });
}

function verifyInputs(root, item) {
  const family = item.theme.split("/")[1];
  const variant = parse(item.theme).name.replace(/-ansi$/, "");
  const directory = join(root, "plugins", family, "palettes");
  inspect(directory, "directory");
  const palette = readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .filter((file) => variant === parse(file).name || variant.startsWith(`${parse(file).name}-`))
    .sort((a, b) => b.length - a.length)[0];
  if (!palette) throw new Error(`Missing terminal palette: ${item.theme}`);
  const theme = read(join(root, item.theme));
  const paletteBytes = read(join(directory, palette));
  const runtime = read(join(root, "previews/runtime.json"));
  // Keep the order and separator identical to render.py's inputs().
  const inputs = [
    theme, paletteBytes,
    read(join(root, "assets/fonts/GeistMono-Regular.otf")),
    read(join(root, ".mise/tasks/previews/render.py")),
    runtime,
    read(join(root, "schemas/theme.schema.json")),
  ];
  if (digest(theme) !== item.theme_sha256 || digest(inputs.map(digest).join("\n")) !== item.input_sha256) {
    throw new Error(`Preview inputs changed: ${item.theme}`);
  }
  const data = JSON.parse(theme);
  const base = data.base ?? "dark";
  const syntax = base.endsWith("-ansi") ? "ansi" : base.startsWith("light") ? "GitHub" : "Monokai Extended";
  if (item.name !== data.name || item.claude_code !== JSON.parse(runtime).claude_version
    || item.syntax_theme !== syntax || !isDeepStrictEqual(item.source, JSON.parse(paletteBytes).source)) {
    throw new Error(`Preview metadata does not match current inputs: ${item.theme}`);
  }
}

function imageSlugs(document, generated = false) {
  return [...document.matchAll(/!\[[^\]\r\n]*\]\(([^)\r\n]*)\)/g)].flatMap((match) => {
    const image = /^renders\/([a-z0-9-]+)\.png$/.exec(match[1]);
    if (generated && !image) throw new Error("Generated gallery contains an unexpected image reference.");
    return image ? [image[1]] : [];
  });
}

function sections(document) {
  const result = document.split(/(?=^## )/m);
  if (document.startsWith("## ")) result.unshift("");
  return result;
}

function mergeGallery(current, generated, managed, family) {
  const [prefix, ...old] = sections(current);
  const [newPrefix, ...next] = sections(generated);
  const preserved = old.filter((section) => {
    const images = imageSlugs(section);
    if (!images.some((image) => managed.has(image))) return true;
    const imageCount = [...section.matchAll(/!\[/g)].length;
    if (images.some((image) => !managed.has(image)) || imageCount !== images.length || /<img[\s>]/i.test(section)) {
      throw new Error(`Gallery section mixes managed and manual previews: ${family}`);
    }
    return false;
  });
  const content = [...preserved, ...next];
  const generatedPrefix = `# ${family} theme previews\n\n> [!TIP]\n> Open a preview for a larger view. Expand **Capture details** for rendering information and palette sources.`;
  let heading = prefix.trim() || newPrefix.trim();
  if (!content.length && [generatedPrefix, `# ${family} theme previews`].includes(heading)) heading = "";
  const document = [heading, ...content.map((section) => section.trim())].filter(Boolean).join("\n\n");
  return document + (heading || content.length ? "\n" : "");
}

/** Validate the entire bundle before changing any repository files. */
export function updatePreviews({ root, directory, checkOnly = false }) {
  if (typeof checkOnly !== "boolean") throw new Error("checkOnly must be a boolean.");
  root = resolve(root);
  directory = resolve(root, directory);
  inspect(root, "directory");
  inspect(directory, "directory");
  if (contains(directory, root) || ["plugins", "previews"].some((name) => contains(join(root, name), directory))) {
    throw new Error("Preview bundle must be outside the preview destinations.");
  }
  const manifest = read(join(directory, "manifest.json"));
  const current = readManifest(manifest);
  const manifestPath = join(root, "previews/manifest.json");
  const previous = inspect(manifestPath, "file", true) ? readManifest(read(manifestPath)) : new Map();
  for (const [name] of previous) {
    if (inspect(join(root, name), "file", true) && !current.has(name)) {
      throw new Error(`Preview bundle omits a previously managed theme: ${name}`);
    }
  }
  const expectedFiles = new Set(["manifest.json"]);
  const desired = new Map();
  for (const item of current.values()) {
    verifyInputs(root, item);
    const image = read(join(directory, item.image));
    if (digest(image) !== item.image_sha256) throw new Error(`Preview image hash mismatch: ${item.image}`);
    desired.set(join(root, item.image), image);
    expectedFiles.add(item.image);
    expectedFiles.add(`plugins/${item.theme.split("/")[1]}/PREVIEWS.md`);
  }
  const files = bundleFiles(directory);
  if (files.length !== expectedFiles.size || files.some((file) => !expectedFiles.has(file))) {
    throw new Error("Preview bundle files do not match the manifest.");
  }
  if (!current.size && !previous.size) return false;
  const obsolete = new Set([...previous.values()]
    .filter((item) => !current.has(item.theme)).map((item) => join(root, item.image)));
  const managedFamilies = Map.groupBy([...previous.values(), ...current.values()], (item) => item.theme.split("/")[1]);
  const currentFamilies = Map.groupBy(current.values(), (item) => item.theme.split("/")[1]);
  for (const [family, managedEntries] of managedFamilies) {
    const path = `plugins/${family}/PREVIEWS.md`;
    const destination = join(root, path);
    const exists = inspect(destination, "file", true);
    const old = exists ? read(destination).toString("utf8").replace(/\r\n?/g, "\n") : "";
    const familyEntries = currentFamilies.get(family) ?? [];
    const generated = familyEntries.length ? read(join(directory, path)).toString("utf8").replace(/\r\n?/g, "\n") : "";
    const expected = familyEntries.map((item) => parse(item.image).name).sort();
    if (!isDeepStrictEqual(imageSlugs(generated, true).sort(), expected)) {
      throw new Error(`Gallery images do not match the manifest: ${family}`);
    }
    const managed = new Set(managedEntries.map((item) => parse(item.image).name));
    const merged = mergeGallery(old, generated, managed, family);
    // Custom Markdown can reference images outside the renderer's inline syntax.
    for (const item of managedEntries) {
      if (obsolete.has(join(root, item.image)) && merged.includes(`renders/${parse(item.image).base}`)) {
        throw new Error(`Gallery still references a removed preview: ${item.image}`);
      }
    }
    if (merged) {
      for (const slug of imageSlugs(merged)) {
        const image = join(root, "plugins", family, "renders", `${slug}.png`);
        if (!desired.has(image) && (obsolete.has(image) || !inspect(image, "file", true))) {
          throw new Error(`Gallery references a missing image: ${family}/${slug}`);
        }
      }
      desired.set(destination, Buffer.from(merged));
    } else if (exists) obsolete.add(destination);
  }
  desired.set(manifestPath, manifest);
  const changed = new Map([...desired].filter(([file, bytes]) =>
    !inspect(file, "file", true) || !read(file).equals(bytes)));
  const removed = [...obsolete].filter((file) => inspect(file, "file", true));
  if (!changed.size && !removed.length) return false;
  if (checkOnly) return true;
  for (const [file, bytes] of changed) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  }
  for (const file of removed) unlinkSync(file);
  for (const parent of new Set(removed.map(dirname))) {
    if (parse(parent).base === "renders" && !readdirSync(parent).length) rmdirSync(parent);
  }
  return true;
}
