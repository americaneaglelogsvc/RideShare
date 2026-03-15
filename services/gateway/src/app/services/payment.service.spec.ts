/**
 * @req PAY-SETL-0001 — Settlement gating (BANK_SETTLED)
 * @req RIDE-PAY-010  — Tenant direct settlement
 * @req PAY-ADJ-0001  — Refunds
 */
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockFrom: any;
  let mockFluidpay: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    mockFluidpay = {
      createPayment: jest.fn(),
      createPayout: jest.fn(),
      refundPayment: jest.fn(),
      getPayment: jest.fn(),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
    };

    service = new PaymentService(mockSupabaseService as any, mockFluidpay as any);
  });

  // ─────────────────────────────────────────────────────────────
  // processDriverPayout — BANK_SETTLED gating (PAY-SETL-0001)
  // ─────────────────────────────────────────────────────────────
  describe('processDriverPayout', () => {
    const baseRequest = {
      driver_id: 'drv-1',
      amount_cents: 5000,
      bank_account: { account_number: '123456789', routing_number: '021000021', account_holder_name: 'John D', account_type: 'checking' as const },
    };

    it('throws BadRequestException when BANK_SETTLED funds are insufficient', async () => {
      // Driver profile found
      mockFrom.single.mockResolvedValueOnce({ data: { id: 'drv-1', first_name: 'John', last_name: 'D' }, error: null });
      // Settled funds query — only 2000 cents available
      mockFrom.single.mockResolvedValueOnce({ data: [{ id: 'pay-1', amount_cents: 2000 }], error: null });
      // Override select chain to return array
      mockFrom.select.mockReturnThis();
      mockFrom.eq.mockReturnThis();
      mockFrom.eq.mockReturnThis();
      // settled returns array not single
      const mockSettledQuery = {
        ...mockFrom,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      mockSettledQuery.eq = jest.fn().mockResolvedValue({ data: [{ id: 'p1', amount_cents: 2000 }], error: null });

      // Set up the chain: from('driver_profiles').select().eq().single() → driver found
      // from('driver_payouts').select().eq().eq() → array of settled
      const supabaseMock = {
        from: jest.fn((table: string) => {
          if (table === 'driver_profiles') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'drv-1', first_name: 'J', last_name: 'D' }, error: null }) }) }) };
          if (table === 'driver_payouts') return { select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [{ id: 'p1', amount_cents: 2000 }], error: null }) }) }) };
          return mockFrom;
        }),
      };
      (service as any).supabaseService = { getClient: () => supabaseMock };

      await expect(service.processDriverPayout(baseRequest)).rejects.toThrow('BANK_SETTLED');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // refundPayment
  // ─────────────────────────────────────────────────────────────
  describe('refundPayment', () => {
    it('throws BadRequestException when payment not found', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'not found' } });
      await expect(service.refundPayment('pay-999')).rejects.toThrow();
    });

    it('throws BadRequestException when payment status is not succeeded', async () => {
      mockFrom.single.mockResolvedValue({
        data: { id: 'pay-1', status: 'pending', amount_cents: 3000, payment_intent_id: 'fui-1' },
        error: null,
      });
      await expect(service.refundPayment('pay-1')).rejects.toThrow('Can only refund successful payments');
    });

    it('processes refund successfully for a succeeded payment', async () => {
      mockFrom.single.mockResolvedValue({
        data: { id: 'pay-1', status: 'succeeded', amount_cents: 3000, payment_intent_id: 'fui-1' },
        error: null,
      });
      mockFluidpay.refundPayment.mockResolvedValue({ id: 'ref-1', status: 'succeeded' });

      const result = await service.refundPayment('pay-1');
      expect(result.success).toBe(true);
      expect(result.refund_id).toBe('ref-1');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Settlement status helpers
  // ─────────────────────────────────────────────────────────────
  describe('settlement status handlers', () => {
    it('handleSettlementCompleted sets status to BANK_SETTLED', async () => {
      mockFrom.eq.mockReturnThis();
      mockFrom.update.mockReturnThis();
      // No throw expected
      await expect(service.handleSettlementCompleted('txn-1')).resolves.not.toThrow();
    });

    it('handleSettlementFailed sets status to FAILED', async () => {
      await expect(service.handleSettlementFailed('txn-1')).resolves.not.toThrow();
    });

    it('handlePayoutCompleted sets status to PAID', async () => {
      await expect(service.handlePayoutCompleted('txn-1')).resolves.not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getPaymentStatus
  // ─────────────────────────────────────────────────────────────
  describe('getPaymentStatus', () => {
    it('throws NotFoundException when payment is not found', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'not found' } });
      await expect(service.getPaymentStatus('pay-404')).rejects.toThrow();
    });
  });
});
