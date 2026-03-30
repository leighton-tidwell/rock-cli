# Communication Command Reference

Send SMS messages and emails through Rock RMS. Manage communication templates and recipients.

**Related**: [people.md](people.md) for finding recipient details, [querying.md](querying.md) for OData syntax.

## Commands

| Command | Description |
|---------|-------------|
| `rock comm send-sms` | Send an SMS message |
| `rock comm send-email` | Send an email |

## comm send-sms

Send an SMS message to a phone number.

```bash
rock comm send-sms --to <phone> --message <text> [options] --json
```

### Flags

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--to <phone>` | string | Yes | Recipient phone number (E.164 format recommended) |
| `--message <text>` | string | Yes | Message body |
| `--from <number>` | string | No | Sender phone number (SMS transport number) |
| `--profile <name>` | string | No | Config profile |

### SMS Requirements

- **From number**: Rock requires a configured SMS transport number. If `--from` is omitted, Rock uses the default transport number. Check available numbers in Rock Admin under Communications > SMS Phone Numbers.
- **Phone format**: Use E.164 format (`+15551234567`) for reliability. Rock may accept other formats depending on configuration.
- **Character limits**: Standard SMS is 160 characters. Longer messages are split into multiple segments.

### Examples

```bash
# Send a simple SMS
rock comm send-sms --to "+15551234567" --message "Welcome to Sunday service!" --json

# Send with explicit from number
rock comm send-sms --to "+15551234567" --from "+15559876543" \
  --message "Your small group meets tonight at 7pm" --json
```

## comm send-email

Send an email, optionally using a communication template.

```bash
rock comm send-email --to <email> [options] --json
```

### Flags

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--to <email>` | string | Yes | Recipient email address |
| `--subject <text>` | string | No | Email subject line |
| `--body <html>` | string | No | Email body (HTML supported) |
| `--template-id <id>` | number | No | Communication template ID |
| `--from <email>` | string | No | Sender email address |
| `--profile <name>` | string | No | Config profile |

### Template Usage

Use `--template-id` to send a pre-built communication template. Templates are configured in Rock Admin under Communications > Communication Templates.

```bash
# Send using a template
rock comm send-email --to "jane@example.com" --template-id 8 --json

# Send with inline subject and body
rock comm send-email --to "jane@example.com" \
  --subject "Welcome!" \
  --body "<h1>Welcome to our church</h1><p>We're glad you're here.</p>" --json
```

### Finding Template IDs

```bash
rock raw get "/api/CommunicationTemplates" --json

# Filter active templates
rock raw get "/api/CommunicationTemplates?\$filter=IsActive eq true" --json
```

## SMS vs Email Differences

| Aspect | SMS | Email |
|--------|-----|-------|
| Recipient format | Phone number (E.164) | Email address |
| From requirement | SMS transport number (configured in Rock) | Email address or Rock default |
| Content | Plain text only | HTML supported |
| Templates | Not typically used | Recommended for consistent branding |
| Length limits | 160 chars per segment | No practical limit |
| Delivery tracking | Carrier-dependent | Read/open tracking available |

## Recipient Patterns

### Send to a Single Person

```bash
# Look up the person first
rock people search --name "Smith" --json
# Use their email or phone from the response

rock comm send-email --to "john.smith@example.com" --subject "Hello" --body "Test" --json
rock comm send-sms --to "+15551234567" --message "Hello" --json
```

### Send to Group Members

Retrieve group members, then iterate:

```bash
# Get group members with person details
rock groups members 42 --json
# Parse email/phone from each Person object, then send individually
```

## Advanced Queries via raw

### List Recent Communications

```bash
rock raw get "/api/Communications?\$top=20&\$orderby=CreatedDateTime desc" --json
```

### Get Communication Recipients

```bash
rock raw get "/api/CommunicationRecipients?\$filter=CommunicationId eq 100&\$expand=PersonAlias" --json
```

### List SMS Transport Numbers

```bash
rock raw get "/api/DefinedValues?\$filter=DefinedTypeId eq 32" --json
```

The DefinedType ID for SMS numbers may vary by instance. Check Rock Admin for the correct ID.
