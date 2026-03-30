# Content Command Reference

Manage content channels and content items in Rock RMS.

**Related**: [querying.md](querying.md) for OData filter syntax.

## Commands

| Command | Description |
|---------|-------------|
| `rock content channels` | List content channels |
| `rock content items` | List content items in a channel |
| `rock content get <id>` | Get a content item by ID |
| `rock content create` | Create a new content item |
| `rock content update <id>` | Update a content item |
| `rock content publish <id>` | Publish a content item |

## Channel Structure

Content in Rock is organized into channels and items:

```
ContentChannel (e.g., "Blog", "Sermon Notes", "News")
  └── ContentChannelItem (individual posts/entries)
        ├── Title
        ├── Content (HTML body)
        ├── Status (Pending, Approved, Denied)
        ├── StartDateTime
        └── ExpireDateTime
```

### Common Channel Fields

| Field | Type | Description |
|-------|------|-------------|
| `Id` | int | Channel ID |
| `Name` | string | Channel name |
| `ChannelTypeName` | string | Type label |
| `ContentChannelTypeId` | int | Channel type ID |
| `IsIndexEnabled` | bool | Whether universal search indexes this channel |

### Listing Channels

```bash
rock content channels --json

# Via raw with filter
rock raw get "/api/ContentChannels?\$filter=IsActive eq true" --json
```

## Content Items

### Common Content Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `Id` | int | Item ID |
| `Title` | string | Item title |
| `Content` | string | HTML body |
| `ContentChannelId` | int | Parent channel ID |
| `Status` | int | 1=Pending, 2=Approved, 3=Denied |
| `StartDateTime` | datetime | Publish start date |
| `ExpireDateTime` | datetime | Expiration date (nullable) |
| `Priority` | int | Sort priority |
| `CreatedDateTime` | datetime | When created |
| `ModifiedDateTime` | datetime | When last modified |

### Status Values

| Value | Label | Description |
|-------|-------|-------------|
| 1 | Pending | Draft, awaiting approval |
| 2 | Approved | Published and visible |
| 3 | Denied | Rejected |

### Listing Items in a Channel

```bash
# All items in channel 5
rock content items --channel 5 --json

# Via raw with filters
rock raw get "/api/ContentChannelItems?\$filter=ContentChannelId eq 5&\$orderby=StartDateTime desc" --json

# Only approved items
rock raw get "/api/ContentChannelItems?\$filter=ContentChannelId eq 5 and Status eq 2&\$orderby=StartDateTime desc" --json
```

## Creating Content Items

```bash
rock content create --channel 5 --title "Sunday Recap" \
  --body "<p>This week's message focused on...</p>" --json
```

### Flags

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--channel <id>` | number | Yes | Content channel ID |
| `--title <text>` | string | Yes | Item title |
| `--body <html>` | string | Yes | HTML content body |
| `--start <date>` | string | No | Start/publish date (YYYY-MM-DD) |
| `--expire <date>` | string | No | Expiration date (YYYY-MM-DD) |
| `--status <n>` | number | No | Status: 1=Pending (default), 2=Approved |
| `--profile <name>` | string | No | Config profile |

### Via raw

```bash
rock raw post "/api/ContentChannelItems" --body '{
  "ContentChannelId": 5,
  "Title": "Sunday Recap",
  "Content": "<p>This week...</p>",
  "Status": 1,
  "StartDateTime": "2026-03-27"
}' --json
```

## Updating Content Items

```bash
rock content update 201 --title "Updated Title" --json
```

### Via raw

```bash
rock raw patch "/api/ContentChannelItems/201" --body '{
  "Title": "Updated Title",
  "Content": "<p>Revised content...</p>"
}' --json
```

## Publishing Content

Set status to Approved (2) to publish:

```bash
rock content publish 201 --json

# Equivalent raw command
rock raw patch "/api/ContentChannelItems/201" --body '{"Status": 2}' --json
```

## Advanced Queries via raw

### Search Content by Title

```bash
rock raw get "/api/ContentChannelItems?\$filter=startswith(Title, 'Sunday')" --json
```

### Get Content with Attributes

```bash
rock raw get "/api/ContentChannelItems/201?loadAttributes=simple" --json
```

### Get Items Expiring Soon

```bash
rock raw get "/api/ContentChannelItems?\$filter=ExpireDateTime le datetime'2026-04-01' and ExpireDateTime ge datetime'2026-03-27' and Status eq 2" --json
```

### Content Items with Channel Details

```bash
rock raw get "/api/ContentChannelItems?\$expand=ContentChannel&\$top=10" --json
```

## Real-World Workflows

### Create and Publish a Blog Post

```bash
# Create as draft
rock raw post "/api/ContentChannelItems" --body '{
  "ContentChannelId": 5,
  "Title": "Easter Service Times",
  "Content": "<p>Join us for Easter...</p>",
  "Status": 1,
  "StartDateTime": "2026-04-01"
}' --json
# Parse the returned Id (e.g., 215)

# Review, then publish
rock raw patch "/api/ContentChannelItems/215" --body '{"Status": 2}' --json
```

### List All Pending Content Needing Approval

```bash
rock raw get "/api/ContentChannelItems?\$filter=Status eq 1&\$orderby=CreatedDateTime desc" --json
```
