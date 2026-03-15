/**
 * @req MIC-PUB-0001 — Microsite static publish + CDN
 * @req MIC-WGT-0001 — Booking/quote widget
 * @req GCP-ARCH-0002 — Tenant microsite domain routing
 */
import { MicrositeService } from './microsite.service';

describe('MicrositeService', () => {
  let service: MicrositeService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new MicrositeService(mockSupabaseService as any);
  });

  // ─────────────────────────────────────────────────────────────
  // getMicrosite
  // ─────────────────────────────────────────────────────────────
  describe('getMicrosite', () => {
    it('returns null when no microsite exists for tenant', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
      const result = await service.getMicrosite('t1');
      expect(result).toBeNull();
    });

    it('returns microsite data when found', async () => {
      const site = { id: 'site-1', tenant_id: 't1', subdomain: 'acme', is_published: true };
      mockFrom.maybeSingle.mockResolvedValue({ data: site, error: null });
      const result = await service.getMicrosite('t1');
      expect(result?.subdomain).toBe('acme');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getMicrositeBySubdomain
  // ─────────────────────────────────────────────────────────────
  describe('getMicrositeBySubdomain', () => {
    it('throws NotFoundException when subdomain not found or not published', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
      await expect(service.getMicrositeBySubdomain('notexist')).rejects.toThrow('Microsite not found');
    });

    it('returns microsite when found and published', async () => {
      const site = { id: 'site-2', subdomain: 'acme', is_published: true };
      mockFrom.maybeSingle.mockResolvedValue({ data: site, error: null });
      const result = await service.getMicrositeBySubdomain('acme');
      expect(result.subdomain).toBe('acme');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // upsertMicrosite
  // ─────────────────────────────────────────────────────────────
  describe('upsertMicrosite', () => {
    it('upserts with correct tenant_id and returns data', async () => {
      const site = { id: 'site-1', tenant_id: 't1', subdomain: 'acme' };
      mockFrom.single.mockResolvedValue({ data: site, error: null });

      const result = await service.upsertMicrosite({
        tenantId: 't1',
        subdomain: 'acme',
        heroTitle: 'Welcome',
        primaryColor: '#003366',
      });
      expect(result.tenant_id).toBe('t1');
    });

    it('throws on DB error', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'unique violation' } });
      await expect(service.upsertMicrosite({ tenantId: 't1' })).rejects.toThrow('unique violation');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // publishMicrosite / unpublishMicrosite
  // ─────────────────────────────────────────────────────────────
  describe('publishMicrosite', () => {
    it('sets is_published=true', async () => {
      const site = { id: 'site-1', is_published: true };
      mockFrom.single.mockResolvedValue({ data: site, error: null });
      const result = await service.publishMicrosite('t1');
      expect(result.is_published).toBe(true);
    });
  });

  describe('unpublishMicrosite', () => {
    it('sets is_published=false', async () => {
      const site = { id: 'site-1', is_published: false };
      mockFrom.single.mockResolvedValue({ data: site, error: null });
      const result = await service.unpublishMicrosite('t1');
      expect(result.is_published).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Booking Widgets
  // ─────────────────────────────────────────────────────────────
  describe('createWidget', () => {
    it('creates widget with defaults and returns data', async () => {
      const widget = { id: 'wgt-1', tenant_id: 't1', name: 'Default Widget', is_active: true };
      mockFrom.single.mockResolvedValue({ data: widget, error: null });

      const result = await service.createWidget({ tenantId: 't1' });
      expect(result.id).toBe('wgt-1');
    });

    it('throws on DB error', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } });
      await expect(service.createWidget({ tenantId: 't1' })).rejects.toThrow('insert failed');
    });
  });

  describe('getWidgetByKey', () => {
    it('throws NotFoundException when widget not found or inactive', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'not found' } });
      await expect(service.getWidgetByKey('key-missing')).rejects.toThrow('Widget not found');
    });
  });

  describe('deactivateWidget', () => {
    it('sets is_active=false for the widget', async () => {
      mockFrom.eq.mockReturnThis();
      mockFrom.update.mockReturnThis();
      mockFrom.eq.mockResolvedValue({ error: null });

      const result = await service.deactivateWidget('wgt-1');
      expect(result.deactivated).toBe(true);
    });
  });
});
