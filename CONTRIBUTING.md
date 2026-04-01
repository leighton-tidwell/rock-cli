# Contributing to rock-cli

Thanks for your interest in contributing! This is a CLI tool for the Rock RMS v2 REST API, built with Bun + TypeScript + Commander.js.

## Quick Setup

```bash
git clone https://github.com/leighton-tidwell/rock-cli.git
cd rock-cli
fnm use            # uses .node-version (v24.14.1)
bun install
```

Run locally:

```bash
bun run bin/rock.ts
```

Configure your Rock instance:

```bash
bun run bin/rock.ts config set --url https://rock.example.com/api --key YOUR_API_KEY
```

Config is stored at `~/.rockrc.json` (override with `ROCK_CONFIG_PATH` env var).

## Project Structure

```
bin/rock.ts              # CLI entry point
src/
  client.ts              # API client (auth, HTTP)
  config.ts              # Config file handling
  registry.ts            # All 317 v2 API resource definitions
  output.ts              # Output formatting (table, JSON, CSV)
  commands/
    resource.ts          # Generic resource command (list, get, create, update, delete)
    config.ts            # `rock config` command
    raw.ts               # `rock raw` for arbitrary API calls
  utils/
    search.ts            # Fuzzy search for resource names
docs/                    # Documentation
skills/rock/             # AI agent skill files (see below)
tests/                   # Test directory (empty — contributions welcome!)
```

## How It Works

The CLI auto-generates commands for all 317 Rock RMS v2 API controllers from `src/registry.ts`. Each entry maps a resource name to its API endpoint. The generic command in `src/commands/resource.ts` handles CRUD operations for all of them.

## Adding a New Resource

Just add an entry to `src/registry.ts` — that's it. The generic resource command picks it up automatically. No new command file needed.

## Testing Against Rock

You need access to a Rock RMS instance with a v2 API key. If you don't have one:

- Use Rock's [demo instance](https://rock.rockrms.com/) if available
- Set up a local Rock instance via their [installer](https://www.rockrms.com/Rock/Developer)
- Or test against the endpoints you have access to and note which Rock version you tested with

There's no automated test suite yet — this is a great area to contribute!

## Code Style

- TypeScript, strict mode
- Keep it simple — small functions, clear names
- Use Bun APIs where appropriate
- No unnecessary dependencies

## Submitting a PR

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Test locally with `bun run bin/rock.ts` against a real Rock instance if possible
4. Open a PR with a clear description of what changed and why

## Reporting Issues

Use the GitHub issue templates. Include your Rock RMS version and the specific endpoint/resource if applicable — behavior can vary between Rock versions.

## AI Agent Skills

The `skills/rock/` directory contains skill files that help AI coding agents (like Claude, Codex, etc.) understand and work with this codebase. If you're using an AI assistant, point it at these files for context. If you improve the codebase in ways that affect how agents should interact with it, update the relevant skill files too.

## License

MIT — see [LICENSE](LICENSE).
