# MedBook API

Express.js API server for the MedBook application.

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

#### Server Configuration

- `NODE_ENV` - Node environment (`development`, `production`, `test`). Default: `development`
- `PORT` - Server port. Default: `4000`
- `API_URL` - Full URL where the API is accessible. Default: `http://localhost:{PORT}`

#### CORS Configuration

The API uses strict whitelist-based CORS policy for security.

- `CORS_ORIGIN` - Comma-separated list of allowed origins. Origins are automatically normalized (lowercase, no trailing slash).
  - Default: `http://localhost:3000,http://127.0.0.1:3000,http://[::1]:3000`
  - Example: `CORS_ORIGIN=https://app.example.com,https://staging.example.com`

- `CORS_ALLOW_NO_ORIGIN` - Allow requests with no Origin header (e.g., Postman, curl, server-to-server requests).
  - Set to `true` to allow. Default: `false`
  - ⚠️ **Security Warning**: Only enable in development or for trusted server-to-server communication.

- `CORS_ALLOW_NULL_ORIGIN` - Allow requests with `Origin: null` (file:// protocol, sandboxed iframes).
  - Set to `true` to allow. Default: `false`
  - ⚠️ **Security Warning**: Only enable if you specifically need to support file:// protocol or sandboxed iframes.

### Running the Server

```bash
# Development mode with hot reload
pnpm dev

# Production build
pnpm build
pnpm start
```

## CORS Policy

The API implements a strict CORS policy:

- **Whitelist-based**: Only origins listed in `CORS_ORIGIN` are allowed
- **Normalized matching**: Origins are normalized (lowercase, no trailing slash) for consistent comparison
- **Credentials support**: Cookies and authorization headers are allowed for whitelisted origins
- **Preflight handling**: OPTIONS requests are properly handled with appropriate error responses
- **Error responses**: Denied requests return 403 Forbidden with a standardized JSON error response

### CORS Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "CORS_ERROR",
    "message": "Origin not allowed by CORS policy",
    "details": "CORS: Origin not allowed"  // Only in development
  }
}
```

## API Routes

- `GET /` - Health check endpoint
- `GET /api/v1/*` - API version 1 routes

## Development

### Project Structure

```
src/
├── app.ts              # Express app configuration
├── index.ts            # Server entry point
├── config/
│   └── env.ts          # Environment configuration
├── middleware/
│   └── cors.middleware.ts  # CORS middleware
├── routes/
│   └── index.ts        # Route definitions
├── controllers/        # Request handlers
├── services/           # Business logic
├── types/              # TypeScript types
└── utils/              # Utility functions
```

## License

MIT


