import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import * as crypto from 'crypto';

/**
 * M5.5: Automated Dispute & Chargeback Orchestrator
 *
 * Handles the financial friction of the US banking system (PaySurity):
 * - On chargeback.initiated: move funds from pending_balance → disputed_balance
 * - Auto-generate evidence package (GPS traces, mile-based distances, timestamps)
 * - Track dispute lifecycle: initiated → evidence_submitted → won/lost/expired
 *
 * All amounts in integer cents. No floating points.
 */

export interface DisputeCase {
  id: string;
  tenantId: string;
  tripId: string;
  transactionId: string;
  status: string;
  disputeType: string;
  disputedAmountCents: number;
  originalFareCents: number;
  reason?: string;
  evidencePackage: Record<string, any>;
  createdAt: string;
}

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Handle a chargeback.initiated event from PaySurity.
   * Moves funds from tenant pending_balance to disputed_balance.
   */
  async handleChargebackInitiated(payload: {
    transaction_id: string;
    disputed_amount_cents: number;
    reason?: string;
    paysurity_dispute_id?: string;
    metadata?: { trip_id?: string; tenant_id?: string };
  }): Promise<DisputeCase> {
    const supabase = this.supabaseService.getClient();

    const tripId = payload.metadata?.trip_id;
    const tenantId = payload.metadata?.tenant_id;

    if (!tripId || !tenantId) {
      throw new BadRequestException('Chargeback event missing trip_id or tenant_id in metadata');
    }

    // Idempotency: check if dispute already exists for this transaction
    const { data: existing } = await supabase
      .from('dispute_cases')
      .select('id')
      .eq('transaction_id', payload.transaction_id)
      .single();

    if (existing) {
      this.logger.warn(`Dispute already exists for transaction ${payload.transaction_id} — idempotent skip`);
      const { data: full } = await supabase
        .from('dispute_cases')
        .select('*')
        .eq('transaction_id', payload.transaction_id)
        .single();
      return this.mapDispute(full);
    }

    // Fetch trip data for evidence package
    const { data: trip } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (!trip) {
      throw new NotFoundException(`Trip ${tripId} not found for chargeback`);
    }

    // Build evidence package with mile-based GPS traces
    const evidencePackage = this.buildEvidencePackage(trip);

    // Create dispute case
    const { data: dispute, error: disputeError } = await supabase
      .from('dispute_cases')
      .insert({
        tenant_id: tenantId,
        trip_id: tripId,
        transaction_id: payload.transaction_id,
        driver_id: trip.driver_id,
        rider_id: trip.rider_id,
        status: 'initiated',
        dispute_type: 'chargeback',
        disputed_amount_cents: payload.disputed_amount_cents,
        original_fare_cents: trip.fare_cents,
        reason: payload.reason,
        evidence_package: evidencePackage,
        paysurity_dispute_id: payload.paysurity_dispute_id,
      })
      .select('*')
      .single();

    if (disputeError) {
      throw new BadRequestException('Failed to create dispute case: ' + disputeError.message);
    }

    // Move funds: pending_balance → disputed_balance
    await this.moveToDisputedBalance(tenantId, payload.disputed_amount_cents);

    this.logger.log(
      `M5.5: Chargeback initiated for trip ${tripId} — ${payload.disputed_amount_cents}¢ moved to disputed_balance`,
    );

    return this.mapDispute(dispute);
  }

  /**
   * Build an evidence package for fighting the dispute.
   * Contains trip details, mile-based GPS traces, and timestamps.
   */
  private buildEvidencePackage(trip: any): Record<string, any> {
    const distanceMiles = trip.distance_miles || 0;

    return {
      trip_summary: {
        trip_id: trip.id,
        tenant_id: trip.tenant_id,
        status: trip.status,
        created_at: trip.created_at,
        completed_at: trip.completed_at,
      },
      fare_details: {
        fare_cents: trip.fare_cents,
        net_payout_cents: trip.net_payout_cents,
        commission_cents: trip.commission_cents,
      },
      route: {
        pickup: {
          address: trip.pickup_address,
          lat: trip.pickup_lat,
          lng: trip.pickup_lng,
        },
        dropoff: {
          address: trip.dropoff_address,
          lat: trip.dropoff_lat,
          lng: trip.dropoff_lng,
        },
        distance_miles: Math.round(distanceMiles * 100) / 100,
        distance_display: `${distanceMiles.toFixed(1)} miles`,
        duration_minutes: trip.duration_minutes,
      },
      gps_trace: {
        pickup_coordinates: `${trip.pickup_lat}, ${trip.pickup_lng}`,
        dropoff_coordinates: `${trip.dropoff_lat}, ${trip.dropoff_lng}`,
        maps_url: `https://maps.google.com/maps?saddr=${trip.pickup_lat},${trip.pickup_lng}&daddr=${trip.dropoff_lat},${trip.dropoff_lng}`,
      },
      timestamps: {
        trip_created: trip.created_at,
        trip_completed: trip.completed_at,
        evidence_generated: new Date().toISOString(),
      },
      integrity_hash: crypto
        .createHash('sha256')
        .update(JSON.stringify({
          trip_id: trip.id,
          fare_cents: trip.fare_cents,
          pickup: `${trip.pickup_lat},${trip.pickup_lng}`,
          dropoff: `${trip.dropoff_lat},${trip.dropoff_lng}`,
        }))
        .digest('hex'),
    };
  }

  /**
   * Move funds from pending_balance to disputed_balance for a tenant.
   */
  private async moveToDisputedBalance(tenantId: string, amountCents: number): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Fetch current balances
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('pending_balance_cents, disputed_balance_cents')
      .eq('id', tenantId)
      .single();

    if (fetchError || !tenant) {
      this.logger.error(`Failed to fetch tenant ${tenantId} for balance move`);
      return;
    }

    const currentPending = tenant.pending_balance_cents || 0;
    const currentDisputed = tenant.disputed_balance_cents || 0;

    await supabase
      .from('tenants')
      .update({
        pending_balance_cents: currentPending - amountCents,
        disputed_balance_cents: currentDisputed + amountCents,
      })
      .eq('id', tenantId);
  }

  /**
   * Submit evidence for a dispute to PaySurity.
   */
  async submitEvidence(
    disputeId: string,
    additionalEvidence?: Record<string, any>,
  ): Promise<DisputeCase> {
    const supabase = this.supabaseService.getClient();

    const { data: dispute, error: fetchError } = await supabase
      .from('dispute_cases')
      .select('*')
      .eq('id', disputeId)
      .eq('status', 'initiated')
      .single();

    if (fetchError || !dispute) {
      throw new NotFoundException('Dispute not found or not in initiated status');
    }

    // Merge additional evidence
    const mergedEvidence = {
      ...dispute.evidence_package,
      ...additionalEvidence,
      submission_timestamp: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from('dispute_cases')
      .update({
        status: 'evidence_submitted',
        evidence_package: mergedEvidence,
        evidence_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select('*')
      .single();

    if (updateError || !updated) {
      throw new BadRequestException('Failed to submit evidence');
    }

    this.logger.log(`M5.5: Evidence submitted for dispute ${disputeId}`);
    return this.mapDispute(updated);
  }

  /**
   * Resolve a dispute (won or lost).
   * If won: move funds back from disputed_balance to pending_balance.
   * If lost: deduct from disputed_balance permanently.
   */
  async resolveDispute(
    disputeId: string,
    resolution: 'won' | 'lost' | 'expired',
    notes?: string,
  ): Promise<DisputeCase> {
    const supabase = this.supabaseService.getClient();

    const { data: dispute, error: fetchError } = await supabase
      .from('dispute_cases')
      .select('*')
      .eq('id', disputeId)
      .in('status', ['initiated', 'evidence_submitted'])
      .single();

    if (fetchError || !dispute) {
      throw new NotFoundException('Dispute not found or already resolved');
    }

    const { data: resolved, error: updateError } = await supabase
      .from('dispute_cases')
      .update({
        status: resolution,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select('*')
      .single();

    if (updateError || !resolved) {
      throw new BadRequestException('Failed to resolve dispute');
    }

    // Balance adjustment
    if (resolution === 'won') {
      // Funds return to pending_balance
      await this.restoreFromDisputedBalance(dispute.tenant_id, dispute.disputed_amount_cents);
      this.logger.log(`M5.5: Dispute ${disputeId} WON — ${dispute.disputed_amount_cents}¢ restored`);
    } else {
      // Funds lost permanently — just reduce disputed_balance
      await this.deductFromDisputedBalance(dispute.tenant_id, dispute.disputed_amount_cents);
      this.logger.log(`M5.5: Dispute ${disputeId} ${resolution.toUpperCase()} — ${dispute.disputed_amount_cents}¢ lost`);
    }

    return this.mapDispute(resolved);
  }

  private async restoreFromDisputedBalance(tenantId: string, amountCents: number): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const { data: tenant } = await supabase
      .from('tenants')
      .select('pending_balance_cents, disputed_balance_cents')
      .eq('id', tenantId)
      .single();

    if (!tenant) return;

    await supabase
      .from('tenants')
      .update({
        pending_balance_cents: (tenant.pending_balance_cents || 0) + amountCents,
        disputed_balance_cents: (tenant.disputed_balance_cents || 0) - amountCents,
      })
      .eq('id', tenantId);
  }

  private async deductFromDisputedBalance(tenantId: string, amountCents: number): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const { data: tenant } = await supabase
      .from('tenants')
      .select('disputed_balance_cents')
      .eq('id', tenantId)
      .single();

    if (!tenant) return;

    await supabase
      .from('tenants')
      .update({
        disputed_balance_cents: (tenant.disputed_balance_cents || 0) - amountCents,
      })
      .eq('id', tenantId);
  }

  /**
   * List disputes for a tenant.
   */
  async listDisputes(
    tenantId: string,
    status?: string,
    limit: number = 50,
  ): Promise<DisputeCase[]> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('dispute_cases')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new BadRequestException('Failed to list disputes');
    return (data || []).map((d: any) => this.mapDispute(d));
  }

  /**
   * Get dispute summary across all tenants (admin view).
   */
  async getDisputeSummary(): Promise<{
    totalActive: number;
    totalDisputedCents: number;
    byStatus: Record<string, number>;
    recentDisputes: DisputeCase[];
  }> {
    const supabase = this.supabaseService.getClient();

    const { data: active } = await supabase
      .from('dispute_cases')
      .select('*')
      .in('status', ['initiated', 'evidence_submitted'])
      .order('created_at', { ascending: false })
      .limit(100);

    const byStatus: Record<string, number> = {};
    let totalDisputedCents = 0;

    for (const d of active || []) {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      totalDisputedCents += d.disputed_amount_cents;
    }

    return {
      totalActive: (active || []).length,
      totalDisputedCents,
      byStatus,
      recentDisputes: (active || []).slice(0, 20).map((d: any) => this.mapDispute(d)),
    };
  }

  private mapDispute(d: any): DisputeCase {
    return {
      id: d.id,
      tenantId: d.tenant_id,
      tripId: d.trip_id,
      transactionId: d.transaction_id,
      status: d.status,
      disputeType: d.dispute_type,
      disputedAmountCents: d.disputed_amount_cents,
      originalFareCents: d.original_fare_cents,
      reason: d.reason,
      evidencePackage: d.evidence_package,
      createdAt: d.created_at,
    };
  }
}
