import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * Phase 7.0 V.1: Universal Skinning Service
 *
 * Resolves CSS variables (--primary, --accent, --bg, etc.) per tenant.
 * These variables are injected into all 7 views:
 *   Rider App, Driver App, Dispatch Console, Tenant Admin,
 *   Super Admin, Public Marketing, Developer Portal.
 *
 * The output is a JSON payload that frontend apps convert into
 * CSS custom properties at runtime via `document.documentElement.style.setProperty()`.
 */

export interface TenantSkin {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  cssVariables: Record<string, string>;
  logoUrl: string;
  appIconUrl: string;
  faviconUrl: string;
  welcomeMessage: string;
  isCustomSkin: boolean; // True if tenant has overridden defaults
}

const DEFAULT_SKIN: Record<string, string> = {
  '--primary': '#1a1a2e',
  '--primary-hover': '#16213e',
  '--accent': '#0f3460',
  '--accent-hover': '#0c2d54',
  '--bg': '#f4f4f5',
  '--bg-card': '#ffffff',
  '--bg-sidebar': '#1a1a2e',
  '--text-primary': '#1f2937',
  '--text-secondary': '#6b7280',
  '--text-inverse': '#ffffff',
  '--border': '#e5e7eb',
  '--success': '#10b981',
  '--warning': '#f59e0b',
  '--danger': '#ef4444',
  '--info': '#3b82f6',
  '--radius-sm': '4px',
  '--radius-md': '8px',
  '--radius-lg': '12px',
  '--shadow-sm': '0 1px 2px rgba(0,0,0,0.05)',
  '--shadow-md': '0 4px 6px rgba(0,0,0,0.07)',
  '--font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

@Injectable()
export class SkinningService {
  private readonly logger = new Logger(SkinningService.name);
  private readonly skinCache = new Map<string, { skin: TenantSkin; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Resolve the full CSS skin for a tenant. Returns cached if available.
   */
  async getTenantSkin(tenantId: string): Promise<TenantSkin> {
    // Check cache
    const cached = this.skinCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.skin;
    }

    const supabase = this.supabaseService.getClient();

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', tenantId)
      .single();

    const { data: onboarding } = await supabase
      .from('tenant_onboarding')
      .select('logo_svg_url, app_icon_url, primary_hex, secondary_hex, welcome_message, custom_css_json')
      .eq('tenant_id', tenantId)
      .single();

    const cssVariables = { ...DEFAULT_SKIN };
    let isCustomSkin = false;

    if (onboarding?.primary_hex) {
      cssVariables['--primary'] = onboarding.primary_hex;
      cssVariables['--bg-sidebar'] = onboarding.primary_hex;
      isCustomSkin = true;
    }
    if (onboarding?.secondary_hex) {
      cssVariables['--accent'] = onboarding.secondary_hex;
      isCustomSkin = true;
    }

    // Merge custom CSS JSON overrides if tenant has paid for Custom CSS
    if (onboarding?.custom_css_json) {
      try {
        const overrides = typeof onboarding.custom_css_json === 'string'
          ? JSON.parse(onboarding.custom_css_json)
          : onboarding.custom_css_json;
        for (const [key, value] of Object.entries(overrides)) {
          if (key.startsWith('--') && typeof value === 'string') {
            cssVariables[key] = value;
            isCustomSkin = true;
          }
        }
      } catch {
        this.logger.warn(`Invalid custom_css_json for tenant ${tenantId}`);
      }
    }

    const skin: TenantSkin = {
      tenantId: tenant?.id || tenantId,
      tenantName: tenant?.name || 'UrWay Dispatch',
      tenantSlug: tenant?.slug || '',
      cssVariables,
      logoUrl: onboarding?.logo_svg_url || '',
      appIconUrl: onboarding?.app_icon_url || '',
      faviconUrl: onboarding?.app_icon_url || '',
      welcomeMessage: onboarding?.welcome_message || '',
      isCustomSkin,
    };

    // Cache it
    this.skinCache.set(tenantId, { skin, expiresAt: Date.now() + this.CACHE_TTL_MS });

    return skin;
  }

  /**
   * Get the default (platform-level) skin for non-tenant pages.
   */
  getDefaultSkin(): TenantSkin {
    return {
      tenantId: 'platform',
      tenantName: 'UrWay Dispatch',
      tenantSlug: '',
      cssVariables: { ...DEFAULT_SKIN },
      logoUrl: '',
      appIconUrl: '',
      faviconUrl: '',
      welcomeMessage: '',
      isCustomSkin: false,
    };
  }

  /**
   * Invalidate cached skin for a tenant (called after branding update).
   */
  invalidateCache(tenantId: string): void {
    this.skinCache.delete(tenantId);
    this.logger.log(`Skin cache invalidated for tenant ${tenantId}`);
  }

  /**
   * Generate the inline <style> block for SSR injection.
   */
  generateInlineStyleBlock(skin: TenantSkin): string {
    const vars = Object.entries(skin.cssVariables)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
    return `:root {\n${vars}\n}`;
  }
}
