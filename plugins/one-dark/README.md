# One Dark

Atom's classic One Dark palette plus Son A. Pham's OneHalf siblings, ported to Claude. OneHalf Dark is a higher-contrast variant of One Dark (same accents, brighter foreground); OneHalf Light is the only light counterpart of the family.

## Installation

```text
/plugin install one-dark@matcra587/claude-themes
```

## Themes

| Theme                | Base         | Source                                  |
| -------------------- | ------------ | --------------------------------------- |
| One Dark             | `dark`       | `joshdick/onedark.vim` (Atom classic)   |
| One Dark (ANSI)      | `dark-ansi`  | `joshdick/onedark.vim`                  |
| OneHalf Dark         | `dark`       | `sonph/onehalf` (`onehalfdark.vim`)     |
| OneHalf Dark (ANSI)  | `dark-ansi`  | `sonph/onehalf`                         |
| OneHalf Light        | `light`      | `sonph/onehalf` (`onehalflight.vim`)    |
| OneHalf Light (ANSI) | `light-ansi` | `sonph/onehalf`                         |

One Dark and OneHalf Dark share `bg=#282c34` and the six accent hexes verbatim — the noticeable difference is OneHalf Dark's brighter `fg=#dcdfe4` (vs One Dark's cooler `fg=#abb2bf`). One Dark also ships a darker red/orange variant (`#be5046` / `#d19a66`); the orange is mapped to `claude` since standard One Dark/OneHalf has no native orange.

## Variants

Each variant ships in regular and **(ANSI)** forms. The ANSI variant delegates code-block syntax highlighting to your terminal's ANSI palette. See the [marketplace README](https://github.com/matcra587/claude-themes#ansi-variants) for details.
