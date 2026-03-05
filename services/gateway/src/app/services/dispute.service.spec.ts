import { DisputeService } from './dispute.service';

describe('DisputeService', () => {
  let service: DisputeService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new DisputeService(mockSupabaseService as any);
  });

  describe('classifyReasonCode', () => {
    it('should classify known Visa reason codes', () => {
      const result = service.classifyReasonCode('13.1');
      expect(result.category).toBe('service_not_received');
      expect(result.winProbability).toBe('high');
      expect(result.recommendedEvidence).toContain('gps_trace');
    });

    it('should classify known Mastercard reason codes', () => {
      const result = service.classifyReasonCode('4837');
      expect(result.category).toBe('no_cardholder_auth');
      expect(result.winProbability).toBe('low');
    });

    it('should return unknown for unclassified codes', () => {
      const result = service.classifyReasonCode('99.99');
      expect(result.category).toBe('unknown');
      expect(result.winProbability).toBe('medium');
      expect(result.recommendedEvidence.length).toBeGreaterThan(0);
    });

    it('should classify fraud codes', () => {
      const result = service.classifyReasonCode('10.4');
      expect(result.category).toBe('fraud');
      expect(result.recommendedEvidence).toContain('device_fingerprint');
    });

    it('should classify credit not processed', () => {
      const result = service.classifyReasonCode('13.6');
      expect(result.category).toBe('credit_not_processed');
      expect(result.winProbability).toBe('high');
    });
  });

  describe('addEvidenceArtifact', () => {
    it('should throw NotFoundException if dispute not found', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: null });

      await expect(
        service.addEvidenceArtifact('nonexistent', { type: 'screenshot', label: 'GPS', url: 'https://example.com/img.png' }),
      ).rejects.toThrow();
    });

    it('should add artifact to existing evidence package', async () => {
      mockFrom.single.mockResolvedValue({
        data: { evidence_package: { artifacts: [] } },
        error: null,
      });

      const result = await service.addEvidenceArtifact('d-1', {
        type: 'gps_trace',
        label: 'GPS Route Screenshot',
        url: 'https://storage.example.com/evidence/gps.png',
      });

      expect(result.success).toBe(true);
      expect(result.artifactCount).toBe(1);
    });
  });
});
