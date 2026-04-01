#!/usr/bin/env bash
# Template: Attendance Report (v2 API)
# Purpose: Pull attendance records for a group over a date range
# Usage: Adapt the variables below to your needs
#
# Output: Attendance occurrence records and individual attendance entries

set -euo pipefail

GROUP_ID=42
FROM_YEAR=2025
FROM_MONTH=1
FROM_DAY=1
TO_YEAR=2025
TO_MONTH=12
TO_DAY=31

# ================================================================
# STEP 1: Get group details
# ================================================================
echo "Group details for group $GROUP_ID..."
rock resource get Group "$GROUP_ID"

# ================================================================
# STEP 2: Get attendance occurrences for the group
# ================================================================
echo ""
echo "Attendance occurrences for group $GROUP_ID..."
rock resource search AttendanceOccurrence \
  --where "GroupId == $GROUP_ID && OccurrenceDate >= DateTime($FROM_YEAR, $FROM_MONTH, $FROM_DAY) && OccurrenceDate <= DateTime($TO_YEAR, $TO_MONTH, $TO_DAY)" \
  --sort 'OccurrenceDate desc' \
  --select 'new (Id, OccurrenceDate, LocationId, ScheduleId, DidNotOccur)'

# ================================================================
# STEP 3: Get individual attendance records
# ================================================================
echo ""
echo "Individual attendance records..."
rock resource search Attendance \
  --where "Occurrence.GroupId == $GROUP_ID && StartDateTime >= DateTime($FROM_YEAR, $FROM_MONTH, $FROM_DAY) && StartDateTime <= DateTime($TO_YEAR, $TO_MONTH, $TO_DAY)" \
  --sort 'StartDateTime desc' \
  --select 'new (Id, PersonAliasId, StartDateTime, DidAttend, CampusId)'

# ================================================================
# STEP 4: Get group members for cross-reference
# ================================================================
echo ""
echo "Active group members..."
rock resource search GroupMember \
  --where "GroupId == $GROUP_ID && GroupMemberStatus == 1" \
  --select 'new (Id, PersonId, GroupRoleId)'
