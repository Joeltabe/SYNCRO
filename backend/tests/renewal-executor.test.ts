import { renewalExecutor } from '../src/services/renewal-executor';

jest.mock('../src/config/database', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../src/config/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  __esModule: true,
}));

jest.mock('../src/services/blockchain-service', () => ({
  blockchainService: {
    syncSubscription: jest.fn(),
  },
}));

jest.mock('../src/utils/transaction', () => ({
  DatabaseTransaction: {
    execute: jest.fn(),
  },
}));

import { supabase } from '../src/config/database';
import { blockchainService } from '../src/services/blockchain-service';
import { DatabaseTransaction } from '../src/utils/transaction';

describe('RenewalExecutor', () => {
  const mockRequest = {
    subscriptionId: 'sub-123',
    userId: 'user-456',
    approvalId: 'approval-789',
    amount: 9.99,
  };

  const validApproval = {
    subscription_id: 'sub-123',
    approval_id: 'approval-789',
    max_spend: 15.0,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    used: false,
  };

  const validSubscription = {
    id: 'sub-123',
    status: 'active',
    next_billing_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  };

  function makeChain(singleValue: any, insertValue = { data: null, error: null }) {
    return {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue(insertValue),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(singleValue),
    };
  }

  beforeEach(() => {
    // Re-apply after resetMocks clears everything
    (DatabaseTransaction.execute as jest.Mock).mockImplementation(
      (fn: (client: any) => any) => fn(supabase)
    );
    (blockchainService.syncSubscription as jest.Mock).mockResolvedValue({
      success: true,
      transactionHash: 'tx-hash-abc123',
    });
  });

  it('should execute renewal successfully', async () => {
    let approvalCalls = 0;
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'renewal_approvals') {
        approvalCalls++;
        if (approvalCalls === 1) return makeChain({ data: validApproval, error: null });
        return makeChain({ data: null, error: null });
      }
      if (table === 'subscriptions') return makeChain({ data: validSubscription, error: null });
      if (table === 'renewal_logs') return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });

    const result = await renewalExecutor.executeRenewal(mockRequest);

    expect(result.success).toBe(true);
    expect(result.subscriptionId).toBe(mockRequest.subscriptionId);
    expect(result.transactionHash).toBeDefined();
  });

  it('should fail with invalid approval', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'renewal_approvals') return makeChain({ data: null, error: { message: 'Not found' } });
      if (table === 'renewal_logs') return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });

    const result = await renewalExecutor.executeRenewal({ ...mockRequest, approvalId: 'invalid' });

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('invalid_approval');
  });

  it('should fail when billing window invalid', async () => {
    const farFuture = {
      ...validSubscription,
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'renewal_approvals') return makeChain({ data: validApproval, error: null });
      if (table === 'subscriptions') return makeChain({ data: farFuture, error: null });
      if (table === 'renewal_logs') return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });

    const result = await renewalExecutor.executeRenewal(mockRequest);

    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('billing_window_invalid');
  });

  it('should retry on retryable failures', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'renewal_approvals') return makeChain({ data: null, error: { message: 'Not found' } });
      if (table === 'renewal_logs') return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });

    const result = await renewalExecutor.executeRenewalWithRetry(mockRequest, 3);

    expect(result).toBeDefined();
  });
});
