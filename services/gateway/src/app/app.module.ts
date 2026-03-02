import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseService } from './services/supabase.service';
import { RealtimeService } from './services/realtime.service';
import { DispatchService } from './services/dispatch.service';
import { LedgerService } from './services/ledger.service';
import { IdentityService } from './services/identity.service';
import { TenantService } from './services/tenant.service';
import { DriverService } from './services/driver.service';
import { FluidpayService } from './services/fluidpay.service';
import { PaymentService } from './services/payment.service';
import { PricingService } from './services/pricing.service';
import { ReservationsService } from './services/reservations.service';
import { AdminService } from './services/admin.service';
import { BillingCronService } from './services/billing-cron.service';
import { NotificationService } from './services/notification.service';
import { HeartbeatService } from './services/heartbeat.service';
import { OutboundWebhookService } from './services/outbound-webhook.service';
import { TenantApiKeyService } from './services/tenant-api-key.service';
import { TaxService } from './services/tax.service';
import { RefundService } from './services/refund.service';
import { MetricsService } from './services/metrics.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { HealthController } from './controllers/health.controller';
import { DriverController } from './controllers/driver.controller';
import { DispatchController } from './controllers/dispatch.controller';
import { TenantController } from './controllers/tenant.controller';
import { PaymentController } from './controllers/payment.controller';
import { AdminController } from './controllers/admin.controller';
import { PaysurityWebhookController } from './controllers/paysurity-webhook.controller';
import { DeveloperController } from './controllers/developer.controller';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminRateLimitGuard, WebhookRateLimitGuard } from './guards/rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [
    HealthController,
    DriverController,
    DispatchController,
    TenantController,
    PaymentController,
    AdminController,
    PaysurityWebhookController,
    DeveloperController,
  ],
  providers: [
    SupabaseService,
    RealtimeService,
    DispatchService,
    LedgerService,
    IdentityService,
    TenantService,
    DriverService,
    FluidpayService,
    PaymentService,
    PricingService,
    ReservationsService,
    AdminService,
    BillingCronService,
    NotificationService,
    HeartbeatService,
    OutboundWebhookService,
    TenantApiKeyService,
    TaxService,
    RefundService,
    MetricsService,
    CircuitBreakerService,
    TenantContextMiddleware,
    JwtAuthGuard,
    AdminRateLimitGuard,
    WebhookRateLimitGuard,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .exclude('health', 'api/(.*)', 'tenants', 'webhooks/(.*)', 'admin/(.*)', 'developer/(.*)')
      .forRoutes('*');
  }
}