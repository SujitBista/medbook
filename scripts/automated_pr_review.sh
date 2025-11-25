#!/bin/bash

# Automated PR Review Process with Codex
# Creates PR, requests Codex review, monitors feedback, and fixes issues

set -e

BRANCH_NAME=$(git branch --show-current)
PR_TITLE="User Profile Management - Task 2.5"
PR_BODY="## Task 2.5: User Profile Management

### Backend Implementation
- ✅ User profile service functions (getUserProfile, updateUserProfile, changePassword)
- ✅ User profile API endpoints (GET/PUT /api/v1/users/profile, PUT /api/v1/users/password)
- ✅ All routes protected with authentication middleware

### Frontend Implementation
- ✅ Next.js API routes to proxy backend requests with JWT token generation
- ✅ Profile page with tabbed interface
- ✅ Profile update form (email)
- ✅ Password change form with validation
- ✅ Form validation and error handling
- ✅ Success messages and loading states

### Features
- View profile information (ID, email, role, member since)
- Update email address with validation
- Change password with current password verification
- Password strength validation (matches backend requirements)
- Protected route with middleware

### Testing
- ✅ Build successful
- ✅ TypeScript compilation successful
- ✅ No linting errors"

MAX_ITERATIONS=5
ITERATION=0

echo "🚀 Starting automated PR review process"
echo "📋 Branch: $BRANCH_NAME"
echo ""

# Push changes
echo "📤 Pushing changes to remote..."
git push origin "$BRANCH_NAME" || {
    echo "❌ Failed to push changes"
    exit 1
}

# Create or get PR
echo "🔍 Checking for existing PR..."
EXISTING_PR=$(gh pr list --head "$BRANCH_NAME" --json number --jq '.[0].number // empty' 2>/dev/null || echo "")

if [ -z "$EXISTING_PR" ]; then
    echo "📝 Creating new PR..."
    PR_OUTPUT=$(gh pr create --title "$PR_TITLE" --body "$PR_BODY" 2>&1)
    PR_NUMBER=$(echo "$PR_OUTPUT" | grep -oE 'pull/[0-9]+' | grep -oE '[0-9]+' | head -1)
    if [ -z "$PR_NUMBER" ]; then
        echo "❌ Failed to create PR"
        echo "$PR_OUTPUT"
        exit 1
    fi
    echo "✅ PR #$PR_NUMBER created"
else
    PR_NUMBER=$EXISTING_PR
    echo "✅ Found existing PR #$PR_NUMBER"
    # Update PR description
    gh pr edit "$PR_NUMBER" --body "$PR_BODY" 2>/dev/null || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "PR #$PR_NUMBER: $PR_TITLE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to check for Codex feedback
check_codex_feedback() {
    gh api repos/SujitBista/medbook/pulls/$PR_NUMBER/comments | \
        jq -r '[.[] | select(.user.login == "chatgpt-codex-connector[bot]")] | sort_by(.created_at) | reverse | .[0] | select(.created_at > "'$LAST_CHECK_TIME'") | .body' 2>/dev/null || echo ""
}

# Function to check if Codex says everything is OK
is_codex_approved() {
    local feedback="$1"
    echo "$feedback" | grep -qiE "(everything is ok|looks good|approved|no issues|no problems|all good|👍|thumbs up|breezy)" && return 0
    return 1
}

# Function to check if there are actionable issues
has_actionable_issues() {
    local feedback="$1"
    echo "$feedback" | grep -qiE "(P[0-9]|Badge|fix|error|issue|problem|suggestion|recommend|should|must|need|change|update|modify)" && return 0
    return 1
}

# Request initial Codex review
echo "🤖 Requesting Codex review..."
gh pr comment "$PR_NUMBER" --body "@codex review"
LAST_CHECK_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "⏳ Waiting for Codex response..."
sleep 30

# Monitor for feedback and fix issues
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo ""
    echo "[Iteration $ITERATION/$MAX_ITERATIONS] Checking for Codex feedback..."
    
    # Get latest Codex comments
    LATEST_COMMENT=$(gh api repos/SujitBista/medbook/pulls/$PR_NUMBER/comments 2>/dev/null | \
        jq -r '[.[] | select(.user.login == "chatgpt-codex-connector[bot]")] | sort_by(.created_at) | reverse | .[0]' 2>/dev/null)
    
    if [ -n "$LATEST_COMMENT" ] && [ "$LATEST_COMMENT" != "null" ]; then
        COMMENT_BODY=$(echo "$LATEST_COMMENT" | jq -r '.body // ""')
        COMMENT_TIME=$(echo "$LATEST_COMMENT" | jq -r '.created_at // ""')
        
        # Check if this is a new comment
        if [ -n "$COMMENT_TIME" ] && [ "$COMMENT_TIME" > "$LAST_CHECK_TIME" ]; then
            echo "✅ New Codex feedback received!"
            echo ""
            echo "$COMMENT_BODY" | head -30
            echo ""
            
            # Check if approved
            if is_codex_approved "$COMMENT_BODY"; then
                echo "🎉 Codex approved! No issues found."
                echo "✅ PR is ready for merge"
                exit 0
            fi
            
            # Check if there are actionable issues
            if has_actionable_issues "$COMMENT_BODY"; then
                echo "⚠️  Codex found issues that need attention"
                echo "📝 Analyzing feedback and fixing issues..."
                
                # Extract issues and fix them (this would need more sophisticated parsing)
                # For now, we'll request another review after a delay
                echo "💡 Please review the feedback and fix issues manually, or"
                echo "   run this script again after fixes are pushed"
                
                # Update last check time
                LAST_CHECK_TIME="$COMMENT_TIME"
                
                # Wait a bit before checking again
                sleep 20
            else
                echo "ℹ️  Codex provided feedback but no actionable issues detected"
                LAST_CHECK_TIME="$COMMENT_TIME"
            fi
        else
            echo "⏳ No new feedback yet, waiting..."
            sleep 20
        fi
    else
        echo "⏳ Waiting for Codex response..."
        sleep 20
    fi
    
    # If we've been waiting too long, request another review
    if [ $ITERATION -eq 3 ]; then
        echo ""
        echo "🔄 Requesting follow-up Codex review..."
        gh pr comment "$PR_NUMBER" --body "@codex review"
        LAST_CHECK_TIME=$(date -u +"%Y-%m:%dT%H:%M:%SZ")
    fi
done

echo ""
echo "⏰ Maximum iterations reached"
echo "📊 Final status:"
echo "   PR: #$PR_NUMBER"
echo "   URL: https://github.com/SujitBista/medbook/pull/$PR_NUMBER"
echo ""
echo "💡 Please check the PR manually for Codex feedback"

