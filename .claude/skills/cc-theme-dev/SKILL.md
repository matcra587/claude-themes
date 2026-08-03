---
name: cc-theme-dev
description: Author, validate, and locally install Claude Code themes in the claude-themes marketplace — scaffold a new family from a canonical palette, catch tokens that render silently wrong, and symlink themes into the Claude Code themes directory for live testing.
when_to_use: When the user asks to "create a theme", "add a theme family", "validate a theme", "check a theme against the schema", "install a theme locally", "test my theme", or is authoring or debugging a Claude Code theme JSON file in this repository.
argument-hint: "[family|theme-file]"
allowed-tools: Bash(command -v uv), Bash(uv run scripts/schema-validation.py:*), Bash(uv run scripts/themes.py:*), Bash(git status:*)
---

# Theme Development

Author, validate, and locally install themes for the claude-themes
marketplace. Scope: this repository's `plugins/<family>/themes/*.json` files
validated against `schemas/theme.schema.json`.

## Core Concepts

- A theme file has three keys: `name`, `base`, and `overrides`. Tokens absent
  from `overrides` fall through to the `base` preset at runtime.
- `schemas/theme.schema.json` is the authority on token names and color
  value formats.

## Current Environment

- uv: !`command -v uv >/dev/null && echo installed || echo "NOT INSTALLED"`

If uv reads NOT INSTALLED, do NOT run the `uv run` commands; use the jq
fallback under Validating.

## Authoring a New Family

1. **Source the palette before writing any token value** — an upstream GitHub
   repo, official spec, or colorscheme file, fetched with
   `gh api -H "Accept: application/vnd.github.raw"`. Never invent palette
   values.
2. **Scaffold** using an existing family as the structural reference —
   `plugins/catppuccin/` shows the layout: `themes/<family>-<variant>.json`
   (plus a `-ansi.json` sibling), `.claude-plugin/plugin.json`, and a README.
   Register the family in `.claude-plugin/marketplace.json` and the root
   README table.
3. **Map tokens** per `.github/CONTRIBUTING.md` (*Semantic mapping*, *Shimmer
   derivation*) covering the full token set. For `*-ansi.json` files, follow
   `.claude/rules/ansi-variants.md`. When the palette documents no role for a
   token family (no orange for `claude`, no violet for `autoAccept`...), put
   the mapping choice to the user as a question before writing values instead
   of silently picking one.
4. **Validate**, then **install** to test live (both below).

## NEVER

- **NEVER trust a theme because it renders.** Unknown or misspelled tokens
  are silently ignored at runtime — a typo'd override is an invisible no-op.
  Validation is the only thing that catches it.
- **NEVER copy a full preset into `overrides`.** Tokens added by future
  Claude Code versions then never fall through. Override only what differs.
- **NEVER swap `claude` and `permission`.** Brand orange and blue must differ
  in hue family — every original community theme shipped this swap.
- **NEVER collapse `subtle`, `inactive`, and `inactiveShimmer` to one value.**
  They are a three-tier dim hierarchy: comment-grade muted, darker disabled,
  mid-tone respectively.

## Validating a Theme

All commands run from the repository root. Validation is owned by
`scripts/schema-validation.py` — the same script CI runs, so local results
match CI exactly (uv resolves its jsonschema dependency from the script's
inline metadata):

```bash
uv run scripts/schema-validation.py --changed path/to/theme.json
uv run scripts/schema-validation.py --all      # every theme in the repo
```

Failures print as `::error file=...` lines and the exit code is non-zero.
To list candidate files: `git status --porcelain -- 'plugins/*/themes/*.json'`.

Fallback without uv (syntax + token names only, no schema checks):

```bash
python3 -m json.tool theme.json > /dev/null   # syntax
jq -r '.overrides | keys[]' theme.json        # tokens, eyeball against schema
```

## Installing to Test Locally

`scripts/themes.py` symlinks marketplace themes into the Claude Code themes
directory (`~/.claude/themes`, or `$CLAUDE_CONFIG_DIR/themes`), creating it if
needed. Symlinks keep the installed theme in sync with the file being edited,
so a `/theme` switch shows edits immediately.

```bash
uv run scripts/themes.py install <family>           # symlink a family's themes
uv run scripts/themes.py install <family> --dry-run # preview
uv run scripts/themes.py list                       # show installed themes
uv run scripts/themes.py uninstall <family>         # remove them
```

Uninstall only removes symlinks resolving back into this repo — a hand-written
theme or a link pointing elsewhere is never touched, and install guards those
behind `--force`. After installing, tell the user to run `/theme` and pick the
family to see it live.

## Resolving Effective Colors

Resolving a theme to its effective palette (base preset merged with overrides)
needs the built-in preset values, which live in the private `cc-theme-presets`
skill. Use that skill's resolver when override coverage or fall-through
inspection is needed.
