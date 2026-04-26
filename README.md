# Claude Themes

A marketplace of UI themes for Claude, built from established palettes rather than ad hoc color picks. Each theme family is a separate plugin — install only the ones you want.

## Installation

Browse and install from the marketplace UI:

```text
/plugin
```

Or install a family directly:

```text
/plugin install <family>@matcra587/claude-themes
```

## Plugins

| Plugin                                           | Themes                                         |
| ------------------------------------------------ | ---------------------------------------------- |
| [`catppuccin`](./plugins/catppuccin)             | Latte, Frappé, Macchiato, Mocha (+ ANSI each) |
| [`dracula`](./plugins/dracula)                   | Dracula (+ ANSI)                               |
| [`monokai`](./plugins/monokai)                   | Classic Monokai (+ ANSI)                       |
| [`monokai-pro`](./plugins/monokai-pro)           | Monokai Pro (+ ANSI)                           |
| [`nord`](./plugins/nord)                         | Nord (+ ANSI)                                  |
| [`solarized`](./plugins/solarized)               | Solarized Dark, Solarized Light (+ ANSI each) |
| [`tokyo-night`](./plugins/tokyo-night)           | Tokyo Night (+ ANSI)                           |

Each plugin's README lists its specific themes and their `base` values.

## ANSI variants

Every family ships each theme in two forms: a regular variant that uses the palette's RGB values, and an **(ANSI)** variant that delegates code-block syntax highlighting to your terminal's ANSI palette. The reason both exist:

Claude Code lets custom themes override UI chrome (message backgrounds, borders, status indicators, etc.), but **syntax highlighting in code blocks is not overridable**. Claude selects one of three hardcoded syntax palettes based on the theme's `base` value:

- `base` contains `"ansi"` → syntax highlighting uses the terminal's ANSI palette
- otherwise `base` contains `"dark"` → a hardcoded Monokai-style palette
- otherwise → a hardcoded GitHub-light palette

The regular variants use `base: "dark"` or `base: "light"`, so code blocks get the Monokai-style or GitHub-light syntax palette. That looks fine but is unrelated to the theme family — a Catppuccin Mocha theme still renders Monokai-style syntax in code blocks.

The **(ANSI)** variants set `base: "dark-ansi"` or `base: "light-ansi"`, flipping code-block syntax over to the terminal's own ANSI palette. If your terminal is themed to match (e.g. terminal uses Catppuccin Mocha ANSI colors + Claude set to Catppuccin Mocha (ANSI)), Claude's UI chrome and code-block syntax render from one unified palette.

### When to use which

- **Regular variants** — when you want themed Claude UI and don't mind Claude's default code-block colors.
- **(ANSI) variants** — when your terminal's ANSI palette already matches the theme family. Use these to unify UI and syntax colors under one palette.

Content-wise, all (ANSI) variants share the same ANSI mapping and differ only in which built-in `base` name they declare.

## Theme schema

Each theme is a JSON file in its plugin's `themes/` directory and follows the standard Claude theme schema:

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

> [!NOTE]
> Some themes intentionally use sparse semantic overrides. If a Claude theme slot does not map cleanly to a source palette color, it is left to Claude's fallback behavior instead of guessing.
