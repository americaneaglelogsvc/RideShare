import { RatingService } from './rating.service';
import { BadRequestException } from '@nestjs/common';

describe('RatingService', () => {
  let service: RatingService;
  let mockSupabaseService: any;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
    };

    mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new RatingService(mockSupabaseService);
  });

  describe('submitRating', () => {
    it('should reject scores outside 1-5 range', async () => {
      await expect(
        service.submitRating({
          tripId: 'trip-1', tenantId: 'ten-1', raterId: 'user-1',
          raterRole: 'rider', rateeId: 'driver-1', score: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submitRating({
          tripId: 'trip-1', tenantId: 'ten-1', raterId: 'user-1',
          raterRole: 'rider', rateeId: 'driver-1', score: 6,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate ratings', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: { id: 'existing' }, error: null });

      await expect(
        service.submitRating({
          tripId: 'trip-1', tenantId: 'ten-1', raterId: 'user-1',
          raterRole: 'rider', rateeId: 'driver-1', score: 5,
        }),
      ).rejects.toThrow('You have already rated this trip');
    });

    it('should submit a valid rating', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
      mockFrom.single.mockResolvedValue({
        data: { id: 'rating-1', score: 5, trip_id: 'trip-1' },
        error: null,
      });

      const result = await service.submitRating({
        tripId: 'trip-1', tenantId: 'ten-1', raterId: 'user-1',
        raterRole: 'rider', rateeId: 'driver-1', score: 5,
        tags: ['professional', 'clean_vehicle'],
        comment: 'Great ride!',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('rating-1');
    });
  });

  describe('getUserRatingSummary', () => {
    it('should return zero average for no ratings', async () => {
      mockFrom.eq.mockReturnValue({
        ...mockFrom,
        data: [],
        error: null,
        then: (resolve: any) => resolve({ data: [], error: null }),
      });
      // Override the select chain
      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const summary = await service.getUserRatingSummary('user-1', 'driver');
      expect(summary.averageScore).toBe(0);
      expect(summary.totalRatings).toBe(0);
    });

    it('should compute correct average and distribution', async () => {
      const ratings = [
        { score: 5, tags: ['professional'] },
        { score: 4, tags: ['professional', 'clean_vehicle'] },
        { score: 5, tags: ['clean_vehicle'] },
      ];

      const mockClient = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: ratings, error: null }),
          }),
        }),
      };
      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const summary = await service.getUserRatingSummary('driver-1', 'driver');
      expect(summary.totalRatings).toBe(3);
      expect(summary.averageScore).toBe(4.67);
      expect(summary.distribution[5]).toBe(2);
      expect(summary.distribution[4]).toBe(1);
      expect(summary.topTags[0].tag).toBe('professional');
      expect(summary.topTags[0].count).toBe(2);
    });
  });
});
