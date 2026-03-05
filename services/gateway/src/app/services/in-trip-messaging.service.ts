import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

// §4.6 In-app messaging (masked), §5.7 Driver↔rider messaging
// CANONICAL MSG-001: In-app only — no external SMS for rider↔driver comms
// CANONICAL MSG-002: Visibility = sender, counterparty, tenant_admin, uwd_super/sub_super ONLY

export type MessageViewerRole = 'rider' | 'driver' | 'tenant_admin' | 'uwd_super_admin' | 'uwd_sub_super';

export interface SendMessageInput {
  tripId: string;
  tenantId: string;
  senderId: string;
  senderRole: 'rider' | 'driver';
  messageType: 'text' | 'location' | 'eta_update' | 'system';
  content: string;
}

export interface TripMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderRole: string;
  messageType: string;
  content: string;
  maskedContent: string | null;
  createdAt: string;
  readAt: string | null;
}

@Injectable()
export class InTripMessagingService {
  private readonly logger = new Logger(InTripMessagingService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async sendMessage(input: SendMessageInput): Promise<TripMessage> {
    const supabase = this.supabaseService.getClient();

    // Validate trip is active
    const { data: trip } = await supabase
      .from('trips')
      .select('status')
      .eq('id', input.tripId)
      .maybeSingle();

    if (!trip || !['driver_assigned', 'en_route_pickup', 'arrived_pickup', 'in_progress'].includes(trip.status)) {
      throw new BadRequestException('Messages can only be sent during active trips');
    }

    const { data, error } = await supabase
      .from('trip_messages')
      .insert({
        trip_id: input.tripId,
        tenant_id: input.tenantId,
        sender_id: input.senderId,
        sender_role: input.senderRole,
        message_type: input.messageType,
        content: input.content,
        masked_content: this.maskPii(input.content),
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.debug(`Message sent: trip=${input.tripId} ${input.senderRole}`);
    return this.mapMessage(data);
  }

  async getConversation(tripId: string, limit = 50): Promise<TripMessage[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('trip_messages')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw new BadRequestException(error.message);
    return (data || []).map(this.mapMessage);
  }

  async markRead(messageId: string, readerId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('trip_messages')
      .update({ read_at: new Date().toISOString(), read_by: readerId })
      .eq('id', messageId)
      .is('read_at', null);

    if (error) this.logger.debug(`Mark read failed: ${error.message}`);
  }

  /**
   * CANONICAL MSG-002 — Role-based message visibility.
   * Rider: own trips only | Driver: own trips only
   * Tenant admin: all messages in their tenant | UWD super/sub-super: all tenants
   */
  async getConversationForRole(
    tripId: string,
    tenantId: string,
    viewerId: string,
    viewerRole: MessageViewerRole,
    limit = 50,
  ): Promise<TripMessage[]> {
    const supabase = this.supabaseService.getClient();

    if (viewerRole === 'uwd_super_admin' || viewerRole === 'uwd_sub_super') {
      const { data, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) throw new BadRequestException(error.message);
      return (data || []).map(this.mapMessage);
    }

    if (viewerRole === 'tenant_admin') {
      const { data: trip } = await supabase
        .from('trips')
        .select('tenant_id')
        .eq('id', tripId)
        .maybeSingle();
      if (!trip || trip.tenant_id !== tenantId) {
        throw new ForbiddenException('Trip does not belong to your tenant.');
      }
      const { data, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('trip_id', tripId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) throw new BadRequestException(error.message);
      return (data || []).map(this.mapMessage);
    }

    if (viewerRole === 'rider' || viewerRole === 'driver') {
      const roleField = viewerRole === 'rider' ? 'rider_id' : 'driver_id';
      const { data: trip } = await supabase
        .from('trips')
        .select(`id, tenant_id, rider_id, driver_id`)
        .eq('id', tripId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!trip) throw new ForbiddenException('Trip not found or not in your tenant.');
      if (trip[roleField] !== viewerId) {
        throw new ForbiddenException('You are not a participant of this trip.');
      }

      const { data, error } = await supabase
        .from('trip_messages')
        .select('*')
        .eq('trip_id', tripId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) throw new BadRequestException(error.message);
      return (data || []).map(this.mapMessage);
    }

    throw new ForbiddenException('Invalid viewer role for message access.');
  }

  async getUnreadCount(tripId: string, userId: string): Promise<number> {
    const supabase = this.supabaseService.getClient();

    const { count, error } = await supabase
      .from('trip_messages')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) return 0;
    return count || 0;
  }

  async sendSystemMessage(tripId: string, tenantId: string, content: string) {
    const supabase = this.supabaseService.getClient();

    await supabase.from('trip_messages').insert({
      trip_id: tripId,
      tenant_id: tenantId,
      sender_id: 'system',
      sender_role: 'system',
      message_type: 'system',
      content,
      masked_content: content,
    });
  }

  async sendEtaUpdate(tripId: string, tenantId: string, driverId: string, etaMinutes: number) {
    return this.sendMessage({
      tripId,
      tenantId,
      senderId: driverId,
      senderRole: 'driver',
      messageType: 'eta_update',
      content: `Driver is ${etaMinutes} minute${etaMinutes === 1 ? '' : 's'} away`,
    });
  }

  // Mask phone numbers and emails in messages for PII compliance
  private maskPii(text: string): string {
    // Mask phone numbers: (xxx) xxx-1234 → (***) ***-1234
    let masked = text.replace(
      /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?)(\d{4})/g,
      '(***) ***-$2'
    );

    // Mask email addresses: user@domain.com → u***@d***.com
    masked = masked.replace(
      /([a-zA-Z0-9])[a-zA-Z0-9.]*@([a-zA-Z0-9])[a-zA-Z0-9]*\.([a-zA-Z]{2,})/g,
      '$1***@$2***.$3'
    );

    return masked;
  }

  private mapMessage(row: any): TripMessage {
    return {
      id: row.id,
      tripId: row.trip_id,
      senderId: row.sender_id,
      senderRole: row.sender_role,
      messageType: row.message_type,
      content: row.content,
      maskedContent: row.masked_content,
      createdAt: row.created_at,
      readAt: row.read_at,
    };
  }
}
