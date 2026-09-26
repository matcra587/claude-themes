# Monokai

The classic Monokai palette, adapted from Microsoft's MIT-licensed Visual Studio Code theme for Claude Code.

## Installation

```text
/plugin install monokai@matcra587/claude-themes
```

## Themes

| Theme | Base | Source |
| --- | --- | --- |
| Monokai | `dark` | Visual Studio Code's Monokai theme |
| Monokai (ANSI) | `dark-ansi` | The same theme's terminal colours |

## Variants

<!-- rumdl-disable-next-line MD057 -->
Choose the regular theme for fixed colours. Choose **(ANSI)** when your terminal uses the Visual Studio Code Monokai terminal colours recorded in [palettes/monokai.json](palettes/monokai.json). Other Monokai terminal ports can assign different colours to the same slots. See the [theme previews](PREVIEWS.md) and [ANSI guide](../../README.md#ansi-variants).

## Colour mapping

The regular theme keeps Monokai's familiar orange, cyan, green, pink, violet and straw yellow. The source also defines a brighter warning yellow and a separate information blue; those retain their corresponding UI roles.

| Claude role | Source colour |
| --- | --- |
| Main text and background | Editor foreground `#f8f8f2` and background `#272822` |
| Messages, memory, selection and empty usage bar | Input background `#414339` |
| Message hover | List hover background `#3e3d32` |
| Composer sidebar | Sidebar background `#1e1f1c` |
| Disabled text | Inactive panel title `#75715e` |
| Disabled shimmer | Comment foreground `#88846f` |
| Muted text | Line number foreground `#90908a` |
| Claude, mascot, fast mode, assistant label and orange | Parameter orange `#fd971f` |
| Permissions, prompt, user label, memory indicator, IDE, suggestions, blue/cyan agents and usage fill | Library cyan `#66d9ef` |
| Accept edits, skills, ultra effort, merged and purple | Numeric violet `#ae81ff` |
| Success, plan mode and green | Function green `#a6e22e` |
| Error, shell border, red and pink | Error border pink `#f92672` |
| Warning | Warning border yellow `#e2e22e` |
| Yellow agents, rainbow yellow and Chrome accent | String yellow `#e6db74` |
| Professional blue | Information border blue `#819aff` |

These colour choices are specific to this Claude theme. Cyan fills the general blue roles, pink fills red, and violet fills both rainbow indigo and violet. The three dim text settings use separate text colours from the source. Accent shimmers add 20 to every RGB channel, capped at 255.

Diff lines mix the source's added and removed text backgrounds with the editor background. The mix uses the source's opacity value: its alpha byte divided by 255. Word highlights then mix 75% of the line colour with 25% editor background. Rejected edit lines mix 50% of each. Each resulting RGB channel rounds to the nearest whole number, with halves rounded up. These solid colours replace the source's transparency, which Claude themes cannot use.

## ANSI terminal palette

The preview palette copies all sixteen explicit terminal colours from the same Visual Studio Code theme. Its background, foreground and cursor use the source's corresponding editor colours. Bright red is Monokai pink, bright green is its green, bright cyan is its cyan and bright magenta is its violet. Bright yellow matches the warning colour, while bright blue matches the separate information blue. Those slots provide exact RGB matches for their assigned roles.

The terminal has no orange or straw-yellow slot. Orange uses fixed xterm 208 (`#ff8700`) and shimmer 215 (`#ffaf5f`), keeping Claude distinct from error pink. Straw yellow uses 186 (`#d7d787`) and shimmer 228 (`#ffff87`). Other accent shimmers use 123 (cyan), 155 (green), 177 (violet), 204 (pink) and 227 (warning yellow). Violet's shimmer uses a slightly more distant but visibly lighter approximation than the closest fixed shade.

Backgrounds without an exact slot use fixed greys: 235 for the main background, 238 for messages and selection, 237 for message hover and 234 for the sidebar. Disabled, shimmer and muted text use 242, 244 and 245. These approximations lose Monokai's warm tint but keep the surfaces and text roles distinct. Slots above 15 must retain the standard xterm colours. ANSI diff tokens inherit the built-in ANSI preset.

## Sources and licence

Colours come from Microsoft's [Monokai theme](https://github.com/microsoft/vscode/blob/e886f3e07de31233c89ecdba812b05bfd07616d7/extensions/theme-monokai/themes/monokai-color-theme.json). Its [extension manifest](https://github.com/microsoft/vscode/blob/e886f3e07de31233c89ecdba812b05bfd07616d7/extensions/theme-monokai/package.json) declares MIT.

VS Code [records Colorsublime's Monokai theme as an upstream source](https://github.com/microsoft/vscode/blob/e886f3e07de31233c89ecdba812b05bfd07616d7/extensions/theme-monokai/cgmanifest.json). Colorsublime later [corrected its licence file to MIT](https://github.com/Colorsublime/Colorsublime-Themes/commit/35bb2455a2167d5c55afdd537caf71f39ae15723). The Monokai theme file is identical at both revisions. This plugin records the corrected revision and includes both [Microsoft's notice](LICENSES/vscode-monokai.txt) and [Colorsublime's notice](LICENSES/colorsublime.txt) unchanged.

The Claude colour choices, shimmer adjustments, diff backgrounds and approximate ANSI matches are described above. [The plugin manifest](.claude-plugin/plugin.json) records the exact source versions and SHA-256 checksums. The terminal palette comes from the VS Code theme.
