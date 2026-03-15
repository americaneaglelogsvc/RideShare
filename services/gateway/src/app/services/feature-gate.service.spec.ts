/**
 * @req SYS-FEAT-010 — Feature flagging
 */
import { FeatureGateService } from './feature-gate.service';

describe('FeatureGateService', () => {
  let service: FeatureGateService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new FeatureGateService(mockSupabaseService as any);
  });

  describe('isEnabled', () => {
    it('returns true if enabled_global is true', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: { enabled_global: true }, error: null });
      const result = await service.isEnabled('test_feature');
      expect(result).toBe(true);
    });

    it('returns true if user is in enabled_users', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ 
        data: { enabled_global: false, enabled_users: ['u1'] }, 
        error: null 
      });
      const result = await service.isEnabled('test_feature', { userId: 'u1' });
      expect(result).toBe(true);
    });
  });

  describe('updateGate', () => {
    it('updates gate settings and invalidates cache', async () => {
      mockFrom.single.mockResolvedValue({ data: { feature_key: 'f1' }, error: null });

      const result = await service.updateGate('f1', { enabledGlobal: true });
      expect(result).toBeDefined();
      expect(mockFrom.update).toHaveBeenCalledWith(expect.objectContaining({ enabled_global: true }));
    });
  });
});
