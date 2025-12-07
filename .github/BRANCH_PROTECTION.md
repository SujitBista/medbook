# Branch Protection Setup Guide

This repository enforces branch-based development through GitHub Actions workflows and branch protection rules.

## Current Workflows

### CI Workflow (`.github/workflows/ci.yml`)

- Runs on all Pull Requests to `main`
- Runs linting, type checking, tests, and builds
- Prevents direct pushes to `main` (fails the workflow)

### Prevent Main Push (`.github/workflows/prevent-main-push.yml`)

- Backup protection that fails if someone tries to push directly to `main`
- Should be redundant if branch protection is properly configured

## Required GitHub Branch Protection Rules

To fully enforce branch-based development, configure these branch protection rules in GitHub:

### Steps to Set Up Branch Protection

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** or edit the existing rule for `main`
4. Configure the following settings:

#### Required Settings

- ✅ **Require a pull request before merging**
  - Require approvals: `1` (or more as needed)
  - Dismiss stale pull request approvals when new commits are pushed
  - Require review from Code Owners (if you have a CODEOWNERS file)

- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Select required status checks:
    - `CI / lint-and-typecheck`
    - `CI / test`
    - `CI / build`

- ✅ **Require conversation resolution before merging**
  - All comments and review suggestions must be resolved

- ✅ **Do not allow bypassing the above settings**
  - Even administrators cannot bypass (recommended for production)

#### Optional but Recommended

- ✅ **Restrict who can push to matching branches**
  - No one (forces all changes through PRs)

- ✅ **Require linear history**
  - Prevents merge commits (keeps history clean)

- ✅ **Include administrators**
  - Apply these rules to admins too

- ✅ **Allow force pushes**
  - ❌ **Unchecked** (prevents force pushes)

- ✅ **Allow deletions**
  - ❌ **Unchecked** (prevents branch deletion)

## Branch Naming Conventions

Use these prefixes for feature branches:

- `feature/` - New features (e.g., `feature/email-notifications`)
- `fix/` - Bug fixes (e.g., `fix/appointment-booking-bug`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)
- `docs/` - Documentation updates (e.g., `docs/api-documentation`)
- `test/` - Test improvements (e.g., `test/add-integration-tests`)
- `refactor/` - Code refactoring (e.g., `refactor/auth-service`)
- `hotfix/` - Critical production fixes (e.g., `hotfix/security-patch`)

## Workflow Example

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/email-notifications

# 3. Make changes and commit
git add .
git commit -m "feat: implement email notifications with SendGrid"

# 4. Push to feature branch
git push origin feature/email-notifications

# 5. Create Pull Request
gh pr create --title "feat: implement email notifications" --body "Adds SendGrid email service..."

# 6. After PR is merged, clean up
git checkout main
git pull origin main
git branch -d feature/email-notifications
git push origin --delete feature/email-notifications
```

## Emergency Hotfixes

For critical production fixes that need to bypass normal workflow:

1. Create a `hotfix/` branch
2. Still create a PR (but can expedite review)
3. Document why it bypassed normal process

```bash
git checkout -b hotfix/critical-security-patch
# Make changes
git push origin hotfix/critical-security-patch
gh pr create --title "hotfix: critical security patch" --body "Emergency fix for..."
```

## Verification

After setting up branch protection:

1. Try to push directly to main (should be blocked):

   ```bash
   git checkout main
   echo "test" >> test.txt
   git add test.txt
   git commit -m "test"
   git push origin main  # Should fail
   ```

2. Create a PR and verify CI runs:
   ```bash
   git checkout -b test/verify-protection
   echo "test" >> test.txt
   git add test.txt
   git commit -m "test: verify branch protection"
   git push origin test/verify-protection
   gh pr create
   ```

## Troubleshooting

### Workflow not running on PRs

- Check that workflows are enabled in repository settings
- Verify the workflow file syntax is correct
- Check GitHub Actions tab for errors

### Can still push to main

- Verify branch protection rules are configured
- Check that "Restrict who can push" is set to "No one"
- Ensure "Include administrators" is checked

### CI checks not showing in PR

- Verify workflow files are in `.github/workflows/`
- Check that workflow triggers match your branch names
- Ensure status checks are properly named in branch protection
