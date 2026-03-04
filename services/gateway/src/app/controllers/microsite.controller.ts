import {
  Controller, Get, Post, Put, Patch, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Public } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { MicrositeService, UpsertMicrositeDto, CreateBookingWidgetDto } from '../services/microsite.service';
import { FaqService, CreateFaqCategoryDto, CreateFaqArticleDto, UpdateFaqArticleDto } from '../services/faq.service';

@ApiTags('microsite')
@Controller('microsites')
export class MicrositeController {
  constructor(
    private readonly micrositeService: MicrositeService,
    private readonly faqService: FaqService,
  ) {}

  // ── Public microsite endpoints ────────────────────────────────────

  @Public()
  @Get('by-subdomain/:subdomain')
  @ApiOperation({ summary: 'Get published microsite by subdomain (public)' })
  async getBySubdomain(@Param('subdomain') subdomain: string) {
    return this.micrositeService.getMicrositeBySubdomain(subdomain);
  }

  // ── Tenant admin microsite management ─────────────────────────────

  @Get(':tenantId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get microsite config for a tenant' })
  async getMicrosite(@Param('tenantId') tenantId: string) {
    return this.micrositeService.getMicrosite(tenantId);
  }

  @Put(':tenantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update microsite config' })
  async upsertMicrosite(
    @Param('tenantId') tenantId: string,
    @Body() dto: Omit<UpsertMicrositeDto, 'tenantId'>,
  ) {
    return this.micrositeService.upsertMicrosite({ ...dto, tenantId });
  }

  @Patch(':tenantId/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish the microsite' })
  async publish(@Param('tenantId') tenantId: string) {
    return this.micrositeService.publishMicrosite(tenantId);
  }

  @Patch(':tenantId/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish the microsite' })
  async unpublish(@Param('tenantId') tenantId: string) {
    return this.micrositeService.unpublishMicrosite(tenantId);
  }

  // ── Booking widgets ───────────────────────────────────────────────

  @Post('widgets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a booking widget' })
  async createWidget(@Body() dto: CreateBookingWidgetDto) {
    return this.micrositeService.createWidget(dto);
  }

  @Get('widgets/tenant/:tenantId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List widgets for a tenant' })
  async listWidgets(@Param('tenantId') tenantId: string) {
    return this.micrositeService.listWidgets(tenantId);
  }

  @Public()
  @Get('widgets/embed/:widgetKey')
  @ApiOperation({ summary: 'Get widget config by key (public, for embed)' })
  async getWidgetByKey(@Param('widgetKey') widgetKey: string) {
    return this.micrositeService.getWidgetByKey(widgetKey);
  }

  @Patch('widgets/:widgetId/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a booking widget' })
  async deactivateWidget(@Param('widgetId') widgetId: string) {
    return this.micrositeService.deactivateWidget(widgetId);
  }
}

@ApiTags('faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // ── Public FAQ endpoints ──────────────────────────────────────────

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List FAQ categories (public)' })
  async listCategories(@Query('tenantId') tenantId?: string) {
    return this.faqService.listCategories(tenantId);
  }

  @Public()
  @Get('categories/:categoryId/articles')
  @ApiOperation({ summary: 'List articles in a category (public)' })
  async listArticles(
    @Param('categoryId') categoryId: string,
    @Query('audience') audience?: string,
  ) {
    return this.faqService.listArticles(categoryId, audience);
  }

  @Public()
  @Get('articles/:articleId')
  @ApiOperation({ summary: 'Get a single FAQ article (public)' })
  async getArticle(@Param('articleId') articleId: string) {
    return this.faqService.getArticle(articleId);
  }

  @Public()
  @Get('slug/:categorySlug/:articleSlug')
  @ApiOperation({ summary: 'Get article by slug path (public)' })
  async getBySlug(
    @Param('categorySlug') categorySlug: string,
    @Param('articleSlug') articleSlug: string,
  ) {
    return this.faqService.getArticleBySlug(categorySlug, articleSlug);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search FAQ articles (public)' })
  async search(
    @Query('q') query: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.faqService.searchArticles(query, tenantId);
  }

  @Public()
  @Post('articles/:articleId/rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rate an article as helpful/not helpful' })
  async rateArticle(
    @Param('articleId') articleId: string,
    @Body() body: { helpful: boolean },
  ) {
    return this.faqService.rateArticle(articleId, body.helpful);
  }

  // ── Admin FAQ management ──────────────────────────────────────────

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS', 'TENANT_OWNER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a FAQ category (admin)' })
  async createCategory(@Body() dto: CreateFaqCategoryDto) {
    return this.faqService.createCategory(dto);
  }

  @Post('articles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS', 'TENANT_OWNER')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a FAQ article (admin)' })
  async createArticle(@Body() dto: CreateFaqArticleDto) {
    return this.faqService.createArticle(dto);
  }

  @Put('articles/:articleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS', 'TENANT_OWNER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a FAQ article (admin)' })
  async updateArticle(
    @Param('articleId') articleId: string,
    @Body() dto: UpdateFaqArticleDto,
  ) {
    return this.faqService.updateArticle(articleId, dto);
  }
}
