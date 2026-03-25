export interface Subscription {
  id: string;
  user_id: string;
  email_account_id: string | null;
  merchant_id: string | null;
  name: string;
  provider: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly' | 'quarterly';
  status: 'active' | 'cancelled' | 'paused' | 'trial' | 'expired';
  next_billing_date: string | null;
  category: string | null;
  logo_url: string | null;
  website_url: string | null;
  renewal_url: string | null;
  notes: string | null;
  tags: string[];
  expired_at: string | null;
  created_at: string;
  updated_at: string;
  last_renewal_cycle_id?: number | null;
  blockchain_created_at?: number | null;
  blockchain_activated_at?: number | null;
  blockchain_last_renewed_at?: number | null;
  blockchain_canceled_at?: number | null;
}

export interface SubscriptionCreateInput {
  name: string;
  provider?: string;
  merchant_id?: string;
  price: number;
  billing_cycle: 'monthly' | 'yearly' | 'quarterly';
  status?: 'active' | 'cancelled' | 'paused' | 'trial' | 'expired';
  next_billing_date?: string;
  category?: string;
  logo_url?: string;
  website_url?: string;
  renewal_url?: string;
  notes?: string;
  tags?: string[];
  email_account_id?: string;
}

export interface SubscriptionUpdateInput {
  name?: string;
  provider?: string;
  merchant_id?: string;
  price?: number;
  billing_cycle?: 'monthly' | 'yearly' | 'quarterly';
  status?: 'active' | 'cancelled' | 'paused' | 'trial' | 'expired';
  next_billing_date?: string;
  category?: string;
  logo_url?: string;
  website_url?: string;
  renewal_url?: string;
  notes?: string;
  tags?: string[];
}

/** Allowlist of fields a user is permitted to update.
 *  Does NOT include id, user_id, created_at — those can never be user-modified. */
export interface SubscriptionUpdateAllowlist {
  name?: string;
  provider?: string;
  merchant_id?: string;
  price?: number;
  billing_cycle?: Subscription['billing_cycle'];
  status?: Subscription['status'];
  next_billing_date?: string;
  category?: string;
  logo_url?: string;
  website_url?: string;
  renewal_url?: string;
  notes?: string;
  tags?: string[];
}

export interface ListSubscriptionsOptions {
  status?: Subscription['status'];
  category?: string;
  limit?: number;
  offset?: number;
}

export interface ListSubscriptionsResult {
  subscriptions: Subscription[];
  total: number;
}
