---
paths:
  - "plugins/**/themes/*-ansi.json"
---

# ANSI variant authoring

An ANSI variant assumes the user's terminal runs that family's terminal port —
that is why they pick it. ANSI slot names resolve through the terminal palette,
not through fixed colors, so every rule below follows from one fact: **slot
semantics are palette-dependent.**

## Rules

- **Never assume stock slot values.** Modern terminal ports (catppuccin,
  gruvbox, nord, rosé pine...) map `black`/`white` and their brights to
  surface/subtext tones, not to #000/#fff, and bright accents are *more
  saturated*, not lighter. A mapping that looks fine on a stock palette can
  collapse into grey-on-grey on a themed one.
- **Build by inversion, per family.** Source the family's published terminal
  ANSI mapping (its upstream style guide and/or GitHub repo, or a
  well-respected community port). For each token in the family's RGB theme,
  choose the slot whose *resolved* color is closest to the RGB value. Prefer
  normal slots for exact accent matches; bright slots are saturated variants.
- **Never pair two grey slots as foreground/background.** `black` text over a
  `blackBright` background resolves to adjacent surface tones in themed
  palettes. Keep surface backgrounds on nominally-dark slots (`black`) so the
  renderer selects a light foreground over them.
- **Greys without a slot use the fixed greyscale ramp.** Base/mantle/crust
  analogues have no ANSI slot; `ansi256(232)`–`ansi256(255)` are fixed
  xterm greys safe in any terminal (e.g. `ansi256(234)` = `#1c1c1c`).
- **Use extended slots the port defines.** Some ports assign colors beyond 15
  (catppuccin: `color16` = peach, `color17` = rosewater); reference them with
  `ansi256(16)`/`(17)` wherever the RGB theme calls for that color. Terminals
  that cannot remap them render xterm cube defaults — that is a terminal
  limitation, not a reason to weaken the mapping.
- **Minimal overrides only.** Base on `dark-ansi`/`light-ansi` and override
  only tokens that differ from the preset. A full copy of the preset is a
  no-op today and masks preset fixes tomorrow.
- **Brand orange:** `claude=redBright` / `claudeShimmer=yellowBright` is the
  deliberate 16-color approximation for ports with no orange slot. When the
  port defines one (catppuccin peach at 16), map `claude` to it directly.

## Verifying token reality

Unknown or removed tokens are silently ignored at runtime, and the official
docs can lag the shipped token set. Verify a doubtful token behaviorally: set
it to a loud color in an installed theme, switch to that theme, and look — a
token that changes nothing does not exist in the running version. Cross-check
against the Claude Code changelog and theme documentation for additions and
removals.
