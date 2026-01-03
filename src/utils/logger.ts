import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'platform.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

enum LogLevel {
  INFO = 'INFO',
  ERROR = 'ERROR',
  AUDIT = 'AUDIT',
}

function log(level: LogLevel, message: string, meta?: object): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(meta && { meta }),
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  // Write to file
  fs.appendFileSync(LOG_FILE, logLine);

  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${level}] ${message}`, meta || '');
  }
}

export const logger = {
  info: (message: string, meta?: object) => log(LogLevel.INFO, message, meta),
  error: (message: string, error?: Error) => {
    log(LogLevel.ERROR, message, {
      message: error?.message,
      stack: error?.stack,
    });
  },
  audit: (action: string, meta?: object) => log(LogLevel.AUDIT, action, meta),
};

export default logger;
