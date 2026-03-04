import { SplitPayService } from './split-pay.service';
import { BadRequestException } from '@nestjs/common';

describe('SplitPayService', () => {
  let service: SplitPayService;
  let mockSupabaseService: any;

  beforeEach(() => {
    mockSupabaseService = { getClient: jest.fn() };
    service = new SplitPayService(mockSupabaseService);
  });

  describe('initiateSplit', () => {
    it('should throw when trip not found', async () => {
      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      });

      await expect(
        service.initiateSplit({
          tripId: 'trip-missing', tenantId: 'ten-1', initiatorId: 'user-1',
          participants: [
            { userId: 'user-1', shareType: 'equal' },
            { userId: 'user-2', shareType: 'equal' },
          ],
        }),
      ).rejects.toThrow('Trip not found');
    });

    it('should split fare equally among 3 participants', async () => {
      const callIdx = { n: 0 };
      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          callIdx.n++;
          if (callIdx.n === 1) {
            // trips query
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { total_fare_cents: 6000, status: 'completed' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          // insert splits
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [
                  { participant_id: 'u1', amount_cents: 2000, status: 'accepted', paid_at: null },
                  { participant_id: 'u2', amount_cents: 2000, status: 'pending', paid_at: null },
                  { participant_id: 'u3', amount_cents: 2000, status: 'pending', paid_at: null },
                ],
                error: null,
              }),
            }),
          };
        }),
      });

      const result = await service.initiateSplit({
        tripId: 'trip-1', tenantId: 'ten-1', initiatorId: 'u1',
        participants: [
          { userId: 'u1', shareType: 'equal' },
          { userId: 'u2', shareType: 'equal' },
          { userId: 'u3', shareType: 'equal' },
        ],
      });

      expect(result.tripId).toBe('trip-1');
      expect(result.totalCents).toBe(6000);
      expect(result.splits).toHaveLength(3);
      expect(result.splits[0].amountCents).toBe(2000);
    });

    it('should handle percentage-based splits', async () => {
      const callIdx = { n: 0 };
      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          callIdx.n++;
          if (callIdx.n === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { total_fare_cents: 10000, status: 'completed' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [
                  { participant_id: 'u1', amount_cents: 7000, status: 'accepted', paid_at: null },
                  { participant_id: 'u2', amount_cents: 3000, status: 'pending', paid_at: null },
                ],
                error: null,
              }),
            }),
          };
        }),
      });

      const result = await service.initiateSplit({
        tripId: 'trip-2', tenantId: 'ten-1', initiatorId: 'u1',
        participants: [
          { userId: 'u1', shareType: 'percentage', shareValue: 70 },
          { userId: 'u2', shareType: 'percentage', shareValue: 30 },
        ],
      });

      expect(result.splits[0].amountCents).toBe(7000);
      expect(result.splits[1].amountCents).toBe(3000);
    });
  });

  describe('getSplitStatus', () => {
    it('should return null for trips with no splits', async () => {
      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const result = await service.getSplitStatus('trip-no-split');
      expect(result).toBeNull();
    });
  });
});
