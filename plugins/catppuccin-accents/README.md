# Catppuccin Accents

The four Catppuccin flavours with an alternative accent colour, following the
accent system used by other Catppuccin ports such as [catppuccin/lazygit](https://github.com/catppuccin/lazygit).

Each theme is identical to its flavour in the [catppuccin](../catppuccin) plugin
(the `blue` accent) except for the accent-hued roles: permissions, the system
spinner, IDE and memory notices, the "you" brief label, the rate-limit meter,
the input box border and the Clawd mascot. Every other palette colour —
including blue itself in subagent labels and the rainbow slots — is unchanged.

Each flavour keeps its `blue` accent in the main [`catppuccin`](../catppuccin)
plugin, so these themes skip it to avoid duplicates in `/theme`.

## Installation

Run these commands inside Claude Code.

1. **Add the marketplace.** You only need to do this once.

   ```text
   /plugin marketplace add matcra587/claude-themes
   ```

2. **Install the theme family.**

   ```text
   /plugin install catppuccin-accents@claude-themes
   ```

   Choose **Install for you** to use the themes across your projects.

3. **Choose a theme.**

   ```text
   /theme
   ```

   Select a variant from the family you installed. If it does not appear, run `/reload-plugins`, then open `/theme` again.

## Themes

| Flavour   | Base   | Accents                                                                       |
| --------- | ------ | ----------------------------------------------------------------------------- |
| Latte     | `light`  | Flamingo, Green, Lavender, Maroon, Mauve, Peach, Pink, Red, Rosewater, Sapphire, Sky, Teal, Yellow |
| Frappé    | `dark`   | same 13 accents                                                                |
| Macchiato | `dark`   | same 13 accents                                                                |
| Mocha     | `dark`   | same 13 accents                                                                |
