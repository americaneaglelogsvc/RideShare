import { LeadService } from './lead.service';
import { BadRequestException } from '@nestjs/common';

describe('LeadService', () => {
  let service: LeadService;
  let mockFrom: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    mockEmailService = {
      send: jest.fn().mockResolvedValue({ messageId: 'msg-1', status: 'SENT', to: 'sales@urwaydispatch.com' }),
    };

    service = new LeadService(mockSupabaseService as any, mockEmailService);
  });

  describe('createLead', () => {
    it('should create a lead and notify the platform team', async () => {
      const mockLead = { id: 'lead-1', name: 'John', email: 'john@test.com', status: 'new' };
      mockFrom.single.mockResolvedValue({ data: mockLead, error: null });

      const result = await service.createLead({
        name: 'John',
        email: 'john@test.com',
        source: 'website',
      });

      expect(result.id).toBe('lead-1');
      expect(mockEmailService.send).toHaveBeenCalledTimes(1);
    });

    it('should throw on DB error', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } });

      await expect(
        service.createLead({ name: 'Jane', email: 'jane@test.com', source: 'website' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateLeadStatus', () => {
    it('should update lead status', async () => {
      const mockUpdated = { id: 'lead-1', status: 'contacted' };
      mockFrom.single.mockResolvedValue({ data: mockUpdated, error: null });

      const result = await service.updateLeadStatus('lead-1', 'contacted');
      expect(result.status).toBe('contacted');
    });
  });
});
