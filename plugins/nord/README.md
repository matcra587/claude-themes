# Nord

The official Nord palette (`nord0`..`nord15`) ported to Claude.

## Installation

```text
/plugin install nord@matcra587/claude-themes
```

## Themes

| Theme       | Base        | Source                                |
| ----------- | ----------- | ------------------------------------- |
| Nord        | `dark`      | Official Nord palette (nord0..nord15) |
| Nord (ANSI) | `dark-ansi` | Official Nord palette (nord0..nord15) |

## Variants

Choose the regular theme for fixed colours. Choose **(ANSI)** when your terminal uses the official Nord Alacritty palette described below. See the [theme previews](PREVIEWS.md) and [ANSI guide](../../README.md#ansi-variants).

## Colour mapping

The regular theme takes its base colours from the official sixteen-colour Nord palette. Nord documents `nord11` for errors and deletions, `nord13` for warnings, and `nord14` for success and additions. Orange keeps Claude distinct from the cool blue permissions and teal plan mode. Purple identifies accept edits and related actions:

| Role | Nord colour |
| --- | --- |
| Main text and background | `nord4` `#d8dee9` and `nord0` `#2e3440` |
| Message, sidebar and memory surfaces | `nord1` `#3b4252` |
| Hover, selection and empty rate limit | `nord2` `#434c5e` |
| Inactive text, its shimmer and subtle text | Brighter `nord3` shades: `#616e88`, `#6d7a96`, `#7b88a1` |
| Claude, Clawd, fast mode and assistant label | `nord12` `#d08770` |
| Permission, prompt, user label, memory indicator, IDE and rate-limit fill | `nord8` `#88c0d0` |
| Plan mode and suggestions | `nord7` `#8fbcbb` |
| Accept edits, skills, ultra effort, merged and purple | `nord15` `#b48ead` |
| Success, warning and error | `nord14` `#a3be8c`, `nord13` `#ebcb8b`, `nord11` `#bf616a` |
| Blue subagents, professional blue and rainbow blue | `nord9` `#81a1c1` |
| Rainbow indigo | `nord10` `#5e81ac` |

Nord has no separate pink or indigo: pink aliases its purple `nord15`, and indigo uses the darker Frost blue `nord10`. Cyan uses `nord8`. Reusing those colours keeps the theme within Nord’s palette.

The original Polar Night greys made dim labels hard to read. Inactive text, its shimmer and subtle text now use the 10%, 15% and 20% lighter `nord3` shades from [Nord Vim](https://github.com/nordtheme/vim/blob/f13f5dfbb784deddbc1d8195f34dfd9ec73e2295/colors/nord.vim). Nord Vim uses the 10% shade for comments; choosing these three shades for Claude's text hierarchy is a local adaptation. They stay distinct, and the background surfaces keep their original colours.

Every RGB accent shimmer adds 20 to each channel, capped at 255. Diff backgrounds blend `nord14` or `nord11` over `nord0`: 20% accent for lines, 10% for dimmed context and 15% for words, rounding each channel to the nearest integer. These blends and accent shimmers are local changes for Claude Code.

## ANSI terminal palette

The ANSI theme assumes the [official Nord Alacritty palette](https://github.com/nordtheme/alacritty/blob/9949642f3903e8fcb62bfc03f09410e3d78440c2/src/nord.yaml). Normal slots 0–7 contain `nord1`, `nord11`, `nord14`, `nord13`, `nord9`, `nord15`, `nord8` and `nord5`. Bright black is `nord3`, bright cyan is `nord7`, and bright white is `nord6`; the other bright accents equal their normal partners. The previews use that same terminal palette.

Normal slots provide exact accent matches. ANSI text uses `white` (`nord5`), the closest Snow Storm text slot. The background token uses fixed xterm 237 (`#3a3a3a`). Inactive text, its shimmer and subtle text use 243 (`#767676`), 244 (`#808080`) and 245 (`#8a8a8a`). Hover and selection use 239 (`#4e4e4e`) to stay distinct from the `black` message surface. These neutral approximations lose Nord's blue tint.

Orange uses fixed xterm 173 (`#d7875f`) with shimmer 180 (`#d7af87`); indigo uses 67 (`#5f87af`). Other unpaired shimmers use fixed xterm approximations: 110 (blue), 151 (green), 152 (cyan), 174 (red), 181 (purple) and 223 (yellow). The terminal must retain the standard xterm cube and greys above slot 15. ANSI diff tokens inherit the ANSI base preset.

## Sources and licence

The [canonical palette and role comments](https://github.com/nordtheme/nord/blob/1cef71605416a222e57225b544540ce0fcec18d4/src/nord.scss), Alacritty port and Vim theme are by Sven Greb and licensed under MIT. This plugin adapts them into Claude theme roles, brighter dim text, derived shimmers, blended diff backgrounds and ANSI approximations. Upstream licence notices are packaged in [LICENSES](LICENSES/). Exact source revisions and SHA-256 checksums are recorded in [.claude-plugin/plugin.json](.claude-plugin/plugin.json) and [palettes/nord.json](palettes/nord.json).
