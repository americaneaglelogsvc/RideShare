/**
 * @req REAL-TIME-010 — Trip state event propagation over Supabase Realtime
 */
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let mockSupabase: any;
  let mockChannel: any;

  beforeEach(() => {
    mockChannel = {
      send: jest.fn().mockResolvedValue('ok'),
      subscribe: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
    };

    mockSupabase = {
      channel: jest.fn().mockReturnValue(mockChannel)
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(mockSupabase)
    };

    service = new RealtimeService(mockSupabaseService as any);
  });

  describe('emitTripStateChanged', () => {
    it('sends event to correct trip channel', async () => {
      const event = { 
        tripId: 'trip-1', 
        status: 'assigned', 
        tenantId: 't1' 
      };

      await service.emitTripStateChanged(event);

      // t-{tenantId}-trip-{tripId}
      expect(mockSupabase.channel).toHaveBeenCalledWith('t-t1-trip-trip-1');
      expect(mockChannel.send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'broadcast',
        event: 'trip_state_changed',
        payload: event
      }));
    });
  });
});
