import express from 'express';
import cors from 'cors';
import path from 'path';
import db from './database/connection';
import { runMigrations } from './database/migrate';
import { seedDatabase } from './database/seed';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import publicRoutes from './routes/public';
import adminRoutes from './routes/admin';
import healthRoutes from './routes/health';
import logger from './utils/logger';
import config from './config';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check (no auth required)
app.use('/health', healthRoutes);

// API routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Serve dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard')));

// Redirect root to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize database
async function initializeDatabase() {
  try {
    logger.info('Initializing database...');

    // Run migrations
    await runMigrations();

    // Check if we need to seed (check if SKUs exist)
    const skuCount = db.prepare('SELECT COUNT(*) as count FROM skus').get() as any;
    if (skuCount.count === 0) {
      logger.info('Seeding database...');
      await seedDatabase();
    }

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database', error as Error);
    process.exit(1);
  }
}

// Start server
async function start() {
  try {
    await initializeDatabase();

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Dashboard: http://localhost:${config.port}/dashboard`);
      logger.info(`API: http://localhost:${config.port}/api`);
      logger.info(`Health: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
start();
