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

- **Unit Tests** - Jest/Vitest for utility functions and components
- **Integration Tests** - API endpoint testing
- **E2E Tests** - Playwright or Cypress for critical user flows
- **Type Safety** - TypeScript for compile-time error checking

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
