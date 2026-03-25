import { supabase } from "../config/database";
import { blockchainService } from "./blockchain-service";
import { renewalCooldownService } from "./renewal-cooldown-service";
import logger from "../config/logger";
import { DatabaseTransaction } from "../utils/transaction";
import type {
  Subscription,
  SubscriptionCreateInput,
  SubscriptionUpdateInput,
  ListSubscriptionsOptions,
  ListSubscriptionsResult,
} from "../types/subscription";

export interface BlockchainSyncResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface SubscriptionSyncResult {
  subscription: Subscription;
  blockchainResult?: BlockchainSyncResult;
  syncStatus: "synced" | "partial" | "failed";
}

/**
 * Subscription service with blockchain sync and transaction management
 */

export class SubscriptionService {
  async createSubscription(
    userId: string,
    input: SubscriptionCreateInput,
    idempotencyKey?: string
  ): Promise<SubscriptionSyncResult> {
    return await DatabaseTransaction.execute(async (client) => {
      try {
        const { data: subscription, error: dbError } = await client
          .from("subscriptions")
          .insert({
            user_id: userId,
            name: input.name,
            provider: input.provider || input.name,
            price: input.price,
            billing_cycle: input.billing_cycle,
            status: input.status || "active",
            next_billing_date: input.next_billing_date || null,
            category: input.category || null,
            logo_url: input.logo_url || null,
            website_url: input.website_url || null,
            renewal_url: input.renewal_url || null,
            notes: input.notes || null,
            tags: input.tags || [],
            email_account_id: input.email_account_id || null,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`);
        }

        // Attempt blockchain sync (non-blocking)
        let blockchainResult;
        let syncStatus: "synced" | "partial" | "failed" = "synced";

        try {
          blockchainResult = await blockchainService.syncSubscription(
            userId,
            subscription.id,
            "create",
            subscription,
          );

          if (!blockchainResult.success) {
            syncStatus = "partial";
            logger.warn("Blockchain sync failed for subscription creation", {
              subscriptionId: subscription.id,
              error: blockchainResult.error,
            });
          }
        } catch (blockchainError) {
          syncStatus = "partial";
          logger.error("Blockchain sync error (non-fatal):", blockchainError);
          blockchainResult = {
            success: false,
            error:
              blockchainError instanceof Error
                ? blockchainError.message
                : String(blockchainError),
          };
        }

        return {
          subscription,
          blockchainResult,
          syncStatus,
        };
      } catch (error) {
        logger.error("Subscription creation failed:", error);
        throw error;
      }
    });
  }

  // Update subscription with blockchain sync
  //Uses optimistic locking to prevent race conditions

  async updateSubscription(
    userId: string,
    subscriptionId: string,
    input: SubscriptionUpdateInput,
    expectedVersion?: number,
  ): Promise<SubscriptionSyncResult> {
    return await DatabaseTransaction.execute(async (client) => {
      try {
        // First, verify ownership and get current version
        const { data: existing, error: fetchError } = await client
          .from("subscriptions")
          .select("*")
          .eq("id", subscriptionId)
          .eq("user_id", userId)
          .single();

        if (fetchError || !existing) {
          throw new Error("Subscription not found or access denied");
        }
        // Explicit allowlist — prevents field injection attacks by never spreading raw input
        const {
          name,
          provider,
          merchant_id,
          price,
          billing_cycle,
          status,
          next_billing_date,
          category,
          logo_url,
          website_url,
          renewal_url,
          notes,
          tags,
        } = input;

        const updateData: Partial<SubscriptionUpdateInput> & { updated_at: string } = {
          ...(name !== undefined && { name }),
          ...(provider !== undefined && { provider }),
          ...(merchant_id !== undefined && { merchant_id }),
          ...(price !== undefined && { price }),
          ...(billing_cycle !== undefined && { billing_cycle }),
          ...(status !== undefined && { status }),
          ...(next_billing_date !== undefined && { next_billing_date }),
          ...(category !== undefined && { category }),
          ...(logo_url !== undefined && { logo_url }),
          ...(website_url !== undefined && { website_url }),
          ...(renewal_url !== undefined && { renewal_url }),
          ...(notes !== undefined && { notes }),
          ...(tags !== undefined && { tags }),
          updated_at: new Date().toISOString(),
        };

        const { data: subscription, error: updateError } = await client
          .from("subscriptions")
          .update(updateData)
          .eq("id", subscriptionId)
          .eq("user_id", userId)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        // Attempt blockchain sync
        let blockchainResult;
        let syncStatus: "synced" | "partial" | "failed" = "synced";

        try {
          blockchainResult = await blockchainService.syncSubscription(
            userId,
            subscriptionId,
            "update",
            subscription,
          );

          if (!blockchainResult.success) {
            syncStatus = "partial";
            logger.warn("Blockchain sync failed for subscription update", {
              subscriptionId,
              error: blockchainResult.error,
            });
          }
        } catch (blockchainError) {
          syncStatus = "partial";
          logger.error("Blockchain sync error (non-fatal):", blockchainError);
          blockchainResult = {
            success: false,
            error:
              blockchainError instanceof Error
                ? blockchainError.message
                : String(blockchainError),
          };
        }

        return {
          subscription,
          blockchainResult,
          syncStatus,
        };
      } catch (error) {
        logger.error("Subscription update failed:", error);
        throw error;
      }
    });
  }

  async cancelSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<SubscriptionSyncResult> {
    return await DatabaseTransaction.execute(async (client) => {
      try {
        const { data: subscription, error: fetchError } = await client
          .from("subscriptions")
          .select("*")
          .eq("id", subscriptionId)
          .eq("user_id", userId)
          .single();

        if (fetchError || !subscription) {
          throw new Error("Subscription not found or access denied");
        }

        if (subscription.status === "cancelled") {
          throw new Error("Subscription already cancelled");
        }

        const { data: updatedSubscription, error: updateError } = await client
          .from("subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionId)
          .eq("user_id", userId)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`);
        }

        let blockchainResult;
        let syncStatus: "synced" | "partial" | "failed" = "synced";

        try {
          blockchainResult = await blockchainService.syncSubscription(
            userId,
            subscriptionId,
            "cancel",
            updatedSubscription,
          );

          if (!blockchainResult.success) {
            syncStatus = "partial";
            logger.warn(
              "Blockchain sync failed for subscription cancellation",
              {
                subscriptionId,
                error: blockchainResult.error,
              },
            );
          }
        } catch (blockchainError) {
          syncStatus = "partial";
          logger.error("Blockchain sync error (non-fatal):", blockchainError);
          blockchainResult = {
            success: false,
            error:
              blockchainError instanceof Error
                ? blockchainError.message
                : String(blockchainError),
          };
        }

        return {
          subscription: updatedSubscription,
          blockchainResult,
          syncStatus,
        };
      } catch (error) {
        logger.error("Subscription cancellation failed:", error);
        throw error;
      }
    });
  }

  //  Delete subscription with blockchain sync

  // Get subscription by ID (with ownership check)

  async getSubscription(userId: string, subscriptionId: string): Promise<Subscription> {
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .eq("user_id", userId)
      .single();

    if (error || !subscription) {
      throw new Error("Subscription not found or access denied");
    }

    return subscription;
  }

  // List user's subscriptions
  async listSubscriptions(
    userId: string,
    options: ListSubscriptionsOptions = {},
  ): Promise<ListSubscriptionsResult> {
    let query = supabase
      .from("subscriptions")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options.status) {
      query = query.eq("status", options.status);
    }

    if (options.category) {
      query = query.eq("category", options.category);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    const { data: subscriptions, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }

    return {
      subscriptions: subscriptions || [],
      total: count || 0,
    };
  }

  /**
   * Check if a renewal can be attempted based on cooldown period
   * Returns cooldown status without enforcing it
   */
  async checkRenewalCooldown(
    subscriptionId: string,
  ): Promise<{
    canRetry: boolean;
    isOnCooldown: boolean;
    timeRemainingSeconds: number;
    message: string;
  }> {
    try {
      const cooldownStatus = await renewalCooldownService.checkCooldown(
        subscriptionId,
      );

      return {
        canRetry: cooldownStatus.canRetry,
        isOnCooldown: cooldownStatus.isOnCooldown,
        timeRemainingSeconds: cooldownStatus.timeRemainingSeconds,
        message: cooldownStatus.canRetry
          ? "Renewal can be attempted"
          : `Cooldown period active. Please wait ${cooldownStatus.timeRemainingSeconds} seconds before retrying.`,
      };
    } catch (error) {
      logger.error("Error checking renewal cooldown:", error);
      throw error;
    }
  }

  /**
   * Retry blockchain sync for a subscription with cooldown enforcement
   * Enforces minimum time gap between renewal attempts to prevent network spam
   */
  async retryBlockchainSync(
    userId: string,
    subscriptionId: string,
    forceBypass: boolean = false,
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      // Check cooldown unless forcing bypass (admin operations)
      if (!forceBypass) {
        const cooldownStatus = await renewalCooldownService.checkCooldown(
          subscriptionId,
        );

        if (cooldownStatus.isOnCooldown) {
          const error = `Cooldown period active. Please wait ${cooldownStatus.timeRemainingSeconds} seconds before retrying.`;
          logger.warn("Renewal attempt rejected due to cooldown", {
            subscription_id: subscriptionId,
            time_remaining_seconds: cooldownStatus.timeRemainingSeconds,
          });
          throw new Error(error);
        }
      }

      const subscription = await this.getSubscription(userId, subscriptionId);

      // Record the attempt before making the call
      await renewalCooldownService.recordRenewalAttempt(
        subscriptionId,
        false, // Assume failure initially
        "Attempt in progress",
        "retry",
      );

      const result = await blockchainService.syncSubscription(
        userId,
        subscriptionId,
        "update",
        subscription,
      );

      // Update the attempt status based on result
      if (result.success) {
        await renewalCooldownService.recordRenewalAttempt(
          subscriptionId,
          true,
          undefined,
          "retry",
        );
      } else {
        await renewalCooldownService.recordRenewalAttempt(
          subscriptionId,
          false,
          result.error || "Blockchain sync failed",
          "retry",
        );
      }

      return result;
    } catch (error) {
      // Record the failed attempt
      try {
        await renewalCooldownService.recordRenewalAttempt(
          subscriptionId,
          false,
          error instanceof Error ? error.message : String(error),
          "retry",
        );
      } catch (logError) {
        logger.warn("Failed to log renewal attempt:", logError);
      }

      logger.error("Renewal retry failed:", error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
