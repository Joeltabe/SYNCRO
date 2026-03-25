import winston from 'winston';
import { requestContextStorage } from '../middleware/requestContext';

/**
 * Custom Winston format that automatically injects `requestId` and `userId`
 * from the current AsyncLocalStorage context into every log entry.
 * No manual propagation is required in service or route code.
 */
const requestContextFormat = winston.format((info: winston.Logform.TransformableInfo) => {
  const ctx = requestContextStorage.getStore();
  if (ctx) {
    info['requestId'] = ctx.requestId;
    if (ctx.userId) {
      info['userId'] = ctx.userId;
    }
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    requestContextFormat(),          // inject requestId / userId first
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'synchro-backend' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        requestContextFormat(),
        winston.format.colorize(),
        winston.format.printf((info: winston.Logform.TransformableInfo) => {
          const { level, message, timestamp, requestId, userId, ...meta } = info as {
            level: string;
            message: string;
            timestamp: string;
            requestId?: string;
            userId?: string;
            [key: string]: unknown;
          };
          const rid = requestId ? ` [${requestId}]` : '';
          const uid = userId ? ` [user:${userId}]` : '';
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}${rid}${uid}: ${message}${metaStr}`;
        })
      ),
    })
  );
}

export default logger;
