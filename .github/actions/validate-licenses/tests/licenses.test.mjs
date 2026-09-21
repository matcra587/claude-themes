import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fixture, license, manifestPath, rejected, successful } from "./fixtures.mjs";

test("pinned source and license evidence passes with a matching packaged notice", async (t) => {
  const f = fixture(t);
  successful(f, await f.run());
  assert.ok(f.calls.some((call) => call.name === "content" && call.path === "palette.json"));
  assert.ok(f.calls.some((call) => call.name === "license"));
  assert.ok(f.calls.some((call) => call.name === "tree"));
  assert.ok(f.summaries.includes("written"));
});

test("packaged notice permits CRLF normalization", async (t) => {
  const f = fixture(t);
  f.write("plugins/sample/LICENSES/upstream.txt", license.toString().replaceAll("\n", "\r\n"));
  successful(f, await f.run());
});

test("missing plugin license fails with a manifest annotation", async (t) => {
  const f = fixture(t);
  f.updateManifest((manifest) => { delete manifest.license; });
  const result = await f.run();
  rejected(f, result, /metadata|upstream|license/i);
  assert.ok(result.failures.some((failure) => failure.file === manifestPath("sample")));
});

for (const field of ["license", "notice"]) {
  test(`missing upstream ${field} fails validation`, async (t) => {
    const f = fixture(t);
    f.updateManifest((manifest) => { delete manifest.metadata.upstream[0][field]; });
    rejected(f, await f.run(), new RegExp(field, "i"));
  });
}

for (const missing of [true, false]) {
  test(`${missing ? "missing" : "modified"} packaged notice fails`, async (t) => {
    const f = fixture(t);
    if (missing) rmSync(join(f.root, "plugins/sample/LICENSES/upstream.txt"));
    else f.write("plugins/sample/LICENSES/upstream.txt", "An incomplete license notice.\n");
    rejected(f, await f.run(), /notice|LICENSES\/upstream\.txt/i);
  });
}

for (const detected of ["BSD-3-Clause", "NOASSERTION", null]) {
  test(`MIT metadata fails when GitHub detects ${String(detected)}`, async (t) => {
    const f = fixture(t);
    f.api.detectedLicense = detected;
    rejected(f, await f.run(), /license|detected|MIT|NOASSERTION/i);
  });
}

for (const location of ["plugin", "upstream"]) {
  test(`disallowed ${location} license fails`, async (t) => {
    const f = fixture(t);
    f.updateManifest((manifest) => {
      if (location === "plugin") manifest.license = "GPL-3.0-only";
      else manifest.metadata.upstream[0].license = "GPL-3.0-only";
    });
    f.api.detectedLicense = "GPL-3.0-only";
    rejected(f, await f.run(), /GPL-3\.0-only|allow|license/i);
  });
}

test("different approved plugin and upstream licenses pass evidence validation", async (t) => {
  const f = fixture(t);
  f.updateManifest((manifest) => { manifest.license = "Apache-2.0"; });
  successful(f, await f.run());
});

test("GitHub detection must cover the declared license path", async (t) => {
  const f = fixture(t);
  f.api.transformLicense = (data) => ({ ...data, path: "OTHER-LICENSE" });
  rejected(f, await f.run(), /license|path|match/i);
});
