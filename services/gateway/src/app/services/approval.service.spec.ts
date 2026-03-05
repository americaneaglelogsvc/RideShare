import { ApprovalService } from './approval.service';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('ApprovalService', () => {
  let service: ApprovalService;
  let mockFrom: any;
  let mockSupabaseService: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new ApprovalService(mockSupabaseService);
  });

  describe('createRequest', () => {
    it('should create an approval request', async () => {
      const mockData = { id: 'req-1', request_type: 'bulk_payout', status: 'pending' };
      mockFrom.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.createRequest('t1', 'user-maker', 'bulk_payout', { total_amount_cents: 600000 });
      expect(result).toEqual(mockData);
    });

    it('should throw on DB error', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'DB fail' } });

      await expect(
        service.createRequest('t1', 'user-maker', 'bulk_payout', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should reject maker == checker', async () => {
      mockFrom.single.mockResolvedValue({
        data: { id: 'req-1', requested_by: 'user-A', expires_at: new Date(Date.now() + 86400000).toISOString() },
        error: null,
      });

      await expect(
        service.approve('req-1', 'user-A'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject expired request', async () => {
      mockFrom.single.mockResolvedValue({
        data: { id: 'req-1', requested_by: 'user-A', expires_at: new Date(Date.now() - 1000).toISOString() },
        error: null,
      });

      // Second call for expiry update
      mockFrom.single.mockResolvedValueOnce({
        data: { id: 'req-1', requested_by: 'user-A', expires_at: new Date(Date.now() - 1000).toISOString() },
        error: null,
      });

      await expect(
        service.approve('req-1', 'user-B'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if request not found', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: null });

      await expect(
        service.approve('nonexistent', 'user-B'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('requiresApproval', () => {
    it('should require approval for bulk payouts > $5000', () => {
      expect(service.requiresApproval('bulk_payout', { total_amount_cents: 600000 })).toBe(true);
      expect(service.requiresApproval('bulk_payout', { total_amount_cents: 400000 })).toBe(false);
    });

    it('should always require approval for suspensions', () => {
      expect(service.requiresApproval('tenant_suspension', {})).toBe(true);
      expect(service.requiresApproval('driver_suspension', {})).toBe(true);
    });

    it('should always require approval for policy publish', () => {
      expect(service.requiresApproval('policy_publish', {})).toBe(true);
    });

    it('should not require approval for unknown types', () => {
      expect(service.requiresApproval('random_action', {})).toBe(false);
    });
  });
});
