/**
 * @req SYS-JOBS-010 — Reliable asynchronous background jobs (At-Least-Once)
 */
import { JobQueueService } from './job-queue.service';

describe('JobQueueService', () => {
  let service: JobQueueService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new JobQueueService(mockSupabaseService as any);
  });

  describe('enqueue', () => {
    it('saves a job to the queue and returns its ID', async () => {
      mockFrom.single.mockResolvedValue({ data: { id: 'job-1' }, error: null });

      const result = await service.enqueue('SEND_EMAIL', { to: 'user@example.com' });
      expect(result).toBe('job-1');
    });

    it('throws on DB error', async () => {
      // Ensure it throws by providing the error in the resolved promise
      const dbError = new Error('insert failed');
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'insert failed' } });
      
      try {
        await service.enqueue('PAYOUT_DRIVER', {});
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toBe('insert failed');
      }
    });
  });
});
