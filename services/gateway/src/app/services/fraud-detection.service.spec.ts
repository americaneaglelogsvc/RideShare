/**
 * @req FRA-DET-010 — AI-powered fraud detection (M12.1)
 */
import { FraudDetectionService } from './fraud-detection.service';

describe('FraudDetectionService', () => {
  let service: FraudDetectionService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new FraudDetectionService(mockSupabaseService as any);
  });

  describe('calculateRiskScore', () => {
    it('returns risk score and recommendation', async () => {
      // Mocking private helper methods
      jest.spyOn(service as any, 'getAccountAge').mockResolvedValue(10); // 10 days
      jest.spyOn(service as any, 'getTransactionFrequency').mockResolvedValue(2);
      jest.spyOn(service as any, 'getLocationRisk').mockResolvedValue(0.1);
      jest.spyOn(service as any, 'getDeviceRisk').mockResolvedValue(0.1);

      const result = await service.calculateRiskScore('user-1', 't1', { amount: 50 });
      expect(result.score).toBeGreaterThan(0);
      expect(result.recommendation).toBeDefined();
    });
  });

  describe('detectFraudPatterns', () => {
    it('returns active fraud patterns', async () => {
      const result = await service.detectFraudPatterns('t1');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('pattern');
    });
  });

  describe('createFraudCase', () => {
    it('creates a new fraud case for investigation', async () => {
      const result = await service.createFraudCase('user-1', 't1', 'payment_fraud', 'high');
      expect(result.caseNumber).toContain('FC-');
      expect(result.status).toBe('open');
    });
  });

  describe('monitorTransactions', () => {
    it('returns transaction alerts', async () => {
      const result = await service.monitorTransactions('t1');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('transactionId');
    });
  });
});
