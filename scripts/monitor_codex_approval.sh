#!/bin/bash

# Monitor Codex Review Approval
# Continuously checks for Codex feedback until approval or issues are resolved

PR_NUMBER=23
CODEX_USER="chatgpt-codex-connector[bot]"
MAX_WAIT_TIME=600  # Maximum wait time in seconds (10 minutes)
POLL_INTERVAL=15   # Check every 15 seconds
START_TIME=$(date +%s)

echo "🔍 Monitoring Codex review for PR #$PR_NUMBER"
echo "⏰ Started at: $(date)"
echo "⏱️  Max wait time: $MAX_WAIT_TIME seconds"
echo ""

# Get initial timestamp
INITIAL_TIMESTAMP=$(gh api repos/SujitBista/medbook/pulls/$PR_NUMBER/comments 2>/dev/null | \
    jq -r '[.[] | select(.user.login == "'$CODEX_USER'")] | sort_by(.created_at) | reverse | if length > 0 then .[0].created_at else "1970-01-01T00:00:00Z" end' 2>/dev/null || echo "1970-01-01T00:00:00Z")

echo "📅 Initial check timestamp: $INITIAL_TIMESTAMP"
echo "   (Will alert on any Codex comments after this time)"
echo ""

ELAPSED=0
ITERATION=0

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
        if [ -n "$COMMENT_TIME" ] && [ "$COMMENT_TIME" \> "$INITIAL_TIMESTAMP" ]; then
            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ New Codex feedback detected!"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "⏰ Time: $(date)"
            echo "⏱️  Elapsed: ${ELAPSED}s ($(($ELAPSED / 60))m $(($ELAPSED % 60))s)"
            echo "📁 File: $COMMENT_PATH:$COMMENT_LINE"
            echo ""
            echo "$COMMENT_BODY" | head -40
            echo ""
            
            # Check for approval indicators (including Codex's specific approval messages)
            if echo "$COMMENT_BODY" | grep -qiE "(everything is ok|looks good|approved|no issues|no problems|all good|👍|thumbs up|breezy|didn't find any major issues|didn't find any major|already looking forward|no major issues)"; then
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "🎉 CODEX APPROVED!"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "✅ No major issues found"
                echo "⏱️  Total time: ${ELAPSED}s ($(($ELAPSED / 60))m $(($ELAPSED % 60))s)"
                echo ""
                echo "🔗 PR: https://github.com/SujitBista/medbook/pull/$PR_NUMBER"
                exit 0
            fi
            
            # Check for actionable issues
            if echo "$COMMENT_BODY" | grep -qiE "(P[0-9]|Badge|fix|error|issue|problem|suggestion|recommend|should|must|need|change|update|modify)"; then
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "⚠️  Codex found issues that need attention"
                echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo "📝 Review the feedback above and fix issues"
                echo "⏱️  Time elapsed: ${ELAPSED}s"
                echo ""
                echo "🔗 View full feedback: https://github.com/SujitBista/medbook/pull/$PR_NUMBER"
                echo ""
                echo "💡 After fixing, push changes and run this script again"
                exit 1
            fi
            
            # Update timestamp to avoid re-processing
            INITIAL_TIMESTAMP="$COMMENT_TIME"
        fi
    fi
    
    # Show progress every 30 seconds
    if [ $((ITERATION % 2)) -eq 0 ]; then
        printf "\r   ⏳ Monitoring... (${ELAPSED}s / ${MAX_WAIT_TIME}s) - Checked $ITERATION times"
    fi
    
    sleep $POLL_INTERVAL
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰ Maximum wait time reached"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  Total time: ${ELAPSED}s ($(($ELAPSED / 60))m $(($ELAPSED % 60))s)"
echo ""
echo "📊 Latest Codex comment timestamp: ${INITIAL_TIMESTAMP}"
echo ""
echo "💡 Codex may still be processing. Check manually:"
echo "   https://github.com/SujitBista/medbook/pull/$PR_NUMBER"
echo ""
echo "🔄 To continue monitoring, run this script again"
exit 2
