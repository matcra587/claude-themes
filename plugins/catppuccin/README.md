# Catppuccin

The four official Catppuccin flavours, adapted for Claude Code using Catppuccin's palette and colour guide.

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

Choose the regular theme for fixed colours. Choose **(ANSI)** when your terminal uses the matching Catppuccin flavour and terminal mapping described below. ANSI code blocks also use your terminal's palette. See the [ANSI guide](../../README.md#ansi-variants) for details.

See [theme previews](PREVIEWS.md) for side-by-side regular and ANSI examples of all four flavours.

### ANSI terminal requirement

The ANSI themes need Catppuccin's published terminal mapping, including colour 16 for Peach. If your terminal changes only colours 0–15, Claude's orange accents will use its default colour 16 instead. Use the regular theme in that case.

<details>
<summary>Windows Terminal setup</summary>

Windows Terminal colour schemes save only the first 16 palette entries in `settings.json`. A shell command can set colour 16 when a tab opens. Add the command to your shell profile so each new tab gets the correct Peach:

| Flavour | Colour 16 |
| ------- | --------- |
| Latte | `rgb:fe/64/0b` |
| Frappé | `rgb:ef/9f/76` |
| Macchiato | `rgb:f5/a9/7f` |
| Mocha | `rgb:fa/b3/87` |

For Fish, add this to `~/.config/fish/config.fish`. This example uses Mocha; replace the RGB value when using another flavour.

```fish
if set -q WT_SESSION
    printf '\e]4;16;rgb:fa/b3/87\a'
end
```

If Windows Terminal launches PowerShell instead of Fish, add this to `$PROFILE`:

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

The sample text should appear in Peach. This setting applies to the current tab; your shell profile reapplies it in new tabs. See Microsoft's [Windows Terminal colour-scheme format](https://learn.microsoft.com/windows/terminal/customize-settings/color-schemes) and [screen-colour commands](https://learn.microsoft.com/windows/console/console-virtual-terminal-sequences#screen-colors).

</details>

## Colour mapping

Catppuccin's guide supplies the status colours and surfaces. Peach keeps Claude's warm identity, Blue marks permissions and user-related information, and Mauve separates accept-edits mode from Teal plan mode:

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

The rainbow uses Red, Peach, Yellow, Green, Sapphire, Lavender and Mauve. Diff backgrounds mix Green or Red with Base at 10%, 15% and 20% for dimmed, word and line highlights. This follows Catppuccin's recommended opacity range while keeping the text readable; the colours are mixed ahead of time because Claude themes cannot express transparency.

Accent shimmers in the regular themes add 20 to each RGB channel, capped at 255. These lighter shades are local additions, not extra colours in the Catppuccin palette. Inactive shimmer uses Overlay 0 instead.

The ANSI themes approximate colours that lack their own terminal slot. For example, Mauve and Lavender share nearby Magenta or Blue slots. Fixed xterm greys keep backgrounds and muted text distinct, but lose some of Catppuccin's tint. The regular and ANSI themes therefore need not look identical.

Preview terminal palettes use Catppuccin's published normal and bright ANSI colours. The style guide assigns Peach to colour 16 and Rosewater to colour 17; both are included.

## Sources and licence

- [Catppuccin palette](https://github.com/catppuccin/palette/blob/07d02aa110ef9eb7e7427afca5c73ba9cf7f8ebd/palette.json)
- [Catppuccin style guide](https://github.com/catppuccin/catppuccin/blob/d09787dd98ca6fba08af5ef2ae94a7e09f17daca/docs/style-guide.md)

The palette and style guide are © 2021 Catppuccin and distributed under the [MIT licence](LICENSES/catppuccin.txt), included with this plugin. Claude Code role choices, diff blends and shimmer adjustments are local changes described above.
