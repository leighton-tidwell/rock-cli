# SQL Command Reference

Run raw T-SQL against the Rock RMS database via the [Triumph Tech Magnus](https://github.com/triumph-tech/magnus-ads) REST endpoints. The Magnus plugin must be installed on the target Rock instance.

**Related**: [troubleshooting.md](troubleshooting.md) for connection issues, [raw-api.md](raw-api.md) for non-SQL access.

## Prerequisite: Enable Magnus per profile

The `sql` command is gated behind a per-profile flag. Edit `~/.rockrc.json`:

```json
{
  "profiles": {
    "default": {
      "url": "https://rock.example.com",
      "apiKey": "...",
      "magnus": true
    }
  },
  "activeProfile": "default"
}
```

If `magnus` is missing or `false`, `rock sql ...` exits non-zero with:

```
Magnus is not enabled for profile 'default'. The Magnus plugin must be installed on this Rock instance. Set "magnus": true on the profile in ~/.rockrc.json once confirmed.
```

This is intentional — the Magnus REST surface only exists on instances that have the plugin installed. Do not flip the flag until you have confirmed the plugin is present.

## Commands

| Command | Description |
|---------|-------------|
| `rock sql query "<SQL>"` | Execute a query, poll until complete, print results |
| `rock sql info` | Print Rock version, SQL edition, database name |
| `rock sql tables` | List tables in the database |

## sql query

Execute a SQL statement (or batch of statements) and print the result set(s).

```bash
rock sql query "SELECT TOP 10 * FROM Person"
```

### Reading SQL from stdin

Pass `-` (or omit the positional argument with stdin piped) to read from stdin:

```bash
cat report.sql | rock sql query
echo "SELECT COUNT(*) FROM Person" | rock sql query -
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--json` | off | Emit the raw `ExecuteQueryProgress` JSON shape instead of a table |
| `--timeout <seconds>` | 60 | Cancel the query and exit non-zero if it does not complete in time |
| `--poll-interval <ms>` | 500 | How often to poll `Status/{id}` while a query is running |
| `--profile <name>` | active | Profile to use |

### Output

Default output is a simple text table per result set, followed by any server-side messages and the query duration in milliseconds. With `--json`, the response is the literal Magnus `ExecuteQueryProgress`:

```ts
{
  Identifier: string;
  IsComplete: boolean;
  Duration: number;
  Messages: { Message: string; ... }[];
  ResultSets: { Columns: { Name, Type }[]; Rows: unknown[][] }[];
}
```

Note that the wire format is PascalCase (`ResultSets`, `Rows`), not camelCase.

### Async query lifecycle

Magnus queries can return synchronously or asynchronously depending on duration. The CLI handles both:

1. POSTs to `/api/TriumphTech/Magnus/Sql/ExecuteQuery`.
2. If `IsComplete: false`, polls `/api/TriumphTech/Magnus/Sql/Status/{Identifier}` every `--poll-interval` ms.
3. If the timeout elapses, DELETEs `/api/TriumphTech/Magnus/Sql/Cancel/{Identifier}` (fire-and-forget) and exits with an error.

## sql info

Calls Magnus `Connect` and prints server metadata.

```bash
rock sql info
```

Use `--json` for raw output. Useful first step when verifying that Magnus is reachable on a new profile.

## sql tables

Walks the Magnus object explorer (root → tables folder → tables) and lists table names.

```bash
rock sql tables
rock sql tables --json
```

For column-level detail, prefer:

```bash
rock sql query "SELECT TOP 0 * FROM Person"  # returns columns with no rows
```

## Common patterns

### Top N rows from a table

```bash
rock sql query "SELECT TOP 10 Id, FirstName, LastName FROM Person ORDER BY Id DESC"
```

### Count rows quickly

```bash
rock sql query "SELECT COUNT(*) AS Total FROM Attendance"
```

### Run a saved query file

```bash
rock sql query - < ./reports/active-givers.sql --json | jq '.ResultSets[0].Rows'
```

### Multiple statements

`query` accepts batched SQL — each `SELECT` produces its own entry in `ResultSets`:

```bash
rock sql query "SELECT COUNT(*) FROM Person; SELECT COUNT(*) FROM Group"
```

## Error handling

Server errors (e.g. `Invalid object name 'Foo'`) come back as standard Rock error responses and are surfaced verbatim — the CLI prints `Rock API error: <status> - <body>` and exits non-zero.

If you see `401 Unauthorized` against a profile where Magnus is enabled, double-check the API key has REST access — Magnus uses the same `Authorization-Token` header as the rest of the Rock REST API.
