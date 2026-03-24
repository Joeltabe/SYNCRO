import { type NextRequest } from "next/server"
import Stripe from "stripe"
import { createApiRoute, createSuccessResponse, validateRequestBody, RateLimiters, ApiErrors } from "@/lib/api/index"
import { HttpStatus } from "@/lib/api/types"
import { z } from "zod"

// Validation schema
const paymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3, "Currency must be 3 characters").default("usd"),
  token: z.string().min(1, "Payment token is required"),
  planName: z.string().min(1, "Plan name is required"),
})

function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw ApiErrors.internalError("Stripe is not configured. Please contact support.")
  }
  return new Stripe(apiKey, {
    apiVersion: "2025-09-30.clover",
  })
}

export const POST = createApiRoute(
  async (request: NextRequest, context, user) => {
    if (!user) {
      throw new Error("User not authenticated")
    }

    // Validate request body
    const body = await validateRequestBody(request, paymentSchema)

    const stripe = getStripeClient()

    try {
      const charge = await stripe.charges.create({
        amount: Math.round(body.amount * 100), // Convert to cents
        currency: body.currency,
        source: body.token,
        description: `Subsync.AI - ${body.planName} Plan Upgrade`,
        metadata: {
          planName: body.planName,
          userId: user.id,
          userEmail: user.email || "",
        },
      })

      return createSuccessResponse(
        {
          payment: {
            id: charge.id,
            amount: charge.amount / 100, // Convert back to dollars
            currency: charge.currency,
            status: charge.status,
            createdAt: new Date(charge.created * 1000),
          },
        },
        HttpStatus.CREATED,
        context.requestId
      )
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw ApiErrors.internalError(`Payment processing failed: ${error.message}`)
      }
      throw error
    }
  },
  {
    requireAuth: true,
    rateLimit: RateLimiters.strict, // Stricter rate limit for payment endpoints
  }
)
