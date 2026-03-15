/**
 * @file audit.service.ts
 * @req AUD-EVT-0001 — Audit event taxonomy (money + state changes)
 */
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface AuditEventDto {
  tenantId?: string;
  actorId: string;
  actorType?: 'user' | 'system' | 'cron' | 'webhook';
  eventType: string;
  resourceType: string;
  resourceId: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'approve' | 'reject' | 'escalate';
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async emit(event: AuditEventDto): Promise<string | null> {
    try {
      const supabase = this.supabaseService.getClient();

      const { data, error } = await supabase
        .from('audit_events')
        .insert({
          tenant_id: event.tenantId || null,
          actor_id: event.actorId,
          actor_type: event.actorType || 'user',
          event_type: event.eventType,
          resource_type: event.resourceType,
          resource_id: event.resourceId,
          action: event.action,
          changes: event.changes || null,
          metadata: event.metadata || {},
          ip_address: event.ipAddress || null,
          user_agent: event.userAgent || null,
        })
        .select('id')
        .single();

      if (error) {
        this.logger.warn(`Audit emit failed: ${error.message}`);
        return null;
      }

      return data.id;
    } catch (e: any) {
      this.logger.warn(`Audit emit exception: ${e.message}`);
      return null;
    }
  }

  async query(filters: {
    tenantId?: string;
    actorId?: string;
    resourceType?: string;
    resourceId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters.limit || 100);

    if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId);
    if (filters.actorId) query = query.eq('actor_id', filters.actorId);
    if (filters.resourceType) query = query.eq('resource_type', filters.resourceType);
    if (filters.resourceId) query = query.eq('resource_id', filters.resourceId);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);

    const { data, error } = await query;
    if (error) {
      this.logger.error(`Audit query failed: ${error.message}`);
      return [];
    }

    return data || [];
  }
}
