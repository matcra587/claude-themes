# Dracula theme previews

These deterministic renders show the main Claude Code theme roles. They use
GeistMono Nerd Font and the official Dracula terminal palette.

Diffs follow Claude Code's base renderer: GitHub for light themes, Monokai
Extended for dark themes and foreground-only ANSI colours for ANSI themes.
Labels such as `tests passed` and `build failed` are stable token probes, not
literal Claude Code status messages. The eight-dot row is the documented
subagent colour palette, not a literal transcript entry.

## Dracula

| Regular | ANSI |
| --- | --- |
| [![Dracula](renders/dracula.png)](renders/dracula.png) | [![Dracula (ANSI)](renders/dracula-ansi.png)](renders/dracula-ansi.png) |

<details>
<summary>Capture details</summary>

Combined screenshot crops from **Claude Code 2.1.278**, using **Geist Mono**.

- **Pixels:** Preserved from the original screenshots.
- **Swatches:** Agent colours.
- **Syntax highlighting:** Regular: `Monokai Extended`; ANSI: `ansi`.
- **Examples:** Auto mode and a shell prompt.

[Terminal palette source](https://github.com/dracula/alacritty/blob/c8a3a13404b78d520d04354e133b5075d9b785e1/dracula.toml).

</details>
