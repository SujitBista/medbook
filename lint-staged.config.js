/**
 * lint-staged configuration for monorepo
 * Handles different ESLint configs per package (flat config for web, legacy for api)
 */
module.exports = {
  '**/*.{ts,tsx,js,jsx}': (filenames) => {
    // Group files by their package directory
    const packageMap = new Map();

    filenames.forEach((file) => {
      if (file.startsWith('apps/web/')) {
        if (!packageMap.has('apps/web')) {
          packageMap.set('apps/web', []);
        }
        packageMap.get('apps/web').push(file);
      } else if (file.startsWith('apps/api/')) {
        if (!packageMap.has('apps/api')) {
          packageMap.set('apps/api', []);
        }
        packageMap.get('apps/api').push(file);
      } else if (file.startsWith('packages/')) {
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
        if (!packageMap.has('root')) {
          packageMap.set('root', []);
        }
        packageMap.get('root').push(file);
      }
    });

    // Build commands for each package
    const commands = [];
    packageMap.forEach((files, dir) => {
      if (dir === 'root') {
        // For root files, run from root (no specific ESLint config expected)
        commands.push(`eslint --fix ${files.join(' ')}`);
      } else {
        // For package files, change to package directory and run eslint
        // This ensures ESLint finds the correct config (flat config for web, legacy for api)
        const relativeFiles = files.map((f) => f.replace(`${dir}/`, '')).join(' ');
        commands.push(`cd ${dir} && eslint --fix ${relativeFiles}`);
      }
    });

    // Return commands array - lint-staged will run them sequentially
    if (commands.length === 0) {
      return 'echo "No files to lint"';
    }
    
    return commands;
  },
  '**/*.{json,md}': 'prettier --write',
};
