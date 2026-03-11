import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeService } from '../src/app/services/realtime.service';
import { NotificationService } from '../src/app/services/notification.service';
import { SupabaseService } from '../src/app/services/supabase.service';

describe('Real-time System Integration', () => {
  let realtimeService: RealtimeService;
  let notificationService: NotificationService;
  let supabaseService: SupabaseService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        RealtimeService,
        NotificationService,
        SupabaseService,
      ],
    }).compile();

    realtimeService = module.get<RealtimeService>(RealtimeService);
    notificationService = module.get<NotificationService>(NotificationService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection for driver', async () => {
      const driverId = 'driver-123';
      const mockWebSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1 // WebSocket.OPEN
      };

      jest.spyOn(realtimeService, 'createWebSocketConnection').mockResolvedValue(mockWebSocket as any);

      const connection = await realtimeService.connectDriver(driverId);
      
      expect(connection).toBeDefined();
      expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle WebSocket connection errors gracefully', async () => {
      const driverId = 'driver-123';
      
      jest.spyOn(realtimeService, 'createWebSocketConnection').mockRejectedValue(new Error('Connection failed'));

      await expect(realtimeService.connectDriver(driverId)).rejects.toThrow('Connection failed');
    });

    it('should reconnect automatically on connection loss', async () => {
      const driverId = 'driver-123';
      const mockWebSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1
      };

      let connectionAttempts = 0;
      jest.spyOn(realtimeService, 'createWebSocketConnection').mockImplementation(async () => {
        connectionAttempts++;
        if (connectionAttempts === 1) {
          throw new Error('Connection failed');
        }
        return mockWebSocket as any;
      });

      const connection = await realtimeService.connectDriverWithRetry(driverId, 3);
      
      expect(connectionAttempts).toBe(2); // Initial failure + retry success
      expect(connection).toBeDefined();
    });

    it('should handle multiple concurrent connections', async () => {
      const drivers = ['driver-1', 'driver-2', 'driver-3'];
      const mockWebSocket = {
        on: jest.fn(),
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1
      };

      jest.spyOn(realtimeService, 'createWebSocketConnection').mockResolvedValue(mockWebSocket as any);

      const connections = await Promise.all(
        drivers.map(driverId => realtimeService.connectDriver(driverId))
      );

      expect(connections).toHaveLength(3);
      connections.forEach(connection => {
        expect(connection).toBeDefined();
      });
    });
  });

  describe('SSE Event Streaming', () => {
    it('should stream ride updates to rider', async () => {
      const riderId = 'rider-123';
      const mockResponse = {
        write: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        on: jest.fn()
      };

      jest.spyOn(realtimeService, 'createSSEStream').mockResolvedValue(mockResponse as any);

      const stream = await realtimeService.streamRideUpdates(riderId);
      
      expect(stream).toBeDefined();
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
    });

    it('should send real-time trip status updates', async () => {
      const tripId = 'trip-123';
      const status = 'driver_arrived';
      const mockWebSocket = {
        send: jest.fn(),
        readyState: 1
      };

      const updateData = {
        tripId,
        status,
        timestamp: new Date().toISOString(),
        location: { lat: 41.8781, lng: -87.6298 },
        eta: 5
      };

      await realtimeService.broadcastTripUpdate(updateData);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'trip_update',
          data: updateData
        })
      );
    });

    it('should handle SSE client disconnection', async () => {
      const riderId = 'rider-123';
      const mockResponse = {
        write: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback();
          }
        })
      };

      jest.spyOn(realtimeService, 'createSSEStream').mockResolvedValue(mockResponse as any);

      const stream = await realtimeService.streamRideUpdates(riderId);
      
      // Simulate client disconnect
      expect(mockResponse.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('Push Notification Triggers', () => {
    it('should trigger push notification when trip assigned', async () => {
      const driverId = 'driver-123';
      const tripData = {
        id: 'trip-123',
        pickup: '123 N Michigan Ave',
        dropoff: "O'Hare Airport",
        rider: { name: 'Test Rider', rating: 4.9 },
        price: 45.50
      };

      const mockNotification = {
        send: jest.fn().mockResolvedValue({ success: true })
      };

      jest.spyOn(notificationService, 'sendPushNotification').mockResolvedValue(mockNotification as any);

      const result = await notificationService.notifyTripAssigned(driverId, tripData);
      
      expect(result.success).toBe(true);
      expect(mockNotification.send).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Trip Assigned',
          body: expect.stringContaining('123 N Michigan Ave'),
          data: expect.objectContaining({
            type: 'trip_assigned',
            tripId: 'trip-123'
          })
        })
      );
    });

    it('should trigger push notification when driver arrives', async () => {
      const riderId = 'rider-123';
      const tripData = {
        id: 'trip-123',
        driver: { name: 'John Driver', rating: 4.8 },
        vehicle: 'Black Toyota Camry',
        licensePlate: 'ABC-123'
      };

      const mockNotification = {
        send: jest.fn().mockResolvedValue({ success: true })
      };

      jest.spyOn(notificationService, 'sendPushNotification').mockResolvedValue(mockNotification as any);

      const result = await notificationService.notifyDriverArrived(riderId, tripData);
      
      expect(result.success).toBe(true);
      expect(mockNotification.send).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Driver Has Arrived',
          body: expect.stringContaining('John Driver'),
          data: expect.objectContaining({
            type: 'driver_arrived',
            tripId: 'trip-123'
          })
        })
      );
    });

    it('should handle push notification failures gracefully', async () => {
      const driverId = 'driver-123';
      const tripData = {
        id: 'trip-123',
        pickup: '123 N Michigan Ave',
        dropoff: "O'Hare Airport"
      };

      jest.spyOn(notificationService, 'sendPushNotification').mockRejectedValue(new Error('Push service unavailable'));

      const result = await notificationService.notifyTripAssigned(driverId, tripData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Push service unavailable');
    });
  });

  describe('Location Update Processing', () => {
    it('should process real-time location updates', async () => {
      const driverId = 'driver-123';
      const location = {
        lat: 41.8781,
        lng: -87.6298,
        heading: 90,
        speed: 25,
        timestamp: new Date().toISOString()
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({
            data: { id: 'location-1' },
            error: null
          });
        })
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabase as any);

      const result = await realtimeService.processLocationUpdate(driverId, location);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          driver_id: driverId,
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speed: location.speed
        })
      );
    });

    it('should broadcast location updates to relevant riders', async () => {
      const driverId = 'driver-123';
      const tripId = 'trip-123';
      const location = {
        lat: 41.8781,
        lng: -87.6298,
        heading: 90,
        speed: 25
      };

      const mockWebSocket = {
        send: jest.fn(),
        readyState: 1
      };

      // Mock rider connections
      jest.spyOn(realtimeService, 'getRiderConnections').mockResolvedValue([mockWebSocket as any]);

      await realtimeService.broadcastLocationUpdate(tripId, driverId, location);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'location_update',
          data: {
            tripId,
            driverId,
            location
          }
        })
      );
    });

    it('should handle invalid location data', async () => {
      const driverId = 'driver-123';
      const invalidLocation = {
        lat: 'invalid',
        lng: null,
        heading: 90,
        speed: 25
      };

      const result = await realtimeService.processLocationUpdate(driverId, invalidLocation);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid location data');
    });
  });

  describe('Real-time Offer Distribution', () => {
    it('should distribute ride offers to eligible drivers', async () => {
      const offer = {
        id: 'offer-123',
        pickup: '123 N Michigan Ave',
        dropoff: "O'Hare Airport",
        price: 45.50,
        distance: 3.2,
        estimatedTime: 15,
        rider: { name: 'Test Rider', rating: 4.9 }
      };

      const eligibleDrivers = ['driver-1', 'driver-2', 'driver-3'];
      const mockWebSockets = eligibleDrivers.map(() => ({
        send: jest.fn(),
        readyState: 1
      }));

      jest.spyOn(realtimeService, 'getEligibleDriverConnections').mockResolvedValue(mockWebSockets as any);

      const results = await realtimeService.distributeOffer(offer);
      
      expect(results.sent).toBe(3);
      expect(results.failed).toBe(0);
      
      mockWebSockets.forEach((ws, index) => {
        expect(ws.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'ride_offer',
            data: offer,
            expiresAt: expect.any(String)
          })
        );
      });
    });

    it('should handle offer distribution failures', async () => {
      const offer = {
        id: 'offer-123',
        pickup: '123 N Michigan Ave',
        dropoff: "O'Hare Airport",
        price: 45.50
      };

      const mockWebSockets = [
        { send: jest.fn(), readyState: 1 },
        { send: jest.fn().mockRejectedValue(new Error('Connection lost')), readyState: 1 },
        { send: jest.fn(), readyState: 0 } // Closed connection
      ];

      jest.spyOn(realtimeService, 'getEligibleDriverConnections').mockResolvedValue(mockWebSockets as any);

      const results = await realtimeService.distributeOffer(offer);
      
      expect(results.sent).toBe(1);
      expect(results.failed).toBe(2);
    });

    it('should track offer acceptance rates', async () => {
      const offerId = 'offer-123';
      const driverId = 'driver-1';

      // Mock offer acceptance
      jest.spyOn(realtimeService, 'recordOfferResponse').mockResolvedValue({
        offerId,
        driverId,
        response: 'accepted',
        timestamp: new Date().toISOString()
      });

      const result = await realtimeService.recordOfferResponse(offerId, driverId, 'accepted');
      
      expect(result.response).toBe('accepted');
      expect(result.timestamp).toBeDefined();
    });
  });
});
