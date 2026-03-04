import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface CreatePolicyDto {
  policy_type: string;
  config_json: Record<string, unknown>;
  activation_mode?: string;
  jurisdiction?: string;
  effective_from?: string;
  effective_until?: string;
  notes?: string;
}

export interface UpdatePolicyDto {
  config_json?: Record<string, unknown>;
  activation_mode?: string;
  effective_from?: string;
  effective_until?: string;
  notes?: string;
}

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async createDraft(tenantId: string, userId: string, dto: CreatePolicyDto) {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('tenant_policies')
      .select('version')
      .eq('tenant_id', tenantId)
      .eq('policy_type', dto.policy_type)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;

    const { data: policy, error } = await supabase
      .from('tenant_policies')
      .insert({
        tenant_id: tenantId,
        policy_type: dto.policy_type,
        version: nextVersion,
        status: 'draft',
        activation_mode: dto.activation_mode || 'manual_only',
        config_json: dto.config_json,
        jurisdiction: dto.jurisdiction,
        effective_from: dto.effective_from,
        effective_until: dto.effective_until,
        notes: dto.notes,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`createDraft failed: ${error.message}`);
      throw new BadRequestException(`Failed to create policy draft: ${error.message}`);
    }

    await this.auditLog(policy.id, tenantId, 'created', userId, null, dto.config_json);

    return policy;
  }

  async updateDraft(tenantId: string, policyId: string, userId: string, dto: UpdatePolicyDto) {
    const supabase = this.supabaseService.getClient();

    const { data: existing, error: fetchErr } = await supabase
      .from('tenant_policies')
      .select('*')
      .eq('id', policyId)
      .eq('tenant_id', tenantId)
      .eq('status', 'draft')
      .single();

    if (fetchErr || !existing) {
      throw new NotFoundException('Draft policy not found or not in draft status');
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.config_json) updates.config_json = dto.config_json;
    if (dto.activation_mode) updates.activation_mode = dto.activation_mode;
    if (dto.effective_from) updates.effective_from = dto.effective_from;
    if (dto.effective_until) updates.effective_until = dto.effective_until;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    const { data: updated, error } = await supabase
      .from('tenant_policies')
      .update(updates)
      .eq('id', policyId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update draft: ${error.message}`);
    }

    await this.auditLog(policyId, tenantId, 'updated', userId, existing.config_json, dto.config_json || existing.config_json);

    return updated;
  }

  async publish(tenantId: string, policyId: string, userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: draft, error: fetchErr } = await supabase
      .from('tenant_policies')
      .select('*')
      .eq('id', policyId)
      .eq('tenant_id', tenantId)
      .eq('status', 'draft')
      .single();

    if (fetchErr || !draft) {
      throw new NotFoundException('Draft policy not found');
    }

    await supabase
      .from('tenant_policies')
      .update({ status: 'archived' })
      .eq('tenant_id', tenantId)
      .eq('policy_type', draft.policy_type)
      .eq('status', 'published');

    const { data: published, error } = await supabase
      .from('tenant_policies')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: userId,
      })
      .eq('id', policyId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to publish: ${error.message}`);
    }

    await this.auditLog(policyId, tenantId, 'published', userId, null, draft.config_json);

    this.logger.log(`Policy ${draft.policy_type} v${draft.version} published for tenant ${tenantId}`);

    return published;
  }

  async rollback(tenantId: string, policyType: string, userId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: current } = await supabase
      .from('tenant_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('policy_type', policyType)
      .eq('status', 'published')
      .single();

    if (!current) {
      throw new NotFoundException('No published policy found to rollback');
    }

    const { data: previous } = await supabase
      .from('tenant_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('policy_type', policyType)
      .eq('status', 'archived')
      .order('version', { ascending: false })
      .limit(1);

    if (!previous || previous.length === 0) {
      throw new ConflictException('No previous version available for rollback');
    }

    await supabase
      .from('tenant_policies')
      .update({ status: 'rollback' })
      .eq('id', current.id);

    await supabase
      .from('tenant_policies')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: userId,
      })
      .eq('id', previous[0].id);

    await this.auditLog(current.id, tenantId, 'rolled_back', userId, current.config_json, previous[0].config_json);

    this.logger.log(`Policy ${policyType} rolled back from v${current.version} to v${previous[0].version} for tenant ${tenantId}`);

    return { rolled_back_from: current.version, restored_to: previous[0].version };
  }

  async getActivePolicy(tenantId: string, policyType: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('policy_type', policyType)
      .eq('status', 'published')
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async listPolicies(tenantId: string, status?: string) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('tenant_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('policy_type')
      .order('version', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to list policies: ${error.message}`);
    }

    return data || [];
  }

  async getPolicyHistory(tenantId: string, policyType: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('policy_type', policyType)
      .order('version', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to get history: ${error.message}`);
    }

    return data || [];
  }

  async diffVersions(tenantId: string, policyType: string, v1: number, v2: number) {
    const supabase = this.supabaseService.getClient();

    const { data: policies } = await supabase
      .from('tenant_policies')
      .select('version, config_json, status, created_at, published_at')
      .eq('tenant_id', tenantId)
      .eq('policy_type', policyType)
      .in('version', [v1, v2]);

    if (!policies || policies.length !== 2) {
      throw new NotFoundException(`Could not find both versions ${v1} and ${v2}`);
    }

    const p1 = policies.find((p: any) => p.version === v1);
    const p2 = policies.find((p: any) => p.version === v2);

    const diff = this.computeDiff(p1!.config_json, p2!.config_json);

    return {
      policy_type: policyType,
      version_a: { version: v1, status: p1!.status, created_at: p1!.created_at },
      version_b: { version: v2, status: p2!.status, created_at: p2!.created_at },
      changes: diff,
    };
  }

  async getJurisdictionTemplates(jurisdiction?: string, policyType?: string) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('jurisdiction_templates')
      .select('*')
      .eq('is_active', true);

    if (jurisdiction) query = query.eq('jurisdiction', jurisdiction);
    if (policyType) query = query.eq('policy_type', policyType);

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to get templates: ${error.message}`);
    }

    return data || [];
  }

  async getAuditLog(tenantId: string, policyId?: string) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('policy_audit_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (policyId) {
      query = query.eq('policy_id', policyId);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to get audit log: ${error.message}`);
    }

    return data || [];
  }

  private async auditLog(
    policyId: string,
    tenantId: string,
    action: string,
    actorId: string,
    oldConfig: any,
    newConfig: any,
  ) {
    const supabase = this.supabaseService.getClient();
    const diffSummary = oldConfig && newConfig
      ? JSON.stringify(this.computeDiff(oldConfig, newConfig))
      : null;

    await supabase.from('policy_audit_log').insert({
      policy_id: policyId,
      tenant_id: tenantId,
      action,
      actor_id: actorId,
      old_config: oldConfig,
      new_config: newConfig,
      diff_summary: diffSummary,
    });
  }

  private computeDiff(a: Record<string, any>, b: Record<string, any>): Array<{ key: string; from: any; to: any }> {
    const changes: Array<{ key: string; from: any; to: any }> = [];
    const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);

    for (const key of allKeys) {
      const valA = (a || {})[key];
      const valB = (b || {})[key];
      if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        changes.push({ key, from: valA, to: valB });
      }
    }

    return changes;
  }
}
