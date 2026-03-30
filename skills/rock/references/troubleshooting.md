# Troubleshooting Reference

Diagnose and resolve common errors when using the Rock CLI.

## Contents

- [HTTP Status Codes](#http-status-codes)
- [Configuration Problems](#configuration-problems)
- [Connectivity Issues](#connectivity-issues)
- [OData Query Errors](#odata-query-errors)
- [Common Scenarios](#common-scenarios)

## HTTP Status Codes

### 401 Unauthorized -- Bad API Key

The API key is missing, invalid, or expired.

```
Rock API error: 401 Unauthorized
```

**Fix**:

```bash
# Verify current config
rock config show

# Update the API key
rock config set-key "your-new-api-key"
```

Generate a new API key in Rock Admin under Security > REST Key Detail.

### 403 Forbidden -- Insufficient Permissions

The API key is valid but lacks permissions for the requested resource.

```
Rock API error: 403 Forbidden
```

**Fix**: In Rock Admin, navigate to the REST key's security settings and grant access to the required entity types (People, Groups, Financial Transactions, etc.). Each entity type has separate View, Edit, and Administrate permissions.

### 400 Bad Request -- Malformed Query

The request URL or body contains invalid syntax, usually a bad OData expression.

```
Rock API error: 400 Bad Request
```

**Common causes**:

| Problem | Example | Fix |
|---------|---------|-----|
| Missing quotes on string values | `LastName eq Smith` | `LastName eq 'Smith'` |
| Quotes on numeric values | `CampusId eq '1'` | `CampusId eq 1` |
| Missing `datetime` prefix | `CreatedDateTime ge '2025-01-01'` | `CreatedDateTime ge datetime'2025-01-01'` |
| Filtering on an attribute | `$filter=BaptismDate eq ...` | Not supported; use `loadAttributes` + client-side filter |
| Invalid field name | `$filter=Firstname eq 'Jane'` | `$filter=FirstName eq 'Jane'` (case-sensitive) |
| Bad `$expand` target | `$expand=InvalidEntity` | Check valid navigation properties |

### 404 Not Found -- Wrong Endpoint or ID

The API path does not exist or the record ID is invalid.

```
Rock API error: 404 Not Found
```

**Common causes**:

| Problem | Fix |
|---------|-----|
| Typo in endpoint | Verify path: `/api/People`, not `/api/Person` |
| Wrong entity ID | Confirm the ID exists: `rock raw get "/api/People/123" --json` |
| Deleted record | Record may have been removed; search again |
| Missing `/api/` prefix | Ensure path starts with `/api/` when using `rock raw` |

### 500 Internal Server Error

Server-side error in Rock RMS.

```
Rock API error: 500 Internal Server Error
```

**Fix**: Check Rock RMS exception logs in Admin > System Settings > Exception List. This is typically a Rock configuration issue, not a CLI problem. Simplify the query to isolate the cause.

## Configuration Problems

### Config File Not Found

```
Config file not found at /Users/you/.rockrc.json. Run 'rock config init' to create one.
```

**Fix**:

```bash
rock config init "https://rock.example.com" "your-api-key"
```

### Profile Not Found

```
Profile 'staging' not found. Available profiles: default, production
```

**Fix**: Create the missing profile or use an existing one:

```bash
# Create the profile
rock config profile add staging --url "https://staging.rock.example.com" --key "staging-key"

# Or list available profiles
rock config profile
```

### Custom Config Path

Set the `ROCK_CONFIG_PATH` environment variable to use a non-default config location:

```bash
export ROCK_CONFIG_PATH="/path/to/custom/.rockrc.json"
rock config show
```

## Connectivity Issues

### Connection Refused / Timeout

```
TypeError: fetch failed
```

**Diagnose**:

1. Verify the URL is correct: `rock config show`
2. Test connectivity directly: `curl -I https://rock.example.com/api/People`
3. Check if a VPN is required
4. Verify the Rock server is running

### SSL Certificate Errors

If the Rock instance uses a self-signed certificate, the CLI's `fetch` call will reject it.

**Fix**: Set the `NODE_TLS_REJECT_UNAUTHORIZED` environment variable (use with caution):

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 rock people search --name "Smith" --json
```

### Trailing Slash in URL

The CLI strips trailing slashes from the base URL. If requests fail, verify the URL format:

```bash
# Good
rock config init "https://rock.example.com" "key"

# Also fine (trailing slash is stripped)
rock config init "https://rock.example.com/" "key"
```

## OData Query Errors

### Unrecognized Field Name

Rock field names are PascalCase and case-sensitive.

| Wrong | Correct |
|-------|---------|
| `firstname` | `FirstName` |
| `lastName` | `LastName` |
| `campus_id` | `CampusId` |
| `grouptype` | `GroupTypeId` |

### Unsupported $expand

Not all entities support all navigation properties. If `$expand` fails:

```bash
# Check what works by fetching without expand first
rock raw get "/api/Groups/42" --json
# Look at the response for navigation property names
```

### Query Too Complex

Rock may reject deeply nested or extremely long filter expressions. Simplify by:

1. Breaking into multiple queries
2. Reducing the number of `or` clauses
3. Removing unnecessary `$expand`

## Common Scenarios

### "I get empty results but know data exists"

1. Check the filter syntax -- a typo returns no matches instead of an error
2. Verify the field name is correct (PascalCase)
3. Confirm the profile points to the correct Rock instance: `rock config show`
4. Try without filters to confirm the endpoint works: `rock raw get "/api/People?\$top=1" --json`

### "I need a PersonAliasId but only have a PersonId"

```bash
rock raw get "/api/PersonAlias?\$filter=PersonId eq 123&\$top=1&\$select=Id,PersonId" --json
```

### "I want to filter by an attribute value"

Attributes cannot be filtered via OData. Fetch with `loadAttributes` and filter client-side:

```bash
rock raw get "/api/People?\$top=500&loadAttributes=simple" --json
# Parse AttributeValues in the response
```

### "Results are truncated"

Rock caps results at a server-side maximum (often 1000). Use `$top` and `$skip` to paginate:

```bash
rock raw get "/api/People?\$top=100&\$skip=0" --json
rock raw get "/api/People?\$top=100&\$skip=100" --json
```

### "The CLI command does not support the filter I need"

Use `rock raw get` as an escape hatch to pass any OData query:

```bash
rock raw get "/api/People?\$filter=BirthMonth eq 12 and PrimaryCampusId eq 1&\$select=Id,FirstName,LastName&\$top=50" --json
```
