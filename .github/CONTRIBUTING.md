# Contributing

Notes for working on the marketplace itself: adding a theme family, validating it the way CI will, and the expectations on commits.

End users don't need anything here. To install a theme, see the [README](../README.md).

## Where to start

* **Something renders broken or unreadable?** Open an [issue](https://github.com/matcra587/claude-themes/issues) with a screenshot plus your terminal and palette. Rendering problems are often palette-specific, so that context is half the diagnosis.
* **Proposing a new family?** Read *What's welcome* below, then open an issue before you build. Palette choice is opinionated, and it's better to sort out whether a family belongs here before you've mapped 72 tokens.
* **Fixing an existing theme?** Small mapping fixes can go straight to a PR. Run the validator first (see *Validation and CI*).

Questions are welcome too. Not sure whether a palette qualifies, or whether a collision is a bug? Ask in an issue.

## What's welcome

New families, ANSI variants for existing ones, and fixes to semantic mappings. Light themes especially: I run Catppuccin Mocha day-to-day and dark themes generally, so light variants get the least real-world testing here. A contributor who actually lives in a light terminal will catch contrast and hierarchy problems I won't.

**What gets declined:** palettes without a clear canonical upstream (a GitHub repo, official spec, or original colorscheme file), ad-hoc personal palettes, and meta-frameworks like Base16.

Two things hold for every change:

* **Schema validation must pass** (CI runs it on every PR).
* **Every flagged audit issue gets resolved** before merge.

## Prerequisites

Strictly, none: a theme is a JSON file, the `$schema` key gives you editor validation as you type, and CI validates every PR. The tools below are for the local loop — running the same validation CI runs, and testing themes live.

* **[uv](https://docs.astral.sh/uv/)** runs `scripts/schema-validation.py` (CI-identical validation) and `scripts/themes.py` (symlink-install for live testing). Both are PEP 723 scripts, so uv provisions Python and dependencies on first run; the cc-theme-dev skill also assumes it. `themes.py` is stdlib-only and runs under plain `python3` too.
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

Tokens absent from `overrides` fall through to the `base` preset at runtime. [`schemas/theme.schema.json`](../schemas/theme.schema.json) is the authority on token names: currently 72, covering the full set Claude Code accepts, including a few the official docs haven't caught up with. Every theme file carries a `$schema` key pointing at the canonical raw URL so editors validate as you type.

> [!WARNING]
> Unknown tokens and invalid values are **silently ignored at runtime**. A typo'd token renders fine and does nothing; schema validation is the only thing that catches it.

## Add a family

Two ways to do this: by hand, or by letting Claude Code drive the same loop via the repo's [cc-theme-dev skill](#the-cc-theme-dev-skill-optional).

<details>
<summary><strong>By hand</strong> — the eight steps</summary>

1. **Pick.** A palette with a clear canonical upstream. See *What's welcome* for what qualifies.

2. **Fetch the palette.** `gh api -H "Accept: application/vnd.github.raw"` against the upstream repo; treat it as the source of truth.

3. **Scaffold:**

   ```text
   plugins/<family>/
   ├── .claude-plugin/plugin.json
   ├── themes/<family>-<variant>.json     # plus -ansi.json sibling
   └── README.md
   ```

4. **Build theme files.** Each RGB variant should cover the full token set; the schema is the list (older families predate the newest tokens, so don't copy their coverage blindly). ANSI variants are derived from the RGB variant through the family's terminal port (see *ANSI variants* below).

5. **Register.** Add an alphabetical entry to `.claude-plugin/marketplace.json` and a row to the root `README.md` plugin table.

6. **Validate.** Same script CI runs:

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

Every PR runs the schema-validation workflow: changed theme files are validated against the schema (a change to the schema or the validator re-validates everything), failures annotate the diff inline, and a results comment is upserted on the PR. Markdown is linted with rumdl, and a security workflow (actionlint, zizmor, CodeQL, dependency review) covers the rest.

Local equivalents:

| Command | What it does |
|---|---|
| `uv run scripts/schema-validation.py --changed <files>` | validate specific theme files (what CI does on PRs) |
| `uv run scripts/schema-validation.py --all` | validate every theme in the repo |
| `uvx rumdl check .` | markdown lint |

## The cc-theme-dev skill (optional)

Working on themes with Claude Code in this repo? The project ships a skill at [`.claude/skills/cc-theme-dev/`](../.claude/skills/cc-theme-dev/SKILL.md) that walks the full loop — scaffold a family from a canonical palette, validate, and symlink-install for live testing — and points back at this guide for the mapping rules. Trigger it with "create a theme", "validate my theme", "install my theme locally", and similar.

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
