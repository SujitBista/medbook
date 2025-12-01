#!/bin/bash

# Automated Codex Review Process
# Monitors PR for Codex feedback and tracks review completion time

PR_NUMBER=22
CODEX_USER="chatgpt-codex-connector"
MAX_WAIT_TIME=300  # Maximum wait time in seconds (5 minutes)
POLL_INTERVAL=10   # Check every 10 seconds
START_TIME=$(date +%s)

echo "🚀 Starting automated Codex review process for PR #$PR_NUMBER"
echo "⏰ Start time: $(date)"
echo ""

# Function to get the latest Codex comment timestamp
get_latest_codex_timestamp() {
    gh api repos/SujitBista/medbook/pulls/$PR_NUMBER/comments | \
        jq -r '[.[] | select(.user.login == "'$CODEX_USER'[bot]")] | sort_by(.created_at) | reverse | .[0].created_at // empty'
}

# Function to get the latest Codex review timestamp
get_latest_codex_review_timestamp() {
    gh api repos/SujitBista/medbook/pulls/$PR_NUMBER/reviews | \
        jq -r '[.[] | select(.user.login == "'$CODEX_USER'")] | sort_by(.submitted_at) | reverse | .[0].submitted_at // empty'
}

# Get initial timestamp before requesting review
INITIAL_COMMENT_TS=$(get_latest_codex_timestamp)
INITIAL_REVIEW_TS=$(get_latest_codex_review_timestamp)

echo "📊 Initial state:"
echo "   Latest comment timestamp: ${INITIAL_COMMENT_TS:-'None'}"
echo "   Latest review timestamp: ${INITIAL_REVIEW_TS:-'None'}"
echo ""

# Request Codex review
echo "📝 Requesting Codex review..."
REVIEW_COMMENT=$(gh pr comment $PR_NUMBER --body "@codex review")
echo "   ✅ Review requested: $REVIEW_COMMENT"
echo ""

# Wait a moment for the comment to be registered
sleep 3

# Monitor for Codex response
echo "⏳ Monitoring for Codex response..."
echo "   Polling every $POLL_INTERVAL seconds (max wait: $MAX_WAIT_TIME seconds)"
echo ""

ELAPSED=0
ITERATION=0

while [ $ELAPSED -lt $MAX_WAIT_TIME ]; do
    ITERATION=$((ITERATION + 1))
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    # Get latest timestamps
    LATEST_COMMENT_TS=$(get_latest_codex_timestamp)
    LATEST_REVIEW_TS=$(get_latest_codex_review_timestamp)
    
    # Check if we have new comments
    if [ -n "$LATEST_COMMENT_TS" ] && [ "$LATEST_COMMENT_TS" != "$INITIAL_COMMENT_TS" ]; then
        echo ""
        echo "✅ New Codex comment detected at $(date)"
        echo "   Time elapsed: ${ELAPSED}s"
        echo ""
        
        # Get the latest comment
        LATEST_COMMENT=$(gh api repos/SujitBista/medbook/pulls/$PR_NUMBER/comments | \
            jq -r '[.[] | select(.user.login == "'$CODEX_USER'[bot]")] | sort_by(.created_at) | reverse | .[0]')
        
        COMMENT_BODY=$(echo "$LATEST_COMMENT" | jq -r '.body')
        COMMENT_PATH=$(echo "$LATEST_COMMENT" | jq -r '.path // "general"')
        COMMENT_LINE=$(echo "$LATEST_COMMENT" | jq -r '.line // "N/A"')
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📋 Latest Codex Comment"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "File: $COMMENT_PATH:$COMMENT_LINE"
        echo ""
        echo "$COMMENT_BODY" | head -20
        echo ""
        
        # Check for "Everything is OK" or similar positive indicators
        if echo "$COMMENT_BODY" | grep -qiE "(everything is ok|looks good|approved|no issues|no problems|all good|👍|thumbs up)"; then
            echo "🎉 Codex indicates everything is OK!"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ Review completed successfully"
            echo "⏱️  Total time: ${ELAPSED}s ($(($ELAPSED / 60))m $(($ELAPSED % 60))s)"
            exit 0
        fi
        
        # Check if there are actionable issues
        if echo "$COMMENT_BODY" | grep -qiE "(P[0-9]|Badge|fix|error|issue|problem|suggestion|recommend|should|must|need|change|update|modify)"; then
            echo "⚠️  Codex has identified issues that need attention"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "📝 Review completed with feedback"
            echo "⏱️  Total time: ${ELAPSED}s ($(($ELAPSED / 60))m $(($ELAPSED % 60))s)"
            echo ""
            echo "View full feedback: https://github.com/SujitBista/medbook/pull/$PR_NUMBER"
            exit 0
        fi
        
        # If we got a new comment but it doesn't match patterns, continue monitoring
        echo "   Continuing to monitor for additional feedback..."
        INITIAL_COMMENT_TS="$LATEST_COMMENT_TS"
    fi
    
    # Check if we have new reviews
    if [ -n "$LATEST_REVIEW_TS" ] && [ "$LATEST_REVIEW_TS" != "$INITIAL_REVIEW_TS" ]; then
        echo ""
        echo "✅ New Codex review detected at $(date)"
        echo "   Time elapsed: ${ELAPSED}s"
        echo ""
        
        LATEST_REVIEW=$(gh api repos/SujitBista/medbook/pulls/$PR_NUMBER/reviews | \
            jq -r '[.[] | select(.user.login == "'$CODEX_USER'")] | sort_by(.submitted_at) | reverse | .[0]')
        
        REVIEW_BODY=$(echo "$LATEST_REVIEW" | jq -r '.body')
        REVIEW_STATE=$(echo "$LATEST_REVIEW" | jq -r '.state')
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📋 Latest Codex Review"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "State: $REVIEW_STATE"
        echo ""
        echo "$REVIEW_BODY" | head -30
        echo ""
        
        # Check for approval or positive state
        if [ "$REVIEW_STATE" = "APPROVED" ] || echo "$REVIEW_BODY" | grep -qiE "(everything is ok|looks good|approved|no issues)"; then
            echo "🎉 Codex review approved!"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ Review completed successfully"
            echo "⏱️  Total time: ${ELAPSED}s ($(($ELAPSED / 60))m $(($ELAPSED % 60))s)"
            exit 0
        fi
        
        INITIAL_REVIEW_TS="$LATEST_REVIEW_TS"
    fi
    
    # Show progress every 30 seconds
    if [ $((ITERATION % 3)) -eq 0 ]; then
        printf "\r   ⏳ Waiting... (${ELAPSED}s / ${MAX_WAIT_TIME}s)"
    fi
    
    sleep $POLL_INTERVAL
done

echo ""
echo "⏰ Maximum wait time reached ($MAX_WAIT_TIME seconds)"
echo "📊 Final status:"
echo "   Latest comment timestamp: ${LATEST_COMMENT_TS:-'None'}"
echo "   Latest review timestamp: ${LATEST_REVIEW_TS:-'None'}"
echo ""
echo "💡 Codex may still be processing. Check manually:"
echo "   https://github.com/SujitBista/medbook/pull/$PR_NUMBER"
exit 1





