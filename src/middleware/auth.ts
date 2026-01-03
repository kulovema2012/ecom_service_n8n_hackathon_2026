import { Request, Response, NextFunction } from 'express';
import AuthService, { Scope } from '../services/AuthService';

export interface AuthRequest extends Request {
  teamId?: string | null;
  scopes?: Scope[];
}

/**
 * Authentication middleware
 * Validates JWT and attaches teamId and scopes to request
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = AuthService.validateToken(token);

    req.teamId = payload.teamId;
    req.scopes = payload.scopes;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require specific scope middleware
 */
export function requireScope(requiredScope: Scope) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.scopes) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (AuthService.hasScope({ scopes: req.scopes, teamId: req.teamId } as any, requiredScope)) {
      next();
    } else {
      res.status(403).json({ error: `Insufficient permissions. Required scope: ${requiredScope}` });
    }
  };
}

/**
 * Require admin access
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.scopes?.includes('admin:all')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}
