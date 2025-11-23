/**
 * lint-staged configuration for monorepo
 * Handles different ESLint configs per package (flat config for web, legacy for api)
 * Skips linting packages that don't have ESLint configured
 */
const fs = require("fs");
const path = require("path");

/**
 * Check if a directory has an ESLint configuration file
 */
function hasESLintConfig(dir) {
  const configFiles = [
    ".eslintrc.js",
    ".eslintrc.cjs",
    ".eslintrc.json",
    ".eslintrc.yaml",
    ".eslintrc.yml",
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
  ];

  return configFiles.some((file) => {
    const filePath = path.join(dir, file);
    return fs.existsSync(filePath);
  });
}

module.exports = {
  "**/*.{ts,tsx,js,jsx}": (filenames) => {
    // Group files by their package directory
    const packageMap = new Map();

    filenames.forEach((file) => {
      if (file.startsWith("apps/web/")) {
        if (!packageMap.has("apps/web")) {
          packageMap.set("apps/web", []);
        }
        packageMap.get("apps/web").push(file);
      } else if (file.startsWith("apps/api/")) {
        if (!packageMap.has("apps/api")) {
          packageMap.set("apps/api", []);
        }
        packageMap.get("apps/api").push(file);
      } else if (file.startsWith("packages/")) {
        // Extract package name from path (e.g., packages/ui/src/... -> packages/ui)
        const match = file.match(/^packages\/([^/]+)/);
        if (match) {
          const pkgDir = `packages/${match[1]}`;
          if (!packageMap.has(pkgDir)) {
            packageMap.set(pkgDir, []);
          }
          packageMap.get(pkgDir).push(file);
        }
      } else {
        // Root-level files
        if (!packageMap.has("root")) {
          packageMap.set("root", []);
        }
        packageMap.get("root").push(file);
      }
    });

    // Build eslint commands for each package that has ESLint configured
    const eslintCommands = [];
    packageMap.forEach((files, dir) => {
      if (dir === "root") {
        // Skip root files - no ESLint config expected at root
        return;
      } else if (dir.startsWith("packages/")) {
        // Only lint packages that have ESLint configured
        if (!hasESLintConfig(dir)) {
          return; // Skip this package
        }
      }
      // For package/app files, change to package directory and run eslint
      // This ensures ESLint finds the correct config (flat config for web, legacy for api)
      const relativeFiles = files
        .map((f) => f.replace(`${dir}/`, ""))
        .join(" ");
      eslintCommands.push(`cd ${dir} && eslint --fix ${relativeFiles}`);
    });

    // Return array: eslint commands first, then prettier
    const commands = [];
    if (eslintCommands.length > 0) {
      // Join eslint commands with && to run sequentially
      commands.push(eslintCommands.join(" && "));
    }
    // Add prettier to format all files (including packages without ESLint)
    commands.push(`prettier --write ${filenames.join(" ")}`);

    return commands.length > 0 ? commands : ['echo "No files to lint"'];
  },
  "**/*.{json,md}": "prettier --write",
};
