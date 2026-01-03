import request from 'supertest';
import express from 'express';
import publicRoutes from '../../src/routes/public';
import adminRoutes from '../../src/routes/admin';
import healthRoutes from '../../src/routes/health';
import { runMigrations } from '../../src/database/migrate';
import { seedDatabase } from '../../src/database/seed';
import { generateApiKey } from '../../src/services/AuthService';

describe('API Integration Tests', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', publicRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/health', healthRoutes);

  let teamApiKey: string;
  let adminApiKey: string;

  beforeAll(async () => {
    // Initialize in-memory database for tests
    process.env.DATABASE_PATH = ':memory:';

    // Set mode to development for testing
    process.env.DEFAULT_MODE = 'development';

    await runMigrations();
    await seedDatabase();

    // Generate API keys for testing
    teamApiKey = generateApiKey('team-01', ['read:inventory', 'read:events', 'write:chat', 'write:events']);
    adminApiKey = generateApiKey('admin', ['admin:all']);
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.database).toBe('connected');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should reject requests without auth token', async () => {
      const response = await request(app).get('/api/inventory');

      expect(response.status).toBe(401);
    });

    it('should reject invalid auth tokens', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should accept valid auth tokens', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${teamApiKey}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Public API - Inventory', () => {
    it('should get inventory for team', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${teamApiKey}`);

      expect(response.status).toBe(200);
      expect(response.body.teamId).toBe('team-01');
      expect(Array.isArray(response.body.inventory)).toBe(true);
    });
  });

  describe('Public API - Events', () => {
    beforeEach(async () => {
      // Create a test event
      await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${teamApiKey}`)
        .send({
          type: 'order.created',
          payload: { orderId: 'TEST-001', items: [] },
        });
    });

    it('should get events for team', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', `Bearer ${teamApiKey}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.events)).toBe(true);
      expect(response.body.events.length).toBeGreaterThan(0);
    });

    it('should filter events by type', async () => {
      const response = await request(app)
        .get('/api/events?type=order.created')
        .set('Authorization', `Bearer ${teamApiKey}`);

      expect(response.status).toBe(200);
      response.body.events.forEach((event: any) => {
        expect(event.type).toBe('order.created');
      });
    });

    it('should limit event results', async () => {
      const response = await request(app)
        .get('/api/events?limit=1')
        .set('Authorization', `Bearer ${teamApiKey}`);

      expect(response.status).toBe(200);
      expect(response.body.events.length).toBeLessThanOrEqual(1);
    });

    it('should create event with valid data', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${teamApiKey}`)
        .send({
          type: 'order.paid',
          payload: { orderId: 'TEST-002', amount: 100 },
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.type).toBe('order.paid');
    });

    it('should reject event creation with invalid type', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${teamApiKey}`)
        .send({
          type: 'invalid.type',
          payload: {},
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Public API - Chat', () => {
    it('should send chat message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${teamApiKey}`)
        .send({
          text: 'Test message',
          sessionId: 'test-session-001',
        });

      expect(response.status).toBe(204);
    });

    it('should reject empty chat message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${teamApiKey}`)
        .send({
          text: '',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Public API - Teams', () => {
    it('should get team info', async () => {
      const response = await request(app)
        .get('/api/teams/team-01')
        .set('Authorization', `Bearer ${teamApiKey}`);

      expect(response.status).toBe(200);
      expect(response.body.teamId).toBe('team-01');
    });

    it('should return 404 for non-existent team', async () => {
      const response = await request(app)
        .get('/api/teams/nonexistent-team')
        .set('Authorization', `Bearer ${teamApiKey}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Admin API - Events', () => {
    it('should inject event as admin', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .set('Authorization', `Bearer ${adminApiKey}`)
        .send({
          teamId: 'team-01',
          type: 'order.created',
          payload: { orderId: 'ADMIN-001', items: [] },
        });

      expect(response.status).toBe(201);
      expect(response.body.teamId).toBe('team-01');
    });

    it('should reject event injection for non-admin', async () => {
      const response = await request(app)
        .post('/api/admin/events')
        .set('Authorization', `Bearer ${teamApiKey}`)
        .send({
          teamId: 'team-01',
          type: 'order.created',
          payload: {},
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Admin API - Inventory', () => {
    it('should restock inventory as admin', async () => {
      const response = await request(app)
        .post('/api/admin/inventory')
        .set('Authorization', `Bearer ${adminApiKey}`)
        .send({
          teamId: 'team-01',
          sku: 'IT-001',
          quantity: 10,
          type: 'restock',
        });

      expect(response.status).toBe(200);
    });

    it('should reject inventory modification for non-admin', async () => {
      const response = await request(app)
        .post('/api/admin/inventory')
        .set('Authorization', `Bearer ${teamApiKey}`)
        .send({
          teamId: 'team-01',
          sku: 'IT-001',
          quantity: 10,
          type: 'restock',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Admin API - Mode', () => {
    it('should switch mode as admin', async () => {
      const response = await request(app)
        .post('/api/admin/mode')
        .set('Authorization', `Bearer ${adminApiKey}`)
        .send({
          mode: 'judging',
        });

      expect(response.status).toBe(200);
      expect(response.body.mode).toBe('judging');

      // Switch back to development
      await request(app)
        .post('/api/admin/mode')
        .set('Authorization', `Bearer ${adminApiKey}`)
        .send({ mode: 'development' });
    });

    it('should reject mode switch for non-admin', async () => {
      const response = await request(app)
        .post('/api/admin/mode')
        .set('Authorization', `Bearer ${teamApiKey}`)
        .send({
          mode: 'judging',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Admin API - Audit Logs', () => {
    it('should get events audit log', async () => {
      const response = await request(app)
        .get('/api/admin/audit/events')
        .set('Authorization', `Bearer ${adminApiKey}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.events)).toBe(true);
    });

    it('should get inventory audit log', async () => {
      const response = await request(app)
        .get('/api/admin/audit/inventory')
        .set('Authorization', `Bearer ${adminApiKey}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.events)).toBe(true);
    });

    it('should get messages audit log', async () => {
      const response = await request(app)
        .get('/api/admin/audit/messages')
        .set('Authorization', `Bearer ${adminApiKey}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    it('should reject audit log access for non-admin', async () => {
      const response = await request(app)
        .get('/api/admin/audit/events')
        .set('Authorization', `Bearer ${teamApiKey}`);

      expect(response.status).toBe(403);
    });
  });
});
