/**
 * @req COMP-AML-010 — Legal & Compliance
 */
import { LegalConsentService } from './legal-consent.service';

describe('LegalConsentService', () => {
  let service: LegalConsentService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new LegalConsentService(mockSupabaseService as any);
  });

  describe('grantConsent', () => {
    it('upserts a consent record', async () => {
      const mockRecord = { id: 'l1', user_id: 'u1', granted: true };
      mockFrom.single.mockResolvedValue({ data: mockRecord, error: null });

      const result = await service.grantConsent({
        tenantId: 't1',
        userId: 'u1',
        userType: 'driver',
        consentType: 'terms_of_service',
        version: '1.0'
      });

      expect(result.granted).toBe(true);
    });
  });

  describe('revokeConsent', () => {
    it('sets granted=false for a specific record', async () => {
      const mockRecord = { id: 'l1', user_id: 'u1', granted: false };
      mockFrom.single.mockResolvedValue({ data: mockRecord, error: null });

      const result = await service.revokeConsent({
        userId: 'u1',
        consentType: 'terms_of_service',
        version: '1.0'
      });

      expect(result.granted).toBe(false);
    });
  });

  describe('checkConsent', () => {
    it('returns true if active consent exists', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: { granted: true }, error: null });
      const result = await service.checkConsent('u1', 'privacy_policy', '1.1');
      expect(result).toBe(true);
    });

    it('returns false if no active consent', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
      const result = await service.checkConsent('u1', 'marketing', '2.0');
      expect(result).toBe(false);
    });
  });

  describe('getUserConsents', () => {
    it('returns history of consents for a user', async () => {
      const mockList = [{ id: 'l1', consent_type: 'tos' }];
      mockFrom.order.mockResolvedValue({ data: mockList, error: null });
      const result = await service.getUserConsents('u1');
      expect(result).toHaveLength(1);
    });
  });
});
