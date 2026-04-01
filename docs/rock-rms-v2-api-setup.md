# Rock RMS v2 API Setup Guide

## Prerequisites

- Rock RMS instance with admin access
- SQL Command access (Admin Tools > Power Tools > SQL Command)

## Step 1: Create a REST Key

1. Go to **Admin Tools > Security > REST Keys**
2. Click **Add** to create a new REST key
3. Give it a name (e.g., "My CLI Key")
4. Save and note the generated key value

## Step 2: Add the REST Key to a Security Role

1. Go to **Admin Tools > Security > Security Roles**
2. Open **RSR - Rock Administration**
3. Under **Group Members**, click **Add (+)**
4. Search for the REST key name you created
5. Save

## Step 3: Grant v2 API Permissions (Bulk SQL)

The v2 API has separate security actions (`ExecuteRead`, `ExecuteWrite`, `ExecuteUnrestrictedRead`, `ExecuteUnrestrictedWrite`) on each REST controller. By default, none of these are granted — even for the Rock Administration role.

### Diagnostic: Check Current State

Run this in **Admin Tools > Power Tools > SQL Command** to see what's already set up:

```sql
-- How many v2 controllers exist?
SELECT COUNT(*) AS TotalV2Controllers
FROM [RestController]
WHERE [ClassName] LIKE 'Rock.Rest.v2.%'

-- What's the RSR - Rock Administration group ID?
SELECT Id, Name FROM [Group]
WHERE Name = 'RSR - Rock Administration'

-- What EntityTypeId does Rock use for RestController?
SELECT Id FROM [EntityType]
WHERE [Name] = 'Rock.Model.RestController'

-- What Auth records already exist for v2 controllers + that group?
SELECT
    a.[Action],
    a.[AllowOrDeny],
    rc.[Name] AS ControllerName
FROM [Auth] a
INNER JOIN [RestController] rc ON rc.Id = a.EntityId
INNER JOIN [EntityType] et ON et.Id = a.EntityTypeId
    AND et.Name = 'Rock.Model.RestController'
LEFT JOIN [Group] g ON g.Id = a.GroupId
WHERE rc.[ClassName] LIKE 'Rock.Rest.v2.%'
    AND g.Name = 'RSR - Rock Administration'
ORDER BY rc.[Name], a.[Action]
```

### Dry Run: Preview What Will Be Inserted

This query shows you exactly what rows would be created. **It does NOT modify anything.**

Replace the group ID (`2`) and entity type ID (`180`) with values from the diagnostic queries above if they differ on your instance.

```sql
SELECT
    180 AS EntityTypeId,
    rc.Id AS EntityId,
    rc.[Name] AS ControllerName,
    rc.[ClassName],
    0 AS [Order],
    a.ActionName AS [Action],
    'A' AS AllowOrDeny,
    0 AS SpecialRole,
    NULL AS PersonAliasId,
    2 AS GroupId
FROM [RestController] rc
CROSS JOIN (
    SELECT 'ExecuteRead' AS ActionName
    UNION SELECT 'ExecuteWrite'
    UNION SELECT 'ExecuteUnrestrictedRead'
    UNION SELECT 'ExecuteUnrestrictedWrite'
) a
WHERE rc.[ClassName] LIKE 'Rock.Rest.v2.%'
AND NOT EXISTS (
    SELECT 1 FROM [Auth] auth
    WHERE auth.EntityTypeId = 180
      AND auth.EntityId = rc.Id
      AND auth.GroupId = 2
      AND auth.[Action] = a.ActionName
)
ORDER BY rc.[Name], a.ActionName
```

You should see ~1,260 rows (317 controllers × 4 actions each, minus any already configured).

### Execute: Bulk Insert Permissions

Once you've verified the dry run looks correct, run this to insert the permissions:

```sql
-- Bulk grant all 4 Execute actions on every v2 REST controller
-- to RSR - Rock Administration
--
-- IMPORTANT: Update @GroupId and @RestControllerEntityTypeId
-- if your values differ from the defaults below.

DECLARE @GroupId INT = 2  -- RSR - Rock Administration group ID
DECLARE @RestControllerEntityTypeId INT = 180  -- EntityTypeId for RestController

INSERT INTO [Auth] (
    [EntityTypeId], [EntityId], [Order], [Action],
    [AllowOrDeny], [SpecialRole], [PersonAliasId], [GroupId], [Guid]
)
SELECT
    @RestControllerEntityTypeId,
    rc.Id,
    0,
    a.ActionName,
    'A',
    0,
    NULL,
    @GroupId,
    NEWID()
FROM [RestController] rc
CROSS JOIN (
    SELECT 'ExecuteRead' AS ActionName
    UNION SELECT 'ExecuteWrite'
    UNION SELECT 'ExecuteUnrestrictedRead'
    UNION SELECT 'ExecuteUnrestrictedWrite'
) a
WHERE rc.[ClassName] LIKE 'Rock.Rest.v2.%'
AND NOT EXISTS (
    SELECT 1 FROM [Auth] auth
    WHERE auth.EntityTypeId = @RestControllerEntityTypeId
      AND auth.EntityId = rc.Id
      AND auth.GroupId = @GroupId
      AND auth.[Action] = a.ActionName
)
```

## Step 4: Clear the Rock Cache

**This is required.** Rock caches security rules in memory. The SQL insert bypasses that cache.

Go to **Admin Tools > Power Tools > Cache Manager** and click **Clear Cache**, or restart the Rock application/IIS AppPool.

## Step 5: Verify

Test the API with curl or the CLI:

```bash
# Install the CLI
bun add -g github:leighton-tidwell/rock-cli

# Configure
rock config init https://your-rock-url.com YOUR_API_KEY

# Test
rock resource search Campuses --take 1
rock resource search People --take 1
rock resource search Groups --take 1
```

If you get `401 Unauthorized`, the cache hasn't been cleared. Go back to Step 4.

## Troubleshooting

### Still getting 401 after cache clear?

Check if there are explicit **Deny** rules that override the Allow:

```sql
SELECT
    a.[Action], a.[AllowOrDeny], a.[Order],
    rc.[Name] AS ControllerName,
    g.Name AS GroupName,
    p.NickName + ' ' + p.LastName AS PersonName
FROM [Auth] a
INNER JOIN [RestController] rc ON rc.Id = a.EntityId
INNER JOIN [EntityType] et ON et.Id = a.EntityTypeId
    AND et.Name = 'Rock.Model.RestController'
LEFT JOIN [Group] g ON g.Id = a.GroupId
LEFT JOIN [PersonAlias] pa ON pa.Id = a.PersonAliasId
LEFT JOIN [Person] p ON p.Id = pa.PersonId
WHERE rc.[ClassName] LIKE 'Rock.Rest.v2.%'
    AND a.AllowOrDeny = 'D'
ORDER BY rc.[Name], a.[Order]
```

### v2 POST/PUT returning 401 with JSON body?

This is a known bug in Rock v17/v18 (GitHub issue #6602). The fix is in v19. Workaround: grant both `ExecuteWrite` AND `ExecuteUnrestrictedWrite` (which this guide does).

### Some endpoints return 500?

A few v2 endpoints have server-side issues on certain Rock versions. This is a Rock bug, not a permissions issue. Try the endpoint in the Rock API docs UI to confirm.
