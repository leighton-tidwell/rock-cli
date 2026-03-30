#!/usr/bin/env bash
# Template: New Member Onboarding Workflow
# Purpose: Find or create a person, add to a group, send welcome email
# Usage: Adapt the variables below to your needs
#
# Steps:
#   1. Search for existing person by name/email
#   2. Create person if not found
#   3. Add person to a group
#   4. Send welcome email via communication template

set -euo pipefail

FIRST_NAME="John"
LAST_NAME="Doe"
EMAIL="john@example.com"
GROUP_ID=42
WELCOME_TEMPLATE_ID=1

# ================================================================
# STEP 1: Search for existing person
# ================================================================
echo "Searching for $FIRST_NAME $LAST_NAME ($EMAIL)..."
rock people search --name "$LAST_NAME" --email "$EMAIL" --json

# ================================================================
# STEP 2: Create person if not found
# ================================================================
# If the search returned no results, create a new person record.
# Capture the person ID from the JSON output for subsequent steps.
rock people create --first "$FIRST_NAME" --last "$LAST_NAME" --email "$EMAIL" --json

# ================================================================
# STEP 3: Add to group
# ================================================================
# Replace <PERSON_ID> with the actual ID from step 1 or 2.
rock groups add-member $GROUP_ID <PERSON_ID> --role "Member"

# ================================================================
# STEP 4: Send welcome email
# ================================================================
# Uses a Rock communication template for consistent messaging.
rock comm send-email --to <PERSON_ID> --template $WELCOME_TEMPLATE_ID --subject "Welcome!"

echo "Onboarding complete for $FIRST_NAME $LAST_NAME"
