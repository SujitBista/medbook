# GitHub Actions Workflows

This directory contains GitHub Actions workflows that enforce branch-based development and run CI/CD checks.

## Workflows

### `ci.yml` - Main CI Pipeline

Runs on all Pull Requests to `main` and feature branches.

**Jobs:**

- **check-branch**: Prevents direct pushes to `main` branch
- **lint-and-typecheck**: Runs ESLint and TypeScript type checking
- **test**: Runs test suite with coverage
- **build**: Builds all packages to ensure they compile

**Triggers:**

- Pull requests to `main`
- Pushes to feature branches (`feature/**`, `fix/**`, etc.)

### `prevent-main-push.yml` - Backup Protection

Additional safety net that fails if someone tries to push directly to `main`.

**Note:** This should be redundant if branch protection rules are properly configured in GitHub settings.

## Required Status Checks

For branch protection to work properly, these status checks must pass:

- `CI / lint-and-typecheck`
- `CI / test`
- `CI / build`

## Local Testing

You can test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Test CI workflow
act pull_request
```

## Troubleshooting

### Workflow not running

- Ensure workflows are enabled in repository Settings → Actions
- Check that workflow files are in `.github/workflows/`
- Verify YAML syntax is correct

### Tests failing in CI but passing locally

- Check environment variables are set in GitHub Secrets
- Verify database setup matches local environment
- Check Node.js version matches (should be 20)

### Build failing

- Ensure all dependencies are in `package.json`
- Check that TypeScript compilation succeeds
- Verify turbo.json configuration is correct
