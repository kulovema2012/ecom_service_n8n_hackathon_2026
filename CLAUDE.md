# Mock IT Marketplace Platform - Architecture & Design Document

## 1. System Overview

This document describes the architecture and design for the **Mock IT Marketplace Platform**, an event-driven system designed for the n8n Hackathon 2026 final round.

### 1.1 Core Philosophy

**Events are the only mechanism by which reality changes.**

All state mutations occur through immutable events. Teams consume these events via read-only APIs and respond through controlled channels (chat messages).

### 1.2 Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| API Server | Node.js + Express + TypeScript | Fast development, excellent async handling, n8n compatibility |
| Database | SQLite (with WAL mode) | Zero-config, ACID compliant, perfect for hackathon scale |
| Event Store | SQLite (dedicated table) | Immutable log, queryable, supports replay |
| Frontend Dashboard | Vanilla JS + HTML | No build step, works everywhere, easy to modify |
| Authentication | JWT-based API keys | Simple, stateless, scope-based permissions |
| Deployment | Docker | Containerized, reproducible, easy deployment |

### 1.3 Implementation Workflow

**Sprint-Based Development with Organized Archival**

This project uses Scrum methodology with sprint files. When a sprint is completed:

1. **Complete the Sprint**
   - Finish all user stories and tasks
   - Verify all acceptance criteria are met
   - Ensure code is tested and working

2. **Move to Done Folder**
   - Move the completed sprint file from `implementation/` to `implementation/done/`
   - Example: `implementation/sprint-0-foundation.md` → `implementation/done/sprint-0-foundation.md`
   - This keeps active sprints separate from completed work

3. **Update Progress**
   - Mark sprint as complete in `implementation/SPRINT_ROADMAP.md`
   - Update todo list with completed tasks

**File Organization:**
```
implementation/
├── SPRINT_ROADMAP.md          # Master tracking document
├── sprint-0-foundation.md     # Active sprints
├── sprint-1-core-services.md
├── sprint-2-dashboard-apis.md
└── done/                      # Completed sprints
    ├── sprint-0-foundation.md
    ├── sprint-1-core-services.md
    └── ...
```

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     STAFF DASHBOARD                             │
│              (Static HTML + Vanilla JS)                         │
│  - Inventory Monitor & Control                                  │
│  - Event Sender (inject/replay/delay)                           │
│  - Messaging Center                                             │
│  - Mode Toggle (Dev/Judging)                                    │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTPS (Admin JWT)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                 │
│                   (Express + TypeScript)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Authentication Middleware (JWT + Scope Validation)      │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬──────────────────────────────────────┬─────────────┘
             │                                      │
             ▼                                      ▼
┌──────────────────────────┐          ┌──────────────────────────┐
│   PUBLIC API (TEAMS)     │          │   ADMIN API (STAFF)      │
│  ┌────────────────────┐  │          │  ┌────────────────────┐  │
│  │ GET /inventory     │  │          │  │ POST /events       │  │
│  │ GET /events        │  │          │  │ POST /inventory    │  │
│  │ POST /chat         │  │          │  │ POST /mode         │  │
│  │ GET /teams/:id     │  │          │  │ GET /audit/*       │  │
│  └────────────────────┘  │          │  └────────────────────┘  │
└──────────────────────────┘          └──────────────────────────┘
             │                                      │
             └──────────────┬───────────────────────┘
                            ▼
        ┌───────────────────────────────────────────┐
        │            SERVICE LAYER                   │
        │  ┌──────────────┐  ┌──────────────────┐   │
        │  │ Event Service│  │Inventory Service │   │
        │  │              │  │                  │   │
        │  │ - validate   │  │ - reserve        │   │
        │  │ - dedupe     │  │ - release        │   │
        │  │ - enqueue    │  │ - restock        │   │
        │  └──────────────┘  └──────────────────┘   │
        │  ┌──────────────┐  ┌──────────────────┐   │
        │  │Chat Service  │  │ Team Service     │   │
        │  │              │  │                  │   │
        │  │ - send       │  │ - register       │   │
        │  │ - history    │  │ - scope check    │   │
        │  └──────────────┘  └──────────────────┘   │
        └───────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │              DATA LAYER                    │
        │  ┌─────────────────────────────────────┐  │
        │  │         SQLite Database              │  │
        │  │  ┌─────────────────────────────────┐ │  │
        │  │  │ events (immutable log)           │ │  │
        │  │  │ inventory (current state)        │ │  │
        │  │  │ inventory_events (audit log)     │ │  │
        │  │  │ messages (chat)                  │ │  │
        │  │  │ teams (metadata)                 │ │  │
        │  │  │ skus (product catalog)           │ │  │
        │  │  └─────────────────────────────────┘ │  │
        │  └─────────────────────────────────────┘  │
        └───────────────────────────────────────────┘
                            ▲
                            │
        ┌───────────────────┴───────────────────┐
        │            CUSTOMER BOT                │
        │     (System-controlled event gen)      │
        │  - Generates order events             │
        │  - Sends chat messages                │
        │  - Runs on schedule (staff-triggered) │
        └───────────────────────────────────────┘
```

---

## 3. Data Models

### 3.1 Event (Immutable Log)

```typescript
interface Event {
  eventId: string;        // UUID, globally unique
  teamId: string;         // team-01, team-02, etc.
  type: EventType;
  payload: unknown;
  createdAt: string;      // ISO-8601
  processedAt?: string;   // ISO-8601, nullable
  metadata?: {
    correlationId?: string;
    causationId?: string;
    replayOf?: string;    // If this is a replay
    delayedUntil?: string;
  };
}

type EventType =
  // Order events
  | "order.created"
  | "order.paid"
  | "order.cancelled"
  | "order.refund_requested"
  | "order.dispute_opened"
  // Inventory events
  | "inventory.restocked"
  | "inventory.shortage_detected"
  | "inventory.manual_adjusted"
  // Chaos events
  | "event.duplicate_sent"
  | "event.delayed"
  | "event.out_of_order";
```

### 3.2 Inventory (Current State)

```typescript
interface Inventory {
  teamId: string;
  sku: string;
  stock: number;          // Must never be negative
  reserved: number;       // reserved <= stock
  available: number;      // stock - reserved (computed)
  version: number;        // For optimistic concurrency
  updatedAt: string;      // ISO-8601
}
```

### 3.3 Inventory Event (Audit Log)

```typescript
interface InventoryEvent {
  eventId: string;
  teamId: string;
  sku: string;
  type: "restocked" | "reserved" | "released" | "adjusted";
  quantity: number;
  previousStock: number;
  newStock: number;
  by: "staff" | "system" | "customer_bot";
  createdAt: string;
}
```

### 3.4 Chat Message

```typescript
interface Message {
  id: string;
  teamId: string;
  from: "staff" | "customer_bot" | "team";
  text: string;
  sessionId?: string;     // Groups related messages
  createdAt: string;
}
```

### 3.5 Team

```typescript
interface Team {
  teamId: string;
  name: string;
  apiKey: string;         // Scoped JWT
  mode: "development" | "judging";
  createdAt: string;
}
```

### 3.6 SKU (Product Catalog)

```typescript
interface SKU {
  sku: string;
  name: string;
  category: "Storage" | "Memory" | "Accessories" | "Networking" | "Security" | "Compute" | "Software";
  initialStock: number;   // Starting stock for each team
}
```

---

## 4. API Specification

### 4.1 Authentication

All API requests require a JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Token scopes:
- `read:inventory` - Read inventory state
- `read:events` - Read event stream
- `write:chat` - Send chat messages
- `write:events` - Send events (DEV MODE ONLY)
- `write:inventory` - Modify inventory (STAFF ONLY)
- `admin:all` - Full admin access (STAFF ONLY)

### 4.2 Public API (Teams)

#### GET /api/inventory
Get current inventory state for a team.

**Response:**
```json
{
  "teamId": "team-01",
  "inventory": [
    {
      "sku": "IT-001",
      "name": "NVMe SSD 1TB",
      "stock": 20,
      "reserved": 5,
      "available": 15
    }
  ]
}
```

#### GET /api/events
Retrieve events for a team. Supports filtering and pagination.

**Query Parameters:**
- `type` (optional) - Filter by event type
- `since` (optional) - ISO-8601 timestamp, get events after this time
- `limit` (optional) - Default 100, max 1000

**Response:**
```json
{
  "events": [
    {
      "eventId": "evt-123",
      "teamId": "team-01",
      "type": "order.created",
      "payload": { ... },
      "createdAt": "2026-01-03T10:00:00Z"
    }
  ],
  "pagination": {
    "hasMore": false,
    "nextSince": "2026-01-03T11:00:00Z"
  }
}
```

#### POST /api/chat
Send a chat message.

**Request:**
```json
{
  "text": "Thank you for your order!",
  "sessionId": "chat-001"
}
```

**Response:** `204 No Content`

#### GET /api/teams/:id
Get team information.

**Response:**
```json
{
  "teamId": "team-01",
  "name": "Team Alpha",
  "mode": "judging"
}
```

### 4.3 Admin API (Staff)

#### POST /api/admin/events
Inject or replay an event.

**Request:**
```json
{
  "teamId": "team-01",
  "type": "order.created",
  "payload": {
    "orderId": "ORD-9001",
    "items": [
      { "sku": "IT-001", "qty": 2 }
    ]
  },
  "options": {
    "delayUntil": "2026-01-03T12:00:00Z",
    "replayOf": "evt-123"
  }
}
```

#### POST /api/admin/inventory
Modify inventory (restock or adjust).

**Request:**
```json
{
  "teamId": "team-01",
  "sku": "IT-001",
  "quantity": 10,
  "type": "restock"
}
```

#### POST /api/admin/mode
Switch between development and judging mode.

**Request:**
```json
{
  "mode": "judging"
}
```

#### GET /api/admin/audit/:type
Get audit logs.

**Parameters:**
- `type` - One of: events, inventory, messages, errors

---

## 5. Event Flow & Processing

### 5.1 Event Processing Pipeline

```
[Staff/Customer Bot]
       │
       ▼
[API Validation]
   - Event schema validation
   - Team exists
   - Idempotency check (eventId)
       │
       ▼
[Event Store]
   - Append to immutable log
   - Transaction commit
       │
       ▼
[Event Processor]
   - Update inventory state
   - Send notifications
   - Trigger side effects
       │
       ▼
[Team Notification]
   - Event visible in GET /events
   - Polling picks up change
```

### 5.2 Idempotency Handling

Every event has a unique `eventId`. Before processing:

1. Check if event with same `eventId` exists
2. If yes: Return existing event (idempotent)
3. If no: Process and store new event

Teams must handle duplicate events gracefully.

### 5.3 Chaos Modes

#### Duplicate Events
Staff can intentionally send an event with the same `eventId` to test deduplication.

#### Delayed Events
Events with `delayUntil` metadata are queued until the specified time.

#### Out-of-Order Events
Events can be sent with older timestamps to test ordering logic.

---

## 6. Staff Dashboard Design

### 6.1 Technical Implementation

- **Static HTML** file served from `/dashboard.html`
- **Vanilla JavaScript** with fetch API
- **Polling every 2-5 seconds** for updates
- **Admin JWT** stored in localStorage

### 6.2 Dashboard Sections

#### A. Header
- Platform status (online/offline)
- Current mode (Development/Judging)
- Current time

#### B. Inventory Monitor
- Table showing all teams × all SKUs
- Color coding: Green (OK), Yellow (Low), Red (Out of stock)
- Filter by team or SKU
- Real-time updates via polling

#### C. Inventory Control
- Form to restock SKU for team
- Manual adjustment form (+/- quantity)
- Reason field (for audit)

#### D. Event Sender
- Team selector
- Event type selector (dropdown)
- Payload editor (JSON textarea)
- Options: Delay until, Replay of
- Send button

#### E. Message Center
- Send message to one team or broadcast
- View recent message history
- Simulate customer message button

#### F. Audit Logs
- Tabbed view: Events, Inventory, Messages, Errors
- Export to JSON button
- Real-time tail

### 6.3 Mockup Structure

```html
<html>
<head>
  <title>Mock IT Marketplace - Staff Dashboard</title>
  <style>
    /* Simple, clean CSS */
    .status-badge { ... }
    .inventory-table { ... }
    .event-form { ... }
  </style>
</head>
<body>
  <header>Platform Controls</header>
  <main>
    <section id="inventory">...</section>
    <section id="event-sender">...</section>
    <section id="messages">...</section>
    <section id="audit">...</section>
  </main>
  <script>
    // Polling logic, form handlers, updates
  </script>
</body>
</html>
```

---

## 7. Security & Permissions

### 7.1 Mode Enforcement

#### Development Mode
Teams can:
- ✅ Read inventory & events
- ✅ Send chat messages
- ✅ Send test events (sandbox)

#### Judging Mode
Teams can:
- ✅ Read inventory & events
- ✅ Send chat messages
- ❌ Send events (write API disabled)

Enforcement:
1. JWT scope validation (`write:events` scope not issued)
2. API returns 403 Forbidden if attempted
3. Server-side checks (not UI-only)

### 7.2 API Key Generation

```typescript
// Development API Key (Team)
{
  scopes: ["read:inventory", "read:events", "write:chat", "write:events"],
  teamId: "team-01"
}

// Judging API Key (Team)
{
  scopes: ["read:inventory", "read:events", "write:chat"],
  teamId: "team-01"
}

// Admin API Key (Staff)
{
  scopes: ["admin:all"],
  teamId: null
}
```

---

## 8. Deployment Strategy

### 8.1 Docker Configuration

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY dist/ ./dist/

# Expose port
EXPOSE 3000

# Start with SQLite in WAL mode for better concurrency
CMD node dist/index.js
```

### 8.2 Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_PATH=/data/platform.db

# JWT
JWT_SECRET=<generate-secure-random>

# Mode (default: development)
DEFAULT_MODE=development

# Admin credentials (for initial setup)
ADMIN_API_KEY=<generate-secure-jwt>
```

### 8.3 Initialization Sequence

1. Create SQLite database with WAL mode
2. Run migrations to create tables
3. Seed initial SKUs
4. Create admin API key
5. Generate team API keys
6. Start server

---

## 9. Observability

### 9.1 Required Logs

- **Event log** (immutable) - All events with timestamps
- **Inventory event log** - All inventory state changes
- **Message log** - All chat messages
- **Error log** - API errors, processing failures

### 9.2 Metrics for Judging

Judges will evaluate:
1. **Correctness** - Events handled correctly
2. **Idempotency** - Duplicates handled gracefully
3. **Ordering** - Out-of-order events handled
4. **Inventory Consistency** - Stock never negative
5. **Error Isolation** - Failures don't cascade
6. **Audit Completeness** - Full traceability

### 9.3 Health Check Endpoint

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": 3600,
  "mode": "judging"
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests
- Event validation logic
- Inventory state calculations
- Idempotency handling

### 10.2 Integration Tests
- Event processing pipeline
- API authentication & authorization
- Mode enforcement

### 10.3 Chaos Tests
- Duplicate event injection
- Delayed event delivery
- Out-of-order event sequences

---

## 11. Implementation Phases

### Phase 1: Foundation (Priority: Critical)
1. Project setup (TypeScript, Express, SQLite)
2. Database schema & migrations
3. Basic API structure
4. Authentication middleware

### Phase 2: Core Features (Priority: Critical)
5. Event system (store, retrieve, idempotency)
6. Inventory system (state management, events)
7. Public API endpoints

### Phase 3: Admin Features (Priority: High)
8. Admin API endpoints
9. Event injection/replay
10. Inventory control

### Phase 4: Dashboard (Priority: High)
11. Static HTML dashboard
12. Inventory monitor
13. Event sender interface
14. Message center

### Phase 5: Polish (Priority: Medium)
15. Chat system
16. Audit log endpoints
17. Customer bot (basic)
18. Documentation

### Phase 6: Hardening (Priority: Medium)
19. Mode enforcement
20. Chaos event support
21. Comprehensive error handling
22. Deployment (Docker)

---

## 12. Success Criteria

The platform is successful when:

1. ✅ All teams receive identical event difficulty
2. ✅ No team can manipulate state during judging
3. ✅ Judges can determine winner based on clear signals
4. ✅ Platform runs 24+ hours without manual intervention
5. ✅ All events are auditable and replayable
6. ✅ Dashboard works for entire judging session

---

## 13. File Structure

```
ecom_service_n8n_hackathon_2026/
├── CLAUDE.md                 # This file
├── package.json
├── tsconfig.json
├── docker-compose.yml
├── Dockerfile
├── README.md
├── src/
│   ├── index.ts              # Server entry point
│   ├── config/
│   │   └── database.ts       # DB connection
│   ├── database/
│   │   ├── migrations/       # SQL migrations
│   │   └── seeds/
│   │       └── skus.ts       # Initial product catalog
│   ├── models/
│   │   ├── Event.ts
│   │   ├── Inventory.ts
│   │   ├── Message.ts
│   │   └── Team.ts
│   ├── services/
│   │   ├── EventService.ts
│   │   ├── InventoryService.ts
│   │   ├── ChatService.ts
│   │   └── TeamService.ts
│   ├── middleware/
│   │   ├── auth.ts           # JWT validation
│   │   ├── mode.ts           # Development/Judging enforcement
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── public.ts         # Team APIs
│   │   ├── admin.ts          # Staff APIs
│   │   └── health.ts
│   └── utils/
│       ├── uuid.ts
│       └── validation.ts
├── dashboard/
│   └── index.html            # Staff dashboard
├── tests/
│   ├── unit/
│   └── integration/
└── data/
    └── platform.db           # SQLite database (gitignored)
```

---

## 14. Reference Resources

- **Event Sourcing**: Martin Fowler's blog on Event Sourcing
- **CQRS**: Microsoft's CQRS pattern documentation
- **n8n Documentation**: https://docs.n8n.io
- **SQLite WAL Mode**: https://www.sqlite.org/wal.html
- **JWT Best Practices**: OWASP JWT Cheat Sheet

---

**Document Version**: 1.0
**Last Updated**: 2026-01-03
**Status**: Ready for Implementation
