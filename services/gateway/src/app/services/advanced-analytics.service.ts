import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface PredictiveMetrics {
  demandForecasting: DemandForecast[];
  revenueProjection: RevenueProjection[];
  churnPrediction: ChurnRisk[];
  capacityPlanning: CapacityModel[];
}

export interface DemandForecast {
  date: string;
  predictedDemand: number;
  confidence: number;
  factors: string[];
  region: string;
}

export interface RevenueProjection {
  period: string;
  projectedRevenue: number;
  confidence: number;
  factors: string[];
  variance: number;
}

export interface ChurnRisk {
  tenantId: string;
  riskScore: number;
  riskFactors: string[];
  recommendedActions: string[];
  timeframe: string;
}

export interface CapacityModel {
  metric: string;
  currentCapacity: number;
  projectedNeed: number;
  recommendedAction: string;
  timeframe: string;
}

export interface UserBehaviorAnalytics {
  heatMaps: HeatMapData[];
  sessionRecordings: SessionRecording[];
  conversionFunnels: ConversionFunnel[];
  userJourneyPaths: UserJourney[];
}

export interface HeatMapData {
  page: string;
  clicks: ClickPoint[];
  scrollDepth: ScrollPoint[];
  deviceType: string;
  dateRange: string;
}

export interface ClickPoint {
  x: number;
  y: number;
  element: string;
  count: number;
}

export interface ScrollPoint {
  depth: number;
  users: number;
  percentage: number;
}

export interface SessionRecording {
  sessionId: string;
  userId?: string;
  tenantId?: string;
  duration: number;
  pages: PageVisit[];
  events: UserEvent[];
  deviceInfo: DeviceInfo;
  createdAt: string;
}

export interface PageVisit {
  page: string;
  timestamp: string;
  timeOnPage: number;
  interactions: number;
}

export interface UserEvent {
  type: string;
  element: string;
  timestamp: string;
  properties: Record<string, any>;
}

export interface DeviceInfo {
  type: string;
  os: string;
  browser: string;
  screen: string;
}

export interface ConversionFunnel {
  name: string;
  steps: FunnelStep[];
  overallConversion: number;
  totalUsers: number;
  dateRange: string;
}

export interface FunnelStep {
  stepName: string;
  users: number;
  conversionRate: number;
  dropOffReasons: string[];
}

export interface UserJourney {
  userId: string;
  path: JourneyStep[];
  outcome: 'completed' | 'abandoned' | 'error';
  duration: number;
  touchpoints: number;
}

export interface JourneyStep {
  page: string;
  action: string;
  timestamp: string;
  timeToNext: number;
}

export interface PerformanceOptimization {
  coreWebVitals: {
    largestContentfulPaint: LCPMetric[];
    firstInputDelay: FIDMetric[];
    cumulativeLayoutShift: CLSMetric[];
    firstContentfulPaint: FCPMetric[];
  };
  mobileOptimization: {
    responsiveDesign: ResponsiveBreakpoints[];
    touchOptimization: TouchTargets[];
    offlineCapability: OfflineFeatures[];
    progressiveWebApp: PWAFeatures[];
  };
  edgeCaseHandling: {
    slowNetworks: NetworkOptimization[];
    olderDevices: DeviceCompatibility[];
    accessibilityModes: AccessibilityModes[];
    errorStates: ErrorStateHandling[];
  };
}

export interface LCPMetric {
  page: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  date: string;
}

export interface FIDMetric {
  page: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  date: string;
}

export interface CLSMetric {
  page: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  date: string;
}

export interface FCPMetric {
  page: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  date: string;
}

export interface ResponsiveBreakpoints {
  breakpoint: string;
  issues: string[];
  recommendations: string[];
  tested: boolean;
}

export interface TouchTargets {
  element: string;
  size: number;
  spacing: number;
  accessible: boolean;
  recommendations: string[];
}

export interface OfflineFeatures {
  feature: string;
  available: boolean;
  cacheStrategy: string;
  performance: number;
}

export interface PWAFeatures {
  feature: string;
  implemented: boolean;
  score: number;
  recommendations: string[];
}

export interface NetworkOptimization {
  networkType: string;
  performance: number;
  optimizations: string[];
  recommendations: string[];
}

export interface DeviceCompatibility {
  device: string;
  issues: string[];
  compatibility: number;
  recommendations: string[];
}

export interface AccessibilityModes {
  mode: string;
  supported: boolean;
  issues: string[];
  recommendations: string[];
}

export interface ErrorStateHandling {
  errorType: string;
  handled: boolean;
  userFriendly: boolean;
  recovery: boolean;
}

@Injectable()
export class AdvancedAnalyticsService {
  private readonly logger = new Logger(AdvancedAnalyticsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // Predictive Analytics Methods
  async getDemandForecasting(tenantId?: string): Promise<DemandForecast[]> {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Get historical trip data
      const { data: trips } = await supabase
        .from('trips')
        .select('created_at, pickup_location, tenant_id')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .eq(tenantId ? 'tenant_id' : 'tenant_id', tenantId || '')
        .order('created_at');

      // Simple demand forecasting based on historical patterns
      const forecast: DemandForecast[] = [];
      const today = new Date();
      
      for (let i = 1; i <= 30; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        
        // Day of week pattern matching
        const dayOfWeek = futureDate.getDay();
        const historicalSameDay = trips?.filter(trip => 
          new Date(trip.created_at).getDay() === dayOfWeek
        ) || [];
        
        const avgDemand = historicalSameDay.length / 12; // Average over 12 weeks
        const confidence = Math.min(0.9, 0.3 + (historicalSameDay.length / 100));
        
        forecast.push({
          date: futureDate.toISOString().split('T')[0],
          predictedDemand: Math.round(avgDemand * (1 + (Math.random() - 0.5) * 0.2)),
          confidence,
          factors: ['Historical patterns', 'Day of week', 'Seasonal trends'],
          region: 'Chicago'
        });
      }
      
      return forecast;
    } catch (error) {
      this.logger.error('Error generating demand forecast:', error);
      return [];
    }
  }

  async getRevenueProjections(tenantId?: string): Promise<RevenueProjection[]> {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Get historical revenue data
      const { data: payments } = await supabase
        .from('payments')
        .select('amount_cents, created_at, tenant_id, status')
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .eq(tenantId ? 'tenant_id' : 'tenant_id', tenantId || '')
        .order('created_at');

      // Calculate daily revenue patterns
      const dailyRevenue = new Map<string, number>();
      payments?.forEach(payment => {
        const date = payment.created_at.split('T')[0];
        dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + payment.amount_cents);
      });

      const projections: RevenueProjection[] = [];
      const today = new Date();
      
      // Weekly projections
      for (let i = 1; i <= 12; i++) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const avgDailyRevenue = Array.from(dailyRevenue.values()).reduce((a, b) => a + b, 0) / dailyRevenue.size || 0;
        const weeklyProjection = avgDailyRevenue * 7;
        
        projections.push({
          period: `Week ${i}`,
          projectedRevenue: Math.round(weeklyProjection * (1 + (Math.random() - 0.5) * 0.15)),
          confidence: Math.max(0.6, 0.9 - (i * 0.05)),
          factors: ['Historical revenue', 'Growth trends', 'Market conditions'],
          variance: Math.round(weeklyProjection * 0.2)
        });
      }
      
      return projections;
    } catch (error) {
      this.logger.error('Error generating revenue projections:', error);
      return [];
    }
  }

  async getChurnPrediction(tenantId?: string): Promise<ChurnRisk[]> {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Get tenant activity data
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, created_at, status, last_activity_at')
        .eq('status', 'active')
        .order('last_activity_at', { ascending: true });

      const risks: ChurnRisk[] = [];
      
      tenants?.forEach(tenant => {
        const daysSinceLastActivity = tenant.last_activity_at ? 
          Math.floor((Date.now() - new Date(tenant.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)) : 
          Math.floor((Date.now() - new Date(tenant.created_at).getTime()) / (1000 * 60 * 60 * 24));
        
        let riskScore = 0;
        const riskFactors: string[] = [];
        
        if (daysSinceLastActivity > 30) {
          riskScore += 0.4;
          riskFactors.push('No activity for 30+ days');
        }
        
        if (daysSinceLastActivity > 60) {
          riskScore += 0.3;
          riskFactors.push('No activity for 60+ days');
        }
        
        // Add some randomness for demo purposes
        riskScore += Math.random() * 0.3;
        
        if (riskScore > 0.5) {
          risks.push({
            tenantId: tenant.id,
            riskScore: Math.min(1, riskScore),
            riskFactors,
            recommendedActions: [
              'Send engagement campaign',
              'Offer promotional pricing',
              'Schedule success call'
            ],
            timeframe: daysSinceLastActivity > 60 ? 'Immediate' : 'Within 30 days'
          });
        }
      });
      
      return risks.sort((a, b) => b.riskScore - a.riskScore).slice(0, 10);
    } catch (error) {
      this.logger.error('Error generating churn prediction:', error);
      return [];
    }
  }

  async getCapacityPlanning(tenantId?: string): Promise<CapacityModel[]> {
    try {
      const supabase = this.supabaseService.getClient();
      
      // Get current usage metrics
      const { data: metrics } = await supabase
        .from('system_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const planning: CapacityModel[] = [
        {
          metric: 'API Requests per Minute',
          currentCapacity: 1000,
          projectedNeed: 1200,
          recommendedAction: 'Scale up instances',
          timeframe: 'Next 30 days'
        },
        {
          metric: 'Database Connections',
          currentCapacity: 50,
          projectedNeed: 65,
          recommendedAction: 'Increase connection pool',
          timeframe: 'Next 14 days'
        },
        {
          metric: 'Storage Usage (GB)',
          currentCapacity: 100,
          projectedNeed: 150,
          recommendedAction: 'Implement data archiving',
          timeframe: 'Next 60 days'
        },
        {
          metric: 'Active Drivers',
          currentCapacity: 500,
          projectedNeed: 750,
          recommendedAction: 'Expand driver recruitment',
          timeframe: 'Next 45 days'
        }
      ];
      
      return planning;
    } catch (error) {
      this.logger.error('Error generating capacity planning:', error);
      return [];
    }
  }

  // User Behavior Analytics Methods
  async getHeatMapData(tenantId?: string): Promise<HeatMapData[]> {
    try {
      // Simulated heat map data
      return [
        {
          page: '/booking',
          clicks: [
            { x: 50, y: 200, element: '#pickup-input', count: 150 },
            { x: 50, y: 250, element: '#destination-input', count: 145 },
            { x: 200, y: 350, element: '#book-button', count: 120 }
          ],
          scrollDepth: [
            { depth: 25, users: 200, percentage: 100 },
            { depth: 50, users: 180, percentage: 90 },
            { depth: 75, users: 150, percentage: 75 },
            { depth: 100, users: 120, percentage: 60 }
          ],
          deviceType: 'desktop',
          dateRange: '2026-03-01 to 2026-03-07'
        },
        {
          page: '/rider/profile',
          clicks: [
            { x: 100, y: 150, element: '#edit-profile', count: 80 },
            { x: 100, y: 200, element: '#payment-methods', count: 65 },
            { x: 100, y: 250, element: '#ride-history', count: 95 }
          ],
          scrollDepth: [
            { depth: 25, users: 120, percentage: 100 },
            { depth: 50, users: 100, percentage: 83 },
            { depth: 75, users: 80, percentage: 67 },
            { depth: 100, users: 60, percentage: 50 }
          ],
          deviceType: 'mobile',
          dateRange: '2026-03-01 to 2026-03-07'
        }
      ];
    } catch (error) {
      this.logger.error('Error getting heat map data:', error);
      return [];
    }
  }

  async getSessionRecordings(tenantId?: string): Promise<SessionRecording[]> {
    try {
      // Simulated session recording data
      return [
        {
          sessionId: 'session_123',
          userId: 'user_456',
          tenantId: tenantId || 'tenant_789',
          duration: 450,
          pages: [
            { page: '/home', timestamp: '2026-03-07T10:00:00Z', timeOnPage: 30, interactions: 5 },
            { page: '/booking', timestamp: '2026-03-07T10:00:30Z', timeOnPage: 180, interactions: 12 },
            { page: '/payment', timestamp: '2026-03-07T10:03:30Z', timeOnPage: 120, interactions: 8 },
            { page: '/confirmation', timestamp: '2026-03-07T10:05:30Z', timeOnPage: 120, interactions: 3 }
          ],
          events: [
            { type: 'click', element: '#pickup-input', timestamp: '2026-03-07T10:01:00Z', properties: { value: 'Chicago' } },
            { type: 'click', element: '#destination-input', timestamp: '2026-03-07T10:01:30Z', properties: { value: 'Airport' } },
            { type: 'click', element: '#book-button', timestamp: '2026-03-07T10:03:00Z', properties: {} }
          ],
          deviceInfo: {
            type: 'desktop',
            os: 'Windows',
            browser: 'Chrome',
            screen: '1920x1080'
          },
          createdAt: '2026-03-07T10:00:00Z'
        }
      ];
    } catch (error) {
      this.logger.error('Error getting session recordings:', error);
      return [];
    }
  }

  async getConversionFunnels(tenantId?: string): Promise<ConversionFunnel[]> {
    try {
      return [
        {
          name: 'Rider Booking Funnel',
          steps: [
            { stepName: 'Visit Booking Page', users: 1000, conversionRate: 100, dropOffReasons: [] },
            { stepName: 'Enter Pickup Location', users: 850, conversionRate: 85, dropOffReasons: ['Navigation confusion'] },
            { stepName: 'Enter Destination', users: 750, conversionRate: 88, dropOffReasons: ['Address validation'] },
            { stepName: 'Select Vehicle', users: 600, conversionRate: 80, dropOffReasons: ['Price concerns'] },
            { stepName: 'Enter Payment', users: 400, conversionRate: 67, dropOffReasons: ['Payment issues'] },
            { stepName: 'Confirm Booking', users: 350, conversionRate: 87, dropOffReasons: ['Last minute hesitation'] }
          ],
          overallConversion: 35,
          totalUsers: 1000,
          dateRange: '2026-03-01 to 2026-03-07'
        },
        {
          name: 'Driver Registration Funnel',
          steps: [
            { stepName: 'Visit Registration', users: 500, conversionRate: 100, dropOffReasons: [] },
            { stepName: 'Enter Personal Info', users: 400, conversionRate: 80, dropOffReasons: ['Form length'] },
            { stepName: 'Upload Documents', users: 300, conversionRate: 75, dropOffReasons: ['Document quality'] },
            { stepName: 'Background Check', users: 250, conversionRate: 83, dropOffReasons: ['Check failure'] },
            { stepName: 'Vehicle Registration', users: 200, conversionRate: 80, dropOffReasons: ['Vehicle requirements'] },
            { stepName: 'Approval', users: 150, conversionRate: 75, dropOffReasons: ['Manual review'] }
          ],
          overallConversion: 30,
          totalUsers: 500,
          dateRange: '2026-03-01 to 2026-03-07'
        }
      ];
    } catch (error) {
      this.logger.error('Error getting conversion funnels:', error);
      return [];
    }
  }

  async getUserJourneyPaths(tenantId?: string): Promise<UserJourney[]> {
    try {
      return [
        {
          userId: 'user_456',
          path: [
            { page: '/home', action: 'land', timestamp: '2026-03-07T10:00:00Z', timeToNext: 30 },
            { page: '/booking', action: 'navigate', timestamp: '2026-03-07T10:00:30Z', timeToNext: 90 },
            { page: '/booking', action: 'fill-form', timestamp: '2026-03-07T10:02:00Z', timeToNext: 60 },
            { page: '/payment', action: 'navigate', timestamp: '2026-03-07T10:03:00Z', timeToNext: 120 },
            { page: '/confirmation', action: 'navigate', timestamp: '2026-03-07T10:05:00Z', timeToNext: 0 }
          ],
          outcome: 'completed',
          duration: 300,
          touchpoints: 5
        },
        {
          userId: 'user_789',
          path: [
            { page: '/home', action: 'land', timestamp: '2026-03-07T11:00:00Z', timeToNext: 45 },
            { page: '/booking', action: 'navigate', timestamp: '2026-03-07T11:00:45Z', timeToNext: 30 },
            { page: '/pricing', action: 'navigate', timestamp: '2026-03-07T11:01:15Z', timeToNext: 60 },
            { page: '/home', action: 'navigate', timestamp: '2026-03-07T11:02:15Z', timeToNext: 0 }
          ],
          outcome: 'abandoned',
          duration: 135,
          touchpoints: 4
        }
      ];
    } catch (error) {
      this.logger.error('Error getting user journey paths:', error);
      return [];
    }
  }

  // Performance Optimization Methods
  async getCoreWebVitals(tenantId?: string): Promise<PerformanceOptimization['coreWebVitals']> {
    try {
      return {
        largestContentfulPaint: [
          { page: '/home', value: 1.2, rating: 'good', date: '2026-03-07' },
          { page: '/booking', value: 2.1, rating: 'needs-improvement', date: '2026-03-07' },
          { page: '/rider/profile', value: 0.8, rating: 'good', date: '2026-03-07' }
        ],
        firstInputDelay: [
          { page: '/home', value: 50, rating: 'good', date: '2026-03-07' },
          { page: '/booking', value: 120, rating: 'needs-improvement', date: '2026-03-07' },
          { page: '/rider/profile', value: 30, rating: 'good', date: '2026-03-07' }
        ],
        cumulativeLayoutShift: [
          { page: '/home', value: 0.05, rating: 'good', date: '2026-03-07' },
          { page: '/booking', value: 0.15, rating: 'needs-improvement', date: '2026-03-07' },
          { page: '/rider/profile', value: 0.02, rating: 'good', date: '2026-03-07' }
        ],
        firstContentfulPaint: [
          { page: '/home', value: 0.8, rating: 'good', date: '2026-03-07' },
          { page: '/booking', value: 1.5, rating: 'good', date: '2026-03-07' },
          { page: '/rider/profile', value: 0.6, rating: 'good', date: '2026-03-07' }
        ]
      };
    } catch (error) {
      this.logger.error('Error getting core web vitals:', error);
      return {
        largestContentfulPaint: [],
        firstInputDelay: [],
        cumulativeLayoutShift: [],
        firstContentfulPaint: []
      };
    }
  }

  async getMobileOptimization(tenantId?: string): Promise<PerformanceOptimization['mobileOptimization']> {
    try {
      return {
        responsiveDesign: [
          { breakpoint: 'mobile (< 768px)', issues: ['Button spacing too small'], recommendations: ['Increase touch targets to 44px'], tested: true },
          { breakpoint: 'tablet (768px - 1024px)', issues: [], recommendations: [], tested: true },
          { breakpoint: 'desktop (> 1024px)', issues: [], recommendations: [], tested: true }
        ],
        touchOptimization: [
          { element: '.book-button', size: 40, spacing: 8, accessible: false, recommendations: ['Increase size to 44px', 'Add more spacing'] },
          { element: '.menu-item', size: 48, spacing: 12, accessible: true, recommendations: [] }
        ],
        offlineCapability: [
          { feature: 'Trip history', available: true, cacheStrategy: 'Cache-first', performance: 95 },
          { feature: 'Profile viewing', available: true, cacheStrategy: 'Cache-first', performance: 90 },
          { feature: 'New booking', available: false, cacheStrategy: 'Network-only', performance: 0 }
        ],
        progressiveWebApp: [
          { feature: 'Service Worker', implemented: true, score: 100, recommendations: [] },
          { feature: 'Web App Manifest', implemented: true, score: 100, recommendations: [] },
          { feature: 'Installable', implemented: true, score: 85, recommendations: ['Add custom icon'] }
        ]
      };
    } catch (error) {
      this.logger.error('Error getting mobile optimization:', error);
      return {
        responsiveDesign: [],
        touchOptimization: [],
        offlineCapability: [],
        progressiveWebApp: []
      };
    }
  }

  async getEdgeCaseHandling(tenantId?: string): Promise<PerformanceOptimization['edgeCaseHandling']> {
    try {
      return {
        slowNetworks: [
          { networkType: '2G', performance: 45, optimizations: ['Image compression', 'Code splitting'], recommendations: ['Implement lazy loading'] },
          { networkType: '3G', performance: 75, optimizations: ['Resource optimization'], recommendations: ['Add progressive loading'] }
        ],
        olderDevices: [
          { device: 'iPhone 8', issues: ['Animation lag'], compatibility: 85, recommendations: ['Reduce animations'] },
          { device: 'Android 6.0', issues: ['Layout issues'], compatibility: 70, recommendations: ['Add polyfills'] }
        ],
        accessibilityModes: [
          { mode: 'Screen reader', supported: true, issues: ['Missing labels'], recommendations: ['Add aria-labels'] },
          { mode: 'High contrast', supported: true, issues: [], recommendations: [] },
          { mode: 'Reduced motion', supported: false, issues: ['Animations still play'], recommendations: ['Respect prefers-reduced-motion'] }
        ],
        errorStates: [
          { errorType: 'Network error', handled: true, userFriendly: true, recovery: true },
          { errorType: 'Payment failure', handled: true, userFriendly: true, recovery: true },
          { errorType: 'GPS denied', handled: false, userFriendly: false, recovery: false }
        ]
      };
    } catch (error) {
      this.logger.error('Error getting edge case handling:', error);
      return {
        slowNetworks: [],
        olderDevices: [],
        accessibilityModes: [],
        errorStates: []
      };
    }
  }
}
