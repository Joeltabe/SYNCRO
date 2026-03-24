/**
 * API Infrastructure - Main Export
 * Centralized exports for all API utilities
 */

// Types
export * from './types'

// Error Handling
export * from './errors'

// Authentication & Authorization
export * from './auth'

// Validation
export * from './validation'

// Rate Limiting
export * from './rate-limit'

// Environment
export * from './env'

/**
 * Helper to create a complete API route handler with all middleware
 */
import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withErrorHandling, createSuccessResponse } from './errors'
import { requireAuth, createRequestContext } from './auth'
import { type RequestContext, type ApiResponse } from './types'
import { RateLimiters } from './rate-limit'
import { isMaintenanceMode } from './env'
import { ApiErrors } from './errors'

type RouteHandler = (
  request: NextRequest,
  context: RequestContext,
  user?: Awaited<ReturnType<typeof requireAuth>>
) => Promise<NextResponse<ApiResponse>>

type RouteOptions = {
  requireAuth?: boolean
  requireRole?: string[]
  rateLimit?: (request: NextRequest) => void
  skipMaintenanceCheck?: boolean
}

/**
 * Create a fully configured API route handler
 */
export function createApiRoute(
  handler: RouteHandler,
  options: RouteOptions = {}
) {
  return withErrorHandling(async (request: NextRequest) => {
    // Check maintenance mode
    if (!options.skipMaintenanceCheck && isMaintenanceMode()) {
      throw ApiErrors.serviceUnavailable('Service is currently under maintenance')
    }

    // Apply rate limiting
    if (options.rateLimit) {
      options.rateLimit(request)
    }

    // Create request context
    const context = createRequestContext(request)

    // Handle authentication
    let user: Awaited<ReturnType<typeof requireAuth>> | undefined
    if (options.requireAuth) {
      user = await requireAuth(request)
      context.userId = user.id
      context.userEmail = user.email

      // Check role if required
      if (options.requireRole) {
        const userRole = user.user_metadata?.role || 'user'
        if (!options.requireRole.includes(userRole)) {
          throw ApiErrors.forbidden(`Requires one of: ${options.requireRole.join(', ')}`)
        }
      }
    }

    // Execute handler
    return handler(request, context, user)
  }, crypto.randomUUID())
}

