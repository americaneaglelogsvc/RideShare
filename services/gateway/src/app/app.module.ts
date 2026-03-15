import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
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
import { RateLimitGuard, AdminRateLimitGuard, WebhookRateLimitGuard } from './guards/rate-limit.guard';
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
import { DisclosureController } from './controllers/disclosure.controller';
import { LeadController } from './controllers/lead.controller';
import { RetryService } from './decorators/retry.decorator';
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
import { DatabaseService } from './services/database.service';
import { SecretManagerService } from './services/secret-manager.service';
import { QrAttributionService } from './services/qr-attribution.service';
import { DisclosureService } from './services/disclosure.service';
import { LeadService } from './services/lead.service';
import { VoiceService } from './services/voice.service';
import { AdvancedAnalyticsService } from './services/advanced-analytics.service';
import { FraudDetectionService } from './services/fraud-detection.service';
import { LuxuryStandardsService } from './services/luxury-standards.service';
import { BackgroundCheckService } from './services/background-check.service';
import { ApprovalService } from './services/approval.service';
import { PlatformTermsService } from './services/platform-terms.service';
import { TermsAcceptanceGuard } from './guards/terms-acceptance.guard';
import { OnboardingController } from './controllers/onboarding.controller';
import { PricingController } from './controllers/pricing.controller';
import { ReservationsController } from './controllers/reservations.controller';
import { SkinningController } from './controllers/skinning.controller';
import { AdvancedAnalyticsController } from './controllers/advanced-analytics.controller';
import { FraudDetectionController } from './controllers/fraud-detection.controller';
import { VehicleConfigService } from './services/vehicle-config.service';
import { PassengerNeedsService } from './services/passenger-needs.service';
import { VehicleConfigController } from './controllers/vehicle-config.controller';
import { PassengerNeedsController } from './controllers/passenger-needs.controller';
import { CorrelationMiddleware } from './middleware/correlation.middleware';
import { CookieConsentMiddleware } from './middleware/cookie-consent.middleware';
import { StandardErrorFilter } from './filters/standard-error.filter';
import { ETagInterceptor } from './interceptors/etag.interceptor';
import { AirportGeofenceService } from './services/airport-geofence.service';
import { EnhancedDriverService } from './services/enhanced-driver.service';
import { AirportQueueController } from './controllers/airport-queue.controller';

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
    DisclosureController,
    LeadController,
    OnboardingController,
    PricingController,
    ReservationsController,
    SkinningController,
    AdvancedAnalyticsController,
    FraudDetectionController,
    VehicleConfigController,
    PassengerNeedsController,
    AirportQueueController,
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
    DatabaseService,
    SecretManagerService,
    QrAttributionService,
    DisclosureService,
    LeadService,
    VoiceService,
    AdvancedAnalyticsService,
    FraudDetectionService,
    LuxuryStandardsService,
    BackgroundCheckService,
    ApprovalService,
    PlatformTermsService,
    TermsAcceptanceGuard,
    RetryService,
    VehicleConfigService,
    PassengerNeedsService,
    AirportGeofenceService,
    EnhancedDriverService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: StandardErrorFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ETagInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationMiddleware)
      .forRoutes('*');
    consumer
      .apply(CookieConsentMiddleware)
      .forRoutes('*');
    consumer
      .apply(TenantContextMiddleware)
      .exclude('health', 'api/(.*)', 'tenants', 'webhooks/(.*)', 'admin/(.*)', 'developer/(.*)')
      .forRoutes('*');
  }
}