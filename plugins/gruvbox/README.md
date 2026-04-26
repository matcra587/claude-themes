# Gruvbox

Pavel Pertsev's Gruvbox palette — warm retro tones — ported to Claude.

## Installation

```text
/plugin install gruvbox@matcra587/claude-themes
```

## Themes

| Theme                | Base         | Source                                   |
| -------------------- | ------------ | ---------------------------------------- |
| Gruvbox Dark         | `dark`       | `morhetz/gruvbox` `dark0` bg (default)   |
| Gruvbox Dark (ANSI)  | `dark-ansi`  | `morhetz/gruvbox` `dark0` bg             |
| Gruvbox Light        | `light`      | `morhetz/gruvbox` `light0` bg            |
| Gruvbox Light (ANSI) | `light-ansi` | `morhetz/gruvbox` `light0` bg            |

The Dark variant uses Gruvbox's `bright_*` accents; the Light variant uses `neutral_*` accents — matching Gruvbox's own dark/light convention. The `aqua` slot maps to `planMode` (Gruvbox's native teal/sage).

## Variants

Each variant ships in regular and **(ANSI)** forms. The ANSI variant delegates code-block syntax highlighting to your terminal's ANSI palette. See the [marketplace README](https://github.com/matcra587/claude-themes#ansi-variants) for details.
