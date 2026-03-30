---
name: rock
description: >
  This skill should be used when the user asks to "look up a person in Rock",
  "search for someone in Rock RMS", "check attendance", "view giving records",
  "manage groups", "add someone to a group", "launch a workflow",
  "send a communication", "send an SMS", "send an email", "manage content channels",
  "check campuses", or any task involving Rock RMS church management data.
  Provides CLI access to the Rock RMS REST API for people, groups, attendance,
  giving, workflows, communications, and content management.
allowed-tools: Bash(rock:*), Bash(bunx rock-cli:*)
---

# Rock RMS CLI

## Core Workflow

Every Rock CLI interaction follows this pattern:

1. **Verify config**: Ensure a connection profile exists (`rock config show`)
2. **Run command**: Execute the appropriate `rock` subcommand
3. **Parse output**: Use `--json` for structured results

```bash
rock config show
rock people search --name "Jane Doe" --json
rock people get 456 --attributes --json
```

## Prerequisites

To use the CLI, install and configure it first:

```bash
npm install -g rock-cli
rock config init
```

The `config init` wizard prompts for the Rock RMS base URL and API key. To add additional instances, use `rock config add --profile staging`.

## Command Groups

| Group | Purpose |
|-------|---------|
| `people` | Search, view, create, update people records |
| `groups` | List, manage groups and members |
| `attendance` | Query and record attendance |
| `giving` | View transactions, accounts, giving summaries |
| `workflows` | List, launch, check workflow status |
| `comm` | Send SMS/email, manage communication templates |
| `content` | Manage content channels and items |
| `campuses` | List and view campuses |
| `raw` | Direct API access escape hatch |
| `config` | Manage connection profiles |

## Common Patterns

### Search Person and Get Details

```bash
rock people search --name "Smith" --json && rock people get 123 --attributes --json
```

### Add a Person to a Group

```bash
rock people search --name "Jane Doe" --json
# Parse the person ID from output, then:
rock groups add-member --group-id 42 --person-id 789 --role-id 1 --json
```

### Launch a Workflow

```bash
rock workflows launch --type-id 15 --name "New Member Follow-Up" --json
rock workflows get 301 --json
```

### Send a Communication

```bash
rock comm send-sms --to "+15551234567" --message "Welcome to Sunday service!" --json
rock comm send-email --to "jane@example.com" --template-id 8 --json
```

### Direct API Access

To call any Rock REST endpoint not covered by a dedicated command:

```bash
rock raw get "api/People?$filter=LastName eq 'Smith'&$top=5" --json
rock raw post "api/Workflows/LaunchWorkflow/15" --body '{"name":"Test"}' --json
```

### Command Chaining

Use `&&` when intermediate output is not needed:

```bash
rock people search --name "Smith" --json && rock attendance check --person-id 123 --json
```

Run commands separately when output from one informs the next.

## Output Modes

| Flag | Description |
|------|-------------|
| `--json` | JSON output (recommended for programmatic use) |
| `--table` | Formatted table output (default for terminals) |
| `--raw` | Unformatted API response |

Always use `--json` when parsing output or chaining commands.

## Multi-Profile Support

To target different Rock instances, pass the `--profile` flag:

```bash
rock --profile staging people search --name "Smith" --json
rock --profile production giving summary --person-id 123 --json
```

## Deep-Dive Documentation

| Reference | When to Use |
|-----------|-------------|
| [references/people.md](references/people.md) | Full people command reference with filters and attributes |
| [references/groups.md](references/groups.md) | Group types, roles, member management |
| [references/attendance.md](references/attendance.md) | Attendance queries, check-in recording |
| [references/giving.md](references/giving.md) | Transactions, accounts, giving statements |
| [references/workflows.md](references/workflows.md) | Workflow types, launching, activity completion |
| [references/communications.md](references/communications.md) | SMS, email, templates, merge fields |
| [references/content.md](references/content.md) | Content channels, items, CRUD operations |
| [references/raw-api.md](references/raw-api.md) | Direct REST access, OData filters, pagination |

## Ready-to-Use Templates

| Template | Description |
|----------|-------------|
| [templates/new-member-workflow.sh](templates/new-member-workflow.sh) | Search person, add to group, launch follow-up workflow |
| [templates/attendance-report.sh](templates/attendance-report.sh) | Pull attendance data for a date range |
| [templates/bulk-communication.sh](templates/bulk-communication.sh) | Send templated SMS/email to a group |
