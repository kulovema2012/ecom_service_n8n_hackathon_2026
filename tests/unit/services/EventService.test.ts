import EventService from '../../../src/services/EventService';
import { CreateEventDTO } from '../../../src/models/Event';
import { runMigrations } from '../../../src/database/migrate';
import db from '../../../src/database/connection';

describe('EventService', () => {
  beforeAll(async () => {
    // Initialize in-memory database for tests
    process.env.DATABASE_PATH = ':memory:';
    await runMigrations();
  });

  afterEach(() => {
    // Clear events table after each test
    db.prepare('DELETE FROM events').run();
  });

  describe('createEvent', () => {
    it('should create a new event', async () => {
      const dto: CreateEventDTO = {
        teamId: 'test-team',
        type: 'order.created',
        payload: { orderId: 'ORD-001', items: [] },
      };

      const event = await EventService.createEvent(dto);

      expect(event).toBeDefined();
      expect(event.teamId).toBe(dto.teamId);
      expect(event.type).toBe(dto.type);
      expect(event.payload).toEqual(dto.payload);
      expect(event.id).toBeDefined();
      expect(event.createdAt).toBeDefined();
    });

    it('should create events with metadata', async () => {
      const dto: CreateEventDTO = {
        teamId: 'test-team',
        type: 'order.paid',
        payload: { orderId: 'ORD-002', amount: 100 },
        metadata: {
          correlationId: 'corr-123',
          causationId: 'cause-456',
        },
      };

      const event = await EventService.createEvent(dto);

      expect(event.metadata).toEqual(dto.metadata);
    });

    it('should support all event types', async () => {
      const eventTypes: Array<CreateEventDTO['type']> = [
        'order.created',
        'order.paid',
        'order.cancelled',
        'order.refund_requested',
        'order.dispute_opened',
        'inventory.restocked',
        'inventory.shortage_detected',
        'inventory.manual_adjusted',
        'event.duplicate_sent',
        'event.delayed',
        'event.out_of_order',
      ];

      for (const type of eventTypes) {
        const event = await EventService.createEvent({
          teamId: 'test-team',
          type,
          payload: {},
        });

        expect(event.type).toBe(type);
      }
    });
  });

  describe('getEvents', () => {
    beforeEach(async () => {
      // Create test events
      await EventService.createEvent({
        teamId: 'test-team',
        type: 'order.created',
        payload: { orderId: 'ORD-001' },
      });

      await EventService.createEvent({
        teamId: 'test-team',
        type: 'order.paid',
        payload: { orderId: 'ORD-001' },
      });

      await EventService.createEvent({
        teamId: 'test-team',
        type: 'order.cancelled',
        payload: { orderId: 'ORD-002' },
      });
    });

    it('should retrieve all events for a team', async () => {
      const events = await EventService.getEvents('test-team');

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(3);
    });

    it('should filter by event type', async () => {
      const events = await EventService.getEvents('test-team', {
        type: 'order.created',
      });

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('order.created');
    });

    it('should limit results', async () => {
      const events = await EventService.getEvents('test-team', {
        limit: 2,
      });

      expect(events.length).toBe(2);
    });

    it('should return empty array for team with no events', async () => {
      const events = await EventService.getEvents('nonexistent-team');

      expect(events).toEqual([]);
    });

    it('should filter events by timestamp', async () => {
      const now = new Date().toISOString();
      const futureDate = new Date(Date.now() + 100000).toISOString();

      const events = await EventService.getEvents('test-team', {
        since: futureDate,
      });

      expect(events.length).toBe(0);
    });
  });

  describe('getEventById', () => {
    it('should retrieve an event by ID', async () => {
      const created = await EventService.createEvent({
        teamId: 'test-team',
        type: 'order.created',
        payload: { orderId: 'ORD-001' },
      });

      const found = await EventService.getEventById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.teamId).toBe(created.teamId);
    });

    it('should return null for non-existent event', async () => {
      const found = await EventService.getEventById('nonexistent-id');

      expect(found).toBeNull();
    });
  });

  describe('replayEvent', () => {
    it('should create a replayed event with replayOf metadata', async () => {
      const original = await EventService.createEvent({
        teamId: 'test-team',
        type: 'order.created',
        payload: { orderId: 'ORD-001' },
      });

      const replayed = await EventService.replayEvent(original.id);

      expect(replayed.metadata?.replayOf).toBe(original.id);
      expect(replayed.teamId).toBe(original.teamId);
      expect(replayed.type).toBe(original.type);
      expect(replayed.payload).toEqual(original.payload);
      expect(replayed.id).not.toBe(original.id);
    });

    it('should throw error when replaying non-existent event', async () => {
      await expect(EventService.replayEvent('nonexistent-id')).rejects.toThrow(
        'Event nonexistent-id not found'
      );
    });

    it('should support delayed replay', async () => {
      const original = await EventService.createEvent({
        teamId: 'test-team',
        type: 'order.created',
        payload: { orderId: 'ORD-001' },
      });

      const delayUntil = new Date(Date.now() + 60000).toISOString();
      const replayed = await EventService.replayEvent(original.id, delayUntil);

      expect(replayed.metadata?.delayedUntil).toBe(delayUntil);
      expect(replayed.metadata?.replayOf).toBe(original.id);
    });
  });

  describe('markAsProcessed', () => {
    it('should mark an event as processed', async () => {
      const event = await EventService.createEvent({
        teamId: 'test-team',
        type: 'order.created',
        payload: { orderId: 'ORD-001' },
      });

      expect(event.processedAt).toBeUndefined();

      await EventService.markAsProcessed(event.id);

      const updated = await EventService.getEventById(event.id);
      expect(updated?.processedAt).toBeDefined();
    });
  });

  describe('getDueEvents', () => {
    it('should return events that are due to be processed', async () => {
      const past = new Date(Date.now() - 1000).toISOString();
      const future = new Date(Date.now() + 60000).toISOString();

      await EventService.createEvent({
        teamId: 'test-team',
        type: 'order.created',
        payload: { orderId: 'ORD-001' },
        metadata: { delayedUntil: past },
      });

      await EventService.createEvent({
        teamId: 'test-team',
        type: 'order.paid',
        payload: { orderId: 'ORD-001' },
        metadata: { delayedUntil: future },
      });

      const dueEvents = await EventService.getDueEvents();

      expect(dueEvents.length).toBe(1);
      expect(dueEvents[0].type).toBe('order.created');
    });
  });

  describe('sendDuplicateEvent', () => {
    it('should return existing event (idempotent)', async () => {
      const original = await EventService.createEvent({
        teamId: 'test-team',
        type: 'order.created',
        payload: { orderId: 'ORD-001' },
      });

      const duplicate = await EventService.sendDuplicateEvent(original.id);

      expect(duplicate.id).toBe(original.id);
      expect(duplicate.teamId).toBe(original.teamId);
    });

    it('should throw error for non-existent event', async () => {
      await expect(EventService.sendDuplicateEvent('nonexistent-id')).rejects.toThrow();
    });
  });

  describe('sendOutOfOrderEvents', () => {
    it('should send events out of order', async () => {
      const events: CreateEventDTO[] = [
        { teamId: 'test-team', type: 'order.created', payload: { orderId: 'ORD-001' } },
        { teamId: 'test-team', type: 'order.paid', payload: { orderId: 'ORD-001' } },
        { teamId: 'test-team', type: 'order.cancelled', payload: { orderId: 'ORD-001' } },
      ];

      const created = await EventService.sendOutOfOrderEvents('test-team', events);

      expect(created.length).toBe(3);
      created.forEach(event => {
        expect(event.metadata?.outOfOrder).toBe('true');
      });
    });
  });

  describe('createDelayedEvents', () => {
    it('should create events with delays', async () => {
      const events: CreateEventDTO[] = [
        { teamId: 'test-team', type: 'order.created', payload: { orderId: 'ORD-001' } },
        { teamId: 'test-team', type: 'order.paid', payload: { orderId: 'ORD-001' } },
      ];

      const delayMs = 5000;
      const created = await EventService.createDelayedEvents('test-team', events, delayMs);

      expect(created.length).toBe(2);
      created.forEach(event => {
        expect(event.metadata?.delayedUntil).toBeDefined();
      });
    }, 10000);
  });
});
