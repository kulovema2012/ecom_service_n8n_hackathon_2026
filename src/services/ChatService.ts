import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import config from '../config';
import logger from '../utils/logger';

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
      INSERT INTO messages (id, team_id, "from", text, session_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, dto.teamId, dto.from, dto.text, dto.sessionId || null, now);

    const message: Message = {
      id,
      teamId: dto.teamId,
      from: dto.from,
      text: dto.text,
      sessionId: dto.sessionId,
      createdAt: now,
    };

    // Send webhook if enabled
    if (config.webhookEnabled) {
      this.sendWebhook(dto.teamId, message).catch(err => {
        logger.error('Failed to send webhook', err);
      });
    }

    return message;
  }

  /**
   * Get webhook URL for a team
   */
  private getWebhookUrl(teamId: string): string | null {
    // Check team-specific webhook
    const stmt = db.prepare('SELECT webhook_url FROM team_webhooks WHERE team_id = ?');
    const row = stmt.get(teamId) as any;

    if (row?.webhook_url) {
      return row.webhook_url;
    }

    // Fall back to default webhook URL
    if (config.defaultWebhookUrl) {
      return config.defaultWebhookUrl;
    }

    return null;
  }

  /**
   * Send webhook to n8n
   */
  private async sendWebhook(teamId: string, message: Message): Promise<void> {
    const webhookUrl = this.getWebhookUrl(teamId);

    if (!webhookUrl) {
      logger.debug(`No webhook URL configured for team ${teamId}`);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.webhookTimeout);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(`Webhook returned non-OK status: ${response.status}`, {
          teamId,
          messageId: message.id,
        });
      } else {
        logger.debug('Webhook sent successfully', {
          teamId,
          messageId: message.id,
          webhookUrl,
        });
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logger.warn('Webhook request timed out', { teamId, messageId: message.id });
      } else {
        logger.error('Webhook request failed', error as Error, { teamId, messageId: message.id });
      }
    }
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

    const rows = stmt.all(teamId, limit) as any[];

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

    const rows = stmt.all(sessionId) as any[];

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
   * Get all messages (admin)
   */
  async getAllMessages(limit: number = 100): Promise<Message[]> {
    const stmt = db.prepare(`
      SELECT * FROM messages
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];

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

  /**
   * Set webhook URL for a team
   */
  setWebhookUrl(teamId: string, webhookUrl: string): void {
    const now = new Date().toISOString();

    const checkStmt = db.prepare('SELECT team_id FROM team_webhooks WHERE team_id = ?');
    const existing = checkStmt.get(teamId) as any;

    if (existing) {
      // Update existing
      const updateStmt = db.prepare(`
        UPDATE team_webhooks
        SET webhook_url = ?, updated_at = ?
        WHERE team_id = ?
      `);
      updateStmt.run(webhookUrl, now, teamId);
    } else {
      // Insert new
      const insertStmt = db.prepare(`
        INSERT INTO team_webhooks (team_id, webhook_url, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `);
      insertStmt.run(teamId, webhookUrl, now, now);
    }

    logger.info(`Webhook URL set for team ${teamId}`, { webhookUrl });
  }

  /**
   * Get webhook URL for a team (public method)
   */
  getTeamWebhookUrl(teamId: string): string | null {
    return this.getWebhookUrl(teamId);
  }

  /**
   * Remove webhook URL for a team
   */
  removeWebhookUrl(teamId: string): void {
    const stmt = db.prepare('DELETE FROM team_webhooks WHERE team_id = ?');
    stmt.run(teamId);
    logger.info(`Webhook URL removed for team ${teamId}`);
  }

  /**
   * Get all webhook configurations (admin)
   */
  getAllWebhooks(): Array<{ teamId: string; webhookUrl: string; createdAt: string; updatedAt: string }> {
    const stmt = db.prepare('SELECT * FROM team_webhooks');
    const rows = stmt.all() as any[];

    return rows.map((row: any) => ({
      teamId: row.team_id,
      webhookUrl: row.webhook_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}

export default new ChatService();
