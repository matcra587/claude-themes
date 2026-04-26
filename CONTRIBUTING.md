# Contributing

How to add a theme family to this marketplace.

The theme JSON schema is documented at <https://code.claude.com/docs/en/terminal-config#create-a-custom-theme>. Three fields: `name`, `base` (one of `dark | light | dark-daltonized | light-daltonized | dark-ansi | light-ansi`), and `overrides`. Color values accept `#rrggbb`, `#rgb`, `rgb(r,g,b)`, `ansi256(n)`, or `ansi:<name>`. Unknown tokens and invalid values are ignored.

## Add a family

1. **Pick.** A palette with a clear canonical upstream — a GitHub repo, official spec, or original colorscheme file. Skip ad-hoc palettes and frameworks like Base16.

2. **Fetch the palette.** Use `gh api -H "Accept: application/vnd.github.raw"` against the upstream repo and treat it as the source of truth.

3. **Scaffold:**

   ```text
   plugins/<family>/
   ├── .claude-plugin/plugin.json
   ├── themes/<family>-<variant>.json     # plus -ansi.json sibling
   └── README.md
   ```

4. **Build theme files.** Each RGB variant needs all 66 keys. ANSI variants copy Anthropic's upstream templates verbatim — see *ANSI variants* below.

5. **Register.** Add an alphabetical entry to `.claude-plugin/marketplace.json` and a row to the root `README.md` plugin table.

6. **Audit.** Verify against the [audit checklist](#audit-checklist) below. Manually or with a script — whichever fits — but resolve every issue before commit.

7. **Commit.** `feat(<family>): add <Family> theme plugin (<variants>)`. The body should name the palette source, list any derived values, and explain judgment calls.

## Semantic mapping

Pick palette colors in priority order:

1. **Documented spec.** If the upstream specifies role mappings (which palette color is for errors, warnings, success, etc.), follow them.
2. **Industry convention.** `success=green`, `error=red`, `warning=yellow`, `permission=blue`, `claude=warm/orange`, `autoAccept=violet`, `planMode=teal/sage/aqua`.
3. **Visual closeness.** When the palette lacks a named role, pick the closest-feeling color and document the choice in the commit body.

## Two bugs the audit must catch

1. **`claude ↔ permission` swapped.** Brand orange and blue must differ in hue family. Every original community theme had this swap; every audit caught it.
2. **`subtle ≡ inactive ≡ inactiveShimmer` collapsed.** These form a three-tier dim hierarchy: `subtle` is comment-grade muted text, `inactive` is the darker disabled tone, `inactiveShimmer` is the mid-tone (palette value or derived).

## Shimmer derivation

- Use a native palette pair when the family ships paired bright variants for its accents.
- Otherwise lighten by ~20 across channels, clamped to 255.

ANSI shimmers follow Anthropic's one deliberate cross-hue exception: `claude=redBright`, `claudeShimmer=yellowBright` — the warm red-to-yellow ramp that approximates brand orange in 16-color ANSI.

## ANSI variants

ANSI files defer to the user's terminal palette and have no theme-specific identity. Every dark ANSI file in this marketplace shares the same content; every light ANSI file shares the same content.

- **Use an existing file as the template.** Copy any `*-ansi.json` from another plugin (matching dark or light) and change only the `name` field.
- **Tolerate the collisions.** `subtle ≡ inactive` and `permission ≡ permissionShimmer` in dark variants are intentional, matching the schema documented for Claude Code. Don't "fix" them.

The only theme-specific bit is the filename. Users pick a family's ANSI variant to pair their picker UX with their RGB choice; the contents are uniform.

## Audit checklist

The per-family audit script must report:

- **Palette correctness** — every RGB value matches the canonical palette exactly or is a documented derivation.
- **Semantic role check** — `success`/`error`/`warning`/`subtle` map to documented or conventional roles.
- **Brand mappings** — `claude`/`permission`/`autoAccept`/`planMode`/`ide` are sane.
- **Cross-key collisions** — three or more semantically distinct keys sharing one value get flagged. Many collisions are legitimate family re-use; some are bugs.

Resolve every flagged collision before commit. Document deliberate deviations in the commit body.
