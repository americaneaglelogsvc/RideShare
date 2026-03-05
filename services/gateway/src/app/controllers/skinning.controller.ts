import { Controller, Get, Param, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SkinningService } from '../services/skinning.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Skinning')
@Controller('skin')
export class SkinningController {
  constructor(private readonly skinningService: SkinningService) {}

  @Get(':tenantId')
  @ApiOperation({ summary: 'Get tenant branding and skin configuration' })
  @ApiResponse({ status: 200, description: 'Skin configuration retrieved successfully' })
  async getTenantSkin(@Param('tenantId') tenantId: string) {
    try {
      const skin = await this.skinningService.getTenantSkin(tenantId);

      return {
        success: true,
        data: skin,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
          code: 'SKIN_RETRIEVAL_FAILED',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get(':tenantId/public')
  @ApiOperation({ summary: 'Get public tenant branding (no auth required)' })
  @ApiResponse({ status: 200, description: 'Public branding retrieved successfully' })
  async getPublicBranding(@Param('tenantId') tenantId: string) {
    try {
      // Use the same service method but return only public-safe data
      const skin = await this.skinningService.getTenantSkin(tenantId);
      
      // Return only public-safe branding data
      const publicBranding = {
        tenantName: skin.tenantName,
        tenantSlug: skin.tenantSlug,
        cssVariables: skin.cssVariables,
        logoUrl: skin.logoUrl,
        faviconUrl: skin.faviconUrl,
        welcomeMessage: skin.welcomeMessage,
      };

      return {
        success: true,
        data: publicBranding,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
          code: 'PUBLIC_BRANDING_RETRIEVAL_FAILED',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
