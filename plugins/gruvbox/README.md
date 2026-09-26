# Gruvbox

Pavel Pertsev's warm, retro Gruvbox colours for Claude Code.

## Installation

```text
/plugin install gruvbox@matcra587/claude-themes
```

## Themes

| Theme | Base | Palette |
| --- | --- | --- |
| Gruvbox Dark | `dark` | Medium dark, bright accents |
| Gruvbox Dark (ANSI) | `dark-ansi` | Medium dark terminal colours |
| Gruvbox Light | `light` | Medium light, faded accents |
| Gruvbox Light (ANSI) | `dark-ansi` | Medium light terminal colours |

Dark uses `dark0` (`#282828`) with `bright_*` accents. Light uses `light0` (`#fbf1c7`) with `faded_*` accents, as Gruvbox's light mode does.

## Variants

<!-- rumdl-disable-next-line MD057 -->
Each theme comes in regular and **(ANSI)** versions. Use ANSI when your terminal uses the matching Gruvbox palette. See the [theme previews](PREVIEWS.md) and the [marketplace's ANSI guide](https://github.com/matcra587/claude-themes#ansi-variants).

> [!NOTE]
> Gruvbox Light's terminal palette puts dark text colours in the White slots and its light background in Black. Its ANSI theme uses the `dark-ansi` base to select readable colours for code and diffs. The theme's interface colours keep it light. The Gruvbox terminal palette is unchanged.

## Colour mapping

| Claude role | Gruvbox colour |
| --- | --- |
| Claude, mascot, fast mode and orange agents | `orange` |
| Permissions, prompt border, IDE, memory indicators and blue agents | `blue` |
| Accept edits, skills, ultra effort and merged status | `purple` |
| Plan mode and cyan agents | `aqua` |
| Success, error and warning | `green`, `red` and `yellow` |
| Muted text | `fg3` |
| Disabled text and disabled shimmer | `gray` and `fg4` |
| Messages, shell output and memory surfaces | `bg1` |
| Selection, message hover and empty usage bar | `bg2` |
| Composer sidebar and mascot background | `bg0` |

The palette has no separate pink or indigo. Pink and purple agents share `purple`, as do indigo and violet rainbow effects. `professionalBlue` uses `neutral_blue` in both variants. The filled usage bar stays orange.

Disabled text, its shimmer and muted text use `gray`, `fg4` and `fg3`. These give both modes three distinct text shades. Gruvbox uses `gray` for comments. This theme uses stronger text shades for secondary text so hints stay visible. These choices are specific to this theme; the Gruvbox colours are unchanged.

Dark's accents already use Gruvbox's bright group. To make shimmers brighter, the theme adds 20 to each RGB channel, capped at 255. Light pairs its faded accents with the matching lighter neutral colours. The light terminal palette uses the same groups. Its normal slots are lighter than its bright slots, despite their names.

Gruvbox has no background shades for Claude's six diff roles. This theme blends green or red over `bg0`: 20% accent for a line, 10% for rejected edits and 15% for word emphasis. Each resulting channel value rounds to the nearest integer, with halves rounded up.

### ANSI differences

The Gruvbox terminal palette puts `bright_*` accents in the bright slots for Dark and `faded_*` accents there for Light. Light shimmers use the normal slots, which hold the lighter neutral colours. In both palettes, `black` is the background and `whiteBright` is the main text colour. Light must not use `black` for text.

Disabled text uses `blackBright` (`gray`), and its shimmer uses `white` (`fg4`). These slots match the Gruvbox colours exactly. Muted text uses the closest fixed greys to `fg3`: xterm 248 (`#a8a8a8`) for Dark and 240 (`#585858`) for Light. Backgrounds without an exact terminal slot also use fixed xterm greys, so they lose Gruvbox's warm tint.

Neither palette has an orange slot. Dark uses xterm 208 (`#ff8700`) and 209 (`#ff875f`), while Light uses 130 (`#af5f00`) and 166 (`#d75f00`). These close matches keep Claude distinct from error red. Dark's other accent shimmers use nearby xterm colours. If the closest colour would repeat the base accent, a lighter shade keeps the animation visible. Slots above 15 must keep their standard xterm values. ANSI diff roles use the built-in ANSI preset instead of the RGB background blends.

## Sources and licence

The palette and terminal mapping come from the pinned [Gruvbox community-maintained source](https://github.com/gruvbox-community/gruvbox/blob/180ad85971343df68be3422a5630fa84e45a9ab2/colors/gruvbox.vim). Its colours match [Pavel Pertsev's original Gruvbox source](https://github.com/morhetz/gruvbox/blob/ef8864bb42bf244f0295d1c5a403b27e3d139695/colors/gruvbox.vim). The plugin manifest records source and licence checksums.

Gruvbox is © 2018 Pavel Pertsev and distributed under the [MIT licence](LICENSES/gruvbox.txt), included with this plugin. The role choices, shimmer adjustments, diff blends and approximate ANSI matches described above are changes made for Claude Code.
