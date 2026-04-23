# Omnikit Plugins Directory

A personal collection of plugins for Claude Code and other development agents.

This repository serves as a centralized hub for tools I use to optimize my development workflow. While it is currently focused on enhancing Claude Code, I plan to expand it to include plugins for other platforms like Codex as my needs evolve.

## Installation

Plugins can be installed directly from this marketplace via Claude Code's plugin system.

To install, run `/plugin install {plugin-name}@matcra587/omnikit`

or browse for the plugin in `/plugin > Discover`

## Plugin Structure

Each plugin follows a standard structure:

```text
plugin-name/
├── .claude-plugin/
│   └── plugin.json      # Plugin metadata (required)
├── .mcp.json            # MCP server configuration (optional)
├── commands/            # Slash commands (optional)
├── agents/              # Agent definitions (optional)
├── skills/              # Skill definitions (optional)
├── themes/              # Theme assets (optional)
└── README.md            # Documentation
```
