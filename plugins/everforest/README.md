# Everforest

Sainnhe's Everforest palette, with warm accents and green-tinted surfaces, ported to Claude Code.

## Installation

```text
/plugin install everforest@matcra587/claude-themes
```

## Themes

| Theme | Base | Palette |
| --- | --- | --- |
| Everforest Dark | `dark` | Medium dark |
| Everforest Dark (ANSI) | `dark-ansi` | Medium dark terminal colours |
| Everforest Light | `light` | Medium light |
| Everforest Light (ANSI) | `light-ansi` | Medium light terminal colours |

Both variants use the upstream medium contrast palette. Dark has a green-grey background; Light has a warm cream background.

## Variants

Each variant ships in regular and **(ANSI)** forms. ANSI colours assume the corresponding Everforest terminal palette. See the [theme previews](PREVIEWS.md) and the [marketplace's ANSI guide](https://github.com/matcra587/claude-themes#ansi-variants).

## Colour mapping

| Claude role | Everforest colour |
| --- | --- |
| Claude, mascot, fast mode and orange agents | `orange` |
| Permissions, prompt border, IDE, memory indicators and blue agents | `blue` |
| Accept edits, skills, ultra effort and merged status | `purple` |
| Plan mode and cyan agents | `aqua` |
| Success, error and warning | `green`, `red` and `yellow` |
| Muted text | `grey2` |
| Disabled text and disabled shimmer | `grey0` and `grey1` |
| Messages, shell output and memory surfaces | `bg1` |
| Selection, message hover and empty usage bar | `bg2` |

The palette has no separate pink or indigo, so this port shares `purple` between pink and purple agents, and between indigo and violet rainbow effects. The filled usage bar retains the orange brand accent. Accent shimmers add 20 to each RGB channel, capped at 255; Everforest does not provide separate bright accent colours.

The dim text hierarchy uses upstream foreground greys rather than background shades. `grey0`, `grey1` and `grey2` become progressively easier to read against both backgrounds. Upstream uses `grey1` for comments and `grey2` for stronger secondary text; assigning the three shades to Claude's disabled, shimmer and muted roles is a local adaptation.

Diff lines use upstream `bg_green` and `bg_red`. Word highlights mix 75% of the line colour with 25% `bg0`; dimmed context mixes 50% of each. These gentler fills keep text readable and distinguish words and context from the line background. Derived channels round to the nearest integer, with halves rounded up. These extra shades are local adaptations for Claude's diff roles.

### ANSI differences

Everforest assigns the same RGB colours to each normal and bright terminal pair. Exact accent matches therefore use normal slots. Surfaces without an exact slot use the fixed xterm greyscale ramp; Everforest Light uses separate steps for the background, message surfaces and hover state to keep them distinguishable. These greys keep the surfaces separate but lose the regular theme's green or cream tint.

Disabled text, its shimmer and muted text use the nearest fixed greys to `grey0`, `grey1` and `grey2`: Dark uses xterm 244 (`#808080`), 245 (`#8a8a8a`) and 247 (`#9e9e9e`); Light uses 248 (`#a8a8a8`), 246 (`#949494`) and 245 (`#8a8a8a`). These values keep all three roles distinct without relying on terminal black or white surface slots.

The terminal palette has no orange slot. Dark uses xterm 173 (`#d7875f`) with shimmer 216 (`#ffaf87`), preserving orange's hue and keeping Claude distinct from error red. The terminal's salmon red is marginally closer by RGB distance but loses that distinction. Light uses xterm 208 (`#ff8700`) and 209 (`#ff875f`). Other accent shimmers use nearby xterm colours so they remain distinct from the base accent. The terminal must retain the standard xterm cube and greys above slot 15. ANSI diff roles inherit the built-in ANSI preset instead of applying the RGB background blends.

## Sources and licence

Colours come from [Everforest's palette definitions](https://github.com/sainnhe/everforest/blob/85a86eb62409e3ec88713bff3d1b9d7374e112e4/autoload/everforest.vim). Diff roles and terminal slots follow the [matching theme implementation](https://github.com/sainnhe/everforest/blob/85a86eb62409e3ec88713bff3d1b9d7374e112e4/colors/everforest.vim). Both sources are pinned to the same revision; their checksums are recorded in the plugin manifest.

Everforest is © 2019 sainnhe and distributed under the [MIT licence](LICENSES/everforest.txt), included with this plugin. Claude Code role choices, shimmer adjustments, diff shades and ANSI approximations are local changes described above.
