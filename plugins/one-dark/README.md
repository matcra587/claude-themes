# One Dark

Atom's One Dark palette through Joshua Dick's Vim port, alongside Son A. Pham's OneHalf Dark and OneHalf Light, adapted for Claude Code.

## Installation

```text
/plugin install one-dark@matcra587/claude-themes
```

Run `/theme` and choose a variant.

## Themes

| Theme | Regular base | ANSI base | Main text | Background |
| --- | --- | --- | --- | --- |
| One Dark | `dark` | `dark-ansi` | `#abb2bf` | `#282c34` |
| OneHalf Dark | `dark` | `dark-ansi` | `#dcdfe4` | `#282c34` |
| OneHalf Light | `light` | `light-ansi` | `#383a42` | `#fafafa` |

## Variants

<!-- rumdl-disable-next-line MD057 -->
Choose the regular theme for fixed colours. Choose **(ANSI)** when your terminal uses the matching upstream Kitty palette. See the [ANSI guide](../../README.md#ansi-variants) and [theme previews](PREVIEWS.md).

> [!WARNING]
> One Dark's Kitty palette maps normal White to Comment Grey. Code using that slot is dimmer than the main UI text. Choose regular **One Dark** if you prefer its syntax colours; UI overrides do not remap ANSI syntax slots.

## Colour mapping

Regular themes use the pinned Vim palettes. Blue identifies permissions, the user, memory and IDE integration; Purple identifies accept edits, skills, merged changes and ultra effort; Cyan identifies plan mode. Success, errors and warnings use Green, Red and Yellow. The prompt border is Blue and the shell border is Red.

| Role | One Dark | OneHalf Dark | OneHalf Light |
| --- | --- | --- | --- |
| Claude, Clawd, fast mode and orange-labelled accents | Dark Yellow `#d19a66` | Yellow `#e5c07b` | Yellow `#c18401` |
| Subtle text | Comment Grey `#5c6370` | Gutter foreground `#919baa` | Derived `#6c6e75` |
| Inactive text | Gutter Grey `#4b5263` | Comment `#5c6370` | Comment `#a0a1a7` |
| Inactive shimmer | Derived `#545b6a` | Derived `#777f8d` | Derived `#86888e` |
| Message backgrounds | Cursor Grey `#2c323c` | Cursor Line `#313640` | Cursor Line `#f0f0f0` |
| Selection and message hover | Visual Grey `#3e4452` | Selection `#474e5d` | Selection `#bfceff` |

> [!NOTE]
> OneHalf has no orange. Its own warm Yellow stands in for orange rather than borrowing a colour from another palette. Purple also stands in for pink and indigo throughout this family. These aliases are intentional; eight agent labels do not imply eight distinct upstream accents.

OneHalf Dark uses its two upstream foreground greys for muted and inactive text. Its near-background non-text colour is reserved for whitespace in Vim and would make Claude's inactive labels difficult to read. OneHalf Light uses the upstream Comment colour for inactive text; its much paler Gutter colour would disappear against the light background. Subtle text is the midpoint between Comment and main text, giving all three dim levels a clear order without borrowing another palette's grey.

Inactive shimmer is the midpoint between inactive and subtle text. Other RGB shimmers add 20 to each channel, capped at 255. Diff backgrounds blend Green or Red over the background at 10%, 15% and 20% for dimmed, word and line highlights. Derived channels round to the nearest integer, with halves rounded up. These are local derivations; the upstream Vim diff accents are foreground colours, not suitable full-strength backgrounds.

## ANSI terminal palette

The Kitty ports put the six accents in the normal Red, Green, Yellow, Blue, Magenta and Cyan slots. Their bright accent slots repeat the same colours, so these variants use nearby, lighter xterm colours for visible shimmers. One Dark's normal White is Comment Grey, while its Bright White is main text. OneHalf Dark uses its main text colour in both White slots; OneHalf Light uses Black for text and White for its background.

Fixed xterm greys approximate colours missing from the terminal slots and preserve the subtle, inactive-shimmer and inactive hierarchy. OneHalf Light's blue selection tint uses a nearby xterm colour instead of a neutral grey. One Dark's orange uses fixed xterm colours 173 (`#d7875f`) and 180 (`#d7af87`) for its shimmer; its terminal port has no orange slot. OneHalf's Yellow maps directly to `ansi:yellow`. ANSI diff backgrounds inherit the selected Claude Code ANSI base.

> [!NOTE]
> OneHalf Light's upstream Vim palette uses Green `#50a14f`, but its Kitty port uses `#40a14f`. The regular and ANSI themes preserve their respective sources, so that small difference is expected.

## Sources and licence

All source and terminal palette files are pinned in [the plugin manifest](.claude-plugin/plugin.json).

- One Dark: [Vim palette](https://github.com/joshdick/onedark.vim/blob/47bec7a6196a843dad195d2666c3ac84c6e80c78/autoload/onedark.vim) and [Kitty palette](https://github.com/joshdick/onedark.vim/blob/47bec7a6196a843dad195d2666c3ac84c6e80c78/term/One%20Dark.kitty).
- OneHalf Dark: [Vim palette](https://github.com/sonph/onehalf/blob/75eb2e97acd74660779fed8380989ee7891eec56/vim/colors/onehalfdark.vim) and [Kitty palette](https://github.com/sonph/onehalf/blob/75eb2e97acd74660779fed8380989ee7891eec56/kitty/onehalf-dark.conf).
- OneHalf Light: [Vim palette](https://github.com/sonph/onehalf/blob/75eb2e97acd74660779fed8380989ee7891eec56/vim/colors/onehalflight.vim) and [Kitty palette](https://github.com/sonph/onehalf/blob/75eb2e97acd74660779fed8380989ee7891eec56/kitty/onehalf-light.conf).

Atom's original One Dark is © 2016 GitHub Inc.; Joshua Dick's Vim port is © 2015 Joshua Dick; OneHalf is © 2019 Son A. Pham. Their MIT licences are included as [Atom's notice](LICENSES/atom-one-dark-syntax.txt), [One Dark's notice](LICENSES/onedark.txt) and [OneHalf's notice](LICENSES/onehalf.txt). Atom's notice comes from the [pinned original project](https://github.com/atom/one-dark-syntax/blob/9c96f4454362267ac45322063e193ccf9d2debb1/LICENSE.md).

The OneHalf Kitty palettes credit [dbinary](https://github.com/dbinary). Claude Code role mappings, derived highlights and ANSI approximations are local adaptations described above.
