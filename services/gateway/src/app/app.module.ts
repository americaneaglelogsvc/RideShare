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
import { OfferService } from './services/offer.service';
import { DistributionService } from './services/distribution.service';
import { ComplianceService } from './services/compliance.service';
import { ParallelSessionService } from './services/parallel-session.service';
import { DisputeService } from './services/dispute.service';
import { GeoZoneService } from './services/geozone.service';
import { ConsentService } from './services/consent.service';
import { IdempotencyGuard, IdempotencyInterceptor } from './guards/idempotency.guard';
import { TenantAnalyticsService } from './services/tenant-analytics.service';
import { VipAnalyticsService } from './services/vip-analytics.service';
import { GlobalMonitorService } from './services/global-monitor.service';
import { ReferralDistributionService } from './services/referral-distribution.service';
import { S3Service } from './services/s3.service';
import { SmsService } from './services/sms.service';
import { EmailService } from './services/email.service';
import { SkinningService } from './services/skinning.service';
import { BrandingInvoiceService } from './services/branding-invoice.service';
import { MarketplaceLiquidityService } from './services/marketplace-liquidity.service';
import { HealthController } from './controllers/health.controller';
import { DriverController } from './controllers/driver.controller';
import { DispatchController } from './controllers/dispatch.controller';
import { TenantController } from './controllers/tenant.controller';
import { PaymentController } from './controllers/payment.controller';
import { AdminController } from './controllers/admin.controller';
import { PaysurityWebhookController } from './controllers/paysurity-webhook.controller';
import { DeveloperController } from './controllers/developer.controller';
import { ComplianceController } from './controllers/compliance.controller';
import { TenantDashboardController } from './controllers/tenant-dashboard.controller';
import { SeoController } from './controllers/seo.controller';
import { DriverSocketGateway } from './gateways/driver-socket.gateway';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminRateLimitGuard, WebhookRateLimitGuard } from './guards/rate-limit.guard';
import { RolesGuard } from './guards/roles.guard';
import { PolicyService } from './services/policy.service';
import { PolicyController, JurisdictionTemplateController } from './controllers/policy.controller';
import { DispatchSseController } from './controllers/dispatch-sse.controller';
import { ConfigValidatorService } from './services/config-validator.service';
import { PayoutService } from './services/payout.service';
import { PayoutController } from './controllers/payout.controller';
import { PushNotificationService } from './services/push-notification.service';
import { RiderDisputeService } from './services/rider-dispute.service';
import { LegalConsentService } from './services/legal-consent.service';
import { BookingAntifraudService } from './services/booking-antifraud.service';
import { MessageRetentionService } from './services/message-retention.service';
import { RiderController } from './controllers/rider.controller';
import { CorporateAccountService } from './services/corporate-account.service';
import { CorporateController } from './controllers/corporate.controller';
import { MicrositeService } from './services/microsite.service';
import { FaqService } from './services/faq.service';
import { MicrositeController, FaqController } from './controllers/microsite.controller';
import { EnvValidationService } from './services/env-validation.service';
import { TimezoneService } from './services/timezone.service';
import { JobQueueService } from './services/job-queue.service';
import { AuditService } from './services/audit.service';
import { DataSubjectRequestService } from './services/data-subject-request.service';
import { FeatureGateService } from './services/feature-gate.service';
import { DispatchEnhancementsService } from './services/dispatch-enhancements.service';
import { PricingPolicyService } from './services/pricing-policy.service';
import { FlightAwarenessService } from './services/flight-awareness.service';
import { EventsEngineService } from './services/events-engine.service';
import { RatingService } from './services/rating.service';
import { InTripMessagingService } from './services/in-trip-messaging.service';
import { FleetOwnerService } from './services/fleet-owner.service';
import { OcrDocumentService } from './services/ocr-document.service';
import { SplitPayService } from './services/split-pay.service';
import { HourlyBookingService } from './services/hourly-booking.service';

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
    ComplianceController,
    TenantDashboardController,
    SeoController,
    PolicyController,
    JurisdictionTemplateController,
    DispatchSseController,
    PayoutController,
    RiderController,
    CorporateController,
    MicrositeController,
    FaqController,
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
    OfferService,
    DistributionService,
    ComplianceService,
    ParallelSessionService,
    DisputeService,
    GeoZoneService,
    ConsentService,
    IdempotencyGuard,
    IdempotencyInterceptor,
    TenantAnalyticsService,
    VipAnalyticsService,
    GlobalMonitorService,
    ReferralDistributionService,
    S3Service,
    SmsService,
    EmailService,
    SkinningService,
    BrandingInvoiceService,
    MarketplaceLiquidityService,
    DriverSocketGateway,
    TenantContextMiddleware,
    JwtAuthGuard,
    AdminRateLimitGuard,
    WebhookRateLimitGuard,
    RolesGuard,
    PolicyService,
    ConfigValidatorService,
    PayoutService,
    PushNotificationService,
    RiderDisputeService,
    LegalConsentService,
    BookingAntifraudService,
    MessageRetentionService,
    CorporateAccountService,
    MicrositeService,
    FaqService,
    EnvValidationService,
    TimezoneService,
    JobQueueService,
    AuditService,
    DataSubjectRequestService,
    FeatureGateService,
    DispatchEnhancementsService,
    PricingPolicyService,
    FlightAwarenessService,
    EventsEngineService,
    RatingService,
    InTripMessagingService,
    FleetOwnerService,
    OcrDocumentService,
    SplitPayService,
    HourlyBookingService,
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