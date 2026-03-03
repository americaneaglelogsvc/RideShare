import { Controller, Get, Res, Param, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../guards/jwt-auth.guard';
import { SupabaseService } from '../services/supabase.service';

/**
 * Phase 7.0: SEO & Meta-Tag Controller
 *
 * Serves dynamic robots.txt, sitemap.xml, and tenant meta-tag JSON
 * for the public marketing site and white-label tenant microsites.
 */
@ApiTags('seo')
@Controller()
export class SeoController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Public()
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Dynamic robots.txt' })
  @ApiResponse({ status: 200, description: 'robots.txt content' })
  async getRobotsTxt(@Res() res: Response) {
    const content = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /webhooks/
Disallow: /developer/
Disallow: /compliance/
Disallow: /health/

Sitemap: https://urwaydispatch.com/sitemap.xml
`;
    res.type('text/plain').send(content);
  }

  @Public()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  @ApiOperation({ summary: 'Dynamic sitemap.xml with tenant microsites' })
  @ApiResponse({ status: 200, description: 'sitemap.xml content' })
  async getSitemapXml(@Res() res: Response) {
    const supabase = this.supabaseService.getClient();

    // Fetch active tenants with domain mappings for sitemap inclusion
    let tenantUrls = '';
    try {
      const { data: mappings } = await supabase
        .from('tenant_domain_mappings')
        .select('host')
        .limit(500);

      if (mappings) {
        tenantUrls = mappings.map(m => `  <url>
    <loc>https://${m.host}/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n');
      }
    } catch {
      // Supabase unavailable — serve static sitemap only
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://urwaydispatch.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://urwaydispatch.com/pricing</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://urwaydispatch.com/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://urwaydispatch.com/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
${tenantUrls}
</urlset>`;
    res.type('application/xml').send(xml);
  }

  @Public()
  @Get('meta/:tenantSlug')
  @ApiOperation({ summary: 'Tenant-specific meta tags for SSR/SEO injection' })
  @ApiResponse({ status: 200, description: 'JSON meta tag payload' })
  async getTenantMeta(@Param('tenantSlug') tenantSlug: string) {
    const supabase = this.supabaseService.getClient();

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', tenantSlug)
      .single();

    if (!tenant) {
      return {
        title: 'UrWay Dispatch — Rideshare Management Platform',
        description: 'Launch your own rideshare brand with UrWay Dispatch. White-label driver management, dispatch, and payment processing.',
        og_image: 'https://urwaydispatch.com/og-default.png',
        canonical: 'https://urwaydispatch.com',
      };
    }

    const { data: onboarding } = await supabase
      .from('tenant_onboarding')
      .select('logo_svg_url, welcome_message')
      .eq('tenant_id', tenant.id)
      .single();

    return {
      title: `${tenant.name} — Powered by UrWay Dispatch`,
      description: onboarding?.welcome_message || `Book a ride with ${tenant.name}. Fast, safe, affordable transportation.`,
      og_image: onboarding?.logo_svg_url || 'https://urwaydispatch.com/og-default.png',
      canonical: `https://${tenant.slug}.urwaydispatch.com`,
      tenant_name: tenant.name,
      tenant_slug: tenant.slug,
    };
  }
}
