#!/usr/bin/env bash
# Template: Giving Summary Report
# Purpose: Retrieve giving summary or transaction history for a person
# Usage: Adapt the variables below to your needs
#
# Two modes:
#   1. Summary: High-level giving totals for a year
#   2. Transactions: Detailed transaction list for a date range

set -euo pipefail

PERSON_ID=123
YEAR=2024

# ================================================================
# OPTION 1: Giving summary (totals by fund, account, etc.)
# ================================================================
echo "Giving summary for person $PERSON_ID, year $YEAR..."
rock giving summary --person $PERSON_ID --year $YEAR --json

# ================================================================
# OPTION 2: Full transaction list
# ================================================================
echo "Transaction details for person $PERSON_ID, year $YEAR..."
rock giving transactions --person $PERSON_ID --from "${YEAR}-01-01" --to "${YEAR}-12-31" --json
