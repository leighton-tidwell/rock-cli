#!/usr/bin/env bash
# Template: Attendance Report
# Purpose: Pull attendance records for a group over a date range
# Usage: Adapt the variables below to your needs
#
# Output: JSON array of attendance records including dates, counts, and member details

set -euo pipefail

GROUP_ID=42
FROM_DATE="2024-01-01"
TO_DATE="2024-12-31"

echo "Pulling attendance for group $GROUP_ID ($FROM_DATE to $TO_DATE)..."
rock attendance list --group $GROUP_ID --from "$FROM_DATE" --to "$TO_DATE" --json
