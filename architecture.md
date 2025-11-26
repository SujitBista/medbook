# Architecture Documentation

## Technology Stack

### Frontend

- **Next.js 14+** (App Router) - React framework with server-side rendering, API routes, and optimized performance
- **React 18+** - UI library for building interactive user interfaces
- **TypeScript** - Type-safe JavaScript for better developer experience and code quality
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **NextAuth.js** - Authentication library for Next.js applications

### Backend

- **Express.js** - Fast, unopinionated web framework for Node.js
- **Node.js** - JavaScript runtime environment
- **TypeScript** - Type-safe backend development
- **PostgreSQL** - Robust relational database management system

### Monorepo & Build Tools

- **Turborepo** - High-performance build system for JavaScript and TypeScript monorepos
- **Turbopack** - Next.js's Rust-based bundler (used by Next.js by default)
- **pnpm** - Fast, disk space efficient package manager (recommended for Turborepo)

### Database & ORM

- **PostgreSQL** - Primary database
- **Prisma** - Next-generation ORM for Node.js and TypeScript (recommended for type-safe database access)

### Development Tools

- **ESLint** - JavaScript/TypeScript linter
- **Prettier** - Code formatter
- **TypeScript** - Static type checking
- **Git** - Version control

## Architecture Decisions

### Monorepo Structure

The project follows a monorepo architecture with the following structure:

- `apps/` - Contains application code (web frontend, API backend)
- `packages/` - Contains shared packages (types, UI components, configs, database schema)

**Benefits:**

- Code sharing between frontend and backend
- Consistent tooling and dependencies
- Atomic commits across multiple packages
- Simplified dependency management

### API Design

- **RESTful API** - Standard REST conventions for API endpoints
- **JSON** - Primary data exchange format
- **HTTP Status Codes** - Standard status codes for API responses
- **API Versioning** - Versioned endpoints (e.g., `/api/v1/...`)

**API Structure:**

```
/api/v1/
  /auth/          - Authentication endpoints
  /users/         - User management
  /doctors/       - Doctor CRUD operations
  /appointments/  - Appointment management
  /availability/  - Doctor availability/schedule
```

### Database Schema Approach

- **Prisma Schema** - Single source of truth for database schema
- **Migrations** - Version-controlled database changes
- **Relations** - Proper foreign key relationships between tables

**Core Entities:**

- Users (with roles: Patient, Doctor, Admin)
- Doctors (linked to Users)
- Appointments (links Patients and Doctors)
- Availability/Schedules (Doctor time slots)

### Authentication Flow

- **NextAuth.js** - Handles authentication on the frontend
- **JWT Tokens** - Secure token-based authentication
- **Session Management** - Server-side session handling
- **Role-Based Access Control (RBAC)** - Patient, Doctor, Admin roles

**Authentication Flow:**

1. User logs in via NextAuth.js
2. NextAuth.js validates credentials with Express API
3. Express API returns JWT token
4. NextAuth.js manages session and token storage
5. Protected routes check session validity

### State Management Strategy

- **React Server Components** - Default for Next.js App Router
- **Server Actions** - For form submissions and mutations
- **React Query/TanStack Query** - For client-side data fetching and caching (optional)
- **Zustand** - Lightweight state management for global UI state (if needed)

### Error Handling Patterns

- **Consistent Error Responses** - Standardized error format across API
- **HTTP Status Codes** - Appropriate status codes for different error types
- **Error Boundaries** - React error boundaries for UI error handling
- **Logging** - Structured logging for debugging and monitoring

**Error Response Format:**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Testing Strategy

The project follows a comprehensive testing strategy with multiple layers of testing:

#### Testing Stack

- **Vitest** - Primary testing framework for unit and integration tests
  - Fast execution with ESM support
  - TypeScript-native with excellent DX
  - Jest-compatible API for easy migration
- **Supertest** - HTTP assertion library for API endpoint testing
- **MSW (Mock Service Worker)** - API mocking for isolated testing
- **@testing-library/react** - React component testing with focus on accessibility
- **Playwright** - E2E testing for critical user flows (Phase 6+)

#### Test Organization

Tests are organized alongside source code using the following structure:

```
apps/api/src/
├── services/
│   ├── auth.service.ts
│   └── auth.service.test.ts      # Unit tests
├── routes/
│   ├── auth.routes.ts
│   └── auth.routes.test.ts       # Integration tests
└── utils/
    ├── auth.ts
    └── auth.test.ts              # Unit tests

apps/web/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx           # Component tests
└── lib/
    ├── auth.ts
    └── auth.test.ts              # Unit tests

packages/db/
├── src/
│   └── index.ts
└── __tests__/                    # Database tests
    └── migrations.test.ts
```

#### Test Types

1. **Unit Tests** - Test individual functions and utilities in isolation
   - Location: `*.test.ts` or `*.test.tsx` files alongside source
   - Coverage target: 70%+ for critical paths
   - Mock external dependencies (database, APIs)

2. **Integration Tests** - Test API endpoints with database
   - Location: `*.test.ts` files in routes/controllers
   - Use test database with transactions/rollbacks
   - Test full request/response cycles

3. **Component Tests** - Test React components
   - Location: `*.test.tsx` files alongside components
   - Use Testing Library for user-centric testing
   - Test accessibility and user interactions

4. **E2E Tests** - Test complete user flows
   - Location: `apps/web/e2e/` directory
   - Use Playwright for browser automation
   - Test critical paths: auth, booking, profile management

#### Test Environment

- **Test Database**: Separate PostgreSQL database for integration tests
- **Environment Variables**: `.env.test` files for test configuration
- **Test Data**: Factories and fixtures for consistent test data
- **Isolation**: Each test runs in isolation with cleanup

#### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests for specific package
pnpm --filter api test
pnpm --filter web test

# Run E2E tests
pnpm --filter web test:e2e
```

#### Coverage Requirements

- **Unit Tests**: 70%+ coverage for services and utilities
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: Critical user flows covered
- **Coverage Reports**: Generated in `coverage/` directories

## Development Tools Configuration

### Package Manager

- **pnpm** - Recommended for Turborepo due to:
  - Efficient disk space usage
  - Fast installation
  - Workspace support
  - Strict dependency resolution

### Linting & Formatting

- **ESLint** - Code quality and consistency
  - Next.js ESLint config
  - TypeScript ESLint rules
  - React best practices
- **Prettier** - Code formatting
  - Consistent code style
  - Auto-format on save

### Type Checking

- **TypeScript** - Strict mode enabled
- **Shared Types** - Common types in `packages/types`
- **Type Generation** - Prisma generates types from schema

### Database Migrations

- **Prisma Migrate** - Database migration tool
- **Migration Files** - Version-controlled in `packages/db/prisma/migrations`
- **Schema File** - `packages/db/prisma/schema.prisma`

## Environment Variables

### Frontend (.env.local)

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### Backend (.env)

```
DATABASE_URL=postgresql://user:password@localhost:5432/medbook
NODE_ENV=development
PORT=4000
JWT_SECRET=your-jwt-secret
NEXTAUTH_SECRET=your-secret-key
```

## Git Workflow

### Branching Strategy

- **main** - Production-ready code
- **develop** - Integration branch for features
- **feature/** - Feature branches (e.g., `feature/authentication`)
- **bugfix/** - Bug fix branches
- **hotfix/** - Critical production fixes

### Commit Conventions

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Build process or auxiliary tool changes

### .gitignore

- `node_modules/`
- `.next/`
- `dist/`
- `.env*` (except `.env.example`)
- `*.log`
- IDE-specific files

## Security Considerations

- **Environment Variables** - Never commit secrets
- **Input Validation** - Validate all user inputs
- **SQL Injection Prevention** - Use Prisma parameterized queries
- **XSS Prevention** - React's built-in XSS protection
- **CSRF Protection** - NextAuth.js handles CSRF tokens
- **Rate Limiting** - Implement rate limiting on API endpoints
- **HTTPS** - Use HTTPS in production
- **Password Hashing** - Use bcrypt or similar for password hashing

## Performance Optimization

- **Next.js Optimizations** - Image optimization, code splitting, SSR/SSG
- **Database Indexing** - Proper indexes on frequently queried columns
- **API Caching** - Implement caching strategies for API responses
- **CDN** - Use CDN for static assets in production
- **Database Connection Pooling** - Efficient database connection management

## Deployment Considerations

### Frontend

- **Vercel** - Recommended for Next.js (seamless integration)
- **Alternative:** Any Node.js hosting platform

### Backend

- **Railway, Render, or AWS** - Express API hosting
- **Docker** - Containerization for consistent deployments

### Database

- **PostgreSQL Hosting** - Supabase, Neon, AWS RDS, or self-hosted
- **Connection Pooling** - Use connection pooler (e.g., PgBouncer)

## Future Considerations

- **Real-time Updates** - WebSocket support for live appointment updates
- **Mobile App** - React Native or native apps
- **Microservices** - Split into smaller services if needed
- **Caching Layer** - Redis for session storage and caching
- **Message Queue** - RabbitMQ or Bull for background jobs (notifications, etc.)
- **Monitoring** - Application monitoring and error tracking (Sentry, etc.)
