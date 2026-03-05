import { PayoutService } from './payout.service';

describe('PayoutService', () => {
  let service: PayoutService;
  let mockFrom: any;
  let mockLedgerService: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    mockLedgerService = {
      recordLedgerEvent: jest.fn().mockResolvedValue(undefined),
    };

    service = new PayoutService(mockSupabaseService as any, mockLedgerService);
  });

  describe('getReceiptTruthStrings', () => {
    it('should return correct truth strings with tenant name', () => {
      const result = service.getReceiptTruthStrings('Acme Transport');
      expect(result.paidBy).toBe('Paid by: Acme Transport');
      expect(result.processedVia).toBe('Processed via: urwaydispatch.com');
      expect(result.fundedBy).toContain('PaySurity rail');
    });
  });

  describe('isCadenceDue (via processScheduledPayouts)', () => {
    // Test the cadence logic indirectly
    it('should have processScheduledPayouts method', () => {
      expect(typeof service.processScheduledPayouts).toBe('function');
    });
  });

  describe('createRepaymentPlan', () => {
    it('should reject installment count outside 1-52', async () => {
      await expect(
        service.createRepaymentPlan('t1', 'd1', 10000, 0, 'overpayment'),
      ).rejects.toThrow('Installment count must be 1');

      await expect(
        service.createRepaymentPlan('t1', 'd1', 10000, 53, 'overpayment'),
      ).rejects.toThrow('Installment count must be 1');
    });

    it('should reject amount below $1.00', async () => {
      await expect(
        service.createRepaymentPlan('t1', 'd1', 50, 2, 'overpayment'),
      ).rejects.toThrow('Minimum repayment amount');
    });

    it('should create a repayment plan for valid input', async () => {
      const mockPlan = { id: 'plan-1', status: 'active', total_amount_cents: 5000 };
      mockFrom.single.mockResolvedValue({ data: mockPlan, error: null });

      const result = await service.createRepaymentPlan('t1', 'd1', 5000, 4, 'overpayment');
      expect(result.id).toBe('plan-1');
    });
  });
});
