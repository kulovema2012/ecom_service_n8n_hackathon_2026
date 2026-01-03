# Sprint 2: Dashboard & Admin APIs

**Sprint Goal:** Build staff dashboard and complete admin API routes

**Duration:** 6-8 hours
**Status:** ⏳ Not Started
**Dependencies:** Sprint 1 must be complete

---

## Stories Overview

| Story | Priority | Estimate | Status |
|-------|----------|----------|--------|
| Story 1: Admin API Routes | High | 2.5 hours | ⏳ Not Started |
| Story 2: Chat Service | Medium | 1.5 hours | ⏳ Not Started |
| Story 3: Team Service | Medium | 1 hour | ⏳ Not Started |
| Story 4: Staff Dashboard | High | 2-3 hours | ⏳ Not Started |

---

## Story 1: Admin API Routes

**As a** staff member
**I want** admin APIs to control the platform
**So that** I can inject events, modify inventory, and manage the platform

**Priority:** High
**Estimate:** 2.5 hours

### Acceptance Criteria
- [ ] POST /api/admin/events - Inject or replay events
- [ ] POST /api/admin/inventory - Restock or adjust inventory
- [ ] POST /api/admin/messages - Send messages to teams
- [ ] POST /api/admin/mode - Switch between dev/judging mode
- [ ] GET /api/admin/audit/:type - Get audit logs
- [ ] GET /api/admin/teams - List all teams
- [ ] All routes require admin access
- [ ] POST /api/admin/teams - Create new team

### Tasks

#### Task 1.1: Create admin routes
**Time:** 2 hours

**Create `src/routes/admin.ts`:**

```typescript
import { Router } from 'express';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth';
import EventService from '../services/EventService';
import InventoryService from '../services/InventoryService';
import { EventType } from '../models/Event';

const router = Router();

// Require admin for all routes
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * POST /api/admin/events
 * Inject or replay an event
 */
router.post('/events', async (req: AuthRequest, res) => {
  try {
    const { teamId, type, payload, options } = req.body;

    // Validate request
    if (!teamId || !type || !payload) {
      res.status(400).json({ error: 'Missing required fields: teamId, type, payload' });
      return;
    }

    // Validate event type
    const validTypes: EventType[] = [
      'order.created', 'order.paid', 'order.cancelled',
      'order.refund_requested', 'order.dispute_opened',
      'inventory.restocked', 'inventory.shortage_detected',
      'inventory.manual_adjusted', 'event.duplicate_sent',
      'event.delayed', 'event.out_of_order'
    ];

    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Invalid event type: ${type}` });
      return;
    }

    // Create event
    const event = await EventService.createEvent({
      teamId,
      type,
      payload,
      metadata: options?.delayUntil ? { delayedUntil: options.delayUntil } : undefined,
    });

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * POST /api/admin/events/:eventId/replay
 * Replay an existing event
 */
router.post('/events/:eventId/replay', async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.params;
    const { delayUntil } = req.body;

    const event = await EventService.replayEvent(eventId, delayUntil);

    res.status(201).json(event);
  } catch (error) {
    console.error('Error replaying event:', error);
    res.status(500).json({ error: 'Failed to replay event' });
  }
});

/**
 * POST /api/admin/inventory
 * Restock or adjust inventory
 */
router.post('/inventory', async (req: AuthRequest, res) => {
  try {
    const { teamId, sku, quantity, type, reason } = req.body;

    // Validate request
    if (!teamId || !sku || quantity === undefined || !type) {
      res.status(400).json({ error: 'Missing required fields: teamId, sku, quantity, type' });
      return;
    }

    if (type === 'restock') {
      await InventoryService.restock({
        teamId,
        sku,
        quantity,
        by: 'staff',
      });

      res.status(204).send();
    } else if (type === 'adjust') {
      if (!reason) {
        res.status(400).json({ error: 'Reason is required for manual adjustments' });
        return;
      }

      await InventoryService.adjust(teamId, sku, quantity, reason, 'staff');

      res.status(204).send();
    } else {
      res.status(400).json({ error: `Invalid type: ${type}. Must be 'restock' or 'adjust'` });
    }
  } catch (error) {
    console.error('Error modifying inventory:', error);
    res.status(500).json({ error: 'Failed to modify inventory' });
  }
});

/**
 * GET /api/admin/teams
 * List all teams
 */
router.get('/teams', async (req: AuthRequest, res) => {
  try {
    // TODO: Implement TeamService
    const teams = [
      // { teamId: 'team-01', name: 'Team Alpha', mode: 'development' },
    ];

    res.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

/**
 * POST /api/admin/teams
 * Create a new team
 */
router.post('/teams', async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    // TODO: Implement TeamService.createTeam()
    // const team = await TeamService.createTeam(name);

    res.status(201).json({
      teamId: 'team-01', // Placeholder
      name,
      apiKey: 'api-key-placeholder', // Placeholder
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

/**
 * POST /api/admin/mode
 * Switch platform mode (development <-> judging)
 */
router.post('/mode', async (req: AuthRequest, res) => {
  try {
    const { mode } = req.body;

    if (mode !== 'development' && mode !== 'judging') {
      res.status(400).json({ error: "Mode must be 'development' or 'judging'" });
      return;
    }

    // TODO: Implement TeamService.setMode(mode)

    res.json({ mode, message: `Platform mode changed to ${mode}` });
  } catch (error) {
    console.error('Error changing mode:', error);
    res.status(500).json({ error: 'Failed to change mode' });
  }
});

/**
 * GET /api/admin/audit/:type
 * Get audit logs
 */
router.get('/audit/:type', async (req: AuthRequest, res) => {
  try {
    const { type } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    // Validate type
    const validTypes = ['events', 'inventory', 'messages', 'errors'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Invalid audit type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    // TODO: Implement audit log retrieval
    let logs = [];

    if (type === 'events') {
      logs = await EventService.getEvents('all', { limit });
    }

    res.json({ type, logs, count: logs.length });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
```

**Validation:** All admin endpoints work correctly with proper authentication

---

#### Task 1.2: Create mode enforcement middleware
**Time:** 30 minutes

**Create `src/middleware/mode.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import db from '../database/connection';

/**
 * Get current platform mode
 */
export function getPlatformMode(): 'development' | 'judging' {
  const stmt = db.prepare('SELECT mode FROM teams LIMIT 1');
  const result = stmt.get() as any;

  // Default to development if no teams exist
  return result?.mode || 'development';
}

/**
 * Middleware to block write operations in judging mode
 */
export function requireDevelopmentMode(req: Request, res: Response, next: NextFunction): void {
  const mode = getPlatformMode();

  if (mode === 'judging') {
    res.status(403).json({
      error: 'Operation not allowed in judging mode',
      mode,
      message: 'Write operations are disabled during judging'
    });
    return;
  }

  next();
}

/**
 * Middleware to check if platform is in judging mode
 */
export function requireJudgingMode(req: Request, res: Response, next: NextFunction): void {
  const mode = getPlatformMode();

  if (mode !== 'judging') {
    res.status(403).json({
      error: 'Operation requires judging mode',
      mode,
      message: 'This endpoint can only be accessed during judging'
    });
    return;
  }

  next();
}
```

**Validation:** Write operations are blocked in judging mode

---

## Story 2: Chat Service

**As a** platform
**I want** to support chat messages between staff, customers, and teams
**So that** communication is captured alongside events

**Priority:** Medium
**Estimate:** 1.5 hours

### Acceptance Criteria
- [ ] Messages are stored with sender, recipient, and timestamp
- [ ] Messages can be retrieved by team
- [ ] Messages do not change state (intent signals only)
- [ ] Staff can send messages to teams
- [ ] Customer bot can send messages to teams

### Tasks

#### Task 2.1: Implement ChatService
**Time:** 1 hour

**Create `src/services/ChatService.ts`:**

```typescript
import db from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  teamId: string;
  from: 'staff' | 'customer_bot' | 'team';
  text: string;
  sessionId?: string;
  createdAt: string;
}

export interface CreateMessageDTO {
  teamId: string;
  from: 'staff' | 'customer_bot' | 'team';
  text: string;
  sessionId?: string;
}

export class ChatService {
  /**
   * Send a message
   */
  async sendMessage(dto: CreateMessageDTO): Promise<Message> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO messages (id, team_id, from, text, session_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, dto.teamId, dto.from, dto.text, dto.sessionId || null, now);

    return {
      id,
      teamId: dto.teamId,
      from: dto.from,
      text: dto.text,
      sessionId: dto.sessionId,
      createdAt: now,
    };
  }

  /**
   * Get messages for a team
   */
  async getMessages(teamId: string, limit: number = 50): Promise<Message[]> {
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE team_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(teamId, limit);

    return rows.map((row: any) => ({
      id: row.id,
      teamId: row.team_id,
      from: row.from,
      text: row.text,
      sessionId: row.session_id,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get messages by session
   */
  async getMessagesBySession(sessionId: string): Promise<Message[]> {
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(sessionId);

    return rows.map((row: any) => ({
      id: row.id,
      teamId: row.team_id,
      from: row.from,
      text: row.text,
      sessionId: row.session_id,
      createdAt: row.created_at,
    }));
  }

  /**
   * Broadcast message to all teams
   */
  async broadcast(from: 'staff' | 'customer_bot', text: string): Promise<void> {
    // Get all teams
    const teamsStmt = db.prepare('SELECT team_id FROM teams');
    const teams = teamsStmt.all() as any[];

    // Send message to each team
    for (const team of teams) {
      await this.sendMessage({
        teamId: team.team_id,
        from,
        text,
      });
    }
  }
}

export default new ChatService();
```

**Validation:** Messages can be sent and retrieved

---

#### Task 2.2: Add chat API endpoint
**Time:** 30 minutes

**Update `src/routes/public.ts` to add chat history endpoint:**

```typescript
/**
 * GET /api/chat
 * Get chat history for the team
 */
router.get('/chat', requireScope('read:events'), async (req: AuthRequest, res) => {
  try {
    const teamId = req.teamId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const messages = await ChatService.getMessages(teamId, limit);

    res.json({
      teamId,
      messages: messages.reverse(), // Return in chronological order
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});
```

**Validation:** Chat history is accessible via API

---

## Story 3: Team Service

**As a** platform
**I want** to manage team registration and API keys
**So that** teams can authenticate and access the platform

**Priority:** Medium
**Estimate:** 1 hour

### Acceptance Criteria
- [ ] Teams can be created with name
- [ ] API keys are generated for teams
- [ ] Platform mode can be switched
- [ ] Team info can be retrieved

### Tasks

#### Task 3.1: Implement TeamService
**Time:** 1 hour

**Create `src/services/TeamService.ts`:**

```typescript
import db from '../database/connection';
import { v4 as uuidv4 } from 'uuid';
import AuthService from './AuthService';
import InventoryService from './InventoryService';

export interface Team {
  teamId: string;
  name: string;
  apiKey: string;
  mode: 'development' | 'judging';
  createdAt: string;
}

export class TeamService {
  /**
   * Create a new team
   */
  async createTeam(name: string): Promise<Team> {
    const teamId = `team-${Date.now()}`;
    const now = new Date().toISOString();
    const mode = 'development';

    // Generate API key
    const apiKey = AuthService.generateTeamToken(teamId, mode);

    // Insert team
    const stmt = db.prepare(`
      INSERT INTO teams (team_id, name, api_key, mode, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(teamId, name, apiKey, mode, now);

    // Initialize inventory for the team
    await InventoryService.initializeTeamInventory(teamId);

    return {
      teamId,
      name,
      apiKey,
      mode,
      createdAt: now,
    };
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<Team | null> {
    const stmt = db.prepare('SELECT * FROM teams WHERE team_id = ?');
    const row = stmt.get(teamId) as any;

    if (!row) return null;

    return {
      teamId: row.team_id,
      name: row.name,
      apiKey: row.api_key,
      mode: row.mode,
      createdAt: row.created_at,
    };
  }

  /**
   * Get all teams
   */
  async getAllTeams(): Promise<Team[]> {
    const stmt = db.prepare('SELECT * FROM teams ORDER BY team_id');
    const rows = stmt.all();

    return rows.map((row: any) => ({
      teamId: row.team_id,
      name: row.name,
      apiKey: row.api_key,
      mode: row.mode,
      createdAt: row.created_at,
    }));
  }

  /**
   * Set platform mode (affects all teams)
   */
  async setMode(mode: 'development' | 'judging'): Promise<void> {
    const stmt = db.prepare('UPDATE teams SET mode = ?');
    stmt.run(mode);

    // Regenerate API keys with new scopes
    const teams = await this.getAllTeams();

    for (const team of teams) {
      const newApiKey = AuthService.generateTeamToken(team.teamId, mode);

      const updateStmt = db.prepare('UPDATE teams SET api_key = ? WHERE team_id = ?');
      updateStmt.run(newApiKey, team.teamId);
    }
  }

  /**
   * Regenerate API key for a team
   */
  async regenerateApiKey(teamId: string): Promise<string> {
    const team = await this.getTeam(teamId);

    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    const newApiKey = AuthService.generateTeamToken(teamId, team.mode);

    const stmt = db.prepare('UPDATE teams SET api_key = ? WHERE team_id = ?');
    stmt.run(newApiKey, teamId);

    return newApiKey;
  }
}

export default new TeamService();
```

**Validation:** Teams can be created and managed

---

## Story 4: Staff Dashboard

**As a** staff member
**I want** a web dashboard to monitor and control the platform
**So that** I can manage the hackathon without direct API access

**Priority:** High
**Estimate:** 2-3 hours

### Acceptance Criteria
- [ ] Dashboard shows platform status and mode
- [ ] Inventory monitor shows all teams and SKUs
- [ ] Event sender form for injecting events
- [ ] Inventory control form for restocking
- [ ] Message center for sending messages
- [ ] Audit logs viewer
- [ ] Polling updates every 3 seconds
- [ ] Admin authentication

### Tasks

#### Task 4.1: Create dashboard HTML structure
**Time:** 1 hour

**Create `dashboard/index.html`:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mock IT Marketplace - Staff Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }

    /* Header */
    header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    header h1 { font-size: 24px; margin-bottom: 10px; }
    .status-bar { display: flex; gap: 20px; align-items: center; }
    .status-badge { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status-online { background: #10b981; color: white; }
    .status-offline { background: #ef4444; color: white; }
    .mode-badge { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .mode-dev { background: #3b82f6; color: white; }
    .mode-judging { background: #f59e0b; color: white; }

    /* Login */
    #login-section { max-width: 400px; margin: 100px auto; background: white; padding: 30px; border-radius: 8px; }
    #login-section input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
    #login-section button { width: 100%; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; }
    #login-section button:hover { background: #2563eb; }

    /* Dashboard sections */
    .dashboard-section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .dashboard-section h2 { font-size: 18px; margin-bottom: 15px; }

    /* Inventory table */
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f9fafb; font-weight: 600; font-size: 12px; text-transform: uppercase; }
    .stock-green { color: #10b981; font-weight: 600; }
    .stock-yellow { color: #f59e0b; font-weight: 600; }
    .stock-red { color: #ef4444; font-weight: 600; }

    /* Forms */
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 5px; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .form-group textarea { min-height: 100px; font-family: monospace; }
    .btn { padding: 8px 16px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-primary:hover { background: #2563eb; }
    .btn-success { background: #10b981; color: white; }
    .btn-danger { background: #ef4444; color: white; }

    /* Grid */
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

    /* Tabs */
    .tabs { display: flex; gap: 10px; margin-bottom: 15px; }
    .tab { padding: 8px 16px; background: #f3f4f6; border: none; border-radius: 4px; cursor: pointer; }
    .tab.active { background: #3b82f6; color: white; }

    /* Logs */
    .log-entry { padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; font-family: monospace; }
    .log-entry:last-child { border-bottom: none; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Login Section -->
    <div id="login-section">
      <h2>Staff Login</h2>
      <div class="form-group">
        <label>Admin API Key</label>
        <input type="password" id="api-key" placeholder="Enter admin API key">
      </div>
      <button onclick="login()">Login</button>
      <p id="login-error" style="color: red; margin-top: 10px; display: none;"></p>
    </div>

    <!-- Dashboard (hidden until logged in) -->
    <div id="dashboard" style="display: none;">
      <!-- Header -->
      <header>
        <h1>Mock IT Marketplace - Staff Dashboard</h1>
        <div class="status-bar">
          <span class="status-badge status-online" id="platform-status">● Online</span>
          <span class="mode-badge mode-dev" id="platform-mode">Development</span>
          <span style="margin-left: auto; font-size: 12px; color: #666;" id="current-time"></span>
          <button class="btn btn-danger" onclick="logout()" style="padding: 4px 12px; font-size: 12px;">Logout</button>
        </div>
      </header>

      <div class="grid">
        <!-- Inventory Monitor -->
        <div class="dashboard-section">
          <h2>Inventory Monitor</h2>
          <div style="margin-bottom: 15px; display: flex; gap: 10px;">
            <select id="inventory-filter-team" class="form-group" style="padding: 6px;">
              <option value="">All Teams</option>
            </select>
            <select id="inventory-filter-sku" class="form-group" style="padding: 6px;">
              <option value="">All SKUs</option>
            </select>
          </div>
          <div style="overflow-x: auto;">
            <table id="inventory-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Stock</th>
                  <th>Reserved</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody id="inventory-body">
                <!-- Populated by JS -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Inventory Control -->
        <div class="dashboard-section">
          <h2>Inventory Control</h2>
          <div class="form-group">
            <label>Team</label>
            <select id="restock-team">
              <!-- Populated by JS -->
            </select>
          </div>
          <div class="form-group">
            <label>SKU</label>
            <select id="restock-sku">
              <!-- Populated by JS -->
            </select>
          </div>
          <div class="form-group">
            <label>Quantity</label>
            <input type="number" id="restock-qty" value="10">
          </div>
          <button class="btn btn-success" onclick="restock()">Restock</button>
        </div>

        <!-- Event Sender -->
        <div class="dashboard-section">
          <h2>Event Sender</h2>
          <div class="form-group">
            <label>Team</label>
            <select id="event-team">
              <!-- Populated by JS -->
            </select>
          </div>
          <div class="form-group">
            <label>Event Type</label>
            <select id="event-type">
              <option value="order.created">order.created</option>
              <option value="order.paid">order.paid</option>
              <option value="order.cancelled">order.cancelled</option>
              <option value="order.refund_requested">order.refund_requested</option>
              <option value="order.dispute_opened">order.dispute_opened</option>
              <option value="inventory.shortage_detected">inventory.shortage_detected</option>
            </select>
          </div>
          <div class="form-group">
            <label>Payload (JSON)</label>
            <textarea id="event-payload">{
  "orderId": "ORD-001",
  "items": [
    { "sku": "IT-001", "qty": 2 }
  ]
}</textarea>
          </div>
          <button class="btn btn-primary" onclick="sendEvent()">Send Event</button>
        </div>

        <!-- Message Center -->
        <div class="dashboard-section">
          <h2>Message Center</h2>
          <div class="form-group">
            <label>Recipient</label>
            <select id="message-team">
              <option value="all">Broadcast to All</option>
              <!-- Populated by JS -->
            </select>
          </div>
          <div class="form-group">
            <label>Message</label>
            <textarea id="message-text" style="min-height: 60px;"></textarea>
          </div>
          <button class="btn btn-primary" onclick="sendMessage()">Send Message</button>

          <h3 style="margin-top: 20px; font-size: 14px;">Recent Messages</h3>
          <div id="recent-messages" style="max-height: 200px; overflow-y: auto; margin-top: 10px; border: 1px solid #eee; border-radius: 4px;">
            <!-- Populated by JS -->
          </div>
        </div>
      </div>

      <!-- Mode Control -->
      <div class="dashboard-section">
        <h2>Platform Mode</h2>
        <p style="font-size: 12px; color: #666; margin-bottom: 10px;">
          <strong>Development:</strong> Teams can send test events. <strong>Judging:</strong> Teams are read-only.
        </p>
        <button class="btn btn-primary" onclick="setMode('development')" id="btn-dev-mode">Switch to Development</button>
        <button class="btn btn-danger" onclick="setMode('judging')" id="btn-judging-mode">Switch to Judging</button>
      </div>

      <!-- Audit Logs -->
      <div class="dashboard-section">
        <h2>Audit Logs</h2>
        <div class="tabs">
          <button class="tab active" onclick="switchTab('events')">Events</button>
          <button class="tab" onclick="switchTab('inventory')">Inventory</button>
          <button class="tab" onclick="switchTab('messages')">Messages</button>
        </div>
        <div id="audit-content" style="max-height: 300px; overflow-y: auto; border: 1px solid #eee; border-radius: 4px;">
          <!-- Populated by JS -->
        </div>
      </div>
    </div>
  </div>

  <script src="dashboard.js"></script>
</body>
</html>
```

**Validation:** Dashboard HTML structure is complete

---

#### Task 4.2: Create dashboard JavaScript
**Time:** 1-2 hours

**Create `dashboard/dashboard.js`:**

```javascript
// State
let adminToken = localStorage.getItem('adminToken');
let currentTab = 'events';
let pollInterval = null;

// API base URL
const API_BASE = window.location.origin + '/api';

// Login
function login() {
  const apiKey = document.getElementById('api-key').value;

  if (!apiKey) {
    showError('Please enter an API key');
    return;
  }

  // Validate API key by fetching teams
  fetch(`${API_BASE}/admin/teams`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  })
    .then(res => {
      if (res.ok) {
        adminToken = apiKey;
        localStorage.setItem('adminToken', adminToken);
        showDashboard();
      } else {
        showError('Invalid API key');
      }
    })
    .catch(err => showError('Login failed: ' + err.message));
}

function logout() {
  localStorage.removeItem('adminToken');
  adminToken = null;
  stopPolling();
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login-section').style.display = 'block';
}

function showError(message) {
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

// Show dashboard
function showDashboard() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  // Start polling
  startPolling();
}

// Polling
function startPolling() {
  updateAll();
  pollInterval = setInterval(updateAll, 3000); // Poll every 3 seconds
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function updateAll() {
  updateTime();
  updatePlatformStatus();
  updateInventory();
  updateTeams();
  updateMessages();
  updateAuditLogs();
}

// API helpers
async function apiGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Update functions
function updateTime() {
  document.getElementById('current-time').textContent = new Date().toLocaleString();
}

async function updatePlatformStatus() {
  try {
    // TODO: Fetch platform mode
    // const data = await apiGet('/admin/mode');
    // document.getElementById('platform-mode').textContent = data.mode;
  } catch (err) {
    console.error('Failed to fetch platform status:', err);
  }
}

async function updateInventory() {
  try {
    // TODO: Fetch inventory
    // const data = await apiGet('/admin/inventory');
    // renderInventoryTable(data.inventory);
  } catch (err) {
    console.error('Failed to fetch inventory:', err);
  }
}

async function updateTeams() {
  try {
    const data = await apiGet('/admin/teams');

    // Update all team dropdowns
    const teamOptions = data.teams.map(t => `<option value="${t.teamId}">${t.name}</option>`).join('');

    document.getElementById('restock-team').innerHTML = teamOptions;
    document.getElementById('event-team').innerHTML = teamOptions;
    document.getElementById('message-team').innerHTML = '<option value="all">Broadcast to All</option>' + teamOptions;
  } catch (err) {
    console.error('Failed to fetch teams:', err);
  }
}

async function updateMessages() {
  try {
    // TODO: Fetch recent messages
    // const data = await apiGet('/admin/messages?limit=20');
    // renderMessages(data.messages);
  } catch (err) {
    console.error('Failed to fetch messages:', err);
  }
}

async function updateAuditLogs() {
  try {
    const data = await apiGet(`/admin/audit/${currentTab}?limit=50`);
    renderAuditLogs(data.logs);
  } catch (err) {
    console.error('Failed to fetch audit logs:', err);
  }
}

// Render functions
function renderInventoryTable(inventory) {
  const tbody = document.getElementById('inventory-body');
  tbody.innerHTML = inventory.map(item => {
    const stockClass = item.available > 10 ? 'stock-green' : item.available > 5 ? 'stock-yellow' : 'stock-red';
    return `
      <tr>
        <td>${item.teamId}</td>
        <td>${item.sku}</td>
        <td>${item.name}</td>
        <td>${item.stock}</td>
        <td>${item.reserved}</td>
        <td class="${stockClass}">${item.available}</td>
      </tr>
    `;
  }).join('');
}

function renderAuditLogs(logs) {
  const container = document.getElementById('audit-content');
  container.innerHTML = logs.map(log => `
    <div class="log-entry">
      <strong>${log.createdAt}</strong> - ${JSON.stringify(log)}
    </div>
  `).join('');
}

// Actions
async function restock() {
  const teamId = document.getElementById('restock-team').value;
  const sku = document.getElementById('restock-sku').value;
  const qty = parseInt(document.getElementById('restock-qty').value);

  try {
    await apiPost('/admin/inventory', {
      teamId,
      sku,
      quantity: qty,
      type: 'restock'
    });

    alert('Restocked successfully!');
    updateInventory();
  } catch (err) {
    alert('Failed to restock: ' + err.message);
  }
}

async function sendEvent() {
  const teamId = document.getElementById('event-team').value;
  const type = document.getElementById('event-type').value;
  const payload = JSON.parse(document.getElementById('event-payload').value);

  try {
    await apiPost('/admin/events', { teamId, type, payload });
    alert('Event sent successfully!');
    updateAuditLogs();
  } catch (err) {
    alert('Failed to send event: ' + err.message);
  }
}

async function sendMessage() {
  const teamId = document.getElementById('message-team').value;
  const text = document.getElementById('message-text').value;

  try {
    await apiPost('/admin/messages', { teamId, text });
    alert('Message sent successfully!');
    document.getElementById('message-text').value = '';
    updateMessages();
  } catch (err) {
    alert('Failed to send message: ' + err.message);
  }
}

async function setMode(mode) {
  try {
    await apiPost('/admin/mode', { mode });
    alert(`Platform mode changed to ${mode}`);
    updatePlatformStatus();
  } catch (err) {
    alert('Failed to change mode: ' + err.message);
  }
}

function switchTab(tab) {
  currentTab = tab;

  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');

  // Update logs
  updateAuditLogs();
}

// Initialize
if (adminToken) {
  showDashboard();
}
```

**Validation:** Dashboard loads and polls for updates

---

## Sprint Completion Checklist

- [ ] All stories completed per acceptance criteria
- [ ] All tasks completed
- [ ] Admin API routes work correctly
- [ ] Chat service is functional
- [ ] Team service is implemented
- [ ] Staff dashboard displays correctly
- [ ] Dashboard polls and updates
- [ ] No critical bugs
- [ ] Ready to start Sprint 3

---

**Sprint 2 Status:** ⏳ Ready to Start (after Sprint 1)
**Last Updated:** 2026-01-03
