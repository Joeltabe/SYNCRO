jest.mock('../src/config/database', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../src/config/logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  __esModule: true,
}));

jest.mock('../src/services/blockchain-service', () => ({
  blockchainService: { syncSubscription: jest.fn() },
}));

jest.mock('../src/utils/transaction', () => ({
  DatabaseTransaction: {
    execute: jest.fn().mockImplementation(async (cb) => {
      const db = jest.requireMock('../src/config/database');
      return cb(db.supabase);
    }),
  },
}));

import { RenewalExecutor } from '../src/services/renewal-executor';
import { supabase } from '../src/config/database';
import { blockchainService } from '../src/services/blockchain-service';

describe('RenewalExecutor', () => {
  let executor: RenewalExecutor;
  const mockRequest = {
    subscriptionId: 'sub-123',
    userId: 'user-456',
    approvalId: 'approval-789',
    amount: 9.99,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    executor = new RenewalExecutor();
  });

  function makeChain(resolvedValue: any) {
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      single: jest.fn().mockResolvedValue(resolvedValue),
    };
  }

  it('should execute renewal successfully', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'renewal_approvals') return makeChain({ data: { approval_id: 'approval-789', max_spend: 15.0, expires_at: null, used: false }, error: null });
      if (table === 'subscriptions') return makeChain({ data: { status: 'active', next_billing_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() }, error: null });
      return makeChain({ data: null, error: null });
    });
    (blockchainService.syncSubscription as jest.Mock).mockResolvedValue({ success: true, transactionHash: 'tx-hash-123' });

    const result = await executor.executeRenewal(mockRequest);
    expect(result.success).toBe(true);
    expect(result.transactionHash).toBe('tx-hash-123');
  });

  it('should fail with invalid approval', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'renewal_approvals') return makeChain({ data: null, error: { message: 'Not found' } });
      return makeChain({ data: null, error: null });
    });

    const result = await executor.executeRenewal(mockRequest);
    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('invalid_approval');
  });

  it('should fail when billing window invalid', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'renewal_approvals') return makeChain({ data: { approval_id: 'approval-789', max_spend: 15.0, expires_at: null, used: false }, error: null });
      if (table === 'subscriptions') return makeChain({ data: { status: 'active', next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }, error: null });
      return makeChain({ data: null, error: null });
    });

    const result = await executor.executeRenewal(mockRequest);
    expect(result.success).toBe(false);
    expect(result.failureReason).toBe('billing_window_invalid');
  });

  it('should retry on retryable failures', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'renewal_approvals') return makeChain({ data: null, error: { message: 'Not found' } });
      return makeChain({ data: null, error: null });
    });

    const result = await executor.executeRenewalWithRetry(mockRequest, 3);
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });
});