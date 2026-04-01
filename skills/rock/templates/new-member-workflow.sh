#!/usr/bin/env bash
# Template: New Member Onboarding Workflow (v2 API)
# Purpose: Find or create a person, add to a group, launch a follow-up workflow
# Usage: Adapt the variables below to your needs
#
# Steps:
#   1. Search for existing person by name
#   2. Create person if not found
#   3. Add person to a group
#   4. Launch a follow-up workflow

set -euo pipefail

FIRST_NAME="John"
LAST_NAME="Doe"
EMAIL="john@example.com"
GROUP_ID=42
WORKFLOW_TYPE_ID=15

# ================================================================
# STEP 1: Search for existing person
# ================================================================
echo "Searching for $FIRST_NAME $LAST_NAME ($EMAIL)..."
rock resource search People \
  --where "LastName == \"$LAST_NAME\" && Email == \"$EMAIL\"" \
  --select 'new (Id, FirstName, LastName, Email)' \
  --take 5

# ================================================================
# STEP 2: Create person if not found
# ================================================================
# If step 1 returned no results, create the person.
# Capture the returned Id for subsequent steps.
echo ""
echo "Creating person record..."
rock resource create People --body "{
  \"FirstName\": \"$FIRST_NAME\",
  \"LastName\": \"$LAST_NAME\",
  \"Email\": \"$EMAIL\",
  \"RecordTypeValueId\": 1,
  \"RecordStatusValueId\": 5,
  \"ConnectionStatusValueId\": 146
}"

# ================================================================
# STEP 3: Add to group
# ================================================================
# Replace PERSON_ID with the actual Id from step 1 or 2.
PERSON_ID=0  # <-- SET THIS FROM STEP 1 OR 2 OUTPUT
echo ""
echo "Adding person $PERSON_ID to group $GROUP_ID..."
rock resource create GroupMember --body "{
  \"GroupId\": $GROUP_ID,
  \"PersonId\": $PERSON_ID,
  \"GroupRoleId\": 2,
  \"GroupMemberStatus\": 1
}"

# ================================================================
# STEP 4: Launch follow-up workflow
# ================================================================
echo ""
echo "Launching follow-up workflow (type $WORKFLOW_TYPE_ID)..."
rock resource create Workflow --body "{
  \"WorkflowTypeId\": $WORKFLOW_TYPE_ID,
  \"Name\": \"New Member Follow-Up: $FIRST_NAME $LAST_NAME\"
}"

echo ""
echo "Onboarding complete for $FIRST_NAME $LAST_NAME"
