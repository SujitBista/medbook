#!/bin/bash

# Automated Codex Review Process
# Monitors PR for Codex feedback, detects approval, and handles issues automatically

set -e

PR_NUMBER=${1:-$(gh pr view --json number --jq '.number' 2>/dev/null || echo "")}

if [ -z "$PR_NUMBER" ]; then
    echo "❌ Error: PR number not provided and could not be detected"
    echo "Usage: $0 [PR_NUMBER]"
    exit 1
fi

CODEX_USER="chatgpt-codex-connector[bot]"
MAX_WAIT_TIME=600  # 10 minutes
POLL_INTERVAL=15   # Check every 15 seconds
START_TIME=$(date +%s)

echo "🤖 Automated Codex Review Process"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PR: #$PR_NUMBER"
echo "Started: $(date)"
echo ""

# Get initial timestamp
INITIAL_TIMESTAMP=$(gh api repos/SujitBista/medbook/pulls/$PR_NUMBER/comments 2>/dev/null | \
    jq -r '[.[] | select(.user.login == "'$CODEX_USER'")] | sort_by(.created_at) | reverse | if length > 0 then .[0].created_at else "1970-01-01T00:00:00Z" end' 2>/dev/null || echo "1970-01-01T00:00:00Z")

echo "📅 Initial timestamp: $INITIAL_TIMESTAMP"
echo ""

# Request Codex review
echo "📝 Requesting Codex review..."
gh pr comment "$PR_NUMBER" --body "@codex review" > /dev/null 2>&1
echo "✅ Review requested"
echo "⏳ Waiting for Codex response..."
echo ""

ELAPSED=0
ITERATION=0
LAST_CHECK_TIME="$INITIAL_TIMESTAMP"

while [ $ELAPSED -lt $MAX_WAIT_TIME ]; do
    ITERATION=$((ITERATION + 1))
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    # Get latest Codex comments
    LATEST_COMMENTS=$(gh api repos/SujitBista/medbook/pulls/$PR_NUMBER/comments 2>/dev/null | \
        jq -r '[.[] | select(.user.login == "'$CODEX_USER'")] | sort_by(.created_at) | reverse' 2>/dev/null || echo "[]")
    
    if [ "$LATEST_COMMENTS" != "[]" ] && [ -n "$LATEST_COMMENTS" ]; then
        LATEST_COMMENT=$(echo "$LATEST_COMMENTS" | jq -r '.[0]')
        COMMENT_TIME=$(echo "$LATEST_COMMENT" | jq -r '.created_at // ""')
        COMMENT_BODY=$(echo "$LATEST_COMMENT" | jq -r '.body // ""')
        COMMENT_PATH=$(echo "$LATEST_COMMENT" | jq -r '.path // "general"')
        COMMENT_LINE=$(echo "$LATEST_COMMENT" | jq -r '.line // "N/A"')
        
        # Check if this is a new comment
        if [ -n "$COMMENT_TIME" ] && [ "$COMMENT_TIME" \> "$LAST_CHECK_TIME" ]; then
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ New Codex feedback received!"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "⏰ Time: $(date)"
            echo "⏱️  Elapsed: ${ELAPSED}s ($(($ELAPSED / 60))m $(($ELAPSED % 60))s)"
            echo "📁 File: $COMMENT_PATH:$COMMENT_LINE"
            echo ""
            echo "$COMMENT_BODY" | head -50
            echo ""
            
            # Check for approval (Codex's specific approval messages)
            if echo "$COMMENT_BODY" | grep -qiE "(didn't find any major issues|didn't find any major|already looking forward|no major issues|everything is ok|looks good|approved|no issues|no problems|all good|👍|thumbs up|breezy)"; then
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "🎉 CODEX APPROVED!"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "✅ No major issues found"
                echo "⏱️  Total time: ${ELAPSED}s ($(($ELAPSED / 60))m $(($ELAPSED % 60))s)"
                echo ""
                echo "🔗 PR: https://github.com/SujitBista/medbook/pull/$PR_NUMBER"
                echo ""
                echo "✨ PR is ready for merge!"
                exit 0
            fi
            
            # Check for actionable issues
            if echo "$COMMENT_BODY" | grep -qiE "(P[0-9]|Badge|fix|error|issue|problem|suggestion|recommend|should|must|need|change|update|modify)"; then
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "⚠️  Codex found issues that need attention"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "📝 Issues detected - manual review required"
                echo "⏱️  Time elapsed: ${ELAPSED}s"
                echo ""
                echo "🔗 View full feedback: https://github.com/SujitBista/medbook/pull/$PR_NUMBER"
                echo ""
                echo "💡 After fixing issues, push changes and run this script again"
                exit 1
            fi
            
            # Update timestamp
            LAST_CHECK_TIME="$COMMENT_TIME"
        fi
    fi
    
    # Show progress
    if [ $((ITERATION % 4)) -eq 0 ]; then
        printf "\r   ⏳ Monitoring... (${ELAPSED}s / ${MAX_WAIT_TIME}s)"
    fi
    
    sleep $POLL_INTERVAL
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰ Maximum wait time reached"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  Total time: ${ELAPSED}s"
echo ""
echo "💡 Codex may still be processing. Check manually:"
echo "   https://github.com/SujitBista/medbook/pull/$PR_NUMBER"
exit 2












