# Folder Structure

## Monorepo Overview

This document describes the complete folder structure for the Doctor Appointment Booking App monorepo. The project uses Turborepo to manage multiple applications and shared packages.

## Root Directory Structure

```
medbook/
├── apps/
│   ├── web/                 # Next.js frontend application
│   └── api/                 # Express.js backend API
├── packages/
│   ├── types/               # Shared TypeScript types
│   ├── ui/                  # Shared UI components
│   ├── config/              # Shared configuration files
│   └── db/                  # Database schema and migrations
├── .gitignore               # Git ignore rules
├── .gitattributes           # Git attributes (optional)
├── package.json             # Root package.json with workspace config
├── pnpm-workspace.yaml      # pnpm workspace configuration
├── turbo.json               # Turborepo configuration
├── tsconfig.json            # Root TypeScript configuration
├── .eslintrc.js             # Root ESLint configuration
├── .prettierrc              # Prettier configuration
├── .prettierignore          # Prettier ignore rules
├── README.md                # Project documentation
├── architecture.md          # Architecture documentation
├── plan.md                  # Implementation plan
└── FOLDER_STRUCTURE.md      # This file
```

## Apps Directory

### apps/web/ (Next.js Frontend)

```
apps/web/
├── app/                     # Next.js App Router directory
│   ├── (auth)/              # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── patient/
│   │   │   │   └── page.tsx
│   │   │   ├── doctor/
│   │   │   │   └── page.tsx
│   │   │   └── admin/
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   ├── doctors/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── appointments/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global styles
│   └── not-found.tsx        # 404 page
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   ├── forms/               # Form components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── BookingForm.tsx
│   │   └── ...
│   ├── layout/              # Layout components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── Navbar.tsx
│   └── features/            # Feature-specific components
│       ├── doctor/
│       │   ├── DoctorCard.tsx
│       │   ├── DoctorList.tsx
│       │   └── ...
│       ├── appointment/
│       │   ├── AppointmentCard.tsx
│       │   ├── AppointmentList.tsx
│       │   └── ...
│       └── ...
├── lib/                     # Utility functions and helpers
│   ├── api.ts               # API client functions
│   ├── utils.ts             # General utilities
│   ├── validations.ts       # Form validation schemas (Zod)
│   └── auth.ts              # Auth helpers
├── hooks/                   # Custom React hooks
│   ├── useAuth.ts
│   ├── useAppointments.ts
│   └── ...
├── types/                   # Frontend-specific types (if any)
│   └── ...
├── public/                  # Static assets
│   ├── images/
│   ├── icons/
│   └── ...
├── .env.local               # Local environment variables (gitignored)
├── .env.example             # Example environment variables
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Frontend dependencies
```

### apps/api/ (Express Backend)

```
apps/api/
├── src/
│   ├── routes/              # API route handlers
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   ├── doctors.routes.ts
│   │   ├── appointments.routes.ts
│   │   ├── availability.routes.ts
│   │   └── index.ts        # Route aggregator
│   ├── controllers/         # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── doctors.controller.ts
│   │   ├── appointments.controller.ts
│   │   └── availability.controller.ts
│   ├── services/            # Business logic (functional services)
│   │   ├── auth.service.ts
│   │   ├── users.service.ts
│   │   ├── doctors.service.ts
│   │   ├── appointments.service.ts
│   │   └── availability.service.ts
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── utils/               # Utility functions
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── validation.ts
│   │   └── logger.ts
│   ├── types/               # Backend-specific types
│   │   └── ...
│   ├── config/              # Configuration files
│   │   ├── database.ts
│   │   └── env.ts
│   └── app.ts               # Express app setup
├── server.ts                # Server entry point
├── .env                     # Environment variables (gitignored)
├── .env.example             # Example environment variables
├── tsconfig.json            # TypeScript configuration
└── package.json             # Backend dependencies
```

## Packages Directory

### packages/types/ (Shared TypeScript Types)

```
packages/types/
├── src/
│   ├── user.types.ts        # User-related types
│   ├── doctor.types.ts      # Doctor-related types
│   ├── appointment.types.ts # Appointment-related types
│   ├── api.types.ts         # API request/response types
│   └── index.ts             # Export all types
├── tsconfig.json
└── package.json
```

### packages/ui/ (Shared UI Components)

```
packages/ui/
├── src/
│   ├── components/          # Shared React components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── Button.test.tsx
│   │   ├── Input/
│   │   ├── Card/
│   │   └── ...
│   ├── styles/              # Shared styles
│   └── index.ts             # Export all components
├── tsconfig.json
├── package.json
└── tailwind.config.js       # Shared Tailwind config (if needed)
```

### packages/config/ (Shared Configurations)

```
packages/config/
├── eslint-config/           # Shared ESLint config
│   ├── index.js
│   └── package.json
├── typescript-config/       # Shared TypeScript configs
│   ├── base.json
│   ├── nextjs.json
│   ├── node.json
│   └── package.json
└── tailwind-config/         # Shared Tailwind config
    ├── index.js
    └── package.json
```

### packages/db/ (Database Schema)

```
packages/db/
├── prisma/
│   ├── schema.prisma        # Prisma schema file
│   ├── migrations/          # Database migrations
│   │   ├── 20240101000000_init/
│   │   │   └── migration.sql
│   │   └── ...
│   └── seed.ts              # Database seeding script
├── src/
│   └── index.ts             # Prisma client export
├── tsconfig.json
└── package.json
```

## Configuration Files Explained

### Root Level

- **package.json**: Root package.json defining workspaces and root-level scripts
- **pnpm-workspace.yaml**: Defines workspace packages for pnpm
- **turbo.json**: Turborepo pipeline configuration for build, test, lint, etc.
- **tsconfig.json**: Base TypeScript configuration extended by apps/packages
- **.eslintrc.js**: ESLint configuration for the entire monorepo
- **.prettierrc**: Prettier formatting rules
- **.gitignore**: Git ignore patterns for the entire repository

### App-Specific Configs

- **apps/web/next.config.js**: Next.js specific configuration
- **apps/web/tailwind.config.js**: Tailwind CSS configuration for frontend
- **apps/api/tsconfig.json**: Backend-specific TypeScript config

## Environment Variables

### Root .env.example

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medbook

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# API
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### apps/web/.env.local.example

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### apps/api/.env.example

```
DATABASE_URL=postgresql://user:password@localhost:5432/medbook
NODE_ENV=development
PORT=4000
JWT_SECRET=your-jwt-secret-here
NEXTAUTH_SECRET=your-secret-key-here
```

### Test Environment Variables

For testing, use separate test databases and configurations:

#### apps/api/.env.test

```
DATABASE_URL=postgresql://user:password@localhost:5432/medbook_test
NODE_ENV=test
PORT=4001
JWT_SECRET=test-jwt-secret
NEXTAUTH_SECRET=test-secret-key
```

#### apps/web/.env.test

```
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=test-secret-key
NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1
```

## Git Structure

```
.git/
├── hooks/                   # Git hooks (if using Husky)
│   └── pre-commit
├── config                   # Git configuration
└── ...
```

## Build Output Directories (Gitignored)

```
apps/web/.next/              # Next.js build output
apps/api/dist/               # Compiled TypeScript output
node_modules/                # Dependencies (all levels)
.pnpm-store/                 # pnpm store (if using pnpm)
.turbo/                      # Turborepo cache
```

## Key Conventions

1. **Naming**: Use kebab-case for directories, PascalCase for components, camelCase for functions
2. **Imports**: Use absolute imports via TypeScript path aliases
3. **Exports**: Use named exports, avoid default exports where possible
4. **Services**: Export plain functions, not class instances (per user rules)
5. **Types**: Shared types go in `packages/types`, app-specific types stay in app
6. **Components**: Shared components in `packages/ui`, app-specific in `apps/web/components`

## Path Aliases (TypeScript)

### apps/web/tsconfig.json

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@medbook/types": ["../../packages/types/src"],
      "@medbook/ui": ["../../packages/ui/src"]
    }
  }
}
```

### apps/api/tsconfig.json

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@medbook/types": ["../../packages/types/src"],
      "@app/db": ["../../packages/db/src"]
    }
  }
}
```

## Scripts Structure

### Root package.json scripts

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "test:coverage": "turbo run test:coverage",
    "clean": "turbo run clean"
  }
}
```

### apps/web/package.json scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test"
  }
}
```

### apps/api/package.json scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage"
  }
}
```

## Testing Structure

### Test Files Organization

Tests follow the convention of being co-located with source files:

```
apps/api/src/
├── services/
│   ├── auth.service.ts
│   └── auth.service.test.ts
├── routes/
│   ├── auth.routes.ts
│   └── auth.routes.test.ts
└── utils/
    ├── auth.ts
    └── auth.test.ts

apps/web/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
└── lib/
    ├── auth.ts
    └── auth.test.ts

packages/db/
└── __tests__/
    ├── migrations.test.ts
    └── fixtures/
        └── users.ts
```

### E2E Tests

E2E tests are organized in a dedicated directory:

```
apps/web/
└── e2e/
    ├── auth.spec.ts
    ├── booking.spec.ts
    └── fixtures/
        └── test-data.ts
```

### Test Configuration Files

```
medbook/
├── vitest.config.ts              # Root Vitest config
├── apps/api/
│   └── vitest.config.ts          # API-specific config
├── apps/web/
│   └── vitest.config.ts          # Web-specific config
└── packages/db/
    └── vitest.config.ts          # DB-specific config
```

### Test Utilities

```
apps/api/src/
└── __tests__/
    ├── setup.ts                  # Test setup and teardown
    ├── helpers.ts                # Test helper functions
    └── fixtures.ts               # Test data fixtures
```

## Notes

- All `node_modules` directories are gitignored
- Environment files (`.env`, `.env.local`) are gitignored
- Build outputs are gitignored
- Test coverage reports (`coverage/`) are gitignored
- Only source code and configuration files are committed
- Each package/app can have its own dependencies
- Shared dependencies are hoisted to root when possible
