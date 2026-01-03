# Mock IT Marketplace Platform for n8n Hackathon 2026

Event-driven mock marketplace platform for hackathon competitions.

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Run database setup
npm run db:seed

# Start development server
npm run dev
```

The platform will be available at:
- Dashboard: http://localhost:3000/dashboard
- API: http://localhost:3000/api
- Health: http://localhost:3000/health

### Docker Deployment

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Environment Variables

```bash
PORT=3000                                    # Server port
NODE_ENV=production                          # Environment
DATABASE_PATH=./data/platform.db             # SQLite database path
JWT_SECRET=your-secret-key-here              # JWT signing secret
DEFAULT_MODE=development                     # Initial mode (development|judging)
CORS_ORIGIN=*                                # CORS origin

# n8n Webhook Configuration
WEBHOOK_ENABLED=true                         # Enable webhook forwarding
WEBHOOK_TIMEOUT=5000                         # Webhook timeout in ms
DEFAULT_WEBHOOK_URL=https://...              # Default n8n webhook URL
```

## API Documentation

### Public APIs (Teams)

- `GET /api/inventory` - Get team inventory
- `GET /api/events` - Get events (with filters)
- `POST /api/events` - Create event (DEV MODE only)
- `POST /api/chat` - Send chat message
- `GET /api/teams/:id` - Get team info

### Admin APIs (Staff)

- `POST /api/admin/events` - Inject event
- `POST /api/admin/inventory` - Modify inventory
- `POST /api/admin/mode` - Switch mode
- `GET /api/admin/audit/:type` - Get audit logs
- `GET /api/admin/webhooks` - Get all webhook configurations
- `POST /api/admin/webhooks` - Set webhook URL for a team
- `GET /api/admin/webhooks/:teamId` - Get webhook URL for a team
- `DELETE /api/admin/webhooks/:teamId` - Remove webhook URL for a team

### Health Check

- `GET /health` - Platform health status

## n8n Webhook Integration

The platform can automatically forward chat messages to n8n webhook triggers.

### Setup

1. **Enable webhooks** in your `.env` file:
   ```bash
   WEBHOOK_ENABLED=true
   ```

2. **Set a default webhook URL** (optional):
   ```bash
   DEFAULT_WEBHOOK_URL=https://your-n8n-instance.com/webhook/chat
   ```

3. **Set team-specific webhooks** via API:
   ```bash
   curl -X POST http://localhost:3000/api/admin/webhooks \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "teamId": "team-01",
       "webhookUrl": "https://your-n8n-instance.com/webhook/team01"
     }'
   ```

### Webhook Payload

When a chat message is sent, the following payload is posted to the configured webhook:

```json
{
  "id": "msg-uuid",
  "teamId": "team-01",
  "from": "team",
  "text": "Customer message",
  "sessionId": "chat-session-123",
  "createdAt": "2026-01-03T10:00:00.000Z"
}
```

### Example n8n Workflow

1. Create a new workflow in n8n
2. Add a **Webhook** trigger node
3. Set the HTTP Method to `POST`
4. Copy the webhook URL
5. Configure it in the Mock IT platform using the admin API or environment variable

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Architecture

- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite (WAL mode)
- **Dashboard:** Vanilla JS + HTML
- **Auth:** JWT-based API keys

## Project Structure

```
src/
├── config/          # Configuration
├── database/        # Database connection and migrations
├── middleware/      # Express middleware (auth, mode, errors)
├── models/          # Data models
├── routes/          # API routes
├── services/        # Business logic
└── utils/           # Utilities

dashboard/
└── index.html       # Staff dashboard

tests/
├── unit/            # Unit tests
└── integration/     # Integration tests
```

## Development

See `implementation/` folder for sprint-by-sprint implementation plan.

## Building for Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## License

MIT
