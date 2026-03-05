# iagtm-agent

Autonomous agent system running on Mac Mini "Paddington". Tasks flow from Asana through GitHub Issues to Claude Code and Cursor Cloud for execution, with proof-of-work artifacts documenting every action.

See [CLAUDE.md](CLAUDE.md) for full operational guidance, skills routing, and workflow details.

## Quick Start

Clone with submodules:
```bash
git clone --recurse-submodules https://github.com/zirinisp/iagtm-agent.git
cd iagtm-agent
bash setup/setup.sh
```

If you already cloned without `--recurse-submodules`:
```bash
git submodule update --init --recursive
```

## Updating Skills

The `skills/` directory is a git submodule tracking [iagtm-skills](https://github.com/zirinisp/iagtm-skills). To pull the latest:
```bash
git submodule update --remote --merge skills
```
