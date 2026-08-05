# Catppuccin

The four official Catppuccin flavours, mapped to Claude Code using
Catppuccin's palette and semantic style guide.

## Installation

```text
/plugin install catppuccin@matcra587/claude-themes
```

Then run `/theme` and choose the Catppuccin flavour you use.

## Themes

| Flavour    | Regular base | ANSI base    |
| ---------- | ------------ | ------------ |
| Latte      | `light`      | `light-ansi` |
| Frappé     | `dark`       | `dark-ansi`  |
| Macchiato  | `dark`       | `dark-ansi`  |
| Mocha      | `dark`       | `dark-ansi`  |

Choose the regular theme if you want consistent colours in any terminal.
Choose the **(ANSI)** theme when your terminal already uses the matching
Catppuccin flavour. The ANSI base also makes code blocks use your terminal's
palette. See the [marketplace ANSI guide](../../README.md#ansi-variants) for
the full distinction.

See [theme previews](PREVIEWS.md) for side-by-side regular and ANSI renders of
all four flavours.

### ANSI terminal requirement

The ANSI themes assume the terminal follows Catppuccin's published terminal
mapping, including extended colour 16 for Peach. If your terminal only remaps
colours 0–15, Claude's orange accents will use the terminal's default colour
16 instead. Use the regular theme in that case.

<details>
<summary>Windows Terminal setup</summary>

Windows Terminal colour schemes only persist the first 16 palette entries in
`settings.json`. Windows Terminal can still change colour 16 at runtime with
the standard `OSC 4` control sequence. Emit it from your shell profile so each
new tab gets the correct Peach value:

| Flavour | Colour 16 |
| ------- | --------- |
| Latte | `rgb:fe/64/0b` |
| Frappé | `rgb:ef/9f/76` |
| Macchiato | `rgb:f5/a9/7f` |
| Mocha | `rgb:fa/b3/87` |

For Fish, add this to `~/.config/fish/config.fish`. This example uses Mocha;
replace the RGB value when using another flavour.

```fish
if set -q WT_SESSION
    printf '\e]4;16;rgb:fa/b3/87\a'
end
```

If Windows Terminal launches PowerShell instead of Fish, add this PowerShell
code to `$PROFILE`:

```powershell
if ($env:WT_SESSION) {
    $escape = [char]27
    $bell = [char]7
    [Console]::Write("${escape}]4;16;rgb:fa/b3/87${bell}")
}
```

Open a new tab after saving the profile. In Fish, verify colour 16 directly:

```fish
printf '\e[38;5;16mcolour 16\e[0m\n'
```

The sample text should render in Peach. The setting belongs to the tab and is
reapplied whenever the shell starts. See Microsoft's
[Windows Terminal colour-scheme format](https://learn.microsoft.com/windows/terminal/customize-settings/color-schemes)
and [OSC screen-colour documentation](https://learn.microsoft.com/windows/console/console-virtual-terminal-sequences#screen-colors).

</details>

## RGB colour mapping

The mappings follow Catppuccin's documented roles where one exists, then the
marketplace's Claude Code conventions:

| Claude Code role | Catppuccin colour |
| ---------------- | ----------------- |
| Claude, Clawd and fast mode | Peach |
| Permission, user label, memory and rate limit | Blue |
| Default prompt border | Lavender |
| Accept edits, skills, merged and ultra effort | Mauve |
| Plan mode and suggestions | Teal |
| Success, warning and error | Green, Yellow and Red |
| Main, secondary and surface backgrounds | Base, Mantle and Surface 0–1 |
| Subtle, inactive shimmer and inactive text | Overlay 1, Overlay 0 and Surface 2 |

The rainbow uses Red, Peach, Yellow, Green, Sapphire, Lavender and Mauve. Diff
backgrounds pre-blend Green or Red with Base at 10%, 15% and 20% for dimmed,
word and line highlights. This preserves Catppuccin's recommended opacity
range because Claude theme colours do not support alpha channels.

Animated RGB shimmers add 20 to each colour channel, capped at 255. These are
derived values rather than extra Catppuccin palette entries.

ANSI variants use the closest published terminal slot when a role has no
direct slot. Fixed xterm greys preserve the Base, surface and overlay hierarchy
without depending on a terminal's custom black and white slots.

## Sources

- [Catppuccin palette](https://github.com/catppuccin/palette/blob/main/palette.json)
- [Catppuccin style guide](https://github.com/catppuccin/catppuccin/blob/main/docs/style-guide.md)
