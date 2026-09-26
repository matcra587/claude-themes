# Contributing

Notes for working on the marketplace itself: adding a theme family, validating it the way CI will, and the expectations on commits.

End users don't need anything here. To install a theme, see the [README](README.md).

## Where to start

* **Something renders broken or unreadable?** Open an [issue](https://github.com/matcra587/claude-themes/issues) with a screenshot plus your terminal and palette. Rendering problems are often palette-specific, so that context is half the diagnosis.
* **Proposing a new family?** Read *What's welcome* below, then open an issue before you build. Palette choice is opinionated, and it's better to sort out whether a family belongs here before you've mapped 72 tokens.
* **Fixing an existing theme?** Small mapping fixes can go straight to a PR. Run the validator first (see *Validation and CI*).

Questions are welcome too. Not sure whether a palette qualifies, or whether a collision is a bug? Ask in an issue.

## What's welcome

New families, ANSI variants for existing ones, and fixes to semantic mappings. Light themes especially: I run Catppuccin Mocha day-to-day and dark themes generally, so light variants get the least real-world testing here. A contributor who actually lives in a light terminal will catch contrast and hierarchy problems I won't.

**What gets declined:** palettes without a clear canonical upstream (a GitHub repo, official spec, or original colorscheme file), ad-hoc personal palettes, and unreviewed bulk imports of theme collections. Named schemes such as Base16 Ocean need their own source, licence and colour review.

> [!IMPORTANT]
> Use palettes with a valid licence that permits redistribution, and check that it covers the source files you use. Follow its terms, preserve required notices and credit, and document your changes. Include the [source and licence records](#source-and-licence-records) with your contribution.

Two things hold for every change:

* **Schema validation must pass** (CI runs it on every PR).
* **Every flagged audit issue gets resolved** before merge.

## Prerequisites

Strictly, none: a theme is a JSON file, the `$schema` key gives you editor validation as you type, and CI validates every PR. The tools below are for the local loop — running the same validation CI runs, and testing themes live.

* **[uv](https://docs.astral.sh/uv/)** runs schema validation. The script declares Python 3.14 and its dependencies inline, so uv provisions them on first run; the cc-theme-dev skill also assumes it.
* **[mise](https://mise.jdx.dev/)** installs the pinned tools with `mise install --locked`. Run `mise tasks --local` to discover available tasks.
* **[gh](https://cli.github.com/)** fetches canonical palettes from upstream repos on the command line. Downloading the palette file in a browser works just as well.
* **`jq`** is optional: degraded fallback checks for when uv is unavailable.

## Theme format

The file format — `name`, `base`, `overrides`, and the accepted color value forms — is documented in [Claude Code's theme docs](https://code.claude.com/docs/en/terminal-config#create-a-custom-theme). A theme file looks like this (excerpt; a real RGB variant covers the full token set):

```json
{
  "$schema": "https://raw.githubusercontent.com/matcra587/claude-themes/main/schemas/theme.schema.json",
  "name": "Nord",
  "base": "dark",
  "overrides": {
    "text": "rgb(216,222,233)",
    "claude": "#d08770",
    "permission": "#81a1c1",
    "success": "#a3be8c",
    "error": "#bf616a"
  }
}
```

Tokens absent from `overrides` fall through to the `base` preset at runtime. [`schemas/theme.schema.json`](schemas/theme.schema.json) is the authority on token names: currently 72, covering the full set Claude Code accepts, including a few the official docs haven't caught up with. Every theme file carries a `$schema` key pointing at the canonical raw URL so editors validate as you type.

> [!WARNING]
> Unknown tokens and invalid values are **silently ignored at runtime**. A typo'd token renders fine and does nothing; schema validation is the only thing that catches it.

## Add a family

Two ways to do this: by hand, or by letting Claude Code drive the same loop via the repo's [cc-theme-dev skill](#the-cc-theme-dev-skill-optional).

<details>
<summary><strong>By hand</strong> — the eight steps</summary>

1. **Pick.** A palette with a clear canonical upstream. See *What's welcome* for what qualifies.

2. **Fetch the palette and its licence.** `gh api -H "Accept: application/vnd.github.raw"` against the upstream repo; treat it as the source of truth. Pin both files to a specific commit for the [source and licence records](#source-and-licence-records).

3. **Scaffold:**

   ```text
   plugins/<family>/
   ├── .claude-plugin/plugin.json
   ├── LICENSES/upstream.txt             # copy of the upstream licence
   ├── palettes/<family>-<variant>.json  # terminal palette and pinned source
   ├── themes/<family>-<variant>.json    # plus -ansi.json sibling
   └── README.md
   ```

4. **Build theme files.** Each RGB variant should cover the full token set; the schema is the list (older families predate the newest tokens, so don't copy their coverage blindly). ANSI variants are derived from the RGB variant through the family's terminal port (see *ANSI variants* below).

5. **Register.** Add an alphabetical entry to `.claude-plugin/marketplace.json` and a row to the root `README.md` plugin table.

6. **Validate.** Run the schema check below. CI also checks the family's [source and licence records](#source-and-licence-records).

   ```sh
   uv run scripts/schema-validation.py --changed plugins/<family>/themes/*.json
   ```

7. **Audit.** Verify against the [audit checklist](#audit-checklist). Manually or with a script, whichever fits, but resolve every issue before commit.

8. **Commit.** `feat(<family>): add <Family> theme plugin (<variants>)`. The body should name the palette source, list any derived values, and explain judgment calls.

</details>

<details>
<summary><strong>With Claude Code</strong> — the cc-theme-dev skill</summary>

Say "create a theme for <family>" in a Claude Code session in this repo; the skill walks the same pick → fetch → scaffold → validate → install loop and enforces the same audit rules. Details, including the one read-only shell command it runs on trigger, are in [the skill section](#the-cc-theme-dev-skill-optional).

</details>

## Source and licence records

New families and existing families you change need source and licence records. See the [licence action's record example and accepted licences](.github/actions/validate-licenses/README.md#record-a-themes-sources) for the full format.

* In `plugins/<family>/.claude-plugin/plugin.json`, set the top-level `license` for the plugin and add a `metadata.upstream` entry for each upstream source file you use, including separate terminal palette sources. Record the upstream repository, full commit SHA, source and licence paths, and their SHA-256 checksums.
* Copy each upstream licence into the plugin, for example at `LICENSES/upstream.txt`, and set the corresponding entry's `notice` to that relative path. Preserve the upstream licence text and any other required notices or credit.
* Add a matching file in the family's `palettes/` directory for every theme. RGB and ANSI variants can share a palette. Set its `source.url` to the upstream file at the recorded commit and its `source.sha256` to the matching `metadata.upstream` checksum; see the [palette matching rules](.github/actions/validate-licenses/README.md#link-terminal-palettes-to-their-sources).

## Semantic mapping

Pick palette colors in *priority order*:

1. **Documented spec.** If the upstream specifies role mappings (which palette color is for errors, warnings, success, etc.), follow them.
2. **Industry convention.** `success=green`, `error=red`, `warning=yellow`, `permission=blue`, `claude=warm/orange`, `autoAccept=violet`, `planMode=teal/sage/aqua`.
3. **Visual closeness.** When the palette lacks a named role, pick the closest-feeling color and document the choice in the commit body.

## Shimmer derivation

* **Native pair**: use the palette's own bright variant when the family ships paired accents.
* **Derived**: otherwise lighten by ~20 across channels, clamped to 255.

ANSI shimmers follow Anthropic's one deliberate cross-hue exception (`claude=redBright`, `claudeShimmer=yellowBright`): a warm red-to-yellow ramp that approximates brand orange in 16-color ANSI. Ports that define an orange extended slot (catppuccin peach at `ansi256(16)`, say) map `claude` to it directly instead.

## ANSI variants

An ANSI variant assumes the user's terminal runs that family's terminal port; that assumption is the whole point of picking one. Slot names resolve through the terminal palette at render time, so each family's ANSI files are derived from its RGB theme rather than copied from a shared template.

Start from the family's published terminal port — its upstream style guide and/or GitHub repo, or a well-respected community port when no official one exists. The port defines which palette color occupies each ANSI slot. Modern ports put surface and subtext tones in the black and white slots, and their brights are more saturated rather than lighter, so stock values (`black`≈#000, `brightBlack`≈grey) can't be assumed.

For each token, choose the slot whose *resolved* color sits closest to the RGB value. Normal slots take priority for exact accent matches; bright slots serve as the saturated variants. Base the file on `dark-ansi`/`light-ansi` and override only tokens that differ from the preset.

Greys with no slot (base/mantle/crust analogues) come from the fixed greyscale ramp `ansi256(232)`–`(255)`; `ansi256(234)` ≈ `#1e1e2e`, for example. Extended slots the port defines (catppuccin `color16` = peach, `color17` = rosewater) are used via `ansi256(16)`/`(17)`. Terminals that can't remap those render xterm defaults; treat that as the terminal's limitation and keep the mapping faithful.

Never pair two grey slots as foreground and background. `black`-slot text on a `blackBright`-slot background resolves to adjacent surface tones in themed palettes and becomes unreadable. Keep surface backgrounds on nominally-dark slots so the renderer picks a light foreground.

Flavours sharing one terminal mapping (catppuccin frappé/macchiato/mocha) naturally end up with identical ANSI file content.

## Validation and CI

Every PR runs CI: changed theme files are validated against the schema (a change to the schema or the validator re-validates everything), failures annotate the diff inline, and a results comment is upserted on the PR. Markdown is linted with rumdl, and a security workflow (actionlint, zizmor, CodeQL, dependency review) covers the rest.

CI also verifies source and licence records for changed families on PRs and pushes to `main`. Any change inside `plugins/<family>/` selects that family, except generated `PREVIEWS.md` files and PNG files directly inside `renders/`. Existing families you change must have the required records; unchanged families are not checked, and deleted families are skipped. Missing records or failed upstream verification fail CI. Passing checks does not replace reviewing the licence terms.

The separate Tests workflow runs the licence action's unit tests when changes to its implementation, tests or test workflow reach `main`. These tests use fixtures and simulated GitHub responses; they do not verify the source and licence records in your contribution.

Local equivalents:

| Command | What it does |
|---|---|
| `uv run scripts/schema-validation.py --changed <files>` | validate specific theme files (what CI does on PRs) |
| `uv run scripts/schema-validation.py --all` | validate every theme in the repo |
| `uvx rumdl check .` | markdown lint |

## Plugin versions

After a change reaches `main`, the preview workflow updates each affected plugin's version and commits it with the previews. It does not write back to the pull request.

| Change | Version update |
| --- | --- |
| Correct colours or change a terminal palette, including its source revision | Patch, such as `0.1.0` to `0.1.1` |
| Add a theme or variant to an existing plugin | Minor, such as `0.1.1` to `0.2.0` |
| Remove or rename a theme, or change its display name | Increase the version yourself in `.claude-plugin/plugin.json`; CI fails if you leave it unchanged. |
| Add a new plugin | Keep the initial version in its manifest. |
| Change documentation, generated images or JSON formatting only | No automatic bump. |

You can set the version yourself. CI keeps an explicit increase when it is large enough for the change and fails if it is too small. When removing a theme, renaming its file or changing its display name, choose the version during review because existing users may rely on the old name.

## Test a theme locally

From the repository root, symlink the file you are editing into `~/.claude/themes` (or `$CLAUDE_CONFIG_DIR/themes`). For example:

```bash
mkdir -p "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/themes"
ln -s "$PWD/plugins/dracula/themes/dracula.json" "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/themes/dracula.json"
```

Choose the theme with `/theme` in Claude Code. The symlink keeps it connected to your working copy; remove the link when you finish testing.

## The cc-theme-dev skill (optional)

Working on themes with Claude Code in this repo? The project ships a skill at [`.claude/skills/cc-theme-dev/`](.claude/skills/cc-theme-dev/SKILL.md) that walks the full loop — scaffold a family from a canonical palette, validate, and symlink-install for live testing — and points back at this guide for the mapping rules. Trigger it with "create a theme", "validate my theme", "install my theme locally", and similar.

The skill uses [dynamic context injection](https://code.claude.com/docs/en/skills#inject-dynamic-context): `` !`command` `` placeholders in its SKILL.md execute automatically when the skill triggers, before Claude sees the content.

> [!IMPORTANT]
> Triggering the skill runs one shell command automatically, read-only: `command -v uv`, to detect whether uv is available (picks full validation vs the degraded fallback). To opt out, set `"disableSkillShellExecution": true` in your Claude Code settings; the command is then replaced with `[shell command execution disabled by policy]` instead of being run.

## Audit checklist

Two bugs shipped in every original community theme, so the audit checks them explicitly:

1. **`claude ↔ permission` swapped.** Brand orange and blue must differ in hue family.
2. **`subtle ≡ inactive ≡ inactiveShimmer` collapsed.** These form a three-tier dim hierarchy: `subtle` is comment-grade muted text, `inactive` is the darker disabled tone, `inactiveShimmer` is the mid-tone (palette value or derived).

The full per-family audit must report:

* **Schema validity**: every file passes the validator (CI gates on this).
* **Token coverage**: each RGB variant should override the full token set; investigate large fall-through gaps against the schema.
* **Palette correctness**: every RGB value matches the canonical palette exactly or is a documented derivation.
* **Semantic role check**: `success`/`error`/`warning`/`subtle` map to documented or conventional roles.
* **Brand mappings**: `claude`/`permission`/`autoAccept`/`planMode`/`ide` are sane.
* **Cross-key collisions**: three or more semantically distinct keys sharing one value get flagged. Many collisions are legitimate family re-use; some are bugs.

Resolve every flagged collision before commit. Document deliberate deviations in the commit body.
