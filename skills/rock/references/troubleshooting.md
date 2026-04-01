# Troubleshooting Reference

Diagnose and resolve common errors when using the Rock CLI with the v2 API.

## HTTP Status Codes

### 401 Unauthorized - Bad API Key

The API key is missing, invalid, or expired.

```
Rock API error: 401 Unauthorized
```

Fix:
```bash
# Verify current config
rock config show

# Update the API key
rock config set-key "your-new-api-key"
```

Generate a new API key in Rock Admin under Security > REST Key Detail.

### 403 Forbidden - Insufficient Permissions

The API key is valid but lacks permissions for the requested resource.

```
Rock API error: 403 Forbidden
```

Fix: In Rock Admin, navigate to the REST key's security settings and grant access
to the required entity types (People, Groups, Financial Transactions, etc.).
Each entity type has separate View, Edit, and Administrate permissions.

### 400 Bad Request - Malformed Query

The request URL or body contains invalid syntax, usually a bad Dynamic LINQ expression.

```
Rock API error: 400 Bad Request
```

Common causes:

| Problem | Wrong | Right |
|---------|-------|-------|
| Using OData syntax | `--where "LastName eq 'Smith'"` | `--where 'LastName == "Smith"'` |
| Missing quotes on strings | `--where 'LastName == Smith'` | `--where 'LastName == "Smith"'` |
| Wrong DateTime syntax | `--where 'Date >= "2025-01-01"'` | `--where 'Date >= DateTime(2025,1,1)'` |
| Invalid field name | `--where 'Firstname == "Jane"'` | `--where 'FirstName == "Jane"'` |
| Filtering on attribute | `--where 'BaptismDate == ...'` | Use `rock resource attributes` instead |
| Bad JSON body | `--body '{Name: Test}'` | `--body '{"Name": "Test"}'` |

### 404 Not Found - Wrong Resource or ID

The resource name doesn't exist or the record ID is invalid.

```
Rock API error: 404 Not Found
```

Common causes:

| Problem | Fix |
|---------|-----|
| Wrong resource name | Use `rock resource list` to find correct name |
| Case sensitivity | `people` should be `People` |
| Wrong entity ID | Confirm ID exists: `rock resource get People 123` |
| Deleted record | Search again to verify record exists |

### 500 Internal Server Error

Server-side error in Rock RMS.

Fix: Check Rock RMS exception logs in Admin > System Settings > Exception List.
This is typically a Rock configuration issue, not a CLI problem.
Simplify the query to isolate the cause.

## Configuration Problems

### Config File Not Found

```
Config file not found. Run 'rock config init' to create one.
```

Fix:
```bash
rock config init "https://rock.example.com" "your-api-key"
```

### Profile Not Found

```
Profile 'staging' not found.
```

Fix:
```bash
# Create the profile
rock config profile add staging --url "https://staging.rock.example.com" --key "staging-key"

# Or list available profiles
rock config profile
```

### Custom Config Path

Set the ROCK_CONFIG_PATH environment variable:
```bash
export ROCK_CONFIG_PATH="/path/to/custom/.rockrc.json"
rock config show
```

## Connectivity Issues

### Connection Refused / Timeout

```
TypeError: fetch failed
```

Diagnose:
1. Verify the URL: `rock config show`
2. Test connectivity: `curl -I https://rock.example.com/api/v2/People`
3. Check if VPN is required
4. Verify Rock server is running

### SSL Certificate Errors

For self-signed certificates:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 rock resource search People --take 1
```

### Trailing Slash in URL

The CLI handles trailing slashes, but verify the URL format:
```bash
rock config show
# URL should be like: https://rock.example.com (no trailing slash)
```

## Query Issues

### Empty Results When Data Exists

1. Check field name casing (PascalCase): `LastName`, not `lastname`
2. Verify the Dynamic LINQ syntax (not OData)
3. Confirm correct Rock instance: `rock config show`
4. Test without filters: `rock resource search People --take 1`
5. Check if resource name is correct: `rock resource list`

### PersonId vs PersonAliasId

Many entities use PersonAliasId, not PersonId. Look up the alias first:
```bash
rock resource search PersonAlias --where 'PersonId == 123' --take 1 \
  --select 'new (Id, PersonId)'
```

### Filtering by Attributes

Attributes cannot be filtered server-side. Fetch them separately:
```bash
# Get the record's attribute values
rock resource attributes People 123

# Update attribute values
rock resource set-attributes People 123 --body '{"BaptismDate": "2025-06-15"}'
```

### Results Are Truncated

Use --take and --offset for pagination:
```bash
# Page through all results
rock resource search People --where 'LastName == "Smith"' --take 100 --offset 0
rock resource search People --where 'LastName == "Smith"' --take 100 --offset 100
```

### Resource Name Not Found

Resource names are PascalCase and singular (usually):
```bash
# Find the correct name
rock resource list | grep -i "person"
rock resource list | grep -i "group"
rock resource list --category "Financial"
```

## Dynamic LINQ vs OData Quick Reference

If you're used to OData (v1 API), here's the mapping:

| OData (v1 - OLD)                          | Dynamic LINQ (v2 - NEW)                           |
|--------------------------------------------|----------------------------------------------------|
| `$filter=LastName eq 'Smith'`             | `--where 'LastName == "Smith"'`                    |
| `$filter=CampusId ne null`               | `--where 'CampusId != null'`                      |
| `$filter=BirthYear gt 1990`              | `--where 'BirthYear > 1990'`                      |
| `$filter=IsActive eq true`               | `--where 'IsActive == true'`                      |
| `$filter=startswith(Name, 'Sm')`         | `--where 'Name.StartsWith("Sm")'`                 |
| `$filter=Date ge datetime'2025-01-01'`   | `--where 'Date >= DateTime(2025, 1, 1)'`          |
| `$select=Id,FirstName,LastName`          | `--select 'new (Id, FirstName, LastName)'`         |
| `$orderby=LastName desc`                 | `--sort 'LastName desc'`                           |
| `$top=10`                                | `--take 10`                                        |
| `$skip=100`                              | `--offset 100`                                     |
| `$filter=... and ...`                    | `--where '... && ...'`                             |
| `$filter=... or ...`                     | `--where '... \|\| ...'`                           |

## Upgrade Issues

### CLI Not Found After Install

Ensure bun's global bin directory is in your PATH:
```bash
export PATH="$HOME/.bun/bin:$PATH"
```

### Upgrading to Latest Version

```bash
rock config upgrade
# Or manually:
bun add -g github:leighton-tidwell/rock-cli
```
