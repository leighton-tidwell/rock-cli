# rock-cli

CLI tool for the [Rock RMS](https://www.rockrms.com/) v2 REST API. Provides full coverage of all 317 v2 API controllers (~1,260 endpoints) through a single generic resource command.

## Installation

```bash
# Install globally from GitHub
bun add -g github:leighton-tidwell/rock-cli
```

Requires [Bun](https://bun.sh/) runtime.

## Quick Start

```bash
# Initialize configuration with your Rock URL and API key
rock config init https://rock.example.com YOUR_API_KEY

# List all available resources
rock resource list

# Search for people
rock resource search People --where 'LastName == "Smith"' --take 10

# Get a specific record
rock resource get Campuses 1
```

## Configuration

Configuration lives at `~/.rockrc.json`. Manage multiple Rock instances via named profiles.

```json
{
  "activeProfile": "production",
  "profiles": {
    "production": {
      "url": "https://rock.example.com",
      "apiKey": "YOUR_API_KEY"
    },
    "staging": {
      "url": "https://rock-staging.example.com",
      "apiKey": "STAGING_KEY"
    }
  }
}
```

```bash
# Switch profiles
rock config profile staging

# Add a new profile
rock config profile add staging --url https://rock-staging.example.com --key YOUR_KEY

# Show current config
rock config show
```

## Commands

### Resource Command (All 317 v2 Controllers)

```bash
# List all resources (grouped by category)
rock resource list
rock resource list --category Financial

# Search / list records
rock resource search People --where 'LastName == "Tidwell"' --take 5
rock resource search FinancialTransactions --where 'TransactionDateTime >= DateTime(2024,1,1)' --take 10
rock resource search Groups --where 'GroupTypeId == 25' --sort 'Name'
rock resource search People --select 'new (Id, FirstName, LastName, Email)'

# Get a single record by ID
rock resource get People 42
rock resource get Campuses 1

# Create a record
rock resource create People --body '{"FirstName":"Jane","LastName":"Doe","Email":"jane@example.com"}'

# Update a record
rock resource update People 42 --body '{"Email":"newemail@example.com"}'

# Delete a record
rock resource delete Notes 99

# Get attribute values
rock resource attributes People 42

# Set attribute values
rock resource set-attributes People 42 --body '{"Allergy":"Peanuts"}'
```

### Search Query Options

| Option | Description | Example |
|---|---|---|
| `--where` | Dynamic LINQ filter | `'LastName == "Smith"'` |
| `--select` | Projection | `'new (Id, FirstName, LastName)'` |
| `--sort` | Sort expression | `'LastName, FirstName desc'` |
| `--take` | Limit results | `10` |
| `--offset` | Skip results | `20` |

### Dynamic LINQ Examples

```
# String comparison
LastName == "Decker"
LastName.Contains("Dec")
Email.StartsWith("admin")

# Numeric
GroupTypeId == 25
Id > 100

# Dates
TransactionDateTime >= DateTime(2024, 1, 1)
CreatedDateTime >= DateTime(2024, 6, 15)

# Boolean
IsActive == true
IsDeceased == false

# Combined
LastName == "Tidwell" && IsActive == true
GroupTypeId == 25 || GroupTypeId == 26

# Nested / collections
PhoneNumbers.Any(Number.StartsWith("210"))
```

### Raw API Requests

For non-standard endpoints or v1 API access:

```bash
rock raw GET /api/v2/utilities/some-endpoint
rock raw POST /api/v2/utilities/some-endpoint --body '{"key":"value"}'
```

### Config Management

```bash
rock config init <url> <apiKey>      # Initialize config
rock config show                      # Show current config
rock config set-url <url>             # Update URL
rock config set-key <key>             # Update API key
rock config profile                   # Show active profile
rock config profile <name>            # Switch profile
rock config profile add <name>        # Add new profile
```

## Resource Categories

| Category | Examples |
|---|---|
| People & Families | People, PersonAliases, PhoneNumbers, Assessments |
| Groups & Membership | Groups, GroupMembers, GroupTypes, GroupLocations |
| Financial | FinancialTransactions, FinancialAccounts, FinancialBatches, FinancialPledges |
| Attendance & Check-in | Attendances, AttendanceOccurrences, AttendanceCodes |
| Communication | Communications, CommunicationTemplates, CommunicationFlows, SmsPipelines |
| Content & Media | ContentChannels, ContentChannelItems, MediaElements, BinaryFiles |
| Events & Registration | EventCalendars, EventItems, Registrations, RegistrationTemplates |
| Connections | ConnectionRequests, ConnectionOpportunities, ConnectionTypes |
| Workflows | Workflows, WorkflowTypes, WorkflowActions, WorkflowTriggers |
| Learning | LearningCourses, LearningClasses, LearningParticipants |
| Steps & Streaks | Steps, StepPrograms, Streaks, AchievementTypes |
| Notes & Documents | Notes, Documents, SignatureDocuments, Snippets |
| Analytics | AnalyticsDimPersonCurrents, AnalyticsFactFinancialTransactions |
| AI | AIAgents, AISkills, AIProviders |
| Security & Auth | Auths, UserLogins, AuthClients |
| System & Admin | Attributes, Categories, DefinedTypes, ServiceJobs, Metrics |

Run `rock resource list` for the full list of all 317 resources.

## Rock RMS API Key Setup

1. In Rock, go to **Admin Tools > Security > REST Keys**
2. Create a new REST key
3. Add the REST key's person to the **RSR - Rock Administration** security role
4. Grant **ExecuteRead**, **ExecuteWrite**, **ExecuteUnrestrictedRead**, and **ExecuteUnrestrictedWrite** on all v2 REST controllers (see [v2 API Setup Guide](docs/rock-rms-v2-api-setup.md) for bulk SQL script)
5. Clear the Rock cache after permission changes

## License

[MIT](LICENSE) -- Copyright Leighton Tidwell 2026
