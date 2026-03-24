/**
 * Rate Limiting Middleware
 * Provides in-memory rate limiting for API routes
 * For production, consider using Redis-based rate limiting
 */

import { type NextRequest } from 'next/server'
import { ApiErrors } from './errors'

type RateLimitConfig = {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string // Custom key generator
}

type RateLimitStore = Map<string, { count: number; resetAt: number }>

// In-memory store (use Redis in production)
const store: RateLimitStore = new Map()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (value.resetAt < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  return `rate_limit:${ip}`
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = config.keyGenerator 
    ? config.keyGenerator(request)
    : defaultKeyGenerator(request)

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    }
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  store.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Rate limit middleware factory
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (request: NextRequest): void => {
    const result = checkRateLimit(request, config)

    if (!result.allowed) {
      const resetSeconds = Math.ceil((result.resetAt - Date.now()) / 1000)
      throw ApiErrors.rateLimitExceeded(
        `Rate limit exceeded. Try again in ${resetSeconds} seconds.`
      )
    }
  }
}

/**
 * Predefined rate limiters
 */
export const RateLimiters = {
  // Strict: 10 requests per minute
  strict: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
  }),

  // Standard: 100 requests per 15 minutes
  standard: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  }),

  // Generous: 1000 requests per hour
  generous: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 1000,
  }),

  // Auth endpoints: 5 requests per 15 minutes
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  }),
}

/**
 * User-based rate limiter (requires authentication)
 */
export function createUserRateLimiter(config: RateLimitConfig) {
  return (request: NextRequest, userId: string): void => {
    const userConfig: RateLimitConfig = {
      ...config,
      keyGenerator: () => `rate_limit:user:${userId}`,
    }

    const result = checkRateLimit(request, userConfig)

    if (!result.allowed) {
      const resetSeconds = Math.ceil((result.resetAt - Date.now()) / 1000)
      throw ApiErrors.rateLimitExceeded(
        `Rate limit exceeded. Try again in ${resetSeconds} seconds.`
      )
    }
  }
}

