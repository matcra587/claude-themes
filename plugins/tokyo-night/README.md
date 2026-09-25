# Tokyo Night

Enkia's original Tokyo Night palette, adapted for Claude Code from the VS Code theme.

## Installation

```text
/plugin install tokyo-night@matcra587/claude-themes
```

## Themes

| Theme | Base | Source |
| --- | --- | --- |
| Tokyo Night | `dark` | Original VS Code Night theme |
| Tokyo Night (ANSI) | `dark-ansi` | The same theme's integrated-terminal colours |

Choose the regular theme for fixed colours. The **ANSI** variant expects the terminal palette recorded in [palettes/tokyo-night.json](palettes/tokyo-night.json). See the [previews](PREVIEWS.md) and [ANSI guide](../../README.md#ansi-variants).

> [!NOTE]
> Tokyo Night ports use different terminal colours. This variant follows the original VS Code theme's terminal settings. The original repository's iTerm profile and Folke's Neovim port have different palettes.

## Colour mapping

Colours come from the [pinned original theme file](https://github.com/tokyo-night/tokyo-night-vscode-theme/blob/7c0f11eaef322f293621ca7befe462214b7ea468/themes/tokyo-night-color-theme.json). Claude has different controls from VS Code, so the roles below explain how they are used here.

| Claude role | Original colour or setting |
| --- | --- |
| Main text and background | Editor foreground `#a9b1d6` and background `#1a1b26` |
| Your messages and their hover background | Input background `#14141b` and list hover background `#13131a` |
| Sidebar, shell messages and memory panels | Sidebar, code-block and widget backgrounds, all `#16161e` |
| Subtle and inactive text | Comment colour `#51597d` and terminal black `#363b54` |
| Inactive shimmer | Midpoint of those two text colours, `#444a69` |
| Claude, Clawd, fast mode and assistant label | Orange `#ff9e64` |
| Permissions, prompt, your label, IDE, memory indicator and rate-limit fill | Blue `#7aa2f7` |
| Accept edits, skills, ultra effort, merged status and rainbow indigo | Magenta `#bb9af7` |
| Plan mode | Overview-ruler information colour `#1abc9c` |
| Suggestions and cyan | Cyan `#7dcfff` |
| Success, green agents and rainbow green | Terminal green `#73daca` |
| Warnings and yellow | Diagnostic yellow `#e0af68` |
| Errors | Diagnostic red `#db4b4b` |
| Shell border, red agents and rainbow red | Terminal red `#f7768e` |
| Purple agents and rainbow violet | Chart purple `#9d7cd8` |
| Pink agents | Tag punctuation pink `#ba3c97` |

Green uses the original terminal's teal-green. The yellow-green used for string literals is a different colour. Pink comes from tag punctuation; indigo uses the lighter magenta, while violet uses the deeper purple. These are deliberate choices within the original palette.

The actual comment colour is `#51597d` in the theme file. Its README still lists `#565f89`; this port follows the file. Muted text stays deliberately dim, as it does upstream.

## Selection and diffs

VS Code's selection and diff backgrounds include transparency. Claude's colour overrides need opaque values, so these are blended over the editor background, rounding each channel to the nearest integer with halves rounded up.

| Background | Upstream value | Claude value |
| --- | --- | --- |
| Selection | `#515c7e4d` | `#2b2f41` |
| Added line and word | `#41a6b520` | `#1f2c38` |
| Removed line and word | `#db4b4b22` | `#34212b` |

Line and word backgrounds match because the original defines them identically. For rejected edits, this port halves the original line opacity before blending. Those two dimmed backgrounds are Claude-specific adaptations.

## Shimmers and ANSI colours

The original terminal palette repeats its normal and bright accent colours. Using those pairs for Claude's shimmers would produce no colour change. Regular shimmers instead add 20 to each RGB channel, capped at 255. The inactive shimmer uses the midpoint described above.

ANSI colours use exact terminal slots where available. Orange, diagnostic red, pink, deeper purple and plan-mode teal have no matching terminal slots, so they use fixed xterm colours. Main text uses bright white, `#acb0d0`, which is closest to the regular theme's editor foreground. Dark surfaces use fixed greys 233, 234 and 236; subtle text uses 241, inactive shimmer uses 239 and inactive text uses the terminal's bright black. These greys approximate the original blue-grey shades while keeping the three text levels distinct.

| Accent | ANSI base | ANSI shimmer |
| --- | --- | --- |
| Orange | 215 `#ffaf5f` | 216 `#ffaf87` |
| Red | Terminal red `#f7768e` | 211 `#ff87af` |
| Yellow | Terminal yellow `#e0af68` | 222 `#ffd787` |
| Green | Terminal green `#73daca` | 122 `#87ffd7` |
| Blue | Terminal blue `#7aa2f7` | 111 `#87afff` |
| Magenta | Terminal magenta `#bb9af7` | 183 `#d7afff` |
| Purple | 140 `#af87d7` | 141 `#af87ff` |

These shimmer slots approximate the derived RGB colours and are brighter than their base colours. Yellow deliberately keeps a yellow hue instead of the slightly closer peach. Diagnostic red uses 167 `#d75f5f`, pink uses 132 `#af5f87` and plan-mode teal uses 37 `#00afaf`. Slots above 15 must retain their standard xterm colours. ANSI diff colours inherit Claude's `dark-ansi` preset.

## Sources and licence

Tokyo Night was created by Enkia. Both the regular palette and terminal settings come from [tokyo-night/tokyo-night-vscode-theme](https://github.com/tokyo-night/tokyo-night-vscode-theme) at commit `7c0f11eaef322f293621ca7befe462214b7ea468`. The MIT licence is included in [LICENSES/tokyo-night-vscode.txt](LICENSES/tokyo-night-vscode.txt).

This adaptation adds Claude role mappings, opaque selection and diff backgrounds, derived shimmers and ANSI approximations. [.claude-plugin/plugin.json](.claude-plugin/plugin.json) records the source file and licence checksums.
