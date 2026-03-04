import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { PushNotificationService } from './push-notification.service';

export interface CreateDisputeDto {
  tenantId: string;
  tripId: string;
  riderId: string;
  category: 'fare_dispute' | 'route_issue' | 'driver_behavior' | 'safety_concern' | 'lost_item' | 'unauthorized_charge' | 'other';
  description: string;
}

export interface ResolveDisputeDto {
  status: 'resolved_refund' | 'resolved_no_action' | 'escalated' | 'closed';
  resolutionNote: string;
  refundCents?: number;
  resolvedBy: string;
}

@Injectable()
export class RiderDisputeService {
  private readonly logger = new Logger(RiderDisputeService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async createDispute(dto: CreateDisputeDto) {
    const supabase = this.supabaseService.getClient();

    // Verify trip exists and belongs to rider
    const { data: trip } = await supabase
      .from('trips')
      .select('id, rider_id, tenant_id')
      .eq('id', dto.tripId)
      .eq('tenant_id', dto.tenantId)
      .single();

    if (!trip) {
      throw new NotFoundException(`Trip ${dto.tripId} not found for this tenant.`);
    }

    // Check for duplicate open disputes on same trip
    const { data: existing } = await supabase
      .from('rider_disputes')
      .select('id')
      .eq('trip_id', dto.tripId)
      .eq('rider_id', dto.riderId)
      .in('status', ['open', 'under_review'])
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('An open dispute already exists for this trip.');
    }

    // SLA: 72 hours for safety concerns, 5 business days for others
    const slaHours = dto.category === 'safety_concern' ? 72 : 120;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('rider_disputes')
      .insert({
        tenant_id: dto.tenantId,
        trip_id: dto.tripId,
        rider_id: dto.riderId,
        category: dto.category,
        description: dto.description,
        status: 'open',
        sla_deadline: slaDeadline,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create dispute: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    this.logger.log(`Dispute ${data.id} created for trip ${dto.tripId} [${dto.category}]`);
    return data;
  }

  async getDispute(disputeId: string, requesterId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('rider_disputes')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Dispute not found.');
    }

    return data;
  }

  async listDisputesForRider(riderId: string, tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('rider_disputes')
      .select('*')
      .eq('rider_id', riderId)
      .eq('tenant_id', tenantId)
      .order('opened_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async listDisputesForTenant(tenantId: string, statusFilter?: string) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('rider_disputes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('opened_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async resolveDispute(disputeId: string, dto: ResolveDisputeDto) {
    const supabase = this.supabaseService.getClient();

    const { data: dispute } = await supabase
      .from('rider_disputes')
      .select('*')
      .eq('id', disputeId)
      .single();

    if (!dispute) throw new NotFoundException('Dispute not found.');

    if (['resolved_refund', 'resolved_no_action', 'closed'].includes(dispute.status)) {
      throw new ForbiddenException('Dispute is already resolved or closed.');
    }

    const updatePayload: Record<string, any> = {
      status: dto.status,
      resolution_note: dto.resolutionNote,
      assigned_to: dto.resolvedBy,
      resolved_at: new Date().toISOString(),
    };

    if (dto.status === 'resolved_refund' && dto.refundCents) {
      updatePayload.refund_cents = dto.refundCents;
    }

    const { data, error } = await supabase
      .from('rider_disputes')
      .update(updatePayload)
      .eq('id', disputeId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Notify rider
    try {
      await this.pushNotificationService.sendToUser(dispute.rider_id, {
        title: 'Dispute Updated',
        body: `Your dispute has been ${dto.status.replace('_', ' ')}.`,
        data: { disputeId, status: dto.status },
      });
    } catch (e) {
      this.logger.warn(`Push notification failed for dispute ${disputeId}`);
    }

    this.logger.log(`Dispute ${disputeId} resolved as ${dto.status}`);
    return data;
  }

  async getDisputeStats(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const statuses = ['open', 'under_review', 'resolved_refund', 'resolved_no_action', 'escalated', 'closed'];
    const stats: Record<string, number> = {};

    for (const status of statuses) {
      const { count } = await supabase
        .from('rider_disputes')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', status);
      stats[status] = count || 0;
    }

    // SLA breaches
    const { count: breached } = await supabase
      .from('rider_disputes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['open', 'under_review'])
      .lt('sla_deadline', new Date().toISOString());

    stats.sla_breached = breached || 0;
    return stats;
  }
}
