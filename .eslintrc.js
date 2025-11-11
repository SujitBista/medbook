module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    "no-console": "warn",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    ".next/",
    ".turbo/",
    "*.config.js",
    "*.config.ts",
  ],
};

