# Testing Guide

This directory contains tests for the API server.

## Test Structure

- **Unit Tests**: Test individual functions and utilities in isolation
  - Location: `*.test.ts` files alongside source files
  - Examples: `utils/auth.test.ts`, `utils/errors.test.ts`

- **Integration Tests**: Test API endpoints with database
  - Location: `routes/*.test.ts` files
  - Examples: `routes/auth.routes.test.ts`, `routes/user.routes.test.ts`

## Running Tests

### Prerequisites

1. **Start PostgreSQL service** (if not already running):

```bash
# macOS with Homebrew
brew services start postgresql@14

# OR manually
pg_ctl -D /usr/local/var/postgresql@14 start
```

2. **Set up test database** - Use the automated setup script:

```bash
# From project root
./scripts/setup-test-db.sh
```

This script will:

- Check if PostgreSQL is running
- Create the test database (`medbook_test`)
- Run migrations
- Output the `TEST_DATABASE_URL` to set

**Manual setup** (alternative):

```bash
# Create test database
createdb medbook_test

# Set TEST_DATABASE_URL
export TEST_DATABASE_URL=postgresql://$(whoami)@localhost:5432/medbook_test

# Run migrations
cd packages/db
DATABASE_URL=$TEST_DATABASE_URL pnpm db:migrate:deploy
```

### Run All Tests

```bash
# From root
pnpm test

# From apps/api directory
cd apps/api
pnpm test
```

### Run Tests in Watch Mode

```bash
cd apps/api
pnpm test:watch
```

### Run Tests with Coverage

```bash
cd apps/api
pnpm test:coverage
```

### Run Specific Test File

```bash
cd apps/api
pnpm test src/utils/auth.test.ts
```

## Test Utilities

### Helpers (`helpers.ts`)

- `createTestApp()` - Creates a test Express app instance
- `createTestAgent(app)` - Creates a Supertest agent for HTTP requests
- `createTestToken(userId, role)` - Creates a JWT token for testing
- `createAuthHeaders(userId, role)` - Creates authorization headers

### Fixtures (`fixtures.ts`)

- `createTestUserInput(overrides)` - Creates test user input data
- `createValidUserInput(overrides)` - Creates valid user input
- `createInvalidPasswordUserInput(overrides)` - Creates invalid password input

### Database Utilities (`db.ts`)

- `cleanupTestData()` - Cleans up test data from database
- `createTestUser(overrides)` - Creates a test user in the database

## Writing Tests

### Example: Unit Test

```typescript
import { describe, it, expect } from "vitest";
import { validatePassword } from "../utils/auth";

describe("validatePassword", () => {
  it("should validate a strong password", () => {
    const result = validatePassword("StrongPass123!");
    expect(result.valid).toBe(true);
  });
});
```

### Example: Integration Test

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestApp, createTestAgent } from "../__tests__/helpers";
import { cleanupTestData, createTestUser } from "../__tests__/db";

describe("POST /api/v1/auth/register", () => {
  const app = createTestApp();
  const agent = createTestAgent(app);

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should register a new user", async () => {
    const response = await agent
      .post("/api/v1/auth/register")
      .send({ email: "test@example.com", password: "ValidPass123!" })
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});
```

## Test Coverage

We aim for:

- **Unit Tests**: 70%+ coverage for utilities and services
- **Integration Tests**: All API endpoints covered
- **Coverage Reports**: Generated in `coverage/` directory

## Notes

- Tests use a separate test database to avoid affecting development data
- Each test should clean up after itself using `cleanupTestData()`
- Test data is prefixed with `test-` for easy identification
- Environment variables are set in `setup.ts` for test environment
