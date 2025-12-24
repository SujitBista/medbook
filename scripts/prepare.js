const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Skip husky setup in CI/CD environments
// Check for common CI environment variables
const isCI =
  process.env.CI === "true" ||
  process.env.VERCEL === "1" ||
  process.env.VERCEL_ENV ||
  process.env.GITHUB_ACTIONS === "true" ||
  process.env.GITLAB_CI === "true" ||
  process.env.CIRCLECI === "true" ||
  process.env.TRAVIS === "true";

if (isCI) {
  // Skip husky setup in CI/CD - Git hooks aren't needed there
  process.exit(0);
}

// Only run husky if:
// 1. We're in a Git repository
// 2. Husky is actually installed in node_modules
const isGitRepo = fs.existsSync(".git");
const huskyInstalled = fs.existsSync(
  path.join(__dirname, "..", "node_modules", ".bin", "husky")
);

if (isGitRepo && huskyInstalled) {
  try {
    // Use pnpm exec to ensure husky is found in node_modules/.bin
    execSync("pnpm exec husky", { stdio: "inherit" });
  } catch (error) {
    // Silently fail if husky execution fails
    process.exit(0);
  }
}
