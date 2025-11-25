#!/bin/bash

# Monitor Codex review feedback for PR #22
# Usage: ./scripts/monitor_codex_review.sh [interval_seconds] [max_checks]

PR_NUMBER=22
INTERVAL=${1:-30}  # Default: check every 30 seconds
MAX_CHECKS=${2:-20}  # Default: check 20 times (10 minutes total)
CODEX_USER="chatgpt-codex-connector"

echo "🔍 Monitoring Codex review feedback for PR #$PR_NUMBER"
echo "⏱️  Checking every $INTERVAL seconds (max $MAX_CHECKS checks)"
echo ""

# Get initial timestamp to compare against (get the most recent Codex comment)
INITIAL_TIMESTAMP=$(gh pr view $PR_NUMBER --json comments --jq '.comments | map(select(.author.login == "'$CODEX_USER'")) | sort_by(.createdAt) | reverse | if length > 0 then .[0].createdAt else "1970-01-01T00:00:00Z" end')

if [ "$INITIAL_TIMESTAMP" = "null" ] || [ -z "$INITIAL_TIMESTAMP" ]; then
    INITIAL_TIMESTAMP="1970-01-01T00:00:00Z"
fi

echo "📅 Initial check timestamp: $INITIAL_TIMESTAMP"
echo "   (Will alert on any Codex comments after this time)"
echo ""

for i in $(seq 1 $MAX_CHECKS); do
    echo "[Check $i/$MAX_CHECKS] $(date '+%H:%M:%S') - Checking for new Codex feedback..."
    
    # Get latest Codex comment
    LATEST_COMMENT=$(gh pr view $PR_NUMBER --json comments --jq '.comments | map(select(.author.login == "'$CODEX_USER'")) | sort_by(.createdAt) | reverse | if length > 0 then .[0] else null end')
    
    if [ "$LATEST_COMMENT" != "null" ] && [ ! -z "$LATEST_COMMENT" ]; then
        LATEST_TIMESTAMP=$(echo "$LATEST_COMMENT" | jq -r '.createdAt // empty')
        LATEST_BODY=$(echo "$LATEST_COMMENT" | jq -r '.body // empty')
        
        # Compare timestamps (check if newer than initial)
        if [ ! -z "$LATEST_TIMESTAMP" ] && [ "$LATEST_TIMESTAMP" != "null" ] && [ "$LATEST_TIMESTAMP" != "$INITIAL_TIMESTAMP" ]; then
            echo ""
            echo "✅ NEW CODEX FEEDBACK DETECTED!"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "📅 Timestamp: $LATEST_TIMESTAMP"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "$LATEST_BODY"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "🔗 PR Link: https://github.com/SujitBista/medbook/pull/$PR_NUMBER"
            echo ""
            
            # Check if feedback contains actionable items
            if echo "$LATEST_BODY" | grep -qiE "(fix|error|issue|problem|suggestion|recommend|should|must|need)"; then
                echo "⚠️  This feedback appears to contain actionable items that may need fixes."
            fi
            
            exit 0
        fi
    fi
    
    # Show progress
    if [ $((i % 5)) -eq 0 ]; then
        echo "   Still monitoring... (checked $i times)"
    fi
    
    # Wait before next check (except on last iteration)
    if [ $i -lt $MAX_CHECKS ]; then
        sleep $INTERVAL
    fi
done

echo ""
echo "⏰ Monitoring completed. No new Codex feedback detected."
echo "💡 You can run this script again to continue monitoring."

