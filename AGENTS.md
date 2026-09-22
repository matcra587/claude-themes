# claude-themes

Marketplace of Claude Code theme plugins: `plugins/<family>/themes/*.json`
validated against `schemas/theme.schema.json`.

## Commands

- List tasks: `mise tasks --local`
- Validate: `uv run scripts/schema-validation.py --changed <file>` (or `--all`)
- Test locally: see [CONTRIBUTING.md](CONTRIBUTING.md#test-a-theme-locally).
- Plan previews: `mise run previews:render --changed --base origin/main --plan`
- Test preview tooling: `mise run test:previews`

## Key facts

- Tokens absent from `overrides` fall through to the `base` preset. Override
  only what differs — never copy a full preset.
- Unknown/misspelled tokens are silently ignored at runtime; validation is the
  only thing that catches them.
- Prefer `uv run` over bare python, `jq` over `python -m json.tool`.
