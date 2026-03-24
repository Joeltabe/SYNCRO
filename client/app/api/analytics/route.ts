import { type NextRequest } from "next/server"
import { createApiRoute, createSuccessResponse, RateLimiters } from "@/lib/api/index"
import { HttpStatus } from "@/lib/api/types"
import { createClient } from "@/lib/supabase/server"

export const GET = createApiRoute(
  async (request: NextRequest, context, user) => {
    if (!user) {
      throw new Error("User not authenticated")
    }

    const supabase = await createClient()

    // Fetch user's subscriptions for analytics
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("price, category, status, created_at")
      .eq("user_id", user.id)
      .eq("status", "active")

    if (error) {
      throw new Error(`Failed to fetch analytics: ${error.message}`)
    }

    // Calculate analytics
    const totalSpend = subscriptions?.reduce((sum, sub) => sum + (sub.price || 0), 0) || 0
    const monthlySpend = totalSpend // Simplified - in production, calculate based on billing cycles

    // Category breakdown
    const categoryMap = new Map<string, number>()
    subscriptions?.forEach((sub) => {
      const category = sub.category || "Uncategorized"
      categoryMap.set(category, (categoryMap.get(category) || 0) + (sub.price || 0))
    })

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, spend]) => ({
      category,
      spend,
      percentage: totalSpend > 0 ? Math.round((spend / totalSpend) * 100) : 0,
    }))

    // Spend trend (simplified - in production, calculate from historical data)
    const spendTrend = [
      { month: "Jan", spend: Math.round(totalSpend * 0.8) },
      { month: "Feb", spend: Math.round(totalSpend * 0.9) },
      { month: "Mar", spend: totalSpend },
    ]

    const analytics = {
      totalSpend,
      monthlySpend,
      categoryBreakdown,
      spendTrend,
    }

    return createSuccessResponse(
      { analytics },
      HttpStatus.OK,
      context.requestId
    )
  },
  {
    requireAuth: true,
    rateLimit: RateLimiters.standard,
  }
)
