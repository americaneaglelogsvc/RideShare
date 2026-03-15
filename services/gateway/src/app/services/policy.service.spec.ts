/**
 * @req SYS-POL-010 — Versioned tenant configuration policies
 */
import { PolicyService } from './policy.service';

describe('PolicyService', () => {
  let service: PolicyService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new PolicyService(mockSupabaseService as any);
  });

  describe('createDraft', () => {
    it('creates a draft with version 1 when no previous versions exist', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
      mockFrom.single.mockResolvedValue({ 
        data: { id: 'p1', version: 1, status: 'draft' }, 
        error: null 
      });

      const result = await service.createDraft('t1', 'user-1', { 
        policy_type: 'cancellation', 
        config_json: { fee_cents: 500 } 
      });

      expect(result.version).toBe(1);
      expect(result.status).toBe('draft');
    });

    it('throws BadRequestException when insert fails', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'constraint violation' } });

      await expect(
        service.createDraft('t1', 'user-1', { policy_type: 'cancellation', config_json: {} }),
      ).rejects.toThrow('constraint violation');
    });
  });
});
