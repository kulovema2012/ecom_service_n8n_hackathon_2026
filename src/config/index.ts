import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || './data/platform.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  defaultMode: (process.env.DEFAULT_MODE || 'development') as 'development' | 'judging',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // n8n Webhook configuration
  webhookEnabled: process.env.WEBHOOK_ENABLED === 'true',
  webhookTimeout: parseInt(process.env.WEBHOOK_TIMEOUT || '5000'), // 5 seconds
  defaultWebhookUrl: process.env.DEFAULT_WEBHOOK_URL || '',
};

// Validate required config
function validateConfig() {
  if (config.nodeEnv === 'production' && config.jwtSecret === 'dev-secret-change-in-production') {
    throw new Error('JWT_SECRET must be set in production');
  }
}

validateConfig();

export default config;
