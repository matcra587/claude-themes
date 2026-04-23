# Claude Themes

A collection of Claude UI themes built from established palettes rather than ad hoc color picks.

## Installation

Install from this marketplace with:

```text
/plugin install claude-themes@matcra587/omnikit
```

## Included Themes

Each theme below ships in two variants: a regular version that uses palette RGB values, and an `-ansi` version that delegates all colors to your terminal's ANSI palette (see [ANSI variants](#ansi-variants) for why).

| Theme                  | Base    | Source                                          |
| ---------------------- | ------- | ----------------------------------------------- |
| `catppuccin-latte`     | `light` | Official Catppuccin Latte                       |
| `catppuccin-frappe`    | `dark`  | Official Catppuccin Frappé                      |
| `catppuccin-macchiato` | `dark`  | Official Catppuccin Macchiato                   |
| `catppuccin-mocha`     | `dark`  | Official Catppuccin Mocha                       |
| `dracula`              | `dark`  | Official Dracula spec                           |
| `monokai`              | `dark`  | Classic Sublime Text Monokai                    |
| `monokai-pro`          | `dark`  | `monokai-pro.nvim` `pro` filter                 |
| `nord`                 | `dark`  | Official Nord palette (nord0..nord15)           |
| `solarized`            | `dark`  | Ethan Schoonover's canonical Solarized palette  |
| `solarized-light`      | `light` | Solarized light variant                         |
| `tokyo-night`          | `dark`  | `tokyonight.nvim` `night` style                 |

Each theme also has a matching `-ansi` variant (e.g. `catppuccin-mocha-ansi`, `dracula-ansi`).

## ANSI variants

Claude Code lets custom themes override UI chrome (message backgrounds, borders, status indicators, rainbow highlights, etc.) but **syntax highlighting in code blocks is not overridable**. Claude Code chooses one of three hardcoded syntax palettes by substring-matching the theme name:

- name contains `"ansi"` → syntax highlighting uses the terminal's ANSI colors
- otherwise name contains `"dark"` → a hardcoded Monokai-style palette
- otherwise → a hardcoded GitHub-light palette

That last branch is the catch: a theme like `catppuccin-mocha` matches neither `"ansi"` nor `"dark"` in its name, so code blocks fall through to the GitHub-light syntax palette even though the theme's `base` is `dark`. Readable, but visually jarring on a dark background.

The `-ansi` variants exist specifically to trigger the first branch. They use `ansi:*` values throughout their overrides, which means both the Claude UI chrome **and** the syntax highlighting in code blocks render from your terminal's ANSI palette.

### When to use which

- **Regular variants** — when you want themed Claude UI and you don't mind Claude's default code-block colors.
- **`-ansi` variants** — when your terminal's ANSI palette is already set to match the theme family (e.g. terminal configured with Catppuccin Mocha ANSI colors + Claude set to `catppuccin-mocha-ansi`). Everything then renders from one unified palette.

Content-wise, all `-ansi` variants share the same ANSI mapping — they differ only in name. The name matters because it's what Claude Code uses to pick the syntax palette. Having per-family names (rather than just `dark-ansi` / `light-ansi`) keeps your theme choice visible in the picker.

## Usage

Themes live in the `themes/` directory and follow the standard Claude theme schema. Claude should pick them up automatically once the plugin is installed.

Select a theme in Claude after installation using the theme name from the table above.

> [!NOTE]
> Some themes intentionally use sparse semantic overrides. If a Claude theme slot does not map cleanly to a source palette color, it is left to Claude's fallback behavior instead of guessing.

```json
{
  "name": "theme-name",
  "base": "dark",
  "overrides": {
    "text": "rgb(255,255,255)",
    "bashBorder": "rgb(231,130,132)"
  }
}
```
