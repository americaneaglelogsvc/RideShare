/**
 * @req M12.3: Final Legal & Compliance Hardening — ConsentService
 */
import { ConsentService } from './consent.service';

describe('ConsentService', () => {
  let service: ConsentService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new ConsentService(mockSupabaseService as any);
  });

  describe('signAgreement', () => {
    it('creates a cryptographic signature and records consent', async () => {
      const mockRecord = {
        id: 'c1',
        tenant_id: 't1',
        driver_identity_id: 'di1',
        driver_profile_id: 'dp1',
        document_type: 'service_agreement',
        document_version: '1.0',
        document_hash: 'hash1',
        signature_hash: 'sig1',
        signed_at: new Date().toISOString()
      };
      
      // Mock existing check
      mockFrom.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
      // Mock insert
      mockFrom.single.mockResolvedValueOnce({ data: mockRecord, error: null });

      const result = await service.signAgreement({
        tenantId: 't1',
        driverIdentityId: 'di1',
        driverProfileId: 'dp1',
        documentType: 'service_agreement',
        documentVersion: '1.0',
        documentContent: 'Agreement content goes here'
      });

      expect(result.id).toBe('c1');
      expect(result.signatureHash).toBeDefined();
    });
  });

  describe('verifyDriverConsent', () => {
    it('returns compliant=true when all required documents are signed', async () => {
      const mockConsents = [
        { document_type: 'tos', document_version: '1.2', tenant_id: 't1', driver_identity_id: 'di1' }
      ];
      mockFrom.select.mockReturnThis();
      mockFrom.eq.mockReturnThis();
      mockFrom.is.mockResolvedValue({ data: mockConsents, error: null });

      const result = await service.verifyDriverConsent('t1', 'di1', [
        { type: 'tos', minVersion: '1.0' }
      ]);

      expect(result.compliant).toBe(true);
      expect(result.signed).toHaveLength(1);
    });
  });

  describe('revokeConsent', () => {
    it('marks a consent record as revoked', async () => {
      const mockRecord = { id: 'c1', revoked_at: new Date().toISOString() };
      mockFrom.update.mockReturnThis();
      mockFrom.eq.mockReturnThis();
      mockFrom.is.mockReturnThis();
      mockFrom.single.mockResolvedValue({ data: mockRecord, error: null });

      const result = await service.revokeConsent('c1', 'Requested by user');
      expect(result.revokedAt).toBeDefined();
    });
  });
});
