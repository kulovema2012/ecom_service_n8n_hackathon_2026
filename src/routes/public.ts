import { Router } from 'express';
import { authMiddleware, requireScope, AuthRequest } from '../middleware/auth';
import EventService from '../services/EventService';
import InventoryService from '../services/InventoryService';
import ChatService from '../services/ChatService';
import TeamService from '../services/TeamService';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * GET /api/inventory
 * Get current inventory for the team
 */
router.get('/inventory', requireScope('read:inventory'), async (req: AuthRequest, res) => {
  try {
    const teamId = req.teamId!;

    const inventory = await InventoryService.getInventory(teamId);

    res.json({
      teamId,
      inventory,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

/**
 * GET /api/events
 * Get events for the team with optional filters
 */
router.get('/events', requireScope('read:events'), async (req: AuthRequest, res) => {
  try {
    const teamId = req.teamId!;
    const type = req.query.type as string | undefined;
    const since = req.query.since as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const events = await EventService.getEvents(teamId, {
      type: type as any,
      since,
      limit,
    });

    res.json({
      events,
      pagination: {
        hasMore: events.length === (limit || 100),
        nextSince: events.length > 0 ? events[events.length - 1].createdAt : undefined,
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * POST /api/chat
 * Send a chat message
 */
router.post('/chat', requireScope('write:chat'), async (req: AuthRequest, res) => {
  try {
    const teamId = req.teamId!;
    const { text, sessionId } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Invalid message text' });
      return;
    }

    await ChatService.sendMessage({
      teamId,
      from: 'team',
      text,
      sessionId,
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

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

/**
 * GET /api/teams/:id
 * Get team information
 */
router.get('/teams/:id', requireScope('read:inventory'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Users can only see their own team info
    if (req.teamId !== id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const team = await TeamService.getTeam(id);

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    res.json({
      teamId: team.teamId,
      name: team.name,
      mode: team.mode,
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

export default router;
