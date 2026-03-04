import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface UpsertMicrositeDto {
  tenantId: string;
  templateId?: string;
  subdomain?: string;
  customDomain?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  footerText?: string;
  analyticsId?: string;
  customCss?: string;
  pages?: any[];
}

export interface CreateBookingWidgetDto {
  tenantId: string;
  name?: string;
  allowedOrigins?: string[];
  theme?: Record<string, any>;
  defaultCategory?: string;
  showFareEstimate?: boolean;
  showDriverEta?: boolean;
  requireAuth?: boolean;
}

@Injectable()
export class MicrositeService {
  private readonly logger = new Logger(MicrositeService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ── Microsites ────────────────────────────────────────────────────

  async getMicrosite(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_microsites')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getMicrositeBySubdomain(subdomain: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_microsites')
      .select('*')
      .eq('subdomain', subdomain)
      .eq('is_published', true)
      .maybeSingle();

    if (error || !data) throw new NotFoundException('Microsite not found.');
    return data;
  }

  async upsertMicrosite(dto: UpsertMicrositeDto) {
    const supabase = this.supabaseService.getClient();

    const payload: Record<string, any> = {
      tenant_id: dto.tenantId,
      updated_at: new Date().toISOString(),
    };

    if (dto.templateId) payload.template_id = dto.templateId;
    if (dto.subdomain) payload.subdomain = dto.subdomain;
    if (dto.customDomain) payload.custom_domain = dto.customDomain;
    if (dto.heroTitle) payload.hero_title = dto.heroTitle;
    if (dto.heroSubtitle) payload.hero_subtitle = dto.heroSubtitle;
    if (dto.heroImageUrl) payload.hero_image_url = dto.heroImageUrl;
    if (dto.primaryColor) payload.primary_color = dto.primaryColor;
    if (dto.accentColor) payload.accent_color = dto.accentColor;
    if (dto.logoUrl) payload.logo_url = dto.logoUrl;
    if (dto.faviconUrl) payload.favicon_url = dto.faviconUrl;
    if (dto.metaTitle) payload.meta_title = dto.metaTitle;
    if (dto.metaDescription) payload.meta_description = dto.metaDescription;
    if (dto.ogImageUrl) payload.og_image_url = dto.ogImageUrl;
    if (dto.footerText) payload.footer_text = dto.footerText;
    if (dto.analyticsId) payload.analytics_id = dto.analyticsId;
    if (dto.customCss !== undefined) payload.custom_css = dto.customCss;
    if (dto.pages) payload.pages = dto.pages;

    const { data, error } = await supabase
      .from('tenant_microsites')
      .upsert(payload, { onConflict: 'tenant_id' })
      .select()
      .single();

    if (error) {
      this.logger.error(`Upsert microsite failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async publishMicrosite(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_microsites')
      .update({ is_published: true, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Microsite published for tenant ${tenantId}`);
    return data;
  }

  async unpublishMicrosite(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_microsites')
      .update({ is_published: false, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ── Booking Widgets ───────────────────────────────────────────────

  async createWidget(dto: CreateBookingWidgetDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('booking_widgets')
      .insert({
        tenant_id: dto.tenantId,
        name: dto.name || 'Default Widget',
        allowed_origins: dto.allowedOrigins || [],
        theme: dto.theme || { primaryColor: '#1a73e8', borderRadius: '8px' },
        default_category: dto.defaultCategory || null,
        show_fare_estimate: dto.showFareEstimate ?? true,
        show_driver_eta: dto.showDriverEta ?? true,
        require_auth: dto.requireAuth ?? false,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async listWidgets(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('booking_widgets')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getWidgetByKey(widgetKey: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('booking_widgets')
      .select('*')
      .eq('widget_key', widgetKey)
      .eq('is_active', true)
      .single();

    if (error || !data) throw new NotFoundException('Widget not found or inactive.');
    return data;
  }

  async deactivateWidget(widgetId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('booking_widgets')
      .update({ is_active: false })
      .eq('id', widgetId);

    if (error) throw new BadRequestException(error.message);
    return { deactivated: true };
  }
}
