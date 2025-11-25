# Codex Review Automation Scripts

Automated scripts for managing Codex PR reviews.

## Scripts

### `auto_codex_review.sh` - **Recommended for future use**

Comprehensive script that requests Codex review and monitors for approval.

**Usage:**

```bash
./scripts/auto_codex_review.sh [PR_NUMBER]
```

**Features:**

- Automatically requests Codex review
- Monitors for approval messages including:
  - "Didn't find any major issues"
  - "Already looking forward to the next diff"
  - Other approval patterns
- Detects actionable issues
- Exits with appropriate status codes

### `monitor_codex_approval.sh`

Monitors an existing PR for Codex feedback.

**Usage:**

```bash
./scripts/monitor_codex_approval.sh
```

**Features:**

- Monitors PR #23 (hardcoded)
- Detects Codex approval messages
- Shows progress and timing

### `automated_pr_review.sh`

Full PR creation and review automation (for new PRs).

**Usage:**

```bash
./scripts/automated_pr_review.sh
```

**Features:**

- Creates or updates PR
- Requests Codex review
- Monitors feedback
- Handles multiple iterations

## Codex Approval Detection

All scripts detect Codex approval when the review contains:

- "Didn't find any major issues"
- "Already looking forward to the next diff"
- "No major issues"
- "Everything is ok"
- "Looks good"
- "Approved"
- "No issues"
- "👍" or "thumbs up"
- "Breezy"

## Exit Codes

- `0` - Codex approved, no issues
- `1` - Codex found issues that need attention
- `2` - Maximum wait time reached, manual check needed
