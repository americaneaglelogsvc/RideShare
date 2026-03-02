import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './services/supabase.service';
import { RealtimeService } from './services/realtime.service';
import { DispatchService } from './services/dispatch.service';
import { LedgerService } from './services/ledger.service';
import { IdentityService } from './services/identity.service';
import { TenantService } from './services/tenant.service';
import { HealthController } from './controllers/health.controller';
import { DriverController } from './controllers/driver.controller';
import { DispatchController } from './controllers/dispatch.controller';
import { TenantController } from './controllers/tenant.controller';
import { DriverService } from './services/driver.service';
import { TenantContextMiddleware } from './tenant-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule,
  ],
  controllers: [
    HealthController,
    DriverController,
    DispatchController,
    TenantController,
  ],
  providers: [
    SupabaseService,
    RealtimeService,
    DispatchService,
    LedgerService,
    DriverService,
    IdentityService,
    TenantService,
    TenantContextMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .exclude('health', 'api/(.*)', 'tenants')
      .forRoutes('*');
  }
}