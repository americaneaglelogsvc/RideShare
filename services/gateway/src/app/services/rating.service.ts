import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

// §4.5 Ratings + Feedback, §5.7 Driver rates rider
// Bi-directional rating system for riders and drivers after trip completion

export interface RatingInput {
  tripId: string;
  tenantId: string;
  raterId: string;
  raterRole: 'rider' | 'driver';
  rateeId: string;
  score: number; // 1-5
  tags?: string[]; // e.g. ['clean_vehicle', 'professional', 'great_conversation']
  comment?: string;
}

export interface RatingSummary {
  userId: string;
  role: 'rider' | 'driver';
  averageScore: number;
  totalRatings: number;
  distribution: Record<number, number>; // { 1: 2, 2: 0, 3: 5, 4: 20, 5: 73 }
  topTags: { tag: string; count: number }[];
}

@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async submitRating(input: RatingInput) {
    if (input.score < 1 || input.score > 5) {
      throw new BadRequestException('Score must be between 1 and 5');
    }

    const supabase = this.supabaseService.getClient();

    // Prevent duplicate ratings
    const { data: existing } = await supabase
      .from('trip_ratings')
      .select('id')
      .eq('trip_id', input.tripId)
      .eq('rater_id', input.raterId)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException('You have already rated this trip');
    }

    const { data, error } = await supabase
      .from('trip_ratings')
      .insert({
        trip_id: input.tripId,
        tenant_id: input.tenantId,
        rater_id: input.raterId,
        rater_role: input.raterRole,
        ratee_id: input.rateeId,
        score: input.score,
        tags: input.tags || [],
        comment: input.comment || null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Update cached average
    await this.refreshUserAverage(input.rateeId, input.raterRole === 'rider' ? 'driver' : 'rider');

    this.logger.log(`Rating submitted: trip=${input.tripId} ${input.raterRole}→${input.score}★`);
    return data;
  }

  async getTripRatings(tripId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('trip_ratings')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getUserRatingSummary(userId: string, role: 'rider' | 'driver'): Promise<RatingSummary> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('trip_ratings')
      .select('score, tags')
      .eq('ratee_id', userId);

    if (error) throw new BadRequestException(error.message);

    const ratings = data || [];
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const tagCounts: Record<string, number> = {};
    let totalScore = 0;

    for (const r of ratings) {
      distribution[r.score] = (distribution[r.score] || 0) + 1;
      totalScore += r.score;
      for (const tag of (r.tags || [])) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      userId,
      role,
      averageScore: ratings.length > 0 ? Math.round((totalScore / ratings.length) * 100) / 100 : 0,
      totalRatings: ratings.length,
      distribution,
      topTags,
    };
  }

  async getRecentRatings(userId: string, limit = 20) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('trip_ratings')
      .select('*, trips:trip_id(pickup_address, dropoff_address, completed_at)')
      .eq('ratee_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async flagRating(ratingId: string, reason: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('trip_ratings')
      .update({ flagged: true, flag_reason: reason, flagged_at: new Date().toISOString() })
      .eq('id', ratingId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.warn(`Rating flagged: ${ratingId} — ${reason}`);
    return data;
  }

  private async refreshUserAverage(userId: string, role: 'rider' | 'driver') {
    try {
      const supabase = this.supabaseService.getClient();
      const { data } = await supabase
        .from('trip_ratings')
        .select('score')
        .eq('ratee_id', userId);

      if (!data || data.length === 0) return;

      const avg = data.reduce((sum, r) => sum + r.score, 0) / data.length;

      // Update cached rating on the appropriate profile
      const table = role === 'driver' ? 'driver_profiles' : 'riders';
      await supabase
        .from(table)
        .update({ cached_rating: Math.round(avg * 100) / 100, rating_count: data.length })
        .eq(role === 'driver' ? 'driver_id' : 'id', userId);
    } catch (e: any) {
      this.logger.debug(`Rating cache refresh failed for ${userId}: ${e.message}`);
    }
  }
}
