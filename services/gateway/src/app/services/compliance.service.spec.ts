/**
 * @req COMP-DRV-010 — Compliance document management
 */
import { ComplianceService } from './compliance.service';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
      then: jest.fn().mockImplementation(function(cb: any) {
        return Promise.resolve({ data: [], error: null }).then(cb);
      })
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
        rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
      }),
    };

    service = new ComplianceService(mockSupabaseService as any);
  });

  describe('uploadDocument', () => {
    it('saves a new document for review', async () => {
      mockFrom.single.mockResolvedValue({ 
        data: { id: 'doc-1', status: 'pending_review' }, 
        error: null 
      });

      const result = await service.uploadDocument({
        tenantId: 't1',
        driverIdentityId: 'idi1',
        driverProfileId: 'dp1',
        documentType: 'insurance',
        documentName: 'p.pdf',
        fileUrl: 'url'
      });
      expect(result.id).toBe('doc-1');
    });
  });

  describe('getTenantComplianceSummary', () => {
    it('aggregates document statuses for a tenant', async () => {
      // Use mockImplementationOnce to avoid Promise vs Function confusion
      mockFrom.then
        .mockImplementationOnce((cb: any) => Promise.resolve({ data: [{ id: 'dp1' }], error: null }).then(cb))
        .mockImplementationOnce((cb: any) => Promise.resolve({ data: [{ driver_profile_id: 'dp1', status: 'approved' }], error: null }).then(cb));

      const result = await service.getTenantComplianceSummary('t1');
      expect(result.totalDrivers).toBe(1);
      expect(result.compliantDrivers).toBe(1);
    });
  });
});
