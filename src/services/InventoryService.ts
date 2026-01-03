import { v4 as uuidv4 } from 'uuid';
import { Inventory, InventoryEvent, RestockDTO, ReserveDTO } from '../models/Inventory';
import { db } from '../database/connection';
import logger from '../utils/logger';

export class InventoryService {
  /**
   * Get all inventory for a team
   */
  async getInventory(teamId: string): Promise<Inventory[]> {
    const stmt = db.prepare(`
      SELECT
        i.team_id,
        i.sku,
        s.name,
        i.stock,
        i.reserved,
        (i.stock - i.reserved) as available,
        i.version,
        i.updated_at
      FROM inventory i
      JOIN skus s ON i.sku = s.sku
      WHERE i.team_id = ?
      ORDER BY i.sku
    `);

    const rows = stmt.all(teamId) as any[];
    return rows.map(this.mapRowToInventory);
  }

  /**
   * Get single inventory item
   */
  async getInventoryItem(teamId: string, sku: string): Promise<Inventory | null> {
    const stmt = db.prepare(`
      SELECT
        i.team_id,
        i.sku,
        s.name,
        i.stock,
        i.reserved,
        (i.stock - i.reserved) as available,
        i.version,
        i.updated_at
      FROM inventory i
      JOIN skus s ON i.sku = s.sku
      WHERE i.team_id = ? AND i.sku = ?
    `);

    const row = stmt.get(teamId, sku) as any;
    return row ? this.mapRowToInventory(row) : null;
  }

  /**
   * Restock inventory (add stock)
   */
  async restock(dto: RestockDTO): Promise<void> {
    logger.audit('Inventory restocked', { teamId: dto.teamId, sku: dto.sku, qty: dto.quantity });

    const current = await this.getInventoryItem(dto.teamId, dto.sku);

    if (!current) {
      throw new Error(`Inventory not found for ${dto.teamId}/${dto.sku}`);
    }

    const newStock = current.stock + dto.quantity;

    // Update inventory with version check
    const updateStmt = db.prepare(`
      UPDATE inventory
      SET stock = ?, version = version + 1, updated_at = ?
      WHERE team_id = ? AND sku = ? AND version = ?
    `);

    const result = updateStmt.run(newStock, new Date().toISOString(), dto.teamId, dto.sku, current.version);

    if (result.changes === 0) {
      throw new Error('Concurrent modification detected');
    }

    // Log to inventory_events
    this.logInventoryEvent({
      id: uuidv4(),
      teamId: dto.teamId,
      sku: dto.sku,
      type: 'restocked',
      quantity: dto.quantity,
      previousStock: current.stock,
      newStock: newStock,
      by: dto.by,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Reserve inventory (decrease available)
   */
  async reserve(dto: ReserveDTO): Promise<boolean> {
    const current = await this.getInventoryItem(dto.teamId, dto.sku);

    if (!current) {
      throw new Error(`Inventory not found for ${dto.teamId}/${dto.sku}`);
    }

    // Check if enough stock available
    if (current.available < dto.quantity) {
      return false; // Not enough stock
    }

    const newReserved = current.reserved + dto.quantity;

    // Update inventory
    const updateStmt = db.prepare(`
      UPDATE inventory
      SET reserved = ?, version = version + 1, updated_at = ?
      WHERE team_id = ? AND sku = ? AND version = ?
    `);

    const result = updateStmt.run(newReserved, new Date().toISOString(), dto.teamId, dto.sku, current.version);

    if (result.changes === 0) {
      throw new Error('Concurrent modification detected');
    }

    // Log to inventory_events
    this.logInventoryEvent({
      id: uuidv4(),
      teamId: dto.teamId,
      sku: dto.sku,
      type: 'reserved',
      quantity: dto.quantity,
      previousStock: current.stock,
      newStock: current.stock,
      by: 'system',
      createdAt: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Release reserved inventory
   */
  async release(teamId: string, sku: string, quantity: number, orderId: string): Promise<boolean> {
    const current = await this.getInventoryItem(teamId, sku);
    if (!current) return false;

    // Decrease stock and reserved
    const newStock = current.stock - quantity;
    const newReserved = current.reserved - quantity;

    if (newStock < 0 || newReserved < 0) {
      throw new Error('Invalid release: would result in negative values');
    }

    const updateStmt = db.prepare(`
      UPDATE inventory
      SET stock = ?, reserved = ?, version = version + 1, updated_at = ?
      WHERE team_id = ? AND sku = ? AND version = ?
    `);

    const result = updateStmt.run(newStock, newReserved, new Date().toISOString(), teamId, sku, current.version);

    if (result.changes === 0) {
      throw new Error('Concurrent modification detected');
    }

    return true;
  }

  /**
   * Manual adjustment (staff only)
   */
  async adjust(teamId: string, sku: string, quantity: number, reason: string, by: 'staff'): Promise<void> {
    const current = await this.getInventoryItem(teamId, sku);
    if (!current) {
      throw new Error(`Inventory not found for ${teamId}/${sku}`);
    }

    const newStock = current.stock + quantity;
    if (newStock < 0) {
      throw new Error('Cannot adjust to negative stock');
    }

    const updateStmt = db.prepare(`
      UPDATE inventory
      SET stock = ?, version = version + 1, updated_at = ?
      WHERE team_id = ? AND sku = ? AND version = ?
    `);

    const result = updateStmt.run(newStock, new Date().toISOString(), teamId, sku, current.version);

    if (result.changes === 0) {
      throw new Error('Concurrent modification detected');
    }

    // Log to inventory_events
    this.logInventoryEvent({
      id: uuidv4(),
      teamId: teamId,
      sku: sku,
      type: 'adjusted',
      quantity: quantity,
      previousStock: current.stock,
      newStock: newStock,
      by: by,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Initialize inventory for a new team
   */
  async initializeTeamInventory(teamId: string): Promise<void> {
    // Get all SKUs with initial stock
    const skusStmt = db.prepare('SELECT sku, initial_stock FROM skus');
    const skus = skusStmt.all() as any[];

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO inventory (team_id, sku, stock, reserved, version, updated_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `);

    const now = new Date().toISOString();

    for (const sku of skus) {
      insertStmt.run(teamId, sku.sku, sku.initial_stock, 0, now);
    }
  }

  private logInventoryEvent(event: InventoryEvent): void {
    const stmt = db.prepare(`
      INSERT INTO inventory_events (id, team_id, sku, type, quantity, previous_stock, new_stock, by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.teamId,
      event.sku,
      event.type,
      event.quantity,
      event.previousStock,
      event.newStock,
      event.by,
      event.createdAt
    );
  }

  private mapRowToInventory(row: any): Inventory {
    return {
      teamId: row.team_id,
      sku: row.sku,
      name: row.name,
      stock: row.stock,
      reserved: row.reserved,
      available: row.available,
      version: row.version,
      updatedAt: row.updated_at,
    };
  }
}

export default new InventoryService();
