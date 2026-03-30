# People Command Reference

Search, view, create, update, and query family relationships for person records in Rock RMS.

**Related**: [querying.md](querying.md) for OData filter syntax, [groups.md](groups.md) for group membership.

## Commands

| Command | Description |
|---------|-------------|
| `rock people search` | Search for people by name, email, or phone |
| `rock people get <id>` | Get a single person by ID |
| `rock people create` | Create a new person record |
| `rock people update <id>` | Update an existing person |
| `rock people family <id>` | Get family members for a person |

## people search

Search for people using filters. Combine multiple filters with AND logic.

```bash
rock people search [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--name <name>` | string | Match against LastName or NickName (exact match) |
| `--email <email>` | string | Match against Email (exact match) |
| `--phone <phone>` | string | Match phone number prefix via `startswith` |
| `--top <n>` | number | Limit number of results returned |
| `--profile <name>` | string | Use a specific config profile |

### OData Filters Generated

The search command builds OData `$filter` expressions from flags:

| Flag | Generated Filter |
|------|------------------|
| `--name "Smith"` | `LastName eq 'Smith' or NickName eq 'Smith'` |
| `--email "jane@example.com"` | `Email eq 'jane@example.com'` |
| `--phone "555"` | `PhoneNumbers/any(a:startswith(a/Number, '555'))` |

Multiple flags combine with `and`.

### Examples

```bash
# Search by last name
rock people search --name "Smith" --json

# Search by email
rock people search --email "jane@example.com" --json

# Search by phone prefix, limit to 5 results
rock people search --phone "5551234" --top 5 --json

# Combine name and email
rock people search --name "Smith" --email "john.smith@example.com" --json
```

### Advanced Searches via raw

For filters beyond the built-in flags, use `rock raw get`:

```bash
# Search by first name
rock raw get "/api/People?\$filter=FirstName eq 'Jane'" --json

# Search by campus
rock raw get "/api/People?\$filter=PrimaryCampusId eq 1" --json

# Search by connection status
rock raw get "/api/People?\$filter=ConnectionStatusValueId eq 146" --json

# Search with wildcard-like behavior
rock raw get "/api/People?\$filter=startswith(LastName, 'Sm')" --json

# Search by birthday month
rock raw get "/api/People?\$filter=BirthMonth eq 3" --json
```

## people get

Retrieve a single person record by ID, optionally loading attributes.

```bash
rock people get <id> [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--attributes` | boolean | Load person attributes (uses `loadAttributes=simple`) |
| `--profile <name>` | string | Use a specific config profile |

### How --attributes Works

Rock RMS stores two categories of data on a person:

- **Database fields** (FirstName, LastName, Email, etc.) -- always returned
- **Attributes** (custom fields like Baptism Date, Membership Date, T-Shirt Size) -- only returned when `loadAttributes` is set

Pass `--attributes` to include attribute values in the response under the `AttributeValues` key.

```bash
# Without attributes: only database fields
rock people get 123 --json

# With attributes: database fields + AttributeValues
rock people get 123 --attributes --json
```

### Common Person Fields

| Field | Type | Description |
|-------|------|-------------|
| `Id` | int | Unique person ID |
| `FirstName` | string | Legal first name |
| `NickName` | string | Preferred first name |
| `LastName` | string | Last name |
| `Email` | string | Primary email |
| `Gender` | int | 0=Unknown, 1=Male, 2=Female |
| `BirthDate` | datetime | Date of birth |
| `PrimaryCampusId` | int | Campus ID |
| `ConnectionStatusValueId` | int | Connection status (member, visitor, etc.) |
| `RecordStatusValueId` | int | Record status (active, inactive, pending) |
| `PhotoUrl` | string | Profile photo URL |

## people create

Create a new person record. First name, last name, and email are required.

```bash
rock people create --first <first> --last <last> --email <email> [options] --json
```

### Flags

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--first <first>` | string | Yes | First name |
| `--last <last>` | string | Yes | Last name |
| `--email <email>` | string | Yes | Email address |
| `--phone <phone>` | string | No | Phone number |
| `--campus <id>` | number | No | Campus ID |
| `--profile <name>` | string | No | Config profile |

### Examples

```bash
# Create a basic person
rock people create --first "Jane" --last "Doe" --email "jane@example.com" --json

# Create with phone and campus
rock people create --first "John" --last "Smith" --email "john@example.com" \
  --phone "5551234567" --campus 1 --json
```

## people update

Update fields on an existing person. Only specified fields are changed.

```bash
rock people update <id> [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--first <first>` | string | Update first name |
| `--last <last>` | string | Update last name |
| `--email <email>` | string | Update email |
| `--phone <phone>` | string | Update phone number |
| `--profile <name>` | string | Config profile |

### Examples

```bash
# Update email
rock people update 123 --email "newemail@example.com" --json

# Update name and phone
rock people update 123 --first "Jonathan" --phone "5559876543" --json
```

## people family

Retrieve family members for a person. Uses the Rock endpoint `GetFamilyMembers`.

```bash
rock people family <id> [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--profile <name>` | string | Config profile |

### Examples

```bash
# Get family members for person 123
rock people family 123 --json
```

### Response Structure

Returns an array of family member objects, each containing the person record and their family role (Adult, Child).

## Real-World Workflows

### Find a Person and View Details

```bash
# Step 1: Search
rock people search --name "Doe" --json
# Parse the Id from results (e.g., 456)

# Step 2: Get full details with attributes
rock people get 456 --attributes --json
```

### Find a Person and View Their Family

```bash
rock people search --email "jane@example.com" --json
# Parse Id (e.g., 789)
rock people family 789 --json
```

### Create a Person Then Add to a Group

```bash
rock people create --first "Jane" --last "Doe" --email "jane@example.com" --json
# Parse the returned Id (e.g., 101)
rock groups add-member 42 101 --json
```
