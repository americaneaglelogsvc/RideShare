import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import * as crypto from 'crypto';

@Injectable()
export class TenantApiKeyService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Generate a new API key for a tenant. Returns the raw key only once.
   * Format: uwd_live_{random_hex}
   */
  async generateKey(tenantId: string, label?: string): Promise<{
    key_id: string;
    raw_key: string;
    prefix: string;
    label: string;
  }> {
    const supabase = this.supabaseService.getClient();

    const rawSecret = crypto.randomBytes(32).toString('hex');
    const rawKey = `uwd_live_${rawSecret}`;
    const prefix = rawKey.slice(0, 16);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const { data, error } = await supabase
      .from('tenant_api_keys')
      .insert({
        tenant_id: tenantId,
        key_prefix: prefix,
        key_hash: keyHash,
        label: label || 'default',
        is_active: true,
      })
      .select('id')
      .single();

    if (error) throw new Error('Failed to generate API key: ' + error.message);

    return {
      key_id: data.id,
      raw_key: rawKey,
      prefix,
      label: label || 'default',
    };
  }

  /**
   * Validate an API key and return the associated tenant_id.
   * Updates last_used_at on successful validation.
   */
  async validateKey(rawKey: string): Promise<{ tenantId: string; keyId: string }> {
    const supabase = this.supabaseService.getClient();

    if (!rawKey.startsWith('uwd_live_')) {
      throw new UnauthorizedException('Invalid API key format.');
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const { data, error } = await supabase
      .from('tenant_api_keys')
      .select('id, tenant_id, is_active, expires_at')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new UnauthorizedException('Invalid or revoked API key.');
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      throw new UnauthorizedException('API key has expired.');
    }

    // Update last_used_at (fire-and-forget)
    supabase
      .from('tenant_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {});

    return { tenantId: data.tenant_id, keyId: data.id };
  }

  /**
   * List all API keys for a tenant (secrets never exposed).
   */
  async listKeys(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_api_keys')
      .select('id, key_prefix, label, is_active, last_used_at, expires_at, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to list API keys');
    return data || [];
  }

  /**
   * Revoke (rotate) an API key.
   */
  async revokeKey(tenantId: string, keyId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('tenant_api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('tenant_id', tenantId);

    if (error) throw new Error('Failed to revoke API key');
    return { success: true, message: 'API key revoked.' };
  }
}
