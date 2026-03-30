# Giving Command Reference

Query financial transactions, list accounts, and generate giving summaries in Rock RMS.

**Related**: [querying.md](querying.md) for OData filter syntax, [people.md](people.md) for finding person/alias IDs.

## Commands

| Command | Description |
|---------|-------------|
| `rock giving transactions` | List financial transactions with filters |
| `rock giving accounts` | List all financial accounts |
| `rock giving summary` | Summarize giving for a person and year |

## giving transactions

List financial transactions with optional filters. Multiple filters combine with AND logic.

```bash
rock giving transactions [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--person <id>` | number | Filter by `AuthorizedPersonAliasId` |
| `--from <date>` | string | Transactions on or after date (YYYY-MM-DD) |
| `--to <date>` | string | Transactions on or before date (YYYY-MM-DD) |
| `--account <id>` | number | Filter by financial account ID |
| `--top <n>` | number | Limit number of results |
| `--profile <name>` | string | Config profile |

### OData Filters Generated

| Flag | Generated Filter |
|------|------------------|
| `--person 456` | `AuthorizedPersonAliasId eq 456` |
| `--from 2025-01-01` | `TransactionDateTime ge datetime'2025-01-01'` |
| `--to 2025-12-31` | `TransactionDateTime le datetime'2025-12-31'` |
| `--account 7` | `FinancialPaymentDetail/FinancialAccountId eq 7` |

### Important: Person ID vs PersonAlias ID

The `--person` flag expects an `AuthorizedPersonAliasId`, not a Person `Id`. To find a person's alias ID:

```bash
rock raw get "/api/PersonAlias?\$filter=PersonId eq 123&\$top=1" --json
```

### Date Range Patterns

```bash
# All transactions in 2025
rock giving transactions --from "2025-01-01" --to "2025-12-31" --json

# Last 30 days for a person
rock giving transactions --person 456 --from "2026-02-25" --json

# Single month
rock giving transactions --from "2025-06-01" --to "2025-06-30" --json

# Specific account in a date range
rock giving transactions --account 7 --from "2025-01-01" --to "2025-12-31" --top 100 --json
```

### Common Transaction Fields

| Field | Type | Description |
|-------|------|-------------|
| `Id` | int | Transaction ID |
| `TransactionDateTime` | datetime | When the transaction occurred |
| `TotalAmount` | decimal | Total transaction amount |
| `AuthorizedPersonAliasId` | int | Person alias who authorized |
| `TransactionTypeValueId` | int | Type (contribution, event registration, etc.) |
| `SourceTypeValueId` | int | Source (website, kiosk, bank, etc.) |
| `FinancialGatewayId` | int | Payment gateway used |

## giving accounts

List all financial accounts configured in Rock. No filters -- returns the full list.

```bash
rock giving accounts [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--profile <name>` | string | Config profile |

### Common Financial Account Structure

| Field | Type | Description |
|-------|------|-------------|
| `Id` | int | Account ID (use with `--account` filter) |
| `Name` | string | Account name (e.g., "General Fund", "Building Fund") |
| `ParentAccountId` | int | Parent account for hierarchy (nullable) |
| `IsActive` | bool | Whether account is active |
| `IsTaxDeductible` | bool | Tax deductibility flag |
| `CampusId` | int | Campus association (nullable) |

### Examples

```bash
# List all accounts
rock giving accounts --json

# Find accounts via raw query with filter
rock raw get "/api/FinancialAccounts?\$filter=IsActive eq true" --json

# Find child accounts under a parent
rock raw get "/api/FinancialAccounts?\$filter=ParentAccountId eq 1" --json
```

## giving summary

Calculate total giving for a specific person and year. Fetches all matching transactions and sums `TotalAmount`.

```bash
rock giving summary --person <id> --year <year> [options] --json
```

### Flags

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--person <id>` | number | Yes | AuthorizedPersonAliasId |
| `--year <year>` | number | Yes | Calendar year to summarize |
| `--profile <name>` | string | No | Config profile |

### Response Structure

```json
{
  "person": 456,
  "year": 2025,
  "transactionCount": 24,
  "totalAmount": 12500.00
}
```

### Examples

```bash
# 2025 giving summary for person alias 456
rock giving summary --person 456 --year 2025 --json

# Compare year over year
rock giving summary --person 456 --year 2024 --json
rock giving summary --person 456 --year 2025 --json
```

## Advanced Queries via raw

### Transactions with Detail Expansion

```bash
# Expand transaction details (line items)
rock raw get "/api/FinancialTransactions?\$filter=AuthorizedPersonAliasId eq 456&\$expand=TransactionDetails" --json

# Expand to see which accounts received funds
rock raw get "/api/FinancialTransactions?\$filter=AuthorizedPersonAliasId eq 456&\$expand=TransactionDetails(\$expand=Account)" --json
```

### Transaction Detail (Line Item) Fields

Each transaction can have multiple `TransactionDetail` line items:

| Field | Type | Description |
|-------|------|-------------|
| `Id` | int | Detail ID |
| `Amount` | decimal | Line item amount |
| `AccountId` | int | Financial account ID |
| `Summary` | string | Optional memo |

### Giving by Account for a Year

```bash
rock raw get "/api/FinancialTransactions?\$filter=AuthorizedPersonAliasId eq 456 and TransactionDateTime ge datetime'2025-01-01' and TransactionDateTime le datetime'2025-12-31'&\$expand=TransactionDetails" --json
```

Parse the response to group amounts by `TransactionDetails[].AccountId`.
