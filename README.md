# Claude Themes

A marketplace of UI themes for Claude Code, built from established palettes rather than ad hoc color picks. Each theme family is a separate plugin — install only the ones you want.

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
| [`everforest`](./plugins/everforest)             | Everforest Dark, Everforest Light (+ ANSI each)|
| [`gruvbox`](./plugins/gruvbox)                   | Gruvbox Dark, Gruvbox Light (+ ANSI each)      |
| [`monokai`](./plugins/monokai)                   | Classic Monokai (+ ANSI)                       |
| [`monokai-pro`](./plugins/monokai-pro)           | Monokai Pro (+ ANSI)                           |
| [`nord`](./plugins/nord)                         | Nord (+ ANSI)                                  |
| [`one-dark`](./plugins/one-dark)                 | One Dark, OneHalf Dark, OneHalf Light (+ ANSI) |
| [`rose-pine`](./plugins/rose-pine)               | Rosé Pine, Moon, Dawn (+ ANSI each)            |
| [`solarized`](./plugins/solarized)               | Solarized Dark, Solarized Light (+ ANSI each) |
| [`tokyo-night`](./plugins/tokyo-night)           | Tokyo Night (+ ANSI)                           |

Each plugin's README lists its specific themes and their `base` values.

## ANSI variants

Every family ships each theme in two forms: a regular variant built from the palette's RGB values, and an **(ANSI)** variant whose colors are ANSI slot names that resolve through your terminal's palette at render time. An ANSI variant assumes your terminal runs that family's terminal port — pick it when the two match, and the whole UI draws from the palette your terminal already defines.

The `base` value also decides code-block syntax highlighting, which custom themes **cannot override**. Claude Code picks one of three syntax palettes:

- `base` contains `"ansi"` → syntax highlighting uses the terminal's ANSI palette
- otherwise `base` contains `"dark"` → a hardcoded Monokai-style palette
- otherwise → a hardcoded GitHub-light palette

So regular variants (`base: "dark"`/`"light"`) always render Monokai-style or GitHub-light code blocks, whatever the family — whilst **(ANSI)** variants (`base: "dark-ansi"`/`"light-ansi"`) unify UI chrome and code-block syntax under the one palette your terminal supplies.

### When to use which

- **Regular variants** — themed UI with Claude Code's default code-block colors; works in any terminal.
- **(ANSI) variants** — your terminal already runs the family's port (e.g. terminal on Catppuccin Mocha + Claude Code on Catppuccin Mocha (ANSI)); everything renders from one palette.

Each family's ANSI mapping is derived from its terminal port. Flavours that share one port mapping (catppuccin's dark flavours, for example) end up with identical ANSI file content — the mapping decides that, not a shared template.

## Theme schema

Each theme is a JSON file in its plugin's `themes/` directory, validated against [`schemas/theme.schema.json`](./schemas/theme.schema.json).

> [!NOTE]
> Some themes intentionally use sparse overrides. A slot with no clean match in the source palette is left to Claude's fallback rather than guessed.

## Contributing

New families, ANSI variants, and semantic-mapping fixes are welcome — light themes especially. See [the contributing guide](CONTRIBUTING.md) for palette sourcing, token mapping, the audit checklist, and local validation.
