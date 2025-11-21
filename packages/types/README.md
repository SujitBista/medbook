# @medbook/types - Shared TypeScript Types

This package contains shared TypeScript types used across the MedBook application (frontend and backend).

## Usage

```typescript
import { User, UserRole, CreateUserInput } from '@medbook/types';
import { Appointment, AppointmentStatus } from '@medbook/types';
import { ApiResponse, PaginatedResponse } from '@medbook/types';
```

## Structure

- `user.types.ts` - User-related types
- `doctor.types.ts` - Doctor-related types
- `appointment.types.ts` - Appointment-related types
- `api.types.ts` - API request/response types

## Building

```bash
pnpm build
```

## Development

Types are automatically compiled to `dist/` directory when built. The package exports both JavaScript and TypeScript declaration files.

