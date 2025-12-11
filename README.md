# MedBook

A modern medical appointment booking platform built with Next.js, Express, and Prisma.

## Architecture

MedBook is a monorepo containing:

- **apps/web**: Next.js frontend application
- **apps/api**: Express.js backend API
- **packages/db**: Prisma database schema and client
- **packages/types**: Shared TypeScript types
- **packages/ui**: Shared UI components
- **infrastructure/n8n**: Workflow automation configuration

## Prerequisites

- Node.js 18+
- pnpm 8+
- Docker and Docker Compose (for n8n)
- PostgreSQL (or use Docker)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

```bash
# Copy environment files
cp packages/db/.env.example packages/db/.env
cp infrastructure/n8n/env.template .env
```

Edit the `.env` files with your configuration.

### 3. Set Up the Database

```bash
# Run migrations
pnpm --filter @medbook/db db:migrate

# Seed the database (optional)
pnpm --filter @medbook/db db:seed
```

### 4. Start Development Servers

```bash
# Start all apps in development mode
pnpm dev
```

- **Web**: http://localhost:3000
- **API**: http://localhost:4000

---

## n8n Workflow Automation

MedBook uses [n8n](https://n8n.io/) for workflow automation, handling tasks like:

- Appointment confirmation emails
- Reminder notifications
- Third-party integrations

### Starting n8n Locally

```bash
# Start n8n with Docker Compose
docker compose up -d n8n

# Check status
docker compose ps

# View logs
docker compose logs -f n8n
```

n8n will be available at: **http://localhost:5678**

### Stopping n8n

```bash
docker compose down
```

### How the Backend Calls n8n

The backend triggers n8n workflows using webhook URLs. When an event occurs (like appointment creation), the API calls the corresponding n8n webhook:

```typescript
import { triggerN8nWebhook } from "./utils/n8n";

// Trigger the appointment-created workflow
await triggerN8nWebhook("appointment-created", {
  appointmentId: appointment.id,
  patientEmail: patient.email,
  doctorName: doctor.name,
  startTime: appointment.startTime,
  endTime: appointment.endTime,
});
```

### n8n Webhook URLs

| Event               | Webhook URL                                         |
| ------------------- | --------------------------------------------------- |
| Appointment Created | `http://localhost:5678/webhook/appointment-created` |

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPOINTMENT CREATION FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Patient │    │  Web App │    │   API    │    │   n8n    │    │  Email   │
│  (User)  │    │ (Next.js)│    │(Express) │    │(Workflow)│    │ Service  │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │
     │ 1. Book       │               │               │               │
     │ Appointment   │               │               │               │
     │──────────────>│               │               │               │
     │               │               │               │               │
     │               │ 2. POST       │               │               │
     │               │ /appointments │               │               │
     │               │──────────────>│               │               │
     │               │               │               │               │
     │               │               │ 3. Create     │               │
     │               │               │ in Database   │               │
     │               │               │───────┐       │               │
     │               │               │       │       │               │
     │               │               │<──────┘       │               │
     │               │               │               │               │
     │               │               │ 4. POST       │               │
     │               │               │ /webhook/     │               │
     │               │               │ appointment-  │               │
     │               │               │ created       │               │
     │               │               │──────────────>│               │
     │               │               │               │               │
     │               │               │               │ 5. Process    │
     │               │               │               │ Workflow      │
     │               │               │               │───────┐       │
     │               │               │               │       │       │
     │               │               │               │<──────┘       │
     │               │               │               │               │
     │               │               │               │ 6. Send       │
     │               │               │               │ Email         │
     │               │               │               │──────────────>│
     │               │               │               │               │
     │               │               │               │               │ 7. Email
     │               │               │               │               │ Delivered
     │               │               │               │<──────────────│
     │               │               │               │               │
     │               │               │<──────────────│               │
     │               │               │ 8. Webhook    │               │
     │               │               │ Response      │               │
     │               │               │               │               │
     │               │<──────────────│               │               │
     │               │ 9. API        │               │               │
     │               │ Response      │               │               │
     │               │               │               │               │
     │<──────────────│               │               │               │
     │ 10. Success   │               │               │               │
     │ Confirmation  │               │               │               │
     │               │               │               │               │
```

### Importing Starter Workflows

1. Open n8n at http://localhost:5678
2. Go to **Workflows** → **Import from file**
3. Select a workflow from `infrastructure/n8n/workflows/`
4. Configure any required credentials
5. Activate the workflow

For detailed n8n documentation, see [infrastructure/n8n/README.md](./infrastructure/n8n/README.md).

---

## Available Scripts

### Root Commands

```bash
pnpm dev          # Start all apps in development mode
pnpm build        # Build all apps
pnpm lint         # Lint all apps
pnpm test         # Run tests
pnpm clean        # Clean all build artifacts
```

### Database Commands

```bash
pnpm --filter @medbook/db db:migrate   # Run migrations
pnpm --filter @medbook/db db:generate  # Generate Prisma client
pnpm --filter @medbook/db db:seed      # Seed the database
pnpm --filter @medbook/db db:studio    # Open Prisma Studio
```

### Docker Commands

```bash
docker compose up -d n8n      # Start n8n
docker compose down           # Stop all services
docker compose logs -f n8n    # View n8n logs
docker compose ps             # Check service status
```

---

## Project Structure

```
medbook/
├── apps/
│   ├── api/                 # Express.js backend
│   │   ├── src/
│   │   │   ├── controllers/ # Route handlers
│   │   │   ├── services/    # Business logic
│   │   │   ├── middleware/  # Express middleware
│   │   │   ├── routes/      # API routes
│   │   │   └── utils/       # Utilities (including n8n helper)
│   │   └── ...
│   └── web/                 # Next.js frontend
│       ├── app/             # App router pages
│       ├── components/      # React components
│       └── ...
├── packages/
│   ├── db/                  # Prisma schema and client
│   ├── types/               # Shared TypeScript types
│   └── ui/                  # Shared UI components
├── infrastructure/
│   └── n8n/                 # n8n configuration
│       ├── README.md        # n8n documentation
│       ├── env.template     # Environment template
│       └── workflows/       # Starter workflows
├── docker-compose.yml       # Docker services (n8n)
└── ...
```

---

## Environment Variables

### API (.env)

| Variable               | Description                     |
| ---------------------- | ------------------------------- |
| `PORT`                 | API server port (default: 4000) |
| `DATABASE_URL`         | PostgreSQL connection string    |
| `JWT_SECRET`           | Secret for JWT tokens           |
| `RESEND_API_KEY`       | Resend API key for emails       |
| `N8N_WEBHOOK_BASE_URL` | n8n webhook base URL            |

### n8n (.env at root)

| Variable             | Description                    |
| -------------------- | ------------------------------ |
| `N8N_PORT`           | n8n port (default: 5678)       |
| `WEBHOOK_URL`        | n8n webhook base URL           |
| `N8N_ENCRYPTION_KEY` | Encryption key for credentials |

See [infrastructure/n8n/env.template](./infrastructure/n8n/env.template) for all n8n options.

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `pnpm test`
4. Create a pull request

---

## License

MIT
