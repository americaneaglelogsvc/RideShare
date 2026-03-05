import { QrAttributionService } from './qr-attribution.service';
import { BadRequestException } from '@nestjs/common';

describe('QrAttributionService', () => {
  let service: QrAttributionService;
  let mockFrom: any;
  let mockLedgerService: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    mockLedgerService = {
      record: jest.fn().mockResolvedValue('ledger-1'),
    };

    service = new QrAttributionService(mockSupabaseService as any, mockLedgerService);
  });

  describe('generateQrCode', () => {
    it('should generate a QR code for a vehicle', async () => {
      const mockData = { id: 'qr-1', vehicle_id: 'v1', code: 'QR-XXXXXXXX' };
      mockFrom.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.generateQrCode('t1', 'v1', 'd1');
      expect(result.id).toBe('qr-1');
    });

    it('should throw on DB error', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } });

      await expect(service.generateQrCode('t1', 'v1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordScan', () => {
    it('should record a QR scan event', async () => {
      // QR lookup returns active code
      mockFrom.single.mockResolvedValueOnce({ data: { id: 'qr-1', driver_id: 'd1', tenant_id: 't1', scan_count: 0 }, error: null });
      // Insert scan
      mockFrom.single.mockResolvedValueOnce({ data: { id: 'scan-1' }, error: null });

      const result = await service.recordScan('ABC123', 'rider-1', 'hash123');
      expect(result).toBeDefined();
    });
  });
});
