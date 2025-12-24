const fs = require("fs");
const { execSync } = require("child_process");

// Only run husky if we're in a Git repository
// This prevents errors in CI/CD environments where Git might not be available
if (fs.existsSync(".git")) {
  try {
    execSync("husky", { stdio: "inherit" });
  } catch (error) {
    // Silently fail if husky is not available (e.g., in CI/CD)
    // This is expected in deployment environments
    process.exit(0);
  }
}
