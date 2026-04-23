# Claude Themes

A collection of Claude UI themes built from established palettes rather than ad hoc color picks.

## Installation

Install from this marketplace with:

```text
/plugin install claude-themes@matcra587/omnikit
```

## Included Themes

Each palette ships in two variants: a regular version that uses palette RGB values, and an **(ANSI)** version that delegates all colors to the terminal's ANSI palette (see [ANSI variants](#ansi-variants) for why).

| Theme                         | Base         | Source                                          |
| ----------------------------- | ------------ | ----------------------------------------------- |
| Catppuccin Latte              | `light`      | Official Catppuccin Latte                       |
| Catppuccin Latte (ANSI)       | `light-ansi` | Official Catppuccin Latte                       |
| Catppuccin Frappé             | `dark`       | Official Catppuccin Frappé                      |
| Catppuccin Frappé (ANSI)      | `dark-ansi`  | Official Catppuccin Frappé                      |
| Catppuccin Macchiato          | `dark`       | Official Catppuccin Macchiato                   |
| Catppuccin Macchiato (ANSI)   | `dark-ansi`  | Official Catppuccin Macchiato                   |
| Catppuccin Mocha              | `dark`       | Official Catppuccin Mocha                       |
| Catppuccin Mocha (ANSI)       | `dark-ansi`  | Official Catppuccin Mocha                       |
| Dracula                       | `dark`       | Official Dracula spec                           |
| Dracula (ANSI)                | `dark-ansi`  | Official Dracula spec                           |
| Monokai                       | `dark`       | Classic Sublime Text Monokai                    |
| Monokai (ANSI)                | `dark-ansi`  | Classic Sublime Text Monokai                    |
| Monokai Pro                   | `dark`       | `monokai-pro.nvim` `pro` filter                 |
| Monokai Pro (ANSI)            | `dark-ansi`  | `monokai-pro.nvim` `pro` filter                 |
| Nord                          | `dark`       | Official Nord palette (nord0..nord15)           |
| Nord (ANSI)                   | `dark-ansi`  | Official Nord palette (nord0..nord15)           |
| Solarized Dark                | `dark`       | Ethan Schoonover's canonical Solarized palette  |
| Solarized Dark (ANSI)         | `dark-ansi`  | Ethan Schoonover's canonical Solarized palette  |
| Solarized Light               | `light`      | Ethan Schoonover's canonical Solarized palette  |
| Solarized Light (ANSI)        | `light-ansi` | Ethan Schoonover's canonical Solarized palette  |
| Tokyo Night                   | `dark`       | `tokyonight.nvim` `night` style                 |
| Tokyo Night (ANSI)            | `dark-ansi`  | `tokyonight.nvim` `night` style                 |

## ANSI variants

Claude Code lets custom themes override UI chrome (message backgrounds, borders, status indicators, rainbow highlights, etc.), but **syntax highlighting in code blocks is not overridable**. Claude Code selects one of three hardcoded syntax palettes based on the theme's `base` value:

- `base` contains `"ansi"` → syntax highlighting uses the terminal's ANSI palette
- otherwise `base` contains `"dark"` → a hardcoded Monokai-style palette
- otherwise → a hardcoded GitHub-light palette

The regular variants use `base: "dark"` or `base: "light"`, so code blocks get the Monokai-style or GitHub-light syntax palette respectively. That looks OK but is unrelated to the theme family — a catppuccin-mocha theme still shows Monokai syntax in code blocks.

The **(ANSI)** variants set `base: "dark-ansi"` or `base: "light-ansi"`. That flips code-block syntax highlighting over to the terminal's own ANSI palette. If the terminal is already themed to match (e.g. terminal uses Catppuccin Mocha ANSI colors + Claude set to Catppuccin Mocha (ANSI)), both the Claude UI chrome and the code-block syntax render from one unified palette.

### When to use which

- **Regular variants** — when you want themed Claude UI and don't mind Claude's default code-block colors.
- **(ANSI) variants** — when your terminal's ANSI palette already matches the theme family. Use these to unify UI and syntax colors under one palette.

Content-wise, all (ANSI) variants share the same ANSI mapping and differ only in which built-in `base` name they declare. The `base` value is what Claude Code uses to pick the syntax palette; the friendly theme name is just what shows up in the theme picker.

## Usage

Themes live in the `themes/` directory and follow the standard Claude theme schema. Claude should pick them up automatically once the plugin is installed.

Select a theme in Claude after installation using the friendly name from the table above.

> [!NOTE]
> Some themes intentionally use sparse semantic overrides. If a Claude theme slot does not map cleanly to a source palette color, it is left to Claude's fallback behavior instead of guessing.

```json
{
  "name": "Catppuccin Mocha",
  "base": "dark",
  "overrides": {
    "text": "rgb(205,214,244)",
    "bashBorder": "rgb(243,139,168)"
  }
}
```
