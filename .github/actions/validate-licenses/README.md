# Validate theme licences

This action checks the sources and licences for theme families changed in a pull request or push. It compares the files from the original project (the upstream) with the details recorded in each plugin, including the copy of the licence shipped with it.

Failed source or licence checks mark the affected file and fail the job. The validation summary shows how many families were checked and how many checks failed.

> [!IMPORTANT]
> Passing these checks does not establish permission to use a palette. Reviewers still need to confirm that the licence covers the files used and that its conditions are met. The action does not check colour accuracy or whether different licences can be used together.

## Which changes are checked?

A change inside `plugins/<family>/` selects that family for checking, with two exceptions:

- Changes to the family's `PREVIEWS.md` do not trigger a check.
- Changes to PNG files directly inside the family's `renders/` directory do not trigger a check.

Deleted families are skipped. Changes to tooling do not trigger checks for unchanged families.

## Record a theme's sources

Add `license` and `metadata.upstream` to `plugins/<family>/.claude-plugin/plugin.json`. The top-level `license` describes your plugin. Each entry in `metadata.upstream` describes an original source file and its licence.

Add an entry for each source file you use, including a separate terminal palette if it comes from another file. Each entry must point to a specific GitHub commit, so the source cannot change underneath the check.

Replace the placeholders in this example with the real details. Use the actual licence for each project; `MIT` is only an example.

```json
{
  "license": "MIT",
  "metadata": {
    "upstream": [
      {
        "repository": "OWNER/REPOSITORY",
        "revision": "<full 40-character commit SHA>",
        "path": "path/to/palette.json",
        "sha256": "<SHA-256 of the source file bytes>",
        "license": "MIT",
        "licensePath": "LICENSE",
        "licenseSha256": "<SHA-256 of the licence file bytes>",
        "notice": "LICENSES/upstream.txt"
      }
    ]
  }
}
```

| Field | What to put here |
| --- | --- |
| `repository` | The original GitHub repository, in `owner/repo` form. |
| `revision` | The full 40-character commit SHA. Branch names and tags are not accepted. |
| `path` | The source file's path inside that repository. |
| `sha256` | The SHA-256 checksum of the source file downloaded from that commit. |
| `license` | The source's licence identifier, such as `MIT`. It must match GitHub's licence detection. |
| `licensePath` | The upstream licence file's path. It must be the file GitHub detects as the repository licence. |
| `licenseSha256` | The SHA-256 checksum of that licence file at the same commit. |
| `notice` | Where you copied the licence inside your plugin, such as `LICENSES/upstream.txt`. |

The action downloads the source and licence from the recorded commit and checks their checksums. It also checks that your copy of the licence matches the upstream text, allowing Windows CRLF line endings. Local and upstream files must be regular files; symlinks and Git submodules are not accepted.

### Link terminal palettes to their sources

Keep terminal palettes in `plugins/<family>/palettes/`. Each theme needs a matching palette from its own family. In the palette's `source` object:

- Set `url` to the original file at the recorded commit, using a GitHub file link containing `/blob/<commit>/` or a `raw.githubusercontent.com` link.
- Set `sha256` to the same checksum as the matching `metadata.upstream` entry.

Palette filenames match theme filenames without a final `-ansi`. For example, both `dracula.json` and `dracula-ansi.json` use `palettes/dracula.json`. A palette can also cover names beginning with its name followed by a hyphen; if several match, the longest name wins.

### Accepted licences

The action accepts `MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `0BSD`, `Zlib`, `Unlicense`, `CC0-1.0` and `CC-BY-4.0`.

Missing source details, unsupported or unrecognised licences, mismatched files and upstreams that cannot be reached all fail the check.

## Test the action locally

Install the pinned tools with mise, then run the tests:

```sh
mise install --locked
mise run test:licenses
mise run test:sources
```

| Command | What it tests |
| --- | --- |
| `mise run test:licenses` | Accepted licences, GitHub's detected licence and the licence copies inside plugins. |
| `mise run test:sources` | Source checksums, file safety, which families are selected and which palettes they use. |

> [!NOTE]
> These tests use temporary files and simulated GitHub responses. They do not contact upstream repositories or change your installed themes.
