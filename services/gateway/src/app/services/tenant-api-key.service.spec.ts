/**
 * @req TEN-AUTH-010 — Tenant API Key management
 */
import { TenantApiKeyService } from './tenant-api-key.service';

describe('TenantApiKeyService', () => {
  let service: TenantApiKeyService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn().mockImplementation(function(cb: any) {
        return Promise.resolve({ data: [], error: null }).then(cb);
      })
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new TenantApiKeyService(mockSupabaseService as any);
  });

  describe('generateKey', () => {
    it('generates and stores a new API key', async () => {
      mockFrom.single.mockResolvedValue({ 
        data: { id: 'k1' }, 
        error: null 
      });

      const result = await service.generateKey('t1', 'Admin Key');
      expect(result.raw_key).toContain('uwd_live_');
    });
  });

  describe('validateKey', () => {
    it('returns tenant info for valid key', async () => {
      mockFrom.single.mockResolvedValue({ 
        data: { tenant_id: 't1', id: 'k1', is_active: true }, 
        error: null 
      });

      const result = await service.validateKey('uwd_live_valid');
      expect(result.tenantId).toBe('t1');
    });
  });
});
