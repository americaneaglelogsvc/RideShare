import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { EmailService } from './email.service';

/**
 * LeadService — CANONICAL §10 "Lead capture form stores to DB + notifies platform team"
 *
 * Receives leads from the public website (for-operators.html),
 * persists them, and sends an email notification to the platform sales team.
 */

export interface CreateLeadDto {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  fleet_size?: string;
  message?: string;
  source?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  fleet_size?: string;
  message?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'closed';
  created_at: string;
}

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
  ) {}

  async createLead(dto: CreateLeadDto): Promise<Lead> {
    if (!dto.name || !dto.email) {
      throw new BadRequestException('Name and email are required');
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: dto.name,
        email: dto.email,
        phone: dto.phone || null,
        company: dto.company || null,
        fleet_size: dto.fleet_size || null,
        message: dto.message || null,
        source: dto.source || 'website',
        status: 'new',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to create lead: ${error.message}`);

    // Notify platform team (non-blocking)
    this.notifyPlatformTeam(data).catch(err =>
      this.logger.warn(`Failed to notify platform team: ${err.message}`),
    );

    this.logger.log(`Lead captured: ${dto.name} <${dto.email}> from ${dto.source || 'website'}`);
    return data;
  }

  async listLeads(status?: string, limit = 50): Promise<Lead[]> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async updateLeadStatus(leadId: string, status: Lead['status']): Promise<Lead> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private async notifyPlatformTeam(lead: Lead): Promise<void> {
    const body = `
New lead captured from ${lead.source}:

Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone || 'N/A'}
Company: ${lead.company || 'N/A'}
Fleet Size: ${lead.fleet_size || 'N/A'}
Message: ${lead.message || 'N/A'}

Review in Platform Admin Console → Leads section.
    `.trim();

    await this.emailService.send({
      to: 'sales@urwaydispatch.com',
      subject: `New Lead: ${lead.name} — ${lead.company || 'Individual'}`,
      html: `<pre>${body}</pre>`,
      tenantId: 'platform',
      eventType: 'LEAD_CAPTURE',
    });
  }
}
