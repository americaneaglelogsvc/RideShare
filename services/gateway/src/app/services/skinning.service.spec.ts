/**
 * @req Phase 7.0 V.1: Universal Skinning Service
 */
import { SkinningService } from './skinning.service';

describe('SkinningService', () => {
  let service: SkinningService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new SkinningService(mockSupabaseService as any);
  });

  describe('getTenantSkin', () => {
    it('returns custom skin variables for a tenant', async () => {
      mockFrom.single.mockResolvedValueOnce({ data: { id: 't1', name: 'Acme', slug: 'acme' }, error: null }); // tenants
      mockFrom.single.mockResolvedValueOnce({ data: { primary_hex: '#112233', welcome_message: 'Hi' }, error: null }); // tenant_onboarding

      const result = await service.getTenantSkin('t1');
      expect(result.cssVariables['--primary']).toBe('#112233');
      expect(result.tenantName).toBe('Acme');
      expect(result.isCustomSkin).toBe(true);
    });

    it('returns default skin if no overrides found', async () => {
      mockFrom.single.mockResolvedValueOnce({ data: { id: 't1' }, error: null });
      mockFrom.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await service.getTenantSkin('t1');
      expect(result.cssVariables['--primary']).toBe('#1a1a2e');
      expect(result.isCustomSkin).toBe(false);
    });
  });

  describe('generateInlineStyleBlock', () => {
    it('generates a :root CSS string', () => {
      const skin = service.getDefaultSkin();
      const style = service.generateInlineStyleBlock(skin);
      expect(style).toContain(':root {');
      expect(style).toContain('--primary: #1a1a2e;');
    });
  });
});
