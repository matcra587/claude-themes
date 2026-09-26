# Rosé Pine

Rosé Pine, Moon and Dawn themes for Claude Code. Their colours come from the official palette, role guide and Kitty terminal themes.

## Installation

```text
/plugin install rose-pine@matcra587/claude-themes
```

Run `/theme` and choose a variant.

## Themes

| Theme | Regular base | ANSI base | Background |
| --- | --- | --- | --- |
| Rosé Pine | `dark` | `dark-ansi` | Base `#191724` |
| Rosé Pine Moon | `dark` | `dark-ansi` | Base `#232136` |
| Rosé Pine Dawn | `light` | `dark-ansi` | Base `#faf4ed` |

## Variants

<!-- rumdl-disable-next-line MD057 -->
Choose the regular theme for fixed colours. Choose **(ANSI)** when your terminal uses the matching official Kitty palette. See the [ANSI guide](../../README.md#ansi-variants) and [theme previews](PREVIEWS.md).

> [!NOTE]
> Dawn's official Kitty palette puts dark text in White and Bright White. Black is a light surface. **Rosé Pine Dawn (ANSI)** uses `dark-ansi` so code highlighting and default diff text stay readable. Its other colour settings keep Dawn's light appearance without changing the official palette.

## Colour mapping

The colour choices follow the [official role guide](https://github.com/rose-pine/rose-pine-palette/blob/92af52b465ab6e47437aca223c9b8d3009a2023b/README.md#roles). Choices made for Claude Code are explained below.

| Claude Code role | Rosé Pine colour |
| --- | --- |
| Claude, Clawd, fast mode, orange and pink accents | Rose |
| Permissions, user label, memory, plan mode and suggestions | Foam |
| Accept edits, skills, merged changes and ultra effort | Iris |
| Success, IDE integration and green accents | Pine |
| Errors and removed diffs | Love |
| Warnings and rate-limit fill | Gold |
| Added diffs | Foam, the official Git-add colour |
| Main, message and hover backgrounds | Base, Surface and Overlay |
| Subtle text and inactive text | Subtle and Muted |
| Inactive shimmer | Midpoint between Muted and Subtle |
| Selection | Highlight Med |

> [!NOTE]
> This palette has no orange or separate pink and indigo. Rose supplies the warm colour for Claude and the orange/pink labels. Iris serves both indigo and violet. Pine fills the terminal's Green slot and marks success here. These choices use existing palette colours.

The prompt border uses Foam and the shell border uses Love. Inactive text uses Muted, an official text colour, instead of a background highlight. Its shimmer sits halfway between Muted and the stronger Subtle, keeping three distinct levels.

Animated accent shimmers add 20 to each RGB channel, capped at 255. Added and removed diff backgrounds mix Foam or Love with Base at 10% for rejected edits, 15% for words and 20% for lines. Calculated channels round to the nearest whole number, with halves rounded up. These background mixes are choices made for this theme. The official guide defines how to use the accent colours, but does not specify these mixes.

### ANSI mapping

| Terminal slot | Palette colour |
| --- | --- |
| Red | Love |
| Green | Pine |
| Yellow | Gold |
| Blue | Foam |
| Magenta | Iris |
| Cyan | Rose |
| White | Text |
| Black / Bright Black | Overlay / Muted |

Bright accent slots repeat their normal colours, so accents use the exact normal slot. Shimmers use nearby lighter xterm colours, except Dawn's Pine shimmer, which uses its Blue slot. Dawn's Rose shimmer uses xterm 210 rather than the equally close 174 so it looks visibly lighter. Claude's warm Rose uses Cyan. Agent accents labelled cyan use Blue to keep the regular theme's Foam colour. A slot's name does not always describe its colour.

Inactive text uses the exact Muted colour in Bright Black. Fixed xterm greys provide close matches for Subtle, the inactive shimmer and missing background slots. Dawn uses xterm White 231 for its light Surface. These matches lose some of the regular themes' purple or cream tint. ANSI diff backgrounds come from the selected Claude Code ANSI base.

> [!NOTE]
> The source versions linked below differ: the palette gives Dawn darker Text `#464261`, while the Kitty theme uses `#575279`. The regular theme's `text` setting follows the palette. The ANSI theme follows the Kitty theme. Text drawn by the terminal can still use Kitty's text colour regardless of the theme setting.

## Sources and licence

- [Official palette](https://github.com/rose-pine/rose-pine-palette/blob/92af52b465ab6e47437aca223c9b8d3009a2023b/palette.json).
- Official Kitty palettes: [Rosé Pine](https://github.com/rose-pine/kitty/blob/efd4f01cb9887feaa7114ff21a887464295d0205/dist/rose-pine.conf), [Moon](https://github.com/rose-pine/kitty/blob/efd4f01cb9887feaa7114ff21a887464295d0205/dist/rose-pine-moon.conf) and [Dawn](https://github.com/rose-pine/kitty/blob/efd4f01cb9887feaa7114ff21a887464295d0205/dist/rose-pine-dawn.conf). Cursor and selection colours provide Highlight High and Highlight Med.

[The plugin manifest](.claude-plugin/plugin.json) records the exact source versions and their checksums. The palette is © mvllow and the Kitty port is © Rosé Pine, both under MIT. Their licences are included as [the palette notice](LICENSES/rose-pine-palette.txt) and [the terminal-port notice](LICENSES/rose-pine-kitty.txt). The choices made for Claude Code are described above: colour assignments, shimmer changes, diff background mixes and approximate ANSI matches.
