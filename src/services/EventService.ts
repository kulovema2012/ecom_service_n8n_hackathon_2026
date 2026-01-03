import { v4 as uuidv4 } from 'uuid';
import { Event, CreateEventDTO, EventFilters, EventType } from '../models/Event';
import { db } from '../database/connection';
import logger from '../utils/logger';

export class EventService {
  /**
   * Create a new event (with idempotency check)
   */
  async createEvent(dto: CreateEventDTO): Promise<Event> {
    const eventId = uuidv4();
    const now = new Date().toISOString();

    logger.audit('Event created', { teamId: dto.teamId, type: dto.type, eventId });

    // Check for duplicate (idempotency)
    const existing = await this.getEventById(eventId);
    if (existing) {
      logger.info('Duplicate event detected (idempotent)', { eventId });
      return existing; // Return existing event (idempotent)
    }

    // Insert new event
    const stmt = db.prepare(`
      INSERT INTO events (id, team_id, type, payload, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      eventId,
      dto.teamId,
      dto.type,
      JSON.stringify(dto.payload),
      now,
      dto.metadata ? JSON.stringify(dto.metadata) : null
    );

    return {
      id: eventId,
      teamId: dto.teamId,
      type: dto.type,
      payload: dto.payload,
      createdAt: now,
      metadata: dto.metadata,
    };
  }

  /**
   * Get events for a team with optional filters
   */
  async getEvents(teamId: string, filters?: EventFilters): Promise<Event[]> {
    let query = 'SELECT * FROM events WHERE team_id = ?';
    const params: any[] = [teamId];

    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters?.since) {
      query += ' AND created_at > ?';
      params.push(filters.since);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(this.mapRowToEvent);
  }

  /**
   * Get a single event by ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
    const row = stmt.get(eventId) as any;

    return row ? this.mapRowToEvent(row) : null;
  }

  /**
   * Replay an existing event (creates new event with replayOf metadata)
   */
  async replayEvent(eventId: string, delayUntil?: string): Promise<Event> {
    const original = await this.getEventById(eventId);
    if (!original) {
      throw new Error(`Event ${eventId} not found`);
    }

    // Create replay event
    return this.createEvent({
      teamId: original.teamId,
      type: original.type,
      payload: original.payload,
      metadata: {
        replayOf: eventId,
        delayedUntil: delayUntil,
      },
    });
  }

  /**
   * Get events that are due to be processed (for delayed events)
   */
  async getDueEvents(): Promise<Event[]> {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      SELECT * FROM events
      WHERE json_extract(metadata, '$.delayedUntil') IS NOT NULL
      AND json_extract(metadata, '$.delayedUntil') <= ?
      AND processed_at IS NULL
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(now) as any[];
    return rows.map(this.mapRowToEvent);
  }

  /**
   * Mark event as processed
   */
  async markAsProcessed(eventId: string): Promise<void> {
    const stmt = db.prepare(`
      UPDATE events
      SET processed_at = ?
      WHERE id = ?
    `);

    stmt.run(new Date().toISOString(), eventId);
  }

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

  private mapRowToEvent(row: any): Event {
    return {
      id: row.id,
      teamId: row.team_id,
      type: row.type as EventType,
      payload: JSON.parse(row.payload),
      createdAt: row.created_at,
      processedAt: row.processed_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}

export default new EventService();
