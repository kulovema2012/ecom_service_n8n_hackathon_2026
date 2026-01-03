import { Router } from 'express';
import db from '../database/connection';
import { getPlatformMode } from '../middleware/mode';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  try {
    // Check database connection
    const row = db.prepare('SELECT 1').get();

    res.json({
      status: 'healthy',
      database: row ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      mode: getPlatformMode(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
