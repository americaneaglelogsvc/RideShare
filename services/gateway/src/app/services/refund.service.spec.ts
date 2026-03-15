/**
 * @req RIDE-PAYOUT-105 — Adjustments + reversals (refunds)
 */
import { RefundService } from './refund.service';

describe('RefundService', () => {
  let service: RefundService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new RefundService(mockSupabaseService as any);
  });

  describe('initiateRefund', () => {
    const baseReq = {
      tenantId: 't1',
      tripId: 'trip-1',
      amountCents: 2000,
      reason: 'Rider overcharged',
      initiatedBy: 'admin-1',
    };

    it('throws NotFoundException when trip not found', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'not found' } });
      await expect(service.initiateRefund(baseReq)).rejects.toThrow('Trip not found');
    });

    it('throws BadRequestException when trip status is not completed or cancelled', async () => {
      mockFrom.single
        .mockResolvedValueOnce({ data: { id: 'trip-1', status: 'active', fare_cents: 5000 }, error: null })
        .mockResolvedValue({ data: null, error: null });
      await expect(service.initiateRefund(baseReq)).rejects.toThrow('Cannot refund trip in status');
    });

    it('throws BadRequestException when amount exceeds trip fare', async () => {
      mockFrom.single
        .mockResolvedValueOnce({ data: { id: 'trip-1', status: 'completed', fare_cents: 1000 }, error: null })
        .mockResolvedValue({ data: null, error: null });
      await expect(service.initiateRefund({ ...baseReq, amountCents: 2000 })).rejects.toThrow('exceeds trip fare');
    });

    it('creates refund and returns breakdown with correct rider_credit_cents', async () => {
      // trip fetch
      mockFrom.single
        .mockResolvedValueOnce({ data: { id: 'trip-1', status: 'completed', fare_cents: 5000 }, error: null })
        // ledger lookup
        .mockResolvedValueOnce({ data: { platform_fee_cents: 750, tenant_net_cents: 3500, driver_payout_cents: 3750 }, error: null })
        // refund insert
        .mockResolvedValueOnce({ data: { id: 'ref-1' }, error: null });

      const result = await service.initiateRefund(baseReq);
      expect(result.refund_id).toBe('ref-1');
      expect(result.status).toBe('COMPLETED');
      expect(result.breakdown.rider_credit_cents).toBe(2000);
    });
  });

  describe('getRefundHistory', () => {
    it('returns paginated refund history for tenant', async () => {
      const refunds = [{ id: 'r1', status: 'COMPLETED', amount_cents: 2000 }];
      mockFrom.limit = jest.fn().mockResolvedValue({ data: refunds, error: null });
      const result = await service.getRefundHistory('t1', 20);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('COMPLETED');
    });

    it('throws on DB error', async () => {
      mockFrom.limit = jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' } });
      await expect(service.getRefundHistory('t1')).rejects.toThrow('Failed to fetch refunds');
    });
  });
});
