import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class FeatureGateService {
  private readonly logger = new Logger(FeatureGateService.name);
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly TTL_MS = 30_000; // 30s cache

  constructor(private readonly supabaseService: SupabaseService) {}

  async isEnabled(featureKey: string, context?: { tenantId?: string; userId?: string }): Promise<boolean> {
    const gate = await this.getGate(featureKey);
    if (!gate) return false;

    // Global kill switch
    if (gate.enabled_global) return true;

    // Tenant allowlist
    if (context?.tenantId && gate.enabled_tenants?.includes(context.tenantId)) return true;

    // User allowlist
    if (context?.userId && gate.enabled_users?.includes(context.userId)) return true;

    // Percentage rollout (deterministic hash)
    if (gate.rollout_pct > 0 && context?.userId) {
      const hash = this.simpleHash(context.userId + featureKey);
      return (hash % 100) < gate.rollout_pct;
    }

    return false;
  }

  async getGate(featureKey: string) {
    const cached = this.cache.get(featureKey);
    if (cached && cached.expiry > Date.now()) return cached.data;

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('feature_gates')
      .select('*')
      .eq('feature_key', featureKey)
      .maybeSingle();

    if (error) {
      this.logger.warn(`Feature gate lookup failed: ${error.message}`);
      return null;
    }

    if (data) {
      this.cache.set(featureKey, { data, expiry: Date.now() + this.TTL_MS });
    }

    return data;
  }

  async listGates() {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('feature_gates')
      .select('*')
      .order('feature_key', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async updateGate(featureKey: string, updates: {
    enabledGlobal?: boolean;
    enabledTenants?: string[];
    enabledUsers?: string[];
    rolloutPct?: number;
    description?: string;
  }) {
    const supabase = this.supabaseService.getClient();

    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.enabledGlobal !== undefined) payload.enabled_global = updates.enabledGlobal;
    if (updates.enabledTenants) payload.enabled_tenants = updates.enabledTenants;
    if (updates.enabledUsers) payload.enabled_users = updates.enabledUsers;
    if (updates.rolloutPct !== undefined) {
      if (updates.rolloutPct < 0 || updates.rolloutPct > 100) {
        throw new BadRequestException('rolloutPct must be 0-100');
      }
      payload.rollout_pct = updates.rolloutPct;
    }
    if (updates.description) payload.description = updates.description;

    const { data, error } = await supabase
      .from('feature_gates')
      .update(payload)
      .eq('feature_key', featureKey)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Invalidate cache
    this.cache.delete(featureKey);

    this.logger.log(`Feature gate '${featureKey}' updated`);
    return data;
  }

  async createGate(featureKey: string, description?: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('feature_gates')
      .insert({
        feature_key: featureKey,
        description: description || null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
