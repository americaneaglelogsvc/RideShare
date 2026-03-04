import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

// §4.3 Multiple stops + split-pay + gratuity
// Allows riders to split a trip fare among multiple participants

export interface SplitPayRequest {
  tripId: string;
  tenantId: string;
  initiatorId: string;
  participants: SplitParticipant[];
}

export interface SplitParticipant {
  userId?: string;
  email?: string;
  phone?: string;
  shareType: 'equal' | 'fixed_amount' | 'percentage';
  shareValue?: number; // cents for fixed_amount, percent for percentage
}

export interface SplitPayStatus {
  tripId: string;
  totalCents: number;
  splits: {
    participantId: string;
    amountCents: number;
    status: 'pending' | 'accepted' | 'declined' | 'paid' | 'failed';
    paidAt: string | null;
  }[];
}

@Injectable()
export class SplitPayService {
  private readonly logger = new Logger(SplitPayService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async initiateSplit(request: SplitPayRequest): Promise<SplitPayStatus> {
    const supabase = this.supabaseService.getClient();

    // Get trip total
    const { data: trip } = await supabase
      .from('trips')
      .select('total_fare_cents, status')
      .eq('id', request.tripId)
      .maybeSingle();

    if (!trip) throw new BadRequestException('Trip not found');

    const totalCents = trip.total_fare_cents;
    const participantCount = request.participants.length;

    // Calculate each participant's share
    const splits = request.participants.map((p, index) => {
      let amountCents: number;

      switch (p.shareType) {
        case 'equal':
          amountCents = Math.floor(totalCents / participantCount);
          // Last person gets remainder
          if (index === participantCount - 1) {
            amountCents = totalCents - (Math.floor(totalCents / participantCount) * (participantCount - 1));
          }
          break;
        case 'fixed_amount':
          amountCents = p.shareValue || 0;
          break;
        case 'percentage':
          amountCents = Math.round(totalCents * (p.shareValue || 0) / 100);
          break;
        default:
          amountCents = Math.floor(totalCents / participantCount);
      }

      return {
        trip_id: request.tripId,
        tenant_id: request.tenantId,
        participant_id: p.userId || null,
        participant_email: p.email || null,
        participant_phone: p.phone || null,
        amount_cents: amountCents,
        share_type: p.shareType,
        status: p.userId === request.initiatorId ? 'accepted' : 'pending',
        initiated_by: request.initiatorId,
      };
    });

    // Validate total matches
    const splitTotal = splits.reduce((sum, s) => sum + s.amount_cents, 0);
    if (Math.abs(splitTotal - totalCents) > participantCount) {
      throw new BadRequestException('Split amounts do not add up to trip total');
    }

    // Insert splits
    const { data, error } = await supabase
      .from('split_pay_requests')
      .insert(splits)
      .select();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(`Split pay initiated: trip=${request.tripId}, ${participantCount} participants`);

    return {
      tripId: request.tripId,
      totalCents,
      splits: (data || []).map(s => ({
        participantId: s.participant_id || s.participant_email || s.participant_phone,
        amountCents: s.amount_cents,
        status: s.status,
        paidAt: s.paid_at,
      })),
    };
  }

  async respondToSplit(splitId: string, userId: string, accept: boolean) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('split_pay_requests')
      .update({
        status: accept ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', splitId)
      .eq('participant_id', userId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    this.logger.log(`Split ${splitId} ${accept ? 'accepted' : 'declined'} by ${userId}`);

    // If declined, reassign their share to initiator
    if (!accept) {
      await this.reassignDeclinedShare(data.trip_id, data.amount_cents, data.initiated_by);
    }

    return data;
  }

  async getSplitStatus(tripId: string): Promise<SplitPayStatus | null> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('split_pay_requests')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at');

    if (error || !data || data.length === 0) return null;

    const totalCents = data.reduce((sum, s) => sum + s.amount_cents, 0);

    return {
      tripId,
      totalCents,
      splits: data.map(s => ({
        participantId: s.participant_id || s.participant_email || s.participant_phone,
        amountCents: s.amount_cents,
        status: s.status,
        paidAt: s.paid_at,
      })),
    };
  }

  async markPaid(splitId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('split_pay_requests')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', splitId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private async reassignDeclinedShare(tripId: string, amountCents: number, initiatorId: string) {
    const supabase = this.supabaseService.getClient();

    // Add declined amount to initiator's share
    const { data: initiatorSplit } = await supabase
      .from('split_pay_requests')
      .select('id, amount_cents')
      .eq('trip_id', tripId)
      .eq('participant_id', initiatorId)
      .maybeSingle();

    if (initiatorSplit) {
      await supabase
        .from('split_pay_requests')
        .update({ amount_cents: initiatorSplit.amount_cents + amountCents })
        .eq('id', initiatorSplit.id);
    }
  }
}
