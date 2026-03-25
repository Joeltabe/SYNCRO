import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

/**
 * Logs the start and end of every HTTP request including:
 *   - method, path, status code, duration (ms)
 *   - requestId and userId are injected automatically by the logger
 *
 * Must be registered AFTER requestIdMiddleware so the context is already set.
 */
export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startMs = Date.now();

  logger.info('Request started', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Hook into the response 'finish' event to log completion
  res.on('finish', () => {
    const durationMs = Date.now() - startMs;
    const level = res.statusCode >= 500 ? 'error'
                : res.statusCode >= 400 ? 'warn'
                : 'info';

    logger[level]('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
    });
  });

  next();
}
