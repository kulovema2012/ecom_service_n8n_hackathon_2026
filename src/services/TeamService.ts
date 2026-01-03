import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
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
    const rows = stmt.all() as any[];

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
    // Update all teams
    const updateStmt = db.prepare('UPDATE teams SET mode = ?');
    updateStmt.run(mode);

    // Regenerate API keys with new scopes
    const teams = await this.getAllTeams();

    for (const team of teams) {
      const newApiKey = AuthService.generateTeamToken(team.teamId, mode);

      const keyUpdateStmt = db.prepare('UPDATE teams SET api_key = ? WHERE team_id = ?');
      keyUpdateStmt.run(newApiKey, team.teamId);
    }
  }

  /**
   * Get platform mode (checks first team)
   */
  async getPlatformMode(): Promise<'development' | 'judging'> {
    const stmt = db.prepare('SELECT mode FROM teams LIMIT 1');
    const result = stmt.get() as any;

    return result?.mode || 'development';
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
