/**
 * @req TEN-ONBOARD-010 — Tenant onboarding workflow
 */
import { TenantService } from './tenant.service';

describe('TenantService', () => {
  let service: TenantService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    const mockNotificationService = {
      sendTenantWelcomeEmail: jest.fn()
    };

    service = new TenantService(
      mockSupabaseService as any,
      mockNotificationService as any
    );
  });

  describe('createTenant', () => {
    it('creates a new tenant and initializes onboarding', async () => {
      const tenant = { id: 't-new', name: 'Acme Rides', slug: 'acme', owner_email: 'ops@acme.com' };
      
      // First call (maybeSingle) - check if exists
      mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
      // Second call (insert) - create tenant
      mockFrom.single.mockResolvedValueOnce({ data: tenant, error: null });
      // Third call (insert) - bootstrap onboarding
      mockFrom.single.mockResolvedValueOnce({ data: {}, error: null });

      const result = await service.createTenant({
        name: 'Acme Rides',
        slug: 'acme',
        owner_email: 'ops@acme.com',
        owner_name: 'John Doe'
      });
      expect(result.tenant_id).toBe('t-new');
      expect(result.status).toBe('DRAFT');
    });

    it('throws on duplicate slug', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: { id: 'existing' }, error: null });
      await expect(service.createTenant({ name: 'Dup', slug: 'dup', owner_email: 'e', owner_name: 'n' })).rejects.toThrow();
    });
  });

  describe('getOnboarding', () => {
    it('returns onboarding checklist for tenant', async () => {
      const onboarding = { tenant_id: 't1', status: 'DRAFT' };
      mockFrom.single.mockResolvedValue({ data: onboarding, error: null });
      const result = await service.getOnboarding('t1');
      expect(result.tenant_id).toBe('t1');
    });
  });

  describe('updateChecklist', () => {
    it('updates onboarding checklist items', async () => {
      const onboarding = { tenant_id: 't1', status: 'DRAFT' };
      mockFrom.single.mockResolvedValueOnce({ data: onboarding, error: null }); // getOnboarding
      
      const updated = { tenant_id: 't1', tax_id_last4: '1234' };
      mockFrom.single.mockResolvedValueOnce({ data: updated, error: null }); // update
      
      const result = await service.updateChecklist('t1', { tax_id_last4: '1234' });
      expect(result.tax_id_last4).toBe('1234');
    });
  });

  describe('submitForReview', () => {
    it('sets status to SUBMITTED if required fields present', async () => {
      const onboarding = { 
        tenant_id: 't1', 
        status: 'DRAFT',
        merchant_provider_code: 'STRIPE',
        tax_id_last4: '1234',
        business_registration_reference: 'REG-123'
      };
      mockFrom.single.mockResolvedValueOnce({ data: onboarding, error: null }); // getOnboarding
      
      const submitted = { ...onboarding, status: 'SUBMITTED' };
      mockFrom.single.mockResolvedValueOnce({ data: submitted, error: null }); // update
      
      const result = await service.submitForReview('t1');
      expect(result.status).toBe('SUBMITTED');
    });
  });
});
