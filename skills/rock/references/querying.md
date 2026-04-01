# Querying Reference (v2 Dynamic LINQ)

The Rock RMS v2 API uses Dynamic LINQ for querying. This is NOT OData.
Do not use OData syntax ($filter, eq, etc.) with the v2 resource commands.

## Search Command Syntax

```bash
rock resource search <Resource> [options]
```

| Option     | Description                                |
|------------|--------------------------------------------|
| `--where`  | Dynamic LINQ filter expression             |
| `--select` | Projection (choose which fields to return) |
| `--sort`   | Sort expression                            |
| `--take`   | Max number of records to return            |
| `--offset` | Number of records to skip (pagination)     |

## Comparison Operators

| Operator | Meaning            | Example                                          |
|----------|--------------------|--------------------------------------------------|
| `==`     | Equal              | `LastName == "Smith"`                            |
| `!=`     | Not equal          | `Gender != 0`                                    |
| `>`      | Greater than       | `BirthYear > 1990`                               |
| `<`      | Less than          | `TotalAmount < 100.00`                           |
| `>=`     | Greater or equal   | `CreatedDateTime >= DateTime(2024, 1, 1)`        |
| `<=`     | Less or equal      | `Id <= 500`                                      |

## Logical Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `&&`     | AND     | `LastName == "Smith" && IsDeceased == false`     |
| `\|\|`   | OR      | `LastName == "Smith" \|\| LastName == "Jones"`   |
| `!`      | NOT     | `!IsDeceased`                                    |

Group with parentheses:
```
(LastName == "Smith" || LastName == "Jones") && IsDeceased == false
```

## String Methods

```bash
# Contains
--where 'LastName.Contains("mit")'

# Starts with
--where 'LastName.StartsWith("Sm")'

# Ends with
--where 'Email.EndsWith("@gmail.com")'

# Case-insensitive comparison
--where 'LastName.ToUpper() == "SMITH"'

# String length
--where 'LastName.Length > 10'
```

## Collection Methods

Used for querying related collections (navigation properties):

```bash
# Any phone number starts with area code
--where 'PhoneNumbers.Any(Number.StartsWith("210"))'

# All group members are active
--where 'Members.All(GroupMemberStatus == 1)'

# Has at least one phone number
--where 'PhoneNumbers.Any()'

# Count-based filter
--where 'Members.Count() > 5'

# Any with multiple conditions
--where 'PhoneNumbers.Any(Number.StartsWith("210") && IsMessagingEnabled == true)'
```

## DateTime Handling

DateTime values use the `DateTime()` constructor in Dynamic LINQ:

```bash
# Date only (year, month, day)
--where 'TransactionDateTime >= DateTime(2024, 1, 1)'
--where 'TransactionDateTime < DateTime(2025, 1, 1)'

# Date and time (year, month, day, hour, minute, second)
--where 'CreatedDateTime >= DateTime(2024, 6, 15, 8, 0, 0)'

# Date range (full year)
--where 'TransactionDateTime >= DateTime(2025, 1, 1) && TransactionDateTime < DateTime(2026, 1, 1)'

# Specific month
--where 'TransactionDateTime >= DateTime(2025, 6, 1) && TransactionDateTime < DateTime(2025, 7, 1)'

# Date properties
--where 'BirthDate.Month == 12'                 # December birthdays
--where 'BirthDate.Year == 1990'                # Born in 1990
--where 'CreatedDateTime.Date == DateTime(2025, 3, 15)'  # Exact date
```

## Null Checks

```bash
# Not null
--where 'CampusId != null'
--where 'Email != null'

# Is null
--where 'Email == null'
--where 'CompletedDateTime == null'     # Incomplete workflows
```

## Boolean Fields

```bash
--where 'IsActive == true'
--where 'IsDeceased == false'
--where 'IsTaxDeductible == true'
```

## Numeric Comparisons

```bash
--where 'TotalAmount > 100.00'
--where 'GroupCapacity >= 10 && GroupCapacity <= 50'
--where 'GroupTypeId == 25'
--where 'RecordStatusValueId == 3'
```

## Projection with --select

Use --select to return only specific fields. This reduces response size and can improve performance.

```bash
# Simple projection
--select 'new (Id, FirstName, LastName, Email)'

# Projection with navigation properties
--select 'new (Id, Name, GroupTypeId, Campus.Name)'

# Rename fields
--select 'new (Id, FirstName as First, LastName as Last)'
```

## Sorting with --sort

```bash
# Ascending (default)
--sort 'LastName'

# Descending
--sort 'CreatedDateTime desc'

# Multiple fields
--sort 'LastName, FirstName'

# Mixed directions
--sort 'LastName, FirstName desc'

# Sort by related field
--sort 'GroupType.Name, Name'
```

## Pagination

```bash
# First page
--take 100 --offset 0

# Second page
--take 100 --offset 100

# Third page
--take 100 --offset 200
```

Always use --sort with pagination to ensure consistent ordering.

## Complete Query Examples

### People Queries

```bash
# Find people by last name with selected fields
rock resource search People \
  --where 'LastName == "Smith"' \
  --select 'new (Id, FirstName, LastName, Email)' \
  --sort 'FirstName' \
  --take 20

# Find people at a specific campus
rock resource search People \
  --where 'PrimaryCampusId == 1 && RecordStatusValueId == 3' \
  --take 50

# Find people with birthdays in December
rock resource search People \
  --where 'BirthDate.Month == 12' \
  --select 'new (Id, FirstName, LastName, BirthDate)' \
  --sort 'BirthDate.Day'

# Search by partial last name
rock resource search People \
  --where 'LastName.Contains("Smi")' \
  --take 10

# Find people by phone
rock resource search People \
  --where 'PhoneNumbers.Any(Number.StartsWith("5551234"))' \
  --take 5
```

### Group Queries

```bash
# Active small groups at campus 1
rock resource search Group \
  --where 'GroupTypeId == 25 && IsActive == true && CampusId == 1' \
  --select 'new (Id, Name, Description, GroupCapacity)' \
  --sort 'Name'

# Find child groups under a parent
rock resource search Group \
  --where 'ParentGroupId == 42' \
  --sort 'Name'

# Active members of a group
rock resource search GroupMember \
  --where 'GroupId == 42 && GroupMemberStatus == 1' \
  --select 'new (Id, PersonId, GroupRoleId)'

# All groups a person belongs to
rock resource search GroupMember \
  --where 'PersonId == 789 && GroupMemberStatus == 1' \
  --select 'new (Id, GroupId, GroupRoleId)'
```

### Financial Queries

```bash
# Transactions for a person in 2025
rock resource search FinancialTransaction \
  --where 'AuthorizedPersonAliasId == 456 && TransactionDateTime >= DateTime(2025, 1, 1) && TransactionDateTime < DateTime(2026, 1, 1)' \
  --sort 'TransactionDateTime desc'

# Active financial accounts
rock resource search FinancialAccount \
  --where 'IsActive == true' \
  --select 'new (Id, Name, IsTaxDeductible)' \
  --sort 'Name'

# Open (status=1) financial batches
rock resource search FinancialBatch \
  --where 'Status == 1' \
  --sort 'BatchStartDateTime desc' \
  --take 10

# Transaction details for a transaction
rock resource search FinancialTransactionDetail \
  --where 'TransactionId == 5001' \
  --select 'new (Id, Amount, AccountId)'
```

### Workflow Queries

```bash
# Active workflow types
rock resource search WorkflowType \
  --where 'IsActive == true' \
  --select 'new (Id, Name, Description)' \
  --sort 'Name'

# Incomplete workflows of a specific type
rock resource search Workflow \
  --where 'WorkflowTypeId == 15 && CompletedDateTime == null' \
  --sort 'ActivatedDateTime desc' \
  --take 20

# Workflows activated in a date range
rock resource search Workflow \
  --where 'ActivatedDateTime >= DateTime(2025, 1, 1) && ActivatedDateTime < DateTime(2025, 4, 1)' \
  --sort 'ActivatedDateTime desc'
```

### Content Queries

```bash
# Approved content items in a channel, newest first
rock resource search ContentChannelItem \
  --where 'ContentChannelId == 5 && Status == 2' \
  --sort 'StartDateTime desc' \
  --take 20

# Pending content needing approval
rock resource search ContentChannelItem \
  --where 'Status == 1' \
  --sort 'CreatedDateTime desc'

# Search by title
rock resource search ContentChannelItem \
  --where 'Title.Contains("Easter")' \
  --select 'new (Id, Title, Status, StartDateTime)'
```

## Common Gotchas

### 1. Dynamic LINQ, NOT OData
```
WRONG: --where "LastName eq 'Smith'"
RIGHT: --where 'LastName == "Smith"'
```

### 2. String Values Use Double Quotes Inside Single Quotes
```bash
# The outer single quotes are for the shell, inner double quotes for LINQ
--where 'LastName == "Smith"'
```

### 3. DateTime Uses Constructor Syntax
```
WRONG: --where 'TransactionDateTime >= "2025-01-01"'
RIGHT: --where 'TransactionDateTime >= DateTime(2025, 1, 1)'
```

### 4. Field Names Are PascalCase
```
WRONG: --where 'lastname == "Smith"'
RIGHT: --where 'LastName == "Smith"'
```

### 5. Attributes Cannot Be Filtered Server-Side
```bash
# WRONG: attributes are not database fields
--where 'BaptismDate > DateTime(2025, 1, 1)'

# RIGHT: fetch attributes separately and filter client-side
rock resource attributes People 123
```

### 6. PersonId vs PersonAliasId
Many entities use PersonAliasId. Find it first:
```bash
rock resource search PersonAlias --where 'PersonId == 123' --take 1
```

### 7. Shell Quoting
Use single quotes for --where to prevent shell interpolation:
```bash
# Good: single quotes protect the expression
rock resource search People --where 'LastName == "Smith"'

# Bad: double quotes cause shell issues with special characters
rock resource search People --where "LastName == \"Smith\""
```
