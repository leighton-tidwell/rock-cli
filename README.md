# rock-cli

CLI tool + Claude Code skill for [Rock RMS](https://www.rockrms.com/).

## Features

- **People** -- search, create, and manage person records
- **Groups** -- list groups, view members, add/remove members
- **Attendance** -- pull attendance records by group and date range
- **Giving** -- retrieve giving summaries and transaction history
- **Workflows** -- trigger and manage Rock workflows
- **Communications** -- send emails via Rock communication templates
- **Raw API access** -- execute arbitrary Rock RMS REST API calls
- **Multi-profile config** -- connect to multiple Rock instances
- **JSON output** -- pipe-friendly `--json` flag on every command
- **Claude Code skill** -- natural-language interface for all of the above

## Installation

```bash
bun add -g rock-cli
```

## Quick Start

```bash
# Initialize configuration (creates ~/.rockrc.json)
rock config init

# You will be prompted for your Rock RMS URL and API key.

# Try your first command
rock people search --name "Smith" --json
```

## Configuration

Configuration lives at `~/.rockrc.json`. You can manage multiple Rock instances via named profiles.

```json
{
  "activeProfile": "production",
  "profiles": {
    "production": {
      "url": "https://rock.example.com",
      "apiKey": "your-api-key",
      "defaultCampusId": 1
    },
    "staging": {
      "url": "https://rock-staging.example.com",
      "apiKey": "your-staging-key"
    }
  }
}
```

Switch profiles on any command with the `--profile` flag:

```bash
rock people search --name "Doe" --profile staging
```

## Commands

| Command Group | Description |
|---|---|
| `rock people` | Search, view, create, and update person records |
| `rock groups` | List groups, view/add/remove members |
| `rock attendance` | Query attendance records by group and date range |
| `rock giving` | Retrieve giving summaries and transaction details |
| `rock workflows` | Trigger workflows and check status |
| `rock comm` | Send emails and SMS via communication templates |
| `rock content` | Manage content channels and items |
| `rock campuses` | List and view campus details |
| `rock raw` | Execute arbitrary Rock RMS REST API requests |
| `rock config` | Initialize and manage connection profiles |

Use `rock <command> --help` for detailed usage on any command.

## Claude Code Skill

Install the skill so Claude Code can interact with Rock RMS using natural language:

```bash
npx @anthropic-ai/claude-code skills add https://github.com/leighton-tidwell/rock-cli
```

Once installed, you can ask Claude things like:

- "Find everyone in the Youth group"
- "Pull a giving summary for person 123 in 2024"
- "Add Jane Doe to the Volunteers group"
- "Show attendance for group 42 last quarter"

The skill includes workflow templates in `skills/rock/templates/` that demonstrate common multi-step operations.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and add tests under `tests/`
4. Run `bun test` to verify everything passes
5. Commit your changes and open a pull request

Please follow the existing code style and include tests for new functionality.

## License

[MIT](LICENSE) -- Copyright Leighton Tidwell 2026
