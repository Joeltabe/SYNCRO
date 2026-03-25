/**
 * Health Check Endpoint
 * Returns basic health status of the API
 */

import { createSuccessResponse } from '@/lib/api/errors'
import { HttpStatus } from '@/lib/api/types'

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  }

  return createSuccessResponse(health, HttpStatus.OK)
}

