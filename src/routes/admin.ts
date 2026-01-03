import { Router } from 'express';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth';
import EventService from '../services/EventService';
import InventoryService from '../services/InventoryService';
import TeamService from '../services/TeamService';
import ChatService from '../services/ChatService';
import CustomerBot from '../services/CustomerBot';
import { EventType } from '../models/Event';
import { db } from '../database/connection';

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
 * GET /api/admin/inventory
 * Get all inventory (for all teams)
 */
router.get('/inventory', async (req: AuthRequest, res) => {
  try {
    const teams = await TeamService.getAllTeams();
    const allInventory: any[] = [];

    for (const team of teams) {
      const inventory = await InventoryService.getInventory(team.teamId);
      allInventory.push(...inventory);
    }

    res.json({ inventory: allInventory });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

/**
 * GET /api/admin/teams
 * List all teams
 */
router.get('/teams', async (req: AuthRequest, res) => {
  try {
    const teams = await TeamService.getAllTeams();

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

    const team = await TeamService.createTeam(name);

    res.status(201).json(team);
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

    await TeamService.setMode(mode);

    res.json({ mode, message: `Platform mode changed to ${mode}` });
  } catch (error) {
    console.error('Error changing mode:', error);
    res.status(500).json({ error: 'Failed to change mode' });
  }
});

/**
 * GET /api/admin/mode
 * Get current platform mode
 */
router.get('/mode', async (req: AuthRequest, res) => {
  try {
    const mode = await TeamService.getPlatformMode();
    res.json({ mode });
  } catch (error) {
    console.error('Error fetching mode:', error);
    res.status(500).json({ error: 'Failed to fetch mode' });
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

    let logs: any[] = [];

    if (type === 'events') {
      // Get events from all teams
      const teams = await TeamService.getAllTeams();
      for (const team of teams) {
        const events = await EventService.getEvents(team.teamId, { limit });
        logs.push(...events);
      }
    } else if (type === 'inventory') {
      const stmt = db.prepare(`SELECT * FROM inventory_events ORDER BY created_at DESC LIMIT ?`);
      const rows = stmt.all(limit) as any[];
      logs = rows;
    } else if (type === 'messages') {
      logs = await ChatService.getAllMessages(limit);
    } else if (type === 'errors') {
      logs = []; // TODO: Implement error logging
    }

    res.json({ type, logs, count: logs.length });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * POST /api/admin/messages
 * Send message to team or broadcast
 */
router.post('/messages', async (req: AuthRequest, res) => {
  try {
    const { teamId, text } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Missing required field: text' });
      return;
    }

    if (teamId === 'all' || !teamId) {
      // Broadcast to all teams
      await ChatService.broadcast('staff', text);
    } else {
      // Send to specific team
      await ChatService.sendMessage({
        teamId,
        from: 'staff',
        text,
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * GET /api/admin/messages
 * Get all recent messages
 */
router.get('/messages', async (req: AuthRequest, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const messages = await ChatService.getAllMessages(limit);

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * GET /api/admin/webhooks
 * Get all webhook configurations
 */
router.get('/webhooks', async (req: AuthRequest, res) => {
  try {
    const webhooks = ChatService.getAllWebhooks();
    res.json({ webhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

/**
 * POST /api/admin/webhooks
 * Set webhook URL for a team
 */
router.post('/webhooks', async (req: AuthRequest, res) => {
  try {
    const { teamId, webhookUrl } = req.body;

    if (!teamId || !webhookUrl) {
      res.status(400).json({ error: 'Missing required fields: teamId, webhookUrl' });
      return;
    }

    // Validate URL
    try {
      new URL(webhookUrl);
    } catch {
      res.status(400).json({ error: 'Invalid webhook URL' });
      return;
    }

    ChatService.setWebhookUrl(teamId, webhookUrl);

    res.json({ message: 'Webhook URL set successfully', teamId, webhookUrl });
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).json({ error: 'Failed to set webhook URL' });
  }
});

/**
 * DELETE /api/admin/webhooks/:teamId
 * Remove webhook URL for a team
 */
router.delete('/webhooks/:teamId', async (req: AuthRequest, res) => {
  try {
    const { teamId } = req.params;

    ChatService.removeWebhookUrl(teamId);

    res.json({ message: 'Webhook URL removed successfully', teamId });
  } catch (error) {
    console.error('Error removing webhook:', error);
    res.status(500).json({ error: 'Failed to remove webhook URL' });
  }
});

/**
 * GET /api/admin/webhooks/:teamId
 * Get webhook URL for a team
 */
router.get('/webhooks/:teamId', async (req: AuthRequest, res) => {
  try {
    const { teamId } = req.params;

    const webhookUrl = ChatService.getTeamWebhookUrl(teamId);

    res.json({ teamId, webhookUrl });
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({ error: 'Failed to fetch webhook URL' });
  }
});

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

    res.json({ message: `Bot started with ${intervalMinutes} minute interval`, intervalId: intervalId.toString() });
  } catch (error) {
    console.error('Error starting bot:', error);
    res.status(500).json({ error: 'Failed to start bot' });
  }
});

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

export default router;
