import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '30d'; // Tokens valid for 30 days

export type Scope =
  | 'read:inventory'
  | 'read:events'
  | 'write:chat'
  | 'write:events'
  | 'write:inventory'
  | 'admin:all';

export interface TokenPayload {
  teamId: string | null;
  scopes: Scope[];
  iat: number;
  exp: number;
}

export class AuthService {
  /**
   * Generate JWT for a team
   */
  generateTeamToken(teamId: string, mode: 'development' | 'judging'): string {
    const scopes: Scope[] = ['read:inventory', 'read:events', 'write:chat'];

    // In development mode, teams can also send events
    if (mode === 'development') {
      scopes.push('write:events');
    }

    const payload = {
      teamId,
      scopes,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
      jwtid: uuidv4(),
    });
  }

  /**
   * Generate admin JWT
   */
  generateAdminToken(): string {
    const payload = {
      teamId: null,
      scopes: ['admin:all'] as Scope[],
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
      jwtid: uuidv4(),
    });
  }

  /**
   * Validate JWT and return payload
   */
  validateToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      return {
        teamId: decoded.teamId || null,
        scopes: decoded.scopes || [],
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Check if payload has required scope
   */
  hasScope(payload: TokenPayload, requiredScope: Scope): boolean {
    // Admin has all scopes
    if (payload.scopes.includes('admin:all')) {
      return true;
    }

    return payload.scopes.includes(requiredScope);
  }

  /**
   * Check if payload has any of the required scopes
   */
  hasAnyScope(payload: TokenPayload, requiredScopes: Scope[]): boolean {
    // Admin has all scopes
    if (payload.scopes.includes('admin:all')) {
      return true;
    }

    return requiredScopes.some(scope => payload.scopes.includes(scope));
  }
}

export default new AuthService();
