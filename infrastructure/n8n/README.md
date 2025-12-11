# n8n Workflow Automation for MedBook

This directory contains configuration and starter workflows for n8n, a workflow automation tool used by MedBook for handling background tasks like email notifications, reminders, and integrations.

## Prerequisites

- Docker and Docker Compose installed on your system
- For macOS: Docker Desktop recommended

## Quick Start

### Starting n8n

From the **root of the monorepo**, run:

```bash
# Start n8n in the background
docker compose up -d n8n

# Or start with logs visible
docker compose up n8n
```

n8n will be available at: **http://localhost:5678**

### Stopping n8n

```bash
# Stop n8n
docker compose down

# Stop and remove volumes (⚠️ this deletes all workflows)
docker compose down -v
```

### Viewing Logs

```bash
# View live logs
docker compose logs -f n8n

# View last 100 lines
docker compose logs --tail 100 n8n
```

### Health Check

```bash
# Check if n8n is running
docker compose ps

# Or check health endpoint directly
curl http://localhost:5678/healthz
```

## Configuration

### Environment Variables

Copy the `.env.example` file to `.env` in the root directory:

```bash
cp infrastructure/n8n/.env.example .env
```

Available variables:

| Variable                  | Default                 | Description                                             |
| ------------------------- | ----------------------- | ------------------------------------------------------- |
| `N8N_PORT`                | `5678`                  | Port n8n runs on                                        |
| `WEBHOOK_URL`             | `http://localhost:5678` | Base URL for webhook callbacks                          |
| `N8N_ENCRYPTION_KEY`      | (empty)                 | Encryption key for credentials (required in production) |
| `N8N_BASIC_AUTH_ACTIVE`   | `false`                 | Enable basic auth (recommended for production)          |
| `N8N_BASIC_AUTH_USER`     | (empty)                 | Basic auth username                                     |
| `N8N_BASIC_AUTH_PASSWORD` | (empty)                 | Basic auth password                                     |
| `GENERIC_TIMEZONE`        | `UTC`                   | Timezone for scheduled workflows                        |

### Generating an Encryption Key

For production, generate a secure encryption key:

```bash
openssl rand -hex 32
```

## Starter Workflows

### Appointment Created Webhook

Located at: `workflows/appointment-created.json`

This workflow handles appointment creation events:

1. **Webhook Trigger**: Receives POST requests at `/webhook/appointment-created`
2. **Data Processing**: Extracts appointment details
3. **Email Notification**: Sends confirmation email to the patient

To import this workflow:

1. Open n8n at http://localhost:5678
2. Go to **Workflows** → **Import from file**
3. Select `infrastructure/n8n/workflows/appointment-created.json`
4. Activate the workflow

### Webhook URL

Once the workflow is active, the webhook URL will be:

```
http://localhost:5678/webhook/appointment-created
```

The backend calls this URL when an appointment is created.

## Creating Custom Workflows

### Best Practices

1. **Naming**: Use descriptive names like `appointment-created`, `reminder-24h`
2. **Error Handling**: Always add error handling nodes
3. **Logging**: Use the "Set" node to log important data
4. **Testing**: Use the "Webhook Test" mode before activating

### Common Trigger Types

- **Webhook**: For real-time events from the backend
- **Schedule**: For recurring tasks (reminders, cleanup)
- **Manual**: For one-off administrative tasks

## Troubleshooting

### n8n won't start

```bash
# Check Docker is running
docker ps

# Check for port conflicts
lsof -i :5678

# Reset n8n data
docker compose down -v
docker compose up -d n8n
```

### Webhooks not receiving data

1. Ensure the workflow is **activated** (toggle in n8n UI)
2. Check the webhook URL matches what the backend sends to
3. Verify n8n container is healthy: `docker compose ps`
4. Check logs for errors: `docker compose logs n8n`

### Data not persisting

- Ensure the Docker volume is properly mounted
- Don't use `docker compose down -v` unless you want to reset

## Production Deployment

For production deployments:

1. **Enable authentication**: Set `N8N_BASIC_AUTH_ACTIVE=true`
2. **Set encryption key**: Generate and set `N8N_ENCRYPTION_KEY`
3. **Use HTTPS**: Set `N8N_PROTOCOL=https` and configure SSL
4. **External database**: Consider using PostgreSQL for reliability
5. **Backup workflows**: Export and version control important workflows

## Integration with MedBook Backend

The backend uses the `triggerN8nWebhook()` helper function to call n8n webhooks:

```typescript
import { triggerN8nWebhook } from "../utils/n8n";

// After creating an appointment
await triggerN8nWebhook("appointment-created", {
  appointmentId: appointment.id,
  patientEmail: appointment.patientEmail,
  doctorName: doctor.name,
  startTime: appointment.startTime,
});
```

See `apps/api/src/utils/n8n.ts` for the full implementation.
