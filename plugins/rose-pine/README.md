# Rosé Pine

The Rosé Pine palette — soft, low-contrast aesthetic — ported to Claude. Ships all three modes: Main (the canonical dark default), Moon (mid-dark), and Dawn (light).

## Installation

```text
/plugin install rose-pine@matcra587/claude-themes
```

## Themes

| Theme                  | Base         | Source                                              |
| ---------------------- | ------------ | --------------------------------------------------- |
| Rosé Pine              | `dark`       | `rose-pine/palette` Main (default)                  |
| Rosé Pine (ANSI)       | `dark-ansi`  | `rose-pine/palette` Main                            |
| Rosé Pine Moon         | `dark`       | `rose-pine/palette` Moon (mid-dark)                 |
| Rosé Pine Moon (ANSI)  | `dark-ansi`  | `rose-pine/palette` Moon                            |
| Rosé Pine Dawn         | `light`      | `rose-pine/palette` Dawn (light)                    |
| Rosé Pine Dawn (ANSI)  | `light-ansi` | `rose-pine/palette` Dawn                            |

The palette uses six named accents per the official spec: `love` (errors / git delete), `gold` (warnings / strings), `pine` (functions / git rename — green family), `foam` (info / git add — blue family), `iris` (hints / git merge — purple), `rose` (booleans / git change — used here for `claude` since the palette has no native orange).

## Variants

Each variant ships in regular and **(ANSI)** forms. The ANSI variant delegates code-block syntax highlighting to your terminal's ANSI palette. See the [marketplace README](https://github.com/matcra587/claude-themes#ansi-variants) for details.
