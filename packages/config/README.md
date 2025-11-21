# @medbook/config - Shared Configuration Packages

This directory contains shared configuration packages for the MedBook monorepo.

## Packages

### @medbook/eslint-config

Shared ESLint configuration.

**Usage:**

```json
// .eslintrc.js or eslint.config.mjs
module.exports = {
  extends: ['@medbook/eslint-config'],
};
```

### @medbook/typescript-config

Shared TypeScript configurations.

**Available configs:**
- `base.json` - Base TypeScript configuration
- `nextjs.json` - Next.js specific configuration (extends base)
- `node.json` - Node.js/backend configuration (extends base)

**Usage:**

```json
// tsconfig.json
{
  "extends": "@medbook/typescript-config/base.json"
}

// For Next.js apps
{
  "extends": "@medbook/typescript-config/nextjs.json"
}

// For Node.js packages
{
  "extends": "@medbook/typescript-config/node.json"
}
```

### @medbook/tailwind-config

Shared Tailwind CSS configuration.

**Usage:**

```js
// tailwind.config.js
module.exports = require('@medbook/tailwind-config');
```

