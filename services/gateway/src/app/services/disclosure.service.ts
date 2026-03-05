import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * DisclosureService — CANONICAL §8.Y RIDE-DISC-010
 * "Disclosure panel: tenant-versioned disclosures (who covers what per ride phase)"
 *
 * - CRUD + publish lifecycle (draft → active → archived)
 * - Version-tracked per tenant
 * - Display contexts: booking, trip, receipt, all
 * - Rider-accessible: GET /disclosures/:tenantId/active
 */

export interface Disclosure {
  id: string;
  tenant_id: string;
  version: number;
  title: string;
  body: string;
  display_context: 'booking' | 'trip' | 'receipt' | 'all';
  status: 'draft' | 'active' | 'archived';
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDisclosureDto {
  title: string;
  body: string;
  display_context?: 'booking' | 'trip' | 'receipt' | 'all';
}

@Injectable()
export class DisclosureService {
  private readonly logger = new Logger(DisclosureService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async create(tenantId: string, dto: CreateDisclosureDto): Promise<Disclosure> {
    const supabase = this.supabaseService.getClient();

    // Get next version number
    const { data: latest } = await supabase
      .from('disclosures')
      .select('version')
      .eq('tenant_id', tenantId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latest?.version || 0) + 1;

    const { data, error } = await supabase
      .from('disclosures')
      .insert({
        tenant_id: tenantId,
        version: nextVersion,
        title: dto.title,
        body: dto.body,
        display_context: dto.display_context || 'all',
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Disclosure v${nextVersion} created for tenant ${tenantId}`);
    return data;
  }

  async publish(tenantId: string, disclosureId: string): Promise<Disclosure> {
    const supabase = this.supabaseService.getClient();

    // Archive any currently active disclosure for same context
    const { data: disclosure } = await supabase
      .from('disclosures')
      .select('*')
      .eq('id', disclosureId)
      .eq('tenant_id', tenantId)
      .eq('status', 'draft')
      .single();

    if (!disclosure) throw new NotFoundException('Draft disclosure not found');

    // Archive previous active for same context
    await supabase
      .from('disclosures')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('display_context', disclosure.display_context)
      .eq('status', 'active');

    // Publish
    const { data, error } = await supabase
      .from('disclosures')
      .update({
        status: 'active',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', disclosureId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Disclosure ${disclosureId} published for tenant ${tenantId}`);
    return data;
  }

  async getActive(tenantId: string, context?: string): Promise<Disclosure[]> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('disclosures')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('version', { ascending: false });

    if (context) {
      query = query.or(`display_context.eq.${context},display_context.eq.all`);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async list(tenantId: string): Promise<Disclosure[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('disclosures')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('version', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async archive(tenantId: string, disclosureId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('disclosures')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', disclosureId)
      .eq('tenant_id', tenantId);

    if (error) throw new BadRequestException(error.message);
  }
}
