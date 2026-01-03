import { Request, Response, NextFunction } from 'express';
import { db } from '../database/connection';

/**
 * Get current platform mode
 */
export function getPlatformMode(): 'development' | 'judging' {
  const stmt = db.prepare('SELECT mode FROM teams LIMIT 1');
  const result = stmt.get() as any;

  // Default to development if no teams exist
  return result?.mode || 'development';
}

/**
 * Middleware to block write operations in judging mode
 */
export function requireDevelopmentMode(req: Request, res: Response, next: NextFunction): void {
  const mode = getPlatformMode();

  if (mode === 'judging') {
    res.status(403).json({
      error: 'Operation not allowed in judging mode',
      mode,
      message: 'Write operations are disabled during judging'
    });
    return;
  }

  next();
}

/**
 * Middleware to check if platform is in judging mode
 */
export function requireJudgingMode(req: Request, res: Response, next: NextFunction): void {
  const mode = getPlatformMode();

  if (mode !== 'judging') {
    res.status(403).json({
      error: 'Operation requires judging mode',
      mode,
      message: 'This endpoint can only be accessed during judging'
    });
    return;
  }

  next();
}
