# Groups Command Reference

List, inspect, and manage groups and group members in Rock RMS.

**Related**: [querying.md](querying.md) for OData filter syntax, [people.md](people.md) for person lookups.

## Commands

| Command | Description |
|---------|-------------|
| `rock groups list` | List groups with optional filters |
| `rock groups get <id>` | Get a group by ID |
| `rock groups members <id>` | List members of a group (with Person expanded) |
| `rock groups add-member <groupId> <personId>` | Add a person to a group |
| `rock groups remove-member <groupId> <personId>` | Remove a person from a group |

## groups list

List groups, optionally filtered by type or campus.

```bash
rock groups list [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--type <groupTypeId>` | number | Filter by GroupTypeId |
| `--campus <campusId>` | number | Filter by CampusId |
| `--top <n>` | number | Limit number of results |
| `--profile <name>` | string | Config profile |

### Common Group Types

Group types vary by Rock instance. These are typical defaults:

| GroupTypeId | Name | Description |
|-------------|------|-------------|
| 10 | Family | Family groups (auto-created per household) |
| 25 | Small Group | Community/life groups |
| 23 | Serving Team | Volunteer serving teams |
| 50 | Security Role | Security role groups |

To discover group types in your instance:

```bash
rock raw get "/api/GroupTypes" --json
```

### Examples

```bash
# List all small groups
rock groups list --type 25 --json

# List serving teams at campus 1
rock groups list --type 23 --campus 1 --json

# List first 10 groups of any type
rock groups list --top 10 --json
```

### Finding Serving Teams vs Small Groups

```bash
# Serving teams
rock groups list --type 23 --json

# Small groups
rock groups list --type 25 --json

# All groups at a campus (any type)
rock groups list --campus 1 --json
```

## groups get

Retrieve a single group by ID.

```bash
rock groups get <id> [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--attributes` | boolean | Load group attributes (`loadAttributes=simple`) |
| `--profile <name>` | string | Config profile |

### Common Group Fields

| Field | Type | Description |
|-------|------|-------------|
| `Id` | int | Unique group ID |
| `Name` | string | Group name |
| `GroupTypeId` | int | Group type |
| `CampusId` | int | Campus (nullable) |
| `ParentGroupId` | int | Parent group for hierarchy |
| `IsActive` | bool | Whether group is active |
| `Description` | string | Group description |
| `GroupCapacity` | int | Max members (nullable) |

### Examples

```bash
# Get group details
rock groups get 42 --json

# Get group with custom attributes
rock groups get 42 --attributes --json
```

## groups members

List all members of a group. Automatically expands the `Person` entity on each GroupMember.

```bash
rock groups members <id> [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--profile <name>` | string | Config profile |

Uses: `$filter=GroupId eq {id}&$expand=Person`

### Member Roles

Each group type defines its own roles. Common defaults:

| GroupRoleId | Name | Typical Use |
|-------------|------|-------------|
| 1 | Leader | Group leaders |
| 2 | Member | Regular members |

Discover roles for a group type:

```bash
rock raw get "/api/GroupTypeRoles?\$filter=GroupTypeId eq 25" --json
```

### GroupMember Status Values

| Value | Status |
|-------|--------|
| 0 | Inactive |
| 1 | Active |
| 2 | Pending |

### Examples

```bash
# List all members of group 42 with person details
rock groups members 42 --json
```

## groups add-member

Add a person to a group with a specified role.

```bash
rock groups add-member <groupId> <personId> [options] --json
```

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--role <roleId>` | number | 2 (Member) | Group role ID |
| `--profile <name>` | string | - | Config profile |

Sets `GroupMemberStatus` to 1 (Active) automatically.

### Examples

```bash
# Add person 789 to group 42 as a member (default role)
rock groups add-member 42 789 --json

# Add person 789 to group 42 as a leader
rock groups add-member 42 789 --role 1 --json
```

## groups remove-member

Remove a person from a group. Looks up the GroupMember record, then deletes it.

```bash
rock groups remove-member <groupId> <personId> [options] --json
```

### Flags

| Flag | Type | Description |
|------|------|-------------|
| `--profile <name>` | string | Config profile |

Throws an error if no matching GroupMember record is found.

### Examples

```bash
rock groups remove-member 42 789 --json
```

## Hierarchy Patterns

Groups in Rock form a tree via `ParentGroupId`. To explore the hierarchy:

```bash
# Get a group and check its parent
rock groups get 42 --json
# Look at ParentGroupId in the response

# Find child groups of a parent
rock raw get "/api/Groups?\$filter=ParentGroupId eq 42" --json

# Get the full group tree for a group type
rock raw get "/api/Groups?\$filter=GroupTypeId eq 25&\$select=Id,Name,ParentGroupId" --json
```

## $expand Patterns for Related Data

Use `rock raw get` for advanced queries with `$expand`:

```bash
# GroupMembers with Person details
rock raw get "/api/GroupMembers?\$filter=GroupId eq 42&\$expand=Person" --json

# Groups with GroupType details
rock raw get "/api/Groups?\$filter=CampusId eq 1&\$expand=GroupType" --json

# GroupMembers with Group and Person
rock raw get "/api/GroupMembers?\$filter=PersonId eq 789&\$expand=Group,Person" --json
```

## Real-World Workflows

### Find All Groups a Person Belongs To

```bash
rock raw get "/api/GroupMembers?\$filter=PersonId eq 789&\$expand=Group" --json
```

### Move a Person Between Groups

```bash
# Remove from old group
rock groups remove-member 42 789 --json

# Add to new group
rock groups add-member 55 789 --json
```

### List Active Members Only

```bash
rock raw get "/api/GroupMembers?\$filter=GroupId eq 42 and GroupMemberStatus eq 1&\$expand=Person" --json
```
