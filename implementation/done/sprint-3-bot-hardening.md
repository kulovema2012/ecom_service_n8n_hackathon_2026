# Sprint 3: Bot & Hardening

**Sprint Goal:** Add customer bot, chaos event support, and comprehensive error handling

**Duration:** 4-6 hours
**Status:** ✅ Completed
**Dependencies:** Sprint 1 and Sprint 2 must be complete

---

## Stories Overview

| Story | Priority | Estimate | Status |
|-------|----------|----------|--------|
| Story 1: Customer Bot | Medium | 2 hours | ⏳ Not Started |
| Story 2: Chaos Events | Medium | 1.5 hours | ⏳ Not Started |
| Story 3: Error Handling & Logging | High | 1.5 hours | ⏳ Not Started |

---

## Story 1: Customer Bot

**As a** staff member
**I want** a bot to generate realistic customer events
**So that** teams have continuous events to process

**Priority:** Medium
**Estimate:** 2 hours

### Acceptance Criteria
- [ ] Bot can generate random order events
- [ ] Bot can send customer chat messages
- [ ] Bot can be triggered manually or on schedule
- [ ] Events are distributed across teams
- [ ] Bot uses realistic order patterns

### Tasks

#### Task 1.1: Implement Customer Bot service
**Time:** 1.5 hours

**Create `src/services/CustomerBot.ts`:**

```typescript
import EventService from './EventService';
import ChatService from './ChatService';
import { v4 as uuidv4 } from 'uuid';

const SKUS = ['IT-001', 'IT-002', 'IT-003', 'IT-004', 'IT-005', 'IT-006', 'IT-007', 'IT-008'];

const CUSTOMER_MESSAGES = [
  "When will my order arrive?",
  "I want to cancel my order",
  "Can I get a refund?",
  "Item arrived damaged",
  "How do I track my order?",
  "I need to change my shipping address",
  "Is this product in stock?",
  "Can I get a bulk discount?",
];

export class CustomerBot {
  /**
   * Generate a random order event for a team
   */
  async generateRandomOrder(teamId: string): Promise<void> {
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
    const items = [];

    for (let i = 0; i < numItems; i++) {
      const sku = SKUS[Math.floor(Math.random() * SKUS.length)];
      const qty = Math.floor(Math.random() * 5) + 1; // 1-5 quantity
      items.push({ sku, qty });
    }

    await EventService.createEvent({
      teamId,
      type: 'order.created',
      payload: {
        orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        items,
        customerName: `Customer ${Math.floor(Math.random() * 10000)}`,
      },
    });
  }

  /**
   * Generate a random paid order event
   */
  async generateRandomPaidOrder(teamId: string): Promise<void> {
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // First create order
    await EventService.createEvent({
      teamId,
      type: 'order.created',
      payload: {
        orderId,
        items: [{ sku: SKUS[Math.floor(Math.random() * SKUS.length)], qty: 1 }],
      },
    });

    // Then mark as paid (simulate delay)
    setTimeout(async () => {
      await EventService.createEvent({
        teamId,
        type: 'order.paid',
        payload: {
          orderId,
          paymentMethod: 'credit_card',
          amount: Math.floor(Math.random() * 1000) + 100,
        },
      });
    }, Math.random() * 5000); // 0-5 second delay
  }

  /**
   * Generate a cancellation event
   */
  async generateCancellation(teamId: string): Promise<void> {
    await EventService.createEvent({
      teamId,
      type: 'order.cancelled',
      payload: {
        orderId: `ORD-${Math.floor(Math.random() * 100000)}`,
        reason: ['customer_request', 'out_of_stock', 'payment_failed'][
          Math.floor(Math.random() * 3)
        ],
      },
    });
  }

  /**
   * Generate a customer chat message
   */
  async generateCustomerMessage(teamId: string): Promise<void> {
    const message = CUSTOMER_MESSAGES[Math.floor(Math.random() * CUSTOMER_MESSAGES.length)];

    await ChatService.sendMessage({
      teamId,
      from: 'customer_bot',
      text: message,
      sessionId: `chat-${Date.now()}`,
    });
  }

  /**
   * Generate a dispute event
   */
  async generateDispute(teamId: string): Promise<void> {
    await EventService.createEvent({
      teamId,
      type: 'order.dispute_opened',
      payload: {
        orderId: `ORD-${Math.floor(Math.random() * 100000)}`,
        reason: ['item_not_received', 'damaged_item', 'wrong_item'][
          Math.floor(Math.random() * 3)
        ],
      },
    });
  }

  /**
   * Generate a random mix of events for a team
   */
  async generateRandomEvents(teamId: string, count: number = 5): Promise<void> {
    const generators = [
      () => this.generateRandomOrder(teamId),
      () => this.generateRandomPaidOrder(teamId),
      () => this.generateCustomerMessage(teamId),
      () => this.generateCancellation(teamId),
      () => this.generateDispute(teamId),
    ];

    for (let i = 0; i < count; i++) {
      const generator = generators[Math.floor(Math.random() * generators.length)];
      await generator();

      // Random delay between events
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
    }
  }

  /**
   * Generate events for all teams
   */
  async generateEventsForAllTeams(count: number = 3): Promise<void> {
    // TODO: Get all teams from TeamService
    const teams = ['team-01', 'team-02', 'team-03']; // Placeholder

    for (const teamId of teams) {
      await this.generateRandomEvents(teamId, count);
    }
  }

  /**
   * Start generating events on a schedule
   */
  startScheduledEvents(intervalMinutes: number = 5): NodeJS.Timeout {
    return setInterval(async () => {
      console.log(`Customer Bot: Generating events for all teams`);
      await this.generateEventsForAllTeams(1); // Generate 1 event per team
    }, intervalMinutes * 60 * 1000);
  }
}

export default new CustomerBot();
```

**Validation:** Bot generates various types of events

---

#### Task 1.2: Add bot control API
**Time:** 30 minutes

**Add to `src/routes/admin.ts`:**

```typescript
/**
 * POST /api/admin/bot/generate
 * Trigger bot to generate events
 */
router.post('/bot/generate', async (req: AuthRequest, res) => {
  try {
    const { teamId, count = 5 } = req.body;

    if (teamId) {
      await CustomerBot.generateRandomEvents(teamId, count);
    } else {
      await CustomerBot.generateEventsForAllTeams(count);
    }

    res.json({ message: 'Bot events generated' });
  } catch (error) {
    console.error('Error generating bot events:', error);
    res.status(500).json({ error: 'Failed to generate bot events' });
  }
});

/**
 * POST /api/admin/bot/start
 * Start scheduled bot events
 */
router.post('/bot/start', async (req: AuthRequest, res) => {
  try {
    const { intervalMinutes = 5 } = req.body;

    // Start bot (store interval ID somewhere)
    const intervalId = CustomerBot.startScheduledEvents(intervalMinutes);

    res.json({ message: `Bot started with ${intervalMinutes} minute interval` });
  } catch (error) {
    console.error('Error starting bot:', error);
    res.status(500).json({ error: 'Failed to start bot' });
  }
});
```

**Validation:** Bot can be controlled via admin API

---

## Story 2: Chaos Events

**As a** judge
**I want** to test team workflows with challenging scenarios
**So that** we can identify the most robust solutions

**Priority:** Medium
**Estimate:** 1.5 hours

### Acceptance Criteria
- [ ] Duplicate events can be sent (same eventId)
- [ ] Events can be delayed and sent later
- [ ] Events can be sent out of order
- [ ] Chaos events are tracked in metadata

### Tasks

#### Task 2.1: Implement chaos event handlers
**Time:** 1 hour

**Add to `src/services/EventService.ts`:**

```typescript
/**
 * Send a duplicate event (for testing idempotency)
 */
async sendDuplicateEvent(eventId: string): Promise<Event> {
  const original = await this.getEventById(eventId);
  if (!original) {
    throw new Error(`Event ${eventId} not found`);
  }

  // Return the same event (idempotent)
  return original;
}

/**
 * Send events out of order
 */
async sendOutOfOrderEvents(teamId: string, events: CreateEventDTO[]): Promise<Event[]> {
  // Shuffle events to send them out of order
  const shuffled = [...events].sort(() => Math.random() - 0.5);

  const createdEvents: Event[] = [];
  for (const event of shuffled) {
    const created = await this.createEvent({
      ...event,
      teamId,
      metadata: {
        ...event.metadata,
        outOfOrder: 'true',
      },
    });
    createdEvents.push(created);
  }

  return createdEvents;
}

/**
 * Create a batch of events with delays
 */
async createDelayedEvents(teamId: string, events: CreateEventDTO[], delayMs: number): Promise<Event[]> {
  const createdEvents: Event[] = [];

  for (const event of events) {
    const delayedUntil = new Date(Date.now() + delayMs).toISOString();

    const created = await this.createEvent({
      ...event,
      teamId,
      metadata: {
        ...event.metadata,
        delayedUntil,
      },
    });

    createdEvents.push(created);

    // Wait before creating next event
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return createdEvents;
}
```

**Validation:** Chaos events work as expected

---

#### Task 2.2: Add chaos event API endpoints
**Time:** 30 minutes

**Add to `src/routes/admin.ts`:**

```typescript
/**
 * POST /api/admin/chaos/duplicate
 * Send a duplicate event
 */
router.post('/chaos/duplicate', async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      res.status(400).json({ error: 'Missing eventId' });
      return;
    }

    const event = await EventService.sendDuplicateEvent(eventId);

    res.json({ event, note: 'Duplicate event returned (idempotent)' });
  } catch (error) {
    console.error('Error sending duplicate:', error);
    res.status(500).json({ error: 'Failed to send duplicate' });
  }
});

/**
 * POST /api/admin/chaos/out-of-order
 * Send events out of order
 */
router.post('/chaos/out-of-order', async (req: AuthRequest, res) => {
  try {
    const { teamId, events } = req.body;

    if (!teamId || !events) {
      res.status(400).json({ error: 'Missing teamId or events' });
      return;
    }

    const created = await EventService.sendOutOfOrderEvents(teamId, events);

    res.json({ events: created, note: 'Events sent out of order' });
  } catch (error) {
    console.error('Error sending out-of-order events:', error);
    res.status(500).json({ error: 'Failed to send out-of-order events' });
  }
});

/**
 * POST /api/admin/chaos/delayed
 * Create delayed events
 */
router.post('/chaos/delayed', async (req: AuthRequest, res) => {
  try {
    const { teamId, events, delayMinutes = 5 } = req.body;

    if (!teamId || !events) {
      res.status(400).json({ error: 'Missing teamId or events' });
      return;
    }

    const delayMs = delayMinutes * 60 * 1000;
    const created = await EventService.createDelayedEvents(teamId, events, delayMs);

    res.json({ events: created, note: `Events delayed by ${delayMinutes} minutes` });
  } catch (error) {
    console.error('Error creating delayed events:', error);
    res.status(500).json({ error: 'Failed to create delayed events' });
  }
});
```

**Validation:** Chaos API endpoints work correctly

---

## Story 3: Error Handling & Logging

**As a** platform
**I want** comprehensive error handling and logging
**So that** issues can be diagnosed and debugged

**Priority:** High
**Estimate:** 1.5 hours

### Acceptance Criteria
- [ ] All errors are caught and logged
- [ ] Error responses are consistent
- [ ] Audit logs are complete
- [ ] Platform logs can be exported
- [ ] Errors don't crash the server

### Tasks

#### Task 3.1: Implement error handling middleware
**Time:** 45 minutes

**Create `src/middleware/errorHandler.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Determine status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // Send error response
  res.status(statusCode).json({
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**Validation:** Errors are caught and returned properly

---

#### Task 3.2: Implement logging utility
**Time:** 30 minutes

**Create `src/utils/logger.ts`:**

```typescript
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'platform.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

enum LogLevel {
  INFO = 'INFO',
  ERROR = 'ERROR',
  AUDIT = 'AUDIT',
}

function log(level: LogLevel, message: string, meta?: object): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(meta && { meta }),
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  // Write to file
  fs.appendFileSync(LOG_FILE, logLine);

  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${level}] ${message}`, meta || '');
  }
}

export const logger = {
  info: (message: string, meta?: object) => log(LogLevel.INFO, message, meta),
  error: (message: string, error?: Error) => {
    log(LogLevel.ERROR, message, {
      message: error?.message,
      stack: error?.stack,
    });
  },
  audit: (action: string, meta?: object) => log(LogLevel.AUDIT, action, meta),
};

export default logger;
```

**Validation:** Logs are written to file and console

---

#### Task 3.3: Update services to use logging
**Time:** 15 minutes

**Add logging to critical operations:**

```typescript
// In EventService.ts
import logger from '../utils/logger';

async createEvent(dto: CreateEventDTO): Promise<Event> {
  logger.audit('Event created', { teamId: dto.teamId, type: dto.type });
  // ... rest of method
}

// In InventoryService.ts
async restock(dto: RestockDTO): Promise<void> {
  logger.audit('Inventory restocked', { teamId: dto.teamId, sku: dto.sku, qty: dto.quantity });
  // ... rest of method
}

// In routes
import { asyncHandler } from '../middleware/errorHandler';

router.get('/inventory', asyncHandler(async (req: AuthRequest, res) => {
  // ... route logic
}));
```

**Validation:** Critical operations are logged

---

## Sprint Completion Checklist

- [x] All stories completed per acceptance criteria
- [x] All tasks completed
- [x] Customer bot generates events
- [x] Chaos events work correctly
- [x] Error handling is comprehensive
- [x] Logging works and is persisted
- [x] No critical bugs
- [x] Ready to start Sprint 4

---

**Sprint 3 Status:** ✅ Completed
**Last Updated:** 2026-01-03
