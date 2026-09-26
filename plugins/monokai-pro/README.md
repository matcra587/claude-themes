# Monokai Pro Community Edition

This theme uses Monokai's free Community Edition colours from the official OpenCode and Konsole themes. The plugin and theme names remain `monokai-pro` and **Monokai Pro**, so existing installations keep working.

## Installation

```text
/plugin install monokai-pro@matcra587/claude-themes
```

Then run `/theme` and choose **Monokai Pro** or **Monokai Pro (ANSI)**.

## Themes

| Theme | Base | Source |
| --- | --- | --- |
| Monokai Pro | `dark` | Official OpenCode and Konsole palettes |
| Monokai Pro (ANSI) | `dark-ansi` | Official Konsole palette |

## Variants

<!-- rumdl-disable-next-line MD057 -->
Choose the regular theme for fixed colours. Choose **(ANSI)** when your terminal uses the official **Monokai Pro CE Konsole** palette. See the [previews](PREVIEWS.md) to compare them and the [ANSI guide](../../README.md#ansi-variants) for details.

## Colour mapping

The regular theme takes its colours from Monokai's OpenCode theme. Claude has different controls, so some choices are specific to this theme:

| Claude role | Colour | Reason |
| --- | --- | --- |
| Claude, Clawd and fast mode | Orange | Keeps Claude's warm accent separate from the user's colour. |
| Permissions, prompt border, user label and memory | Cyan | Uses the palette's information colour. There is no separate blue. |
| Accept edits, skills and ultra effort | Purple | Uses the palette's accent colour. |
| Success and plan mode | Green | Uses the palette's success colour. |
| Errors and removals | Pink-red | Uses the palette's error colour. Pink agent labels use this too. |
| Warnings | Orange | Follows OpenCode's warning colour, replacing this theme's previous yellow. |

The background is `#2d2a2e` and text is `#fcfcfa`. Subtle text uses OpenCode's muted text colour, `dimmed2`. Inactive text uses its comment colour, `dimmed3`. The inactive shimmer is halfway between them.

Message backgrounds and side panels use `backgroundDimmed1`, the colour OpenCode uses for panels. Hover backgrounds and empty usage bars use `dimmed5`. Selections use `dimmed4`. Text uses its own shades, separate from the backgrounds.

Animated accent colours use the matching bright colours from Monokai's Konsole theme. The rainbow uses pink-red, orange, yellow, green, cyan and purple. Indigo and violet share purple because this palette has no separate colours for them.

Diff lines use OpenCode's own backgrounds: `#393b35` for additions and `#422f37` for removals. Claude also needs backgrounds for rejected edit lines and word highlights. These mix the line colour with the main background at 50% for rejected edit lines and 75% for words. Both are softer than the line colour. Calculated RGB channels round to the nearest whole number, with halves rounded up. These extra shades are made for this Claude theme.

### ANSI differences

OpenCode supplies interface colours, not a terminal palette. The ANSI slots therefore come from the separate official Konsole theme. Its slot names are unusual: `blue` holds cyan, and `cyan` holds orange. This theme follows the colours those slots contain.

The Konsole theme's `white` slot is a muted grey. Body text uses fixed xterm White 231, a near-white match for `#fcfcfa`. Missing text and background shades use the nearest fixed xterm grey. These lose the regular palette's slight purple tint. For the panel background, xterm 234 and 235 are equally close. This theme uses the darker 234. ANSI accents and shimmers use exact normal and bright Konsole slots. Diff backgrounds come from Claude Code's ANSI base.

> [!NOTE]
> Other Monokai terminal themes can assign these slots differently. Use the regular theme if your terminal colours do not match. See the [ANSI guide](../../README.md#ansi-variants).

## Sources and licence

- [Official OpenCode palette](https://github.com/monokai-pro/opencode/blob/1a817a5e5f921354532f638383ff857e39965a43/monokai-pro.json)
- [Official Konsole palette](https://github.com/monokai-pro/konsole/blob/df531914171a5b26db0ba11163d80c23e40c7355/Monokai-Pro-CE.colorscheme)

Both sources are © 2025 Monokai and use the MIT licence. Their identical [licence notice](LICENSES/monokai-pro.txt) is included. [The plugin manifest](.claude-plugin/plugin.json) records the exact source versions and their checksums. Community Edition replaces the earlier `monokai-pro.nvim` palette source. The colour choices and extra shades made for Claude are described above.
