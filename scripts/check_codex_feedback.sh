#!/bin/bash

# Quick check for Codex feedback on PR #22
# Usage: ./scripts/check_codex_feedback.sh

PR_NUMBER=22
CODEX_USER="chatgpt-codex-connector"

echo "🔍 Checking for Codex feedback on PR #$PR_NUMBER..."
echo ""

# Get all Codex comments sorted by date
COMMENTS=$(gh pr view $PR_NUMBER --json comments --jq '.comments | map(select(.author.login == "'$CODEX_USER'")) | sort_by(.createdAt) | reverse')

COMMENT_COUNT=$(echo "$COMMENTS" | jq 'length')

if [ "$COMMENT_COUNT" -eq 0 ]; then
    echo "❌ No Codex comments found on this PR."
    echo ""
    echo "💡 Codex may still be processing the review request."
    echo "   Run this script again in a few minutes."
    exit 0
fi

echo "✅ Found $COMMENT_COUNT Codex comment(s)"
echo ""

# Show the most recent comment
LATEST=$(echo "$COMMENTS" | jq '.[0]')
TIMESTAMP=$(echo "$LATEST" | jq -r '.createdAt')
BODY=$(echo "$LATEST" | jq -r '.body')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📅 Latest Codex Comment: $TIMESTAMP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "$BODY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 View PR: https://github.com/SujitBista/medbook/pull/$PR_NUMBER"
echo ""

# Check for actionable feedback
if echo "$BODY" | grep -qiE "(fix|error|issue|problem|suggestion|recommend|should|must|need|change|update|modify)"; then
    echo "⚠️  This feedback contains actionable items that may need attention."
    echo ""
fi



