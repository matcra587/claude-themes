# GitHub

GitHub Dark Default, Light Default and Dark Dimmed, adapted from the official GitHub theme for VS Code and its pinned Primer Primitives palette.

## Installation

```text
/plugin install github@matcra587/claude-themes
```

Run `/theme` and choose a variant. See the [theme previews](PREVIEWS.md).

## Themes

| Theme | Regular base | ANSI base | Background |
| --- | --- | --- | --- |
| GitHub Dark Default | `dark` | `dark-ansi` | `#0d1117` |
| GitHub Light Default | `light` | `light-ansi` | `#ffffff` |
| GitHub Dark Dimmed | `dark` | `dark-ansi` | `#22272e` |

Regular variants provide fixed UI colours. Choose **(ANSI)** when your terminal uses the corresponding GitHub VS Code terminal palette. These themes cover the default and dimmed variants, not the older GitHub Light and GitHub Dark themes. See the [ANSI guide](../../README.md#ansi-variants) for syntax-highlighting behaviour.

## Colour mapping

| Claude Code role | Upstream colour |
| --- | --- |
| Claude, Clawd, fast mode and orange accents | Orange `severe.fg` |
| Permissions, prompt border, user label, memory and blue accents | Blue `accent.fg` |
| Accept edits, merged changes, skills and ultra effort | Purple `done.fg` |
| Success, errors and warnings | `success.fg`, `danger.fg` and `attention.fg` |
| Plan mode and cyan accents | Terminal `ansi.cyan` |
| Pink agent labels | `sponsors.fg` |
| Body text, inactive text and subtle text | `fg.default`, `fg.subtle` and `fg.muted` |
| Main background, message surfaces and sidebar | `canvas.default`, `canvas.subtle` and `canvas.inset` |

Claude's warm orange remains distinct from permission blue and error red. Indigo and violet share the upstream purple, since this palette has no separate indigo role. Green, red, yellow, blue and purple accents reuse their corresponding status colours.

Inactive shimmer is the midpoint between the inactive and subtle foregrounds. Hover surfaces and empty usage bars use Gray 1 in Light Default and Gray 7 in the dark variants. Selection blends the blue accent over the main background at 20%. These are local choices for Claude's controls.

Accent shimmers use an upstream normal/bright terminal pair when the base colour matches and the bright colour is lighter. Otherwise they add 20 to each RGB channel, capped at 255. For example, Light Default's bright Red is darker than its normal Red, so its red shimmer uses the derived shade instead.

Diff lines retain the VS Code theme's tints: Green 1 or Red 1 at 30% over the light background, and Green 5 or Red 5 at 15% over the dark backgrounds. These translucent colours are flattened onto each variant's main background. Word highlights mix 75% of the resulting line colour with the main background; rejected diff backgrounds use 50%. These softer backgrounds are local adaptations. Derived RGB channels round to the nearest integer, with halves rounded up.

## ANSI differences

Terminal colours come from Primer's top-level `ansi` roles, as exported by the VS Code theme. They are separate from Primer's CodeMirror ANSI colours. Slot names describe terminal roles rather than fixed RGB values; Light Default's White slots are grey foregrounds, not white surfaces.

Exact terminal matches use their published slots. Other accents and accent shimmers use nearby xterm colours; orange has no dedicated terminal slot. Missing neutral colours use fixed xterm greys, which lose the regular themes' slight blue tint. Body text follows the nearest neutral colour when no slot matches the VS Code foreground override. ANSI diff backgrounds inherit Claude Code's ANSI preset.

Dark Dimmed's ANSI variant uses the terminal's Yellow slot for both orange accents and warnings: it is the closest available colour to the upstream orange. The regular variant keeps orange and yellow separate.

Light Default uses distinct fixed grey steps where choosing each nearest colour independently would collapse the hierarchy: White 231 for the main background, Gray 255 for message surfaces and Gray 254 for hover. Its inactive text retains the exact terminal White slot; the shimmer and subtle text use progressively darker Gray 242 and Gray 241. Accent shimmers remain visibly lighter than their resolved ANSI base colours.

## Sources and licence

This port uses [GitHub's VS Code theme](https://github.com/primer/github-vscode-theme/tree/cd78e5e4e7bcf132a6f428ae0f32264bb1b729cf), whose [package manifest](https://github.com/primer/github-vscode-theme/blob/cd78e5e4e7bcf132a6f428ae0f32264bb1b729cf/package.json) pins Primer Primitives 7.10.0. That release resolves to [Primer commit `f82864e`](https://github.com/primer/primitives/tree/f82864eb33c37f8624704bd996bc21b97d3c311b).

The [VS Code colour overrides](https://github.com/primer/github-vscode-theme/blob/cd78e5e4e7bcf132a6f428ae0f32264bb1b729cf/src/colors.js) are applied after resolving the Primer scales. In particular, Dark Default uses foreground `#e6edf3`, muted foreground `#7d8590` and blue accent `#2f81f7`; Light Default uses foreground `#1f2328` and muted foreground `#656d76`. Dark Dimmed uses the pinned dimmed scale without these default-theme overrides.

The [theme generator](https://github.com/primer/github-vscode-theme/blob/cd78e5e4e7bcf132a6f428ae0f32264bb1b729cf/src/theme.js) supplies the terminal mapping and diff tints. Primer's [theme scales](https://github.com/primer/primitives/tree/f82864eb33c37f8624704bd996bc21b97d3c311b/data/colors/themes), [global roles](https://github.com/primer/primitives/tree/f82864eb33c37f8624704bd996bc21b97d3c311b/data/colors/vars) and component ANSI roles supply the values. The [plugin manifest](.claude-plugin/plugin.json) records each source file, revision and checksum.

Both projects use MIT licences. The required notices are included for [GitHub VS Code Theme, © 2020 Primer](LICENSES/github-vscode-theme.txt), and [Primer Primitives, © 2018 GitHub Inc.](LICENSES/primer-primitives.txt). Claude role choices, shimmer derivations, flattened diff shades and ANSI approximations are local adaptations described above.
