#!/usr/bin/env bash
# Template: Giving Summary Report (v2 API)
# Purpose: Retrieve giving data for a person in a specific year
# Usage: Adapt the variables below to your needs
#
# Two modes:
#   1. Transaction list: Detailed transaction history for a date range
#   2. Transaction details: Line items per account

set -euo pipefail

PERSON_ALIAS_ID=456
YEAR=2025

# ================================================================
# STEP 1: Verify the person alias exists
# ================================================================
echo "Looking up person alias $PERSON_ALIAS_ID..."
rock resource get PersonAlias "$PERSON_ALIAS_ID"

# ================================================================
# STEP 2: Get all transactions for the year
# ================================================================
echo ""
echo "Transactions for person alias $PERSON_ALIAS_ID in $YEAR..."
rock resource search FinancialTransaction \
  --where "AuthorizedPersonAliasId == $PERSON_ALIAS_ID && TransactionDateTime >= DateTime($YEAR, 1, 1) && TransactionDateTime < DateTime($((YEAR + 1)), 1, 1)" \
  --sort 'TransactionDateTime desc' \
  --select 'new (Id, TransactionDateTime, TotalAmount, TransactionTypeValueId)'

# ================================================================
# STEP 3: Get transaction details (line items by account)
# ================================================================
echo ""
echo "Transaction details (line items) for person alias $PERSON_ALIAS_ID in $YEAR..."
rock resource search FinancialTransactionDetail \
  --where "Transaction.AuthorizedPersonAliasId == $PERSON_ALIAS_ID && Transaction.TransactionDateTime >= DateTime($YEAR, 1, 1) && Transaction.TransactionDateTime < DateTime($((YEAR + 1)), 1, 1)" \
  --select 'new (Id, Amount, AccountId, Transaction.TransactionDateTime)'

# ================================================================
# STEP 4: List financial accounts for reference
# ================================================================
echo ""
echo "Active financial accounts..."
rock resource search FinancialAccount \
  --where 'IsActive == true' \
  --select 'new (Id, Name, IsTaxDeductible)' \
  --sort 'Name'
