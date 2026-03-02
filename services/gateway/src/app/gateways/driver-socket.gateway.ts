import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * M6.2: Multi-Tenant WebSocket Gateway for Driver App
 *
 * Key design principles:
 * - Each driver maintains N simultaneous WebSocket connections (one per tenant profile).
 * - The driver joins a tenant-scoped room: `tenant:{tenantId}:driver:{driverId}`
 * - x-tenant-id is injected via handshake auth/query, ensuring channel isolation.
 * - A "global heartbeat" room `identity:{identityId}` tracks the driver's
 *   overall online state across all tenants.
 * - Tenant A offers are NEVER emitted to the Tenant B room.
 */
@WebSocketGateway({
  namespace: '/driver',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class DriverSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DriverSocketGateway.name);

  // Track connected sockets: socketId → { tenantId, driverId, identityId }
  private connections = new Map<string, {
    tenantId: string;
    driverId: string;
    identityId: string;
  }>();

  handleConnection(client: Socket): void {
    const tenantId = (client.handshake.auth?.tenantId || client.handshake.query?.tenantId) as string;
    const driverId = (client.handshake.auth?.driverId || client.handshake.query?.driverId) as string;
    const identityId = (client.handshake.auth?.identityId || client.handshake.query?.identityId) as string;

    if (!tenantId || !driverId) {
      this.logger.warn(`Socket ${client.id} missing tenantId or driverId — disconnecting`);
      client.disconnect(true);
      return;
    }

    // Join tenant-scoped room
    const tenantRoom = `tenant:${tenantId}:driver:${driverId}`;
    client.join(tenantRoom);

    // Join global identity room (for cross-tenant heartbeat)
    if (identityId) {
      client.join(`identity:${identityId}`);
    }

    this.connections.set(client.id, { tenantId, driverId, identityId });

    this.logger.log(
      `M6.2: Driver ${driverId} connected to tenant ${tenantId} (socket ${client.id})`,
    );

    // Acknowledge connection with tenant context
    client.emit('connected', {
      tenantId,
      driverId,
      identityId,
      room: tenantRoom,
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket): void {
    const conn = this.connections.get(client.id);
    if (conn) {
      this.logger.log(
        `M6.2: Driver ${conn.driverId} disconnected from tenant ${conn.tenantId} (socket ${client.id})`,
      );
      this.connections.delete(client.id);
    }
  }

  /**
   * Driver switches "tenant view" — stays connected but changes active tenant context.
   * The UI calls this when the driver swipes between tenant tabs.
   */
  @SubscribeMessage('switch_tenant_view')
  handleSwitchTenantView(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; driverId: string },
  ): void {
    const conn = this.connections.get(client.id);
    if (!conn) return;

    // Leave old tenant room, join new one
    const oldRoom = `tenant:${conn.tenantId}:driver:${conn.driverId}`;
    const newRoom = `tenant:${data.tenantId}:driver:${data.driverId}`;

    client.leave(oldRoom);
    client.join(newRoom);

    this.connections.set(client.id, {
      ...conn,
      tenantId: data.tenantId,
      driverId: data.driverId,
    });

    client.emit('tenant_view_switched', {
      tenantId: data.tenantId,
      driverId: data.driverId,
      room: newRoom,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `M6.2: Driver switched view to tenant ${data.tenantId} (socket ${client.id})`,
    );
  }

  /**
   * Global heartbeat — driver sends a periodic ping indicating they're "Available"
   * across all active tenants. This is broadcast to the identity room.
   */
  @SubscribeMessage('heartbeat')
  handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      identityId: string;
      activeTenants: Array<{ tenantId: string; driverId: string; status: string }>;
      location?: { lat: number; lng: number };
    },
  ): void {
    // Broadcast to identity room so all connected tenant sockets see the heartbeat
    if (data.identityId) {
      this.server.to(`identity:${data.identityId}`).emit('heartbeat_ack', {
        identityId: data.identityId,
        activeTenants: data.activeTenants,
        location: data.location,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Driver accepts an instant offer from the UI.
   * Forwards to the offer acceptance flow.
   */
  @SubscribeMessage('accept_offer')
  handleAcceptOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string; driverId: string; offerId: string },
  ): void {
    // Emit back to the client — the actual acceptance is handled via HTTP API
    // This is a convenience event for real-time UI feedback
    client.emit('offer_acceptance_pending', {
      tenantId: data.tenantId,
      offerId: data.offerId,
      message: 'Processing acceptance via API...',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit an instant offer to a specific driver within a tenant-scoped room.
   * Called by OfferService when broadcasting instant offers.
   */
  emitInstantOfferToDriver(
    tenantId: string,
    driverId: string,
    offer: any,
  ): void {
    const room = `tenant:${tenantId}:driver:${driverId}`;
    this.server.to(room).emit('instant_offer', offer);
    this.logger.log(`M7.2: Emitted instant_offer to room ${room}`);
  }

  /**
   * Emit a trip status update to a specific driver within a tenant.
   */
  emitTripUpdate(
    tenantId: string,
    driverId: string,
    event: { tripId: string; status: string; data?: any },
  ): void {
    const room = `tenant:${tenantId}:driver:${driverId}`;
    this.server.to(room).emit('trip_update', event);
  }

  /**
   * Get the count of currently connected drivers per tenant.
   */
  getConnectionStats(): {
    totalConnections: number;
    byTenant: Record<string, number>;
    byIdentity: Record<string, string[]>;
  } {
    const byTenant: Record<string, number> = {};
    const byIdentity: Record<string, string[]> = {};

    for (const [, conn] of this.connections) {
      byTenant[conn.tenantId] = (byTenant[conn.tenantId] || 0) + 1;

      if (conn.identityId) {
        if (!byIdentity[conn.identityId]) byIdentity[conn.identityId] = [];
        if (!byIdentity[conn.identityId].includes(conn.tenantId)) {
          byIdentity[conn.identityId].push(conn.tenantId);
        }
      }
    }

    return {
      totalConnections: this.connections.size,
      byTenant,
      byIdentity,
    };
  }
}
