# Claude Themes

A collection of Claude UI themes built from established palettes rather than ad hoc color picks.

## Installation

Install from this marketplace with:

```text
/plugin install claude-themes@matcra587/omnikit
```

## Included Themes

| Theme                  | Base    | Notes                                 |
| ---------------------- | ------- | ------------------------------------- |
| `catppuccin-latte`     | `light` | Official Catppuccin Latte palette     |
| `catppuccin-frappe`    | `dark`  | Official Catppuccin Frappé palette    |
| `catppuccin-macchiato` | `dark`  | Official Catppuccin Macchiato palette |
| `catppuccin-mocha`     | `dark`  | Official Catppuccin Mocha palette     |
| `dracula`              | `dark`  | Official Dracula palette              |
| `monokai`              | `dark`  | Classic Monokai-inspired mapping      |
| `monokai-pro`          | `dark`  | Based on `monokai-pro.nvim`           |
| `nord`                 | `dark`  | Shared Nord palette port              |
| `solarized`            | `dark`  | Canonical Solarized dark palette      |
| `solarized-light`      | `light` | Canonical Solarized light palette     |
| `tokyo-night`          | `dark`  | Shared Tokyo Night palette port       |

## Palette Sources

- The existing Catppuccin, Dracula, Nord, Solarized, and Tokyo Night themes were synced from the shared `claude-themes` source.
- Solarized variants follow the canonical Solarized palette by Ethan Schoonover.
- Monokai Pro follows the `monokai-pro.nvim` palette.
- New theme imports only override colors that map cleanly to Claude's semantic theme keys.

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
    "bashBorder": "rgb(231,130,132)",
  }
}
```
