/**
 * @req DRV-ONBOARD-010 — Driver background check integration
 */
import { BackgroundCheckService } from './background-check.service';

describe('BackgroundCheckService', () => {
  let service: BackgroundCheckService;

  beforeEach(() => {
    const mockFeatureGateService = {
      isEnabled: jest.fn().mockResolvedValue(true)
    };

    service = new BackgroundCheckService(mockFeatureGateService as any);
  });

  describe('isEnabled', () => {
    it('checks feature gate for background checks', async () => {
      const result = await service.isEnabled('t1');
      expect(result).toBe(true);
    });
  });

  describe('initiateCheck', () => {
    it('initiates a manual background check for a driver', async () => {
      // initiateCheck returns { checkId, status, checkTypes, details? }
      const result = await service.initiateCheck('t1', 'drv-1', 'standard');
      expect(result.checkId).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.checkTypes).toContain('criminal');
    });
  });

  describe('getRequiredChecks', () => {
    it('returns different checks based on vehicle category', () => {
      const standard = service.getRequiredChecks('standard');
      const luxury = service.getRequiredChecks('luxury');
      const nemt = service.getRequiredChecks('nemt');
      
      expect(standard).toContain('criminal');
      expect(luxury).toContain('drug_screen');
      expect(nemt).toContain('medical_card');
    });
  });
});
