# Workflows Command Reference

List workflow types, launch workflows, and check workflow status in Rock RMS.

**Related**: [querying.md](querying.md) for OData filter syntax.

## Commands

| Command | Description |
|---------|-------------|
| `rock workflows list` | List workflow types or workflow instances |
| `rock workflows launch <typeId>` | Launch a workflow by type ID |
| `rock workflows status <id>` | Get workflow status by ID |

## workflows list

List workflow types (default) or workflow instances.

```bash
rock workflows list [options] --json
```

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--type <t>` | string | `types` | Resource to list: `types` or `workflows` |
| `--top <n>` | number | - | Limit number of results |
| `--profile <name>` | string | - | Config profile |

### Listing Workflow Types

Workflow types are the definitions/templates. Use these to find the `typeId` needed for launching.

```bash
# List all workflow types
rock workflows list --json

# List first 10 workflow types
rock workflows list --top 10 --json
```

### Listing Workflow Instances

Workflow instances are running or completed executions of a workflow type.

```bash
# List all workflow instances
rock workflows list --type workflows --json

# List recent 20 workflow instances
rock workflows list --type workflows --top 20 --json
```

### Common Workflow Type Fields

| Field | Type | Description |
|-------|------|-------------|
| `Id` | int | Workflow type ID (use as `typeId` for launch) |
| `Name` | string | Workflow type name |
| `Description` | string | What the workflow does |
| `IsActive` | bool | Whether the type is active |
| `Category` | string | Category grouping |

### Common Workflow Types in Rock

These vary by instance, but typical examples:

| Purpose | Example Name |
|---------|-------------|
| New member follow-up | "New Member Follow-Up" |
| Connection request | "Connection Request" |
| Facility request | "Facility Request" |
| IT request | "IT Request" |
| Prayer request | "Prayer Request" |
| Background check | "Background Check" |

Discover your instance's workflow types:

```bash
rock workflows list --json
```

## workflows launch

Launch a new workflow instance from a workflow type.

```bash
rock workflows launch <typeId> [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--attrs <json>` | string | Attributes as a JSON string |
| `--profile <name>` | string | Config profile |

### How --attrs Works

Pass workflow attributes as a JSON object string. The required attributes depend on the workflow type definition.

```bash
# Launch with no attributes
rock workflows launch 15 --json

# Launch with attributes
rock workflows launch 15 --attrs '{"PersonId": 123, "Note": "Please follow up"}' --json

# Launch a connection request workflow
rock workflows launch 22 --attrs '{"RequesterPersonAliasId": 456, "ConnectorPersonAliasId": 789}' --json
```

### Response

Returns the created workflow object, including the new workflow `Id` for status tracking.

## workflows status

Check the current status of a running or completed workflow instance.

```bash
rock workflows status <id> [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--profile <name>` | string | Config profile |

### Common Workflow Instance Fields

| Field | Type | Description |
|-------|------|-------------|
| `Id` | int | Workflow instance ID |
| `WorkflowTypeId` | int | The type this instance was created from |
| `Name` | string | Instance name |
| `Status` | string | Current status label |
| `IsCompleted` | bool | Whether the workflow has finished |
| `CompletedDateTime` | datetime | When completed (nullable) |
| `ActivatedDateTime` | datetime | When launched |

### Status Checking Pattern

```bash
# Launch a workflow
rock workflows launch 15 --attrs '{"PersonId": 123}' --json
# Parse the returned Id (e.g., 301)

# Check status
rock workflows status 301 --json
```

## Advanced Queries via raw

### Filter Workflow Instances by Type

```bash
rock raw get "/api/Workflows?\$filter=WorkflowTypeId eq 15" --json
```

### Find Active (Incomplete) Workflows

```bash
rock raw get "/api/Workflows?\$filter=IsCompleted eq false" --json
```

### Find Workflows for a Date Range

```bash
rock raw get "/api/Workflows?\$filter=ActivatedDateTime ge datetime'2025-01-01' and ActivatedDateTime le datetime'2025-12-31'" --json
```

### Get Workflow Activities

```bash
rock raw get "/api/WorkflowActivities?\$filter=WorkflowId eq 301" --json
```

### Get Workflow with Attributes

```bash
rock raw get "/api/Workflows/301?loadAttributes=simple" --json
```
