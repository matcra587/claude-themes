# Dracula

The official Dracula palette, adapted for Claude Code.

## Installation

```text
/plugin install dracula@matcra587/claude-themes
```

## Themes

| Theme          | Base        | Source                |
| -------------- | ----------- | --------------------- |
| Dracula | `dark` | Official Alacritty and OpenCode palettes |
| Dracula (ANSI) | `dark-ansi` | Official Alacritty palette |

## Variants

Choose the regular theme for fixed colours. Choose **(ANSI)** when your terminal uses the official Dracula palette. See the [ANSI guide](../../README.md#ansi-variants) for details.

See [theme previews](PREVIEWS.md) for side-by-side regular and ANSI renders.

## Colour mapping

Orange keeps Claude's warm identity, while Cyan marks permissions and user-related information. Purple separates accept-edits mode from Green plan mode. Warnings stay Yellow so they remain distinct from Claude's Orange.

| Role | Dracula colour |
| --- | --- |
| Claude, Clawd and fast mode | Orange |
| Permissions, user label, IDE, memory and rate limits | Cyan |
| Prompt border, accept edits, skills, merged changes and ultra effort | Purple |
| Plan mode and success | Green |
| Warning and error | Yellow and Red |
| Shell border and pink agents | Pink |
| Inactive and subtle text | Selection and Comment |

Diff backgrounds mix Green or Red with Background at 10%, 15% and 20% for dimmed, word and line highlights. Rounding each RGB channel to the nearest integer gives soft highlights that keep the text readable. These blends are local choices for Claude Code. The inactive shimmer sits halfway between Selection and Comment, with each channel rounded down, so it stays separate from both.

Most animated shimmers use the official terminal palette's brighter partner. Orange has no terminal slot, so its regular shimmer adds 20 to each RGB channel, capped at 255.

### ANSI mapping

Dracula puts Purple in the terminal's Blue slot. The Blue agent therefore uses Purple, the Purple agent uses its brighter partner, and Cyan supplies the permission colour. The rainbow ends with Pink to keep its last two steps distinct.

ANSI Orange uses fixed xterm colours 215 and 222. Fixed greys approximate missing surface colours while keeping text and backgrounds separate. These approximations mean the ANSI theme can differ from the regular theme. ANSI diff backgrounds inherit Claude Code's ANSI base.

## Sources and licence

The sources are the [official Dracula Alacritty palette](https://github.com/dracula/alacritty/blob/c8a3a13404b78d520d04354e133b5075d9b785e1/dracula.toml) and [official OpenCode palette](https://github.com/dracula/opencode/blob/e7b8ba5bff2eca780c974a241d233230e58c4e0c/dracula.json). They agree on the core colours; application roles differ, so this port keeps its own documented warning and diff choices. Exact revisions and checksums are recorded in [the plugin manifest](.claude-plugin/plugin.json).

The terminal palette is © 2018 Dracula Theme. Both sources use MIT, with their notices included as [the terminal licence](LICENSES/dracula.txt) and [OpenCode licence](LICENSES/dracula-opencode.txt). Claude Code role choices, shimmer adjustments, diff blends and ANSI approximations are local changes described above.
