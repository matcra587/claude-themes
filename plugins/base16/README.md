# Base16

Ocean, Eighties and Cupcake by Chris Kempson, adapted for Claude Code from Tinted Theming's community-maintained copies.

## Installation

```text
/plugin install base16@matcra587/claude-themes
```

## Themes

| Theme | Base | Character |
| --- | --- | --- |
| Base16 Ocean | `dark` | Cool blue-grey surfaces and muted accents |
| Base16 Ocean (ANSI) | `dark-ansi` | Matching Ocean terminal colours |
| Base16 Eighties | `dark` | Neutral dark surfaces and warm accents |
| Base16 Eighties (ANSI) | `dark-ansi` | Matching Eighties terminal colours |
| Base16 Cupcake | `light` | Pale pink surfaces and pastel accents |
| Base16 Cupcake (ANSI) | `dark-ansi` | Matching Cupcake terminal colours |

## Variants

<!-- rumdl-disable-next-line MD057 -->
Choose the regular theme for fixed colours. Choose **(ANSI)** when your terminal uses the matching scheme with Tinted Theming's iTerm2 Base16 mapping, recorded in [palettes](palettes/). See the [theme previews](PREVIEWS.md) and [ANSI guide](../../README.md#ansi-variants).

> [!NOTE]
> Tinted Theming's Cupcake terminal palette puts dark text colours in the White slots. Its ANSI theme uses `dark-ansi` so code and diffs stay readable. The other colour settings keep Cupcake light, without changing the terminal palette.

## Colour mapping

Each scheme supplies sixteen named colours, `base00` through `base0F`. This theme uses them for the following Claude roles:

| Claude role | Base16 colour |
| --- | --- |
| Background, inverse text, mascot background and message hover | `base00` |
| Messages, sidebar, memory and selection | `base01` |
| Empty usage bar | `base02` |
| Claude, mascot, fast mode, assistant label and orange agents | `base09` |
| Permissions, prompt, user label, memory indicator, IDE, blue agents and usage fill | `base0D` |
| Accept edits, skills, ultra effort, merged, purple and pink | `base0E` |
| Plan mode, suggestions and cyan | `base0C` |
| Success, error and warning | `base0B`, `base08` and `base0A` |

Pink shares purple, and rainbow indigo and violet share `base0E`. The schemes' brown `base0F` is retained in the source palette but has no matching Claude role. Accent shimmers add 20 to every RGB channel, capped at 255.

Ocean and Eighties retain `base05` body text. Their disabled text uses `base03`, muted text uses `base04`, and the disabled shimmer is the midpoint between them, rounded down. Cupcake uses the stronger `base07` body text, with `base04`, `base05` and `base06` for disabled, shimmer and muted text. This keeps its dim hierarchy distinct while improving UI text contrast. All three schemes use the main background for message hover rather than placing text on a stronger foreground shade.

Diff backgrounds blend `base0B` or `base08` over `base00`: 20% accent for a line, 15% for word highlights and 10% for rejected edit line backgrounds. Channels round to the nearest integer, with halves rounded up. These blends and shimmers are local derived colours.

## ANSI terminal palette

Tinted Theming's iTerm2 template assigns normal slots to `base00`, `base08`, `base0B`, `base0A`, `base0D`, `base0E`, `base0C` and `base05`. Bright black is `base03`, bright white is `base07`, and bright accent slots repeat their normal colours. Normal accent slots provide exact matches. The background uses `black`; body text uses `white` for Ocean and Eighties and `whiteBright` for Cupcake.

Cupcake's terminal foreground remains the template's original `base05`, even though the Claude UI uses stronger `base07`.

This terminal mapping defines sixteen slots. Orange and shades without a slot use fixed xterm colours rather than assuming extended Base16 slots have been configured:

| Scheme | Orange / shimmer | Message surface / empty bar | Disabled / shimmer / muted |
| --- | --- | --- | --- |
| Ocean | 173 / 180 | 237 / 240 | `blackBright` / 246 / 249 |
| Eighties | 209 / 215 | 237 / 239 | `blackBright` / 245 / 247 |
| Cupcake | 180 / 223 | 255 / 253 | 248 / `white` / 243 |

The fixed greys lose each scheme's surface tint. Other accent shimmers use nearby brighter xterm colours; Ocean's blue shimmer preserves the blue hue rather than taking the slightly closer violet shade. Slots above 15 must retain the standard xterm colours. ANSI diff roles inherit the built-in preset.

## Sources and licence

The pinned [Ocean](https://github.com/tinted-theming/schemes/blob/50f6e3b93a8f62db9d839f8b79a709c1bbdaac53/base16/ocean.yaml), [Eighties](https://github.com/tinted-theming/schemes/blob/50f6e3b93a8f62db9d839f8b79a709c1bbdaac53/base16/eighties.yaml) and [Cupcake](https://github.com/tinted-theming/schemes/blob/50f6e3b93a8f62db9d839f8b79a709c1bbdaac53/base16/cupcake.yaml) files credit Chris Kempson. The terminal mapping comes from Tinted Theming's pinned [iTerm2 template](https://github.com/tinted-theming/tinted-terminal/blob/7da7cf8362299c64cf228654453affbcd1e67706/templates/iterm2-base16.mustache).

All sixteen colours in each scheme match Chris Kempson's original Vim themes: [Ocean](https://github.com/chriskempson/base16-vim/blob/3be3cd82cd31acfcab9a41bad853d9c68d30478d/colors/base16-ocean.vim), [Eighties](https://github.com/chriskempson/base16-vim/blob/3be3cd82cd31acfcab9a41bad853d9c68d30478d/colors/base16-eighties.vim) and [Cupcake](https://github.com/chriskempson/base16-vim/blob/3be3cd82cd31acfcab9a41bad853d9c68d30478d/colors/base16-cupcake.vim). Tinted Theming maintains the copies used here; it is a community continuation of his work.

Both Tinted repositories use MIT licences. Their notices and [Chris Kempson's original MIT notice](LICENSES/base16-vim.txt) are included unchanged in [LICENSES](LICENSES/). [The plugin manifest](.claude-plugin/plugin.json) records the Tinted source files, exact versions and SHA-256 checksums checked by CI. The original Vim themes provide the colour comparison above. Claude's colour choices and extra shades are described in this README.
