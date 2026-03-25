import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';
import logger from '../config/logger';
import { setRequestUserId } from './requestContext';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Authentication middleware
 * Supports both JWT tokens (Bearer) and HTTP-only cookies
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to get token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.authToken) {
      // Fallback to cookie-based auth
      token = req.cookies.authToken;
    }

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token required',
      });
      return;
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Authentication failed', { error: error?.message });
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    // Attach user to request and propagate to log context
    req.user = {
      id: user.id,
      email: user.email || '',
    };
    setRequestUserId(user.id);

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that work both authenticated and unauthenticated if there's any later on.
 */
export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.authToken) {
      token = req.cookies.authToken;
    }

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email || '',
        };
        setRequestUserId(user.id);
      }
    }

    next();
  } catch (error) {
    // Continue even on error for optional auth
    next();
  }
}
