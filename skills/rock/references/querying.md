# Querying Reference

Rock RMS uses OData v3 query parameters for filtering, selecting, expanding, and paginating API results. This is the most important reference for building effective queries.

**Related**: All other references use the patterns documented here.

## Contents

- [Two-Tier Data Model](#two-tier-data-model)
- [$filter](#filter)
- [$select](#select)
- [$expand](#expand)
- [$orderby](#orderby)
- [$top and $skip](#top-and-skip)
- [loadAttributes](#loadattributes)
- [Combining Parameters](#combining-parameters)
- [Common Gotchas](#common-gotchas)

## Two-Tier Data Model

Rock stores data in two tiers. Understanding this distinction is critical.

### Tier 1: Database Fields

Standard columns on the entity table (e.g., `FirstName`, `LastName`, `Email` on People). These fields:

- Support `$filter`, `$select`, `$orderby`
- Are always returned in API responses
- Have predictable types (string, int, datetime, bool)

### Tier 2: Attributes

Custom fields stored in the attribute/attribute-value system (e.g., "Baptism Date", "T-Shirt Size"). These fields:

- Do **NOT** support `$filter` -- you cannot filter by attribute values via OData
- Do **NOT** support `$orderby`
- Must be explicitly requested via `loadAttributes=simple` or `loadAttributes=expanded`
- Appear under the `AttributeValues` key in the response

### Practical Implication

To find people baptized after a certain date, you cannot do this:

```
# WRONG -- attributes cannot be filtered via OData
$filter=BaptismDate gt datetime'2025-01-01'
```

Instead, fetch records with attributes loaded and filter client-side:

```bash
rock raw get "/api/People?\$top=500&loadAttributes=simple" --json
# Then filter the AttributeValues.BaptismDate in your code
```

## $filter

Filter results based on database field values.

### Comparison Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `eq` | Equal | `LastName eq 'Smith'` |
| `ne` | Not equal | `Gender ne 0` |
| `gt` | Greater than | `BirthYear gt 1990` |
| `lt` | Less than | `BirthYear lt 2000` |
| `ge` | Greater than or equal | `TransactionDateTime ge datetime'2025-01-01'` |
| `le` | Less than or equal | `TransactionDateTime le datetime'2025-12-31'` |

### Logical Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `and` | Both conditions | `LastName eq 'Smith' and IsDeceased eq false` |
| `or` | Either condition | `LastName eq 'Smith' or LastName eq 'Jones'` |

Parentheses group logic:

```
(LastName eq 'Smith' or LastName eq 'Jones') and IsDeceased eq false
```

### String Functions

| Function | Description | Example |
|----------|-------------|---------|
| `startswith(field, 'val')` | Starts with | `startswith(LastName, 'Sm')` |
| `endswith(field, 'val')` | Ends with | `endswith(Email, '@gmail.com')` |

### Collection Functions

Use `any()` and `all()` to filter on related collections:

```
# People with any phone number starting with '555'
PhoneNumbers/any(p: startswith(p/Number, '555'))

# Groups where all members are active
Members/all(m: m/GroupMemberStatus eq 1)
```

### Data Type Syntax

| Type | Syntax | Example |
|------|--------|---------|
| String | Single quotes | `LastName eq 'Smith'` |
| Integer | No quotes | `CampusId eq 1` |
| Boolean | No quotes | `IsActive eq true` |
| DateTime | `datetime` prefix | `CreatedDateTime ge datetime'2025-01-01'` |
| Null | `null` keyword | `CampusId eq null` |

### CLI Examples

```bash
# Simple equality
rock raw get "/api/People?\$filter=LastName eq 'Smith'" --json

# Date range
rock raw get "/api/FinancialTransactions?\$filter=TransactionDateTime ge datetime'2025-01-01' and TransactionDateTime le datetime'2025-12-31'" --json

# String function
rock raw get "/api/People?\$filter=startswith(Email, 'john')" --json

# Collection filter
rock raw get "/api/People?\$filter=PhoneNumbers/any(p: startswith(p/Number, '555'))" --json

# Null check
rock raw get "/api/Groups?\$filter=CampusId ne null" --json

# Combined logic
rock raw get "/api/People?\$filter=(LastName eq 'Smith' or LastName eq 'Jones') and RecordStatusValueId eq 3" --json
```

## $select

Limit which fields are returned. Reduces response size and improves performance.

```bash
# Return only Id, FirstName, LastName
rock raw get "/api/People?\$select=Id,FirstName,LastName" --json

# Combine with filter
rock raw get "/api/People?\$filter=LastName eq 'Smith'&\$select=Id,FirstName,LastName,Email" --json
```

Use `$select` when you only need a few fields from a large entity.

## $expand

Include related entities in the response. Without `$expand`, related entities return only their ID.

### Syntax

```
$expand=RelatedEntity
$expand=Entity1,Entity2
```

### Common Expand Patterns

| Base Entity | Expand | Result |
|-------------|--------|--------|
| GroupMembers | `Person` | Include full person record on each member |
| GroupMembers | `Group` | Include full group record on each member |
| GroupMembers | `Group,Person` | Include both |
| Groups | `GroupType` | Include the group type definition |
| Groups | `Campus` | Include campus details |
| FinancialTransactions | `TransactionDetails` | Include line items |
| ContentChannelItems | `ContentChannel` | Include parent channel |
| CommunicationRecipients | `PersonAlias` | Include person alias |

### CLI Examples

```bash
# Group members with person details
rock raw get "/api/GroupMembers?\$filter=GroupId eq 42&\$expand=Person" --json

# Transactions with line items
rock raw get "/api/FinancialTransactions?\$expand=TransactionDetails&\$top=10" --json

# All groups a person belongs to
rock raw get "/api/GroupMembers?\$filter=PersonId eq 789&\$expand=Group" --json
```

### Nested Expand

Some Rock instances support nested expand:

```bash
rock raw get "/api/FinancialTransactions?\$expand=TransactionDetails(\$expand=Account)&\$top=5" --json
```

## $orderby

Sort results by a database field. Append `desc` for descending order.

```bash
# Ascending (default)
rock raw get "/api/People?\$orderby=LastName" --json

# Descending
rock raw get "/api/FinancialTransactions?\$orderby=TransactionDateTime desc" --json

# Multiple sort fields
rock raw get "/api/People?\$orderby=LastName,FirstName" --json
```

## $top and $skip

Paginate results. Rock returns a maximum number of records per request (often 1000).

| Parameter | Description |
|-----------|-------------|
| `$top` | Maximum number of records to return |
| `$skip` | Number of records to skip |

### Manual Pagination

```bash
# Page 1
rock raw get "/api/People?\$top=100&\$skip=0" --json

# Page 2
rock raw get "/api/People?\$top=100&\$skip=100" --json

# Page 3
rock raw get "/api/People?\$top=100&\$skip=200" --json
```

### CLI Built-In Pagination

The `--top` flag on dedicated commands maps to `$top`:

```bash
rock people search --name "Smith" --top 10 --json
```

The CLI also provides an internal `paginate()` utility that automatically walks through all pages when fetching large datasets.

## loadAttributes

Request attribute values on entities. This is a Rock-specific parameter, not standard OData.

| Value | Description |
|-------|-------------|
| `simple` | Return attribute values as simple key-value pairs |
| `expanded` | Return attribute values with full metadata (type, description, etc.) |

### When to Use Each

- Use `simple` for most cases -- returns `AttributeValues` as `{ "Key": { "Value": "...", "ValueFormatted": "..." } }`
- Use `expanded` when you need attribute metadata (field type, categories, display options)

### CLI Usage

```bash
# Via dedicated command
rock people get 123 --attributes --json    # Uses loadAttributes=simple
rock groups get 42 --attributes --json     # Uses loadAttributes=simple

# Via raw for expanded
rock raw get "/api/People/123?loadAttributes=expanded" --json
```

### Combining with Other Parameters

```bash
rock raw get "/api/People?\$filter=LastName eq 'Smith'&\$top=10&loadAttributes=simple" --json
```

Note: `loadAttributes` does NOT use the `$` prefix. It is a Rock-specific query parameter.

## Combining Parameters

Build complex queries by combining multiple OData parameters:

```bash
# Filter + select + orderby + top
rock raw get "/api/People?\$filter=PrimaryCampusId eq 1&\$select=Id,FirstName,LastName&\$orderby=LastName&\$top=50" --json

# Filter + expand + top + loadAttributes
rock raw get "/api/GroupMembers?\$filter=GroupId eq 42&\$expand=Person&\$top=100&loadAttributes=simple" --json
```

### Parameter Summary

| Parameter | Prefix | Purpose |
|-----------|--------|---------|
| `$filter` | `$` | Filter rows |
| `$select` | `$` | Choose columns |
| `$expand` | `$` | Join related entities |
| `$orderby` | `$` | Sort results |
| `$top` | `$` | Limit result count |
| `$skip` | `$` | Offset for pagination |
| `loadAttributes` | none | Load attribute values |

## Common Gotchas

### 1. Attributes Cannot Be Filtered

```
# WRONG: this will return a 400 error
$filter=BaptismDate gt datetime'2025-01-01'

# RIGHT: load attributes and filter client-side
/api/People?$top=500&loadAttributes=simple
```

### 2. DateTime Requires the datetime Prefix

```
# WRONG
$filter=TransactionDateTime ge '2025-01-01'

# RIGHT
$filter=TransactionDateTime ge datetime'2025-01-01'
```

### 3. String Values Need Single Quotes

```
# WRONG
$filter=LastName eq Smith

# RIGHT
$filter=LastName eq 'Smith'
```

### 4. Integer and Boolean Values Must NOT Have Quotes

```
# WRONG
$filter=CampusId eq '1'

# RIGHT
$filter=CampusId eq 1
```

### 5. Shell Escaping with $

The `$` character is special in bash. Escape it in shell commands:

```bash
# Use backslash to escape $
rock raw get "/api/People?\$filter=LastName eq 'Smith'" --json

# Or use single quotes for the entire URL (no escaping needed)
rock raw get '/api/People?$filter=LastName eq '\''Smith'\''' --json
```

### 6. $expand Does Not Work on All Entities

Some entities have limited navigation properties. If `$expand` returns an error, check the Rock RMS API documentation for supported navigation properties on that entity.

### 7. $top Default Limits

Rock imposes a server-side maximum (often 1000 records). Even if you request `$top=5000`, the server may cap the result. Use `$skip` to paginate through larger datasets.

### 8. loadAttributes Has No $ Prefix

```
# WRONG
$loadAttributes=simple

# RIGHT
loadAttributes=simple
```

### 9. PersonId vs PersonAliasId

Many Rock entities reference `PersonAliasId`, not `PersonId`. A person can have multiple aliases (from merges). Use the correct field:

```bash
# Find a person's alias ID
rock raw get "/api/PersonAlias?\$filter=PersonId eq 123&\$top=1" --json
```

### 10. Filter on Related Entity Fields

To filter on a related entity's field, use the navigation path:

```
# Filter transactions by payment detail's account
FinancialPaymentDetail/FinancialAccountId eq 7
```

Not all nested paths are supported. Test queries or consult Rock API docs for your version.
