import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface CreateFaqCategoryDto {
  tenantId?: string;
  scope?: 'platform' | 'tenant';
  name: string;
  slug: string;
  sortOrder?: number;
}

export interface CreateFaqArticleDto {
  categoryId: string;
  tenantId?: string;
  title: string;
  slug: string;
  contentMd: string;
  contentHtml?: string;
  audience?: 'all' | 'rider' | 'driver' | 'tenant_admin';
  isPublished?: boolean;
  sortOrder?: number;
}

export interface UpdateFaqArticleDto {
  title?: string;
  contentMd?: string;
  contentHtml?: string;
  audience?: 'all' | 'rider' | 'driver' | 'tenant_admin';
  isPublished?: boolean;
  sortOrder?: number;
}

@Injectable()
export class FaqService {
  private readonly logger = new Logger(FaqService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ── Categories ────────────────────────────────────────────────────

  async listCategories(tenantId?: string) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('faq_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async createCategory(dto: CreateFaqCategoryDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('faq_categories')
      .insert({
        tenant_id: dto.tenantId || null,
        scope: dto.scope || (dto.tenantId ? 'tenant' : 'platform'),
        name: dto.name,
        slug: dto.slug,
        sort_order: dto.sortOrder || 0,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        throw new BadRequestException(`Category slug "${dto.slug}" already exists.`);
      }
      throw new BadRequestException(error.message);
    }

    return data;
  }

  // ── Articles ──────────────────────────────────────────────────────

  async listArticles(categoryId: string, audience?: string) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('faq_articles')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (audience && audience !== 'all') {
      query = query.or(`audience.eq.${audience},audience.eq.all`);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async getArticle(articleId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('faq_articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (error || !data) throw new NotFoundException('Article not found.');

    // Increment view count (non-blocking)
    supabase
      .from('faq_articles')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', articleId)
      .then(() => {});

    return data;
  }

  async getArticleBySlug(categorySlug: string, articleSlug: string) {
    const supabase = this.supabaseService.getClient();

    const { data: category } = await supabase
      .from('faq_categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();

    if (!category) throw new NotFoundException('Category not found.');

    const { data, error } = await supabase
      .from('faq_articles')
      .select('*')
      .eq('category_id', category.id)
      .eq('slug', articleSlug)
      .eq('is_published', true)
      .single();

    if (error || !data) throw new NotFoundException('Article not found.');
    return data;
  }

  async createArticle(dto: CreateFaqArticleDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('faq_articles')
      .insert({
        category_id: dto.categoryId,
        tenant_id: dto.tenantId || null,
        title: dto.title,
        slug: dto.slug,
        content_md: dto.contentMd,
        content_html: dto.contentHtml || null,
        audience: dto.audience || 'all',
        is_published: dto.isPublished ?? true,
        sort_order: dto.sortOrder || 0,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateArticle(articleId: string, dto: UpdateFaqArticleDto) {
    const supabase = this.supabaseService.getClient();

    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (dto.title) payload.title = dto.title;
    if (dto.contentMd) payload.content_md = dto.contentMd;
    if (dto.contentHtml !== undefined) payload.content_html = dto.contentHtml;
    if (dto.audience) payload.audience = dto.audience;
    if (dto.isPublished !== undefined) payload.is_published = dto.isPublished;
    if (dto.sortOrder !== undefined) payload.sort_order = dto.sortOrder;

    const { data, error } = await supabase
      .from('faq_articles')
      .update(payload)
      .eq('id', articleId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async rateArticle(articleId: string, helpful: boolean) {
    const supabase = this.supabaseService.getClient();

    const { data: article } = await supabase
      .from('faq_articles')
      .select('helpful_count, not_helpful_count')
      .eq('id', articleId)
      .single();

    if (!article) throw new NotFoundException('Article not found.');

    const update = helpful
      ? { helpful_count: (article.helpful_count || 0) + 1 }
      : { not_helpful_count: (article.not_helpful_count || 0) + 1 };

    const { data, error } = await supabase
      .from('faq_articles')
      .update(update)
      .eq('id', articleId)
      .select('id, helpful_count, not_helpful_count')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async searchArticles(query: string, tenantId?: string) {
    const supabase = this.supabaseService.getClient();

    let dbQuery = supabase
      .from('faq_articles')
      .select('id, title, slug, content_md, audience, category_id')
      .eq('is_published', true)
      .or(`title.ilike.%${query}%,content_md.ilike.%${query}%`);

    if (tenantId) {
      dbQuery = dbQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data, error } = await dbQuery.limit(20);
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }
}
