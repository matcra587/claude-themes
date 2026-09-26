# Solarized

Ethan Schoonover's official Solarized colours for Claude Code, in Dark and Light modes.

## Installation

```text
/plugin install solarized@matcra587/claude-themes
```

## Themes

| Theme | Base |
| --- | --- |
| Solarized Dark | `dark` |
| Solarized Dark (ANSI) | `dark-ansi` |
| Solarized Light | `light` |
| Solarized Light (ANSI) | `dark-ansi` |

## Variants

<!-- rumdl-disable-next-line MD057 -->
Choose the regular theme for fixed colours. Choose **(ANSI)** when your terminal uses the matching official Xresources palette described below. See the [theme previews](PREVIEWS.md) and [ANSI guide](../../README.md#ansi-variants).

> [!NOTE]
> The official Solarized Light terminal palette puts dark text colours in the white slots. **Solarized Light (ANSI)** uses the `dark-ansi` base to select readable code colours from those slots. Its interface colours remain Solarized Light.

## Colour mapping

Both regular themes use Ethan Schoonover's sixteen official Solarized colours. Dark uses `base03` for the background and `base0` for text. Light uses `base3` and `base00`. Orange identifies Claude. Blue marks permissions and user-related information. Violet distinguishes accept-edits mode from Cyan plan mode. Some roles share an accent:

| Role | Dark | Light |
| --- | --- | --- |
| Background and inverse text | `base03` `#002b36` | `base3` `#fdf6e3` |
| Main text | `base0` `#839496` | `base00` `#657b83` |
| Message, sidebar, selection and memory surfaces | `base02` `#073642` | `base2` `#eee8d5` |
| Message hover | `base03` `#002b36` | `base3` `#fdf6e3` |
| Subtle text | `base00` `#657b83` | `base0` `#839496` |
| Inactive text | `base01` `#586e75` | `base1` `#93a1a1` |
| Inactive shimmer | Derived `#5e747c` | Derived `#8b9a9b` |

| Accent roles | Solarized colour |
| --- | --- |
| Claude, Clawd, fast mode, assistant label and orange | Orange `#cb4b16` |
| Permission, prompt, user label, IDE, memory indicator and rate-limit fill | Blue `#268bd2` |
| Accept edits, skills, ultra effort, merged, purple and rainbow indigo/violet | Violet `#6c71c4` |
| Plan mode, suggestions and cyan | Cyan `#2aa198` |
| Success and green | Green `#859900` |
| Error, shell border and red | Red `#dc322f` |
| Warning and yellow | Yellow `#b58900` |
| Pink | Magenta `#d33682` |

Solarized has one violet accent, so rainbow indigo and violet share it. Each RGB accent shimmer adds 20 to its channels, capped at 255. Inactive text uses a text shade rather than a background colour. Its shimmer is halfway between inactive and subtle text, rounded down. All three stand out less than body text. Hovered messages use the main background colour to keep text visible. These choices adapt the official colours to Claude Code.

Diff backgrounds blend green or red over the mode's main background: 10% accent for lines, 5% for rejected edits and 7.5% for words. Each channel rounds to the nearest integer, with halves rounded up. These blends and shimmer values are changes for Claude Code, not additions to Solarized's official palette.

Solarized uses gentle contrast by design. Its official body text colours give a contrast of about 4.75:1 against Dark's main background and 4.13:1 against Light's. The diff backgrounds reduce that to at least 4.18:1 in Dark and 3.58:1 in Light. This theme keeps the official text colours. It does not claim every text/background pairing reaches 4.5:1.

## ANSI terminal palette

Use the matching Dark or Light configuration from the [official Xresources port](https://github.com/altercation/solarized/blob/62f656a02f93c5190a8753159e34b385588d5ff3/xresources/solarized). Its Light block swaps which neutral colours the base names refer to. The Light preview uses those swaps. If your terminal assigns Solarized Light's slots differently, choose the regular theme.

| ANSI slot | Dark colour | Light colour |
| --- | --- | --- |
| `black` | `base02` `#073642` | `base2` `#eee8d5` |
| `white` | `base2` `#eee8d5` | `base02` `#073642` |
| `blackBright` | `base03` `#002b36` | `base3` `#fdf6e3` |
| `greenBright` | `base01` `#586e75` | `base1` `#93a1a1` |
| `yellowBright` | `base00` `#657b83` | `base0` `#839496` |
| `blueBright` | `base0` `#839496` | `base00` `#657b83` |
| `cyanBright` | `base1` `#93a1a1` | `base01` `#586e75` |
| `whiteBright` | `base3` `#fdf6e3` | `base03` `#002b36` |

Normal red, green, yellow, blue, magenta and cyan keep their named accents in both modes. `redBright` is orange, and `magentaBright` is violet. Bright green, yellow, blue and cyan are neutral shades. They do not work as success, warning, permission and plan accents. ANSI body text uses neutral `blueBright`. The main background uses `blackBright`, and message backgrounds use `black`.

Inactive text uses `greenBright`, and subtle text uses `yellowBright`. These slots match the Solarized text shades exactly. Dark's inactive shimmer uses fixed xterm 243 (`#767676`); Light uses 246 (`#949494`). Dark uses a slightly brighter shade than the closest fixed grey to keep the shimmer distinct from inactive text. In both modes, shimmer contrast against the background falls between inactive and subtle text contrast.

Accent shimmers use 74 (`#5fafd7`) for blue, 104 (`#8787d7`) for violet, 106 (`#87af00`) for green, 166 (`#d75f00`) for orange, 203 (`#ff5f5f`) for red and 178 (`#d7af00`) for yellow. These roughly match the RGB shimmers but are brighter. They do not add terminal palette entries. Slots above 15 must keep their standard xterm values. ANSI diff tokens use the ANSI base preset.

## Sources and licence

The [official palette and usage guidance](https://github.com/altercation/solarized/blob/62f656a02f93c5190a8753159e34b385588d5ff3/README.md#the-values) and Xresources port are by Ethan Schoonover and licensed under MIT. This plugin adapts them for Claude roles, shimmers, blended diff backgrounds and ANSI mappings. The original licence notice is included in [LICENSES/solarized.txt](LICENSES/solarized.txt). [.claude-plugin/plugin.json](.claude-plugin/plugin.json) records the pinned source files and SHA-256 checksums. [palettes](palettes/) contains the exact Dark and Light terminal maps.
