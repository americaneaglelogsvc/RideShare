import { DisclosureService } from './disclosure.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DisclosureService', () => {
  let service: DisclosureService;
  let mockFrom: any;

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

    service = new DisclosureService(mockSupabaseService as any);
  });

  describe('create', () => {
    it('should create a disclosure in draft status', async () => {
      const mockData = { id: 'd-1', status: 'draft', title: 'Test Disclosure' };
      // maybeSingle for version lookup, single for insert
      mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
      mockFrom.single.mockResolvedValue({ data: mockData, error: null });

      const result = await service.create('t1', {
        title: 'Test Disclosure',
        body: 'Test content',
        display_context: 'booking',
      });
      expect(result.status).toBe('draft');
    });

    it('should throw on DB error', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'constraint violation' } });

      await expect(
        service.create('t1', { title: 'X', body: 'Y', display_context: 'booking' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('publish', () => {
    it('should publish a draft disclosure', async () => {
      // First single call: find draft disclosure
      mockFrom.single.mockResolvedValueOnce({ data: { id: 'd-1', status: 'draft', display_context: 'booking' }, error: null });
      // Second single call: update to active
      mockFrom.single.mockResolvedValueOnce({ data: { id: 'd-1', status: 'active', version: 2 }, error: null });

      const result = await service.publish('t1', 'd-1');
      expect(result).toBeDefined();
    });

    it('should throw if disclosure not found', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: null });

      await expect(service.publish('t1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
