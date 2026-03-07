import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface FraudDetectionSystem {
  machineLearning: {
    riskScoring: RiskScore[];
    patternRecognition: FraudPattern[];
    anomalyDetection: AnomalyAlert[];
    predictiveModels: PredictiveModel[];
  };
  realTimeMonitoring: {
    transactionMonitoring: TransactionAlert[];
    userBehaviorAnalysis: BehaviorAlert[];
    deviceFingerprinting: DeviceProfile[];
    locationVerification: LocationCheck[];
  };
  investigationTools: {
    caseManagement: FraudCase[];
    evidenceCollection: Evidence[];
    reportingTools: InvestigationReport[];
    integrationApis: LawEnforcementApi[];
  };
}

export interface RiskScore {
  userId: string;
  tenantId: string;
  score: number;
  confidence: number;
  factors: RiskFactor[];
  timestamp: string;
  recommendation: 'allow' | 'review' | 'block';
}

export interface RiskFactor {
  type: string;
  weight: number;
  value: number;
  description: string;
}

export interface FraudPattern {
  id: string;
  name: string;
  description: string;
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  occurrences: number;
  lastSeen: string;
  active: boolean;
}

export interface AnomalyAlert {
  id: string;
  type: string;
  description: string;
  userId?: string;
  tenantId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  data: Record<string, any>;
  timestamp: string;
  resolved: boolean;
}

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'clustering';
  accuracy: number;
  precision: number;
  recall: number;
  lastTrained: string;
  features: string[];
  predictions: ModelPrediction[];
}

export interface ModelPrediction {
  userId: string;
  prediction: number;
  confidence: number;
  timestamp: string;
  actual?: number;
}

export interface TransactionAlert {
  id: string;
  transactionId: string;
  userId: string;
  tenantId: string;
  type: string;
  amount: number;
  riskScore: number;
  reasons: string[];
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'investigating';
}

export interface BehaviorAlert {
  id: string;
  userId: string;
  tenantId: string;
  behaviorType: string;
  description: string;
  riskScore: number;
  events: BehaviorEvent[];
  timestamp: string;
  resolved: boolean;
}

export interface BehaviorEvent {
  type: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface DeviceProfile {
  id: string;
  userId: string;
  fingerprint: string;
  deviceInfo: DeviceInfo;
  riskScore: number;
  firstSeen: string;
  lastSeen: string;
  associatedUsers: string[];
  anomalies: DeviceAnomaly[];
}

export interface DeviceInfo {
  userAgent: string;
  ip: string;
  screen: string;
  language: string;
  timezone: string;
  platform: string;
}

export interface DeviceAnomaly {
  type: string;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

export interface LocationCheck {
  id: string;
  userId: string;
  checkType: string;
  expectedLocation: LocationPoint;
  actualLocation: LocationPoint;
  distance: number;
  riskScore: number;
  timestamp: string;
  passed: boolean;
}

export interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
  timestamp: string;
}

export interface FraudCase {
  id: string;
  caseNumber: string;
  userId: string;
  tenantId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  evidence: Evidence[];
  timeline: CaseTimeline[];
}

export interface Evidence {
  id: string;
  caseId: string;
  type: string;
  description: string;
  data: Record<string, any>;
  collectedAt: string;
  collectedBy: string;
}

export interface CaseTimeline {
  id: string;
  caseId: string;
  action: string;
  description: string;
  performedBy: string;
  timestamp: string;
}

export interface InvestigationReport {
  id: string;
  caseId: string;
  summary: string;
  findings: Finding[];
  recommendations: string[];
  generatedAt: string;
  generatedBy: string;
}

export interface Finding {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
}

export interface LawEnforcementApi {
  name: string;
  endpoint: string;
  status: 'active' | 'inactive' | 'error';
  lastUsed: string;
  usageCount: number;
  supportedJurisdictions: string[];
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // Machine Learning Methods
  async calculateRiskScore(userId: string, tenantId: string, transactionData?: any): Promise<RiskScore> {
    try {
      const factors: RiskFactor[] = [];
      let totalScore = 0;

      // Account age factor
      const accountAge = await this.getAccountAge(userId);
      if (accountAge < 30) {
        factors.push({
          type: 'account_age',
          weight: 0.3,
          value: accountAge,
          description: 'New account (higher risk)'
        });
        totalScore += 0.3;
      }

      // Transaction frequency factor
      const transactionFrequency = await this.getTransactionFrequency(userId);
      if (transactionFrequency > 10) {
        factors.push({
          type: 'transaction_frequency',
          weight: 0.2,
          value: transactionFrequency,
          description: 'High transaction frequency'
        });
        totalScore += 0.2;
      }

      // Amount factor
      if (transactionData?.amount > 1000) {
        factors.push({
          type: 'high_amount',
          weight: 0.25,
          value: transactionData.amount,
          description: 'High transaction amount'
        });
        totalScore += 0.25;
      }

      // Location factor
      const locationRisk = await this.getLocationRisk(userId);
      if (locationRisk > 0.5) {
        factors.push({
          type: 'location_risk',
          weight: 0.15,
          value: locationRisk,
          description: 'Unusual location pattern'
        });
        totalScore += 0.15;
      }

      // Device factor
      const deviceRisk = await this.getDeviceRisk(userId);
      if (deviceRisk > 0.5) {
        factors.push({
          type: 'device_risk',
          weight: 0.1,
          value: deviceRisk,
          description: 'New or suspicious device'
        });
        totalScore += 0.1;
      }

      const confidence = Math.min(0.95, 0.5 + (factors.length * 0.1));
      let recommendation: 'allow' | 'review' | 'block' = 'allow';

      if (totalScore >= 0.7) {
        recommendation = 'block';
      } else if (totalScore >= 0.4) {
        recommendation = 'review';
      }

      return {
        userId,
        tenantId,
        score: Math.min(1, totalScore),
        confidence,
        factors,
        timestamp: new Date().toISOString(),
        recommendation
      };
    } catch (error) {
      this.logger.error('Error calculating risk score:', error);
      return {
        userId,
        tenantId,
        score: 0,
        confidence: 0,
        factors: [],
        timestamp: new Date().toISOString(),
        recommendation: 'allow'
      };
    }
  }

  async detectFraudPatterns(tenantId?: string): Promise<FraudPattern[]> {
    try {
      // Simulated fraud patterns
      return [
        {
          id: 'pattern_1',
          name: 'Rapid Small Transactions',
          description: 'Multiple small transactions in quick succession',
          pattern: 'amount < 50 AND count > 10 in 5 minutes',
          severity: 'medium',
          confidence: 0.85,
          occurrences: 15,
          lastSeen: new Date(Date.now() - 3600000).toISOString(),
          active: true
        },
        {
          id: 'pattern_2',
          name: 'Unusual Location Access',
          description: 'Access from multiple distant locations simultaneously',
          pattern: 'location_distance > 1000km AND time_diff < 10min',
          severity: 'high',
          confidence: 0.92,
          occurrences: 3,
          lastSeen: new Date(Date.now() - 7200000).toISOString(),
          active: true
        },
        {
          id: 'pattern_3',
          name: 'Device Switching Pattern',
          description: 'Frequent switching between different devices',
          pattern: 'device_count > 5 in 1 hour',
          severity: 'low',
          confidence: 0.75,
          occurrences: 8,
          lastSeen: new Date(Date.now() - 1800000).toISOString(),
          active: true
        }
      ];
    } catch (error) {
      this.logger.error('Error detecting fraud patterns:', error);
      return [];
    }
  }

  async detectAnomalies(tenantId?: string): Promise<AnomalyAlert[]> {
    try {
      return [
        {
          id: 'anomaly_1',
          type: 'spending_spike',
          description: 'Unusual spike in spending detected',
          userId: 'user_456',
          tenantId: tenantId || 'tenant_789',
          severity: 'high',
          confidence: 0.88,
          data: {
            normal_spending: 150,
            current_spending: 1200,
            increase_factor: 8
          },
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          resolved: false
        },
        {
          id: 'anomaly_2',
          type: 'login_pattern',
          description: 'Unusual login time and location pattern',
          userId: 'user_123',
          tenantId: tenantId || 'tenant_789',
          severity: 'medium',
          confidence: 0.75,
          data: {
            normal_login_time: '09:00-17:00',
            current_login_time: '02:30',
            normal_location: 'Chicago',
            current_location: 'New York'
          },
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          resolved: false
        }
      ];
    } catch (error) {
      this.logger.error('Error detecting anomalies:', error);
      return [];
    }
  }

  async getPredictiveModels(tenantId?: string): Promise<PredictiveModel[]> {
    try {
      return [
        {
          id: 'model_1',
          name: 'Fraud Risk Classification',
          type: 'classification',
          accuracy: 0.94,
          precision: 0.91,
          recall: 0.89,
          lastTrained: new Date(Date.now() - 86400000).toISOString(),
          features: ['account_age', 'transaction_frequency', 'amount', 'location_risk', 'device_risk'],
          predictions: [
            { userId: 'user_1', prediction: 0.15, confidence: 0.88, timestamp: new Date().toISOString() },
            { userId: 'user_2', prediction: 0.85, confidence: 0.92, timestamp: new Date().toISOString() }
          ]
        },
        {
          id: 'model_2',
          name: 'Churn Prediction',
          type: 'classification',
          accuracy: 0.87,
          precision: 0.84,
          recall: 0.81,
          lastTrained: new Date(Date.now() - 172800000).toISOString(),
          features: ['activity_score', 'support_tickets', 'payment_issues', 'usage_decline'],
          predictions: [
            { userId: 'user_3', prediction: 0.25, confidence: 0.79, timestamp: new Date().toISOString() },
            { userId: 'user_4', prediction: 0.78, confidence: 0.86, timestamp: new Date().toISOString() }
          ]
        }
      ];
    } catch (error) {
      this.logger.error('Error getting predictive models:', error);
      return [];
    }
  }

  // Real-Time Monitoring Methods
  async monitorTransactions(tenantId?: string): Promise<TransactionAlert[]> {
    try {
      return [
        {
          id: 'tx_alert_1',
          transactionId: 'tx_12345',
          userId: 'user_789',
          tenantId: tenantId || 'tenant_456',
          type: 'high_amount',
          amount: 2500,
          riskScore: 0.75,
          reasons: ['Amount exceeds typical spending', 'New payment method', 'First time transaction over $1000'],
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          status: 'pending'
        },
        {
          id: 'tx_alert_2',
          transactionId: 'tx_12346',
          userId: 'user_456',
          tenantId: tenantId || 'tenant_456',
          type: 'frequency',
          amount: 45,
          riskScore: 0.65,
          reasons: ['Multiple transactions in short time', 'Same merchant repeated'],
          timestamp: new Date(Date.now() - 900000).toISOString(),
          status: 'approved'
        }
      ];
    } catch (error) {
      this.logger.error('Error monitoring transactions:', error);
      return [];
    }
  }

  async analyzeUserBehavior(userId: string, tenantId?: string): Promise<BehaviorAlert[]> {
    try {
      return [
        {
          id: 'behavior_alert_1',
          userId,
          tenantId: tenantId || 'tenant_789',
          behaviorType: 'access_pattern',
          description: 'Unusual access pattern detected',
          riskScore: 0.68,
          events: [
            { type: 'login', timestamp: new Date(Date.now() - 3600000).toISOString(), data: { location: 'Chicago' } },
            { type: 'login', timestamp: new Date(Date.now() - 1800000).toISOString(), data: { location: 'New York' } },
            { type: 'transaction', timestamp: new Date(Date.now() - 900000).toISOString(), data: { amount: 500 } }
          ],
          timestamp: new Date(Date.now() - 900000).toISOString(),
          resolved: false
        }
      ];
    } catch (error) {
      this.logger.error('Error analyzing user behavior:', error);
      return [];
    }
  }

  async createDeviceProfile(userId: string, deviceInfo: DeviceInfo): Promise<DeviceProfile> {
    try {
      const fingerprint = this.generateDeviceFingerprint(deviceInfo);
      
      return {
        id: `device_${Date.now()}`,
        userId,
        fingerprint,
        deviceInfo,
        riskScore: await this.calculateDeviceRisk(deviceInfo),
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        associatedUsers: [userId],
        anomalies: []
      };
    } catch (error) {
      this.logger.error('Error creating device profile:', error);
      throw error;
    }
  }

  async verifyLocation(userId: string, expectedLocation: LocationPoint, actualLocation: LocationPoint): Promise<LocationCheck> {
    try {
      const distance = this.calculateDistance(expectedLocation, actualLocation);
      const riskScore = Math.min(1, distance / 1000); // Risk increases with distance in km
      const passed = distance < 100; // Pass if within 100km

      return {
        id: `location_check_${Date.now()}`,
        userId,
        checkType: 'geographic_verification',
        expectedLocation,
        actualLocation,
        distance,
        riskScore,
        timestamp: new Date().toISOString(),
        passed
      };
    } catch (error) {
      this.logger.error('Error verifying location:', error);
      throw error;
    }
  }

  // Investigation Tools Methods
  async createFraudCase(userId: string, tenantId: string, type: string, severity: 'low' | 'medium' | 'high' | 'critical'): Promise<FraudCase> {
    try {
      const caseNumber = `FC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      return {
        id: `case_${Date.now()}`,
        caseNumber,
        userId,
        tenantId,
        type,
        severity,
        status: 'open',
        priority: severity === 'critical' ? 1 : severity === 'high' ? 2 : severity === 'medium' ? 3 : 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        evidence: [],
        timeline: [{
          id: `timeline_${Date.now()}`,
          caseId: `case_${Date.now()}`,
          action: 'created',
          description: 'Fraud case created',
          performedBy: 'system',
          timestamp: new Date().toISOString()
        }]
      };
    } catch (error) {
      this.logger.error('Error creating fraud case:', error);
      throw error;
    }
  }

  async collectEvidence(caseId: string, type: string, description: string, data: Record<string, any>): Promise<Evidence> {
    try {
      return {
        id: `evidence_${Date.now()}`,
        caseId,
        type,
        description,
        data,
        collectedAt: new Date().toISOString(),
        collectedBy: 'system'
      };
    } catch (error) {
      this.logger.error('Error collecting evidence:', error);
      throw error;
    }
  }

  async generateInvestigationReport(caseId: string): Promise<InvestigationReport> {
    try {
      return {
        id: `report_${Date.now()}`,
        caseId,
        summary: 'Investigation summary for fraud case',
        findings: [
          {
            type: 'suspicious_activity',
            description: 'Multiple high-value transactions detected',
            severity: 'high',
            evidence: ['transaction_logs', 'user_activity']
          },
          {
            type: 'location_anomaly',
            description: 'Unusual login locations detected',
            severity: 'medium',
            evidence: ['login_logs', 'geolocation_data']
          }
        ],
        recommendations: [
          'Implement additional verification steps',
          'Monitor account activity closely',
          'Consider temporary account restrictions'
        ],
        generatedAt: new Date().toISOString(),
        generatedBy: 'system'
      };
    } catch (error) {
      this.logger.error('Error generating investigation report:', error);
      throw error;
    }
  }

  async getLawEnforcementApis(): Promise<LawEnforcementApi[]> {
    try {
      return [
        {
          name: 'FBI IC3 API',
          endpoint: 'https://api.ic3.gov',
          status: 'active',
          lastUsed: new Date(Date.now() - 86400000).toISOString(),
          usageCount: 15,
          supportedJurisdictions: ['US', 'CA', 'UK']
        },
        {
          name: 'Interpol I-24/7',
          endpoint: 'https://www.interpol.int/api',
          status: 'active',
          lastUsed: new Date(Date.now() - 172800000).toISOString(),
          usageCount: 8,
          supportedJurisdictions: ['Global']
        }
      ];
    } catch (error) {
      this.logger.error('Error getting law enforcement APIs:', error);
      return [];
    }
  }

  // Private Helper Methods
  private async getAccountAge(userId: string): Promise<number> {
    // Simulated account age in days
    return Math.floor(Math.random() * 365);
  }

  private async getTransactionFrequency(userId: string): Promise<number> {
    // Simulated transaction frequency in last 24 hours
    return Math.floor(Math.random() * 20);
  }

  private async getLocationRisk(userId: string): Promise<number> {
    // Simulated location risk score
    return Math.random();
  }

  private async getDeviceRisk(userId: string): Promise<number> {
    // Simulated device risk score
    return Math.random();
  }

  private async calculateDeviceRisk(deviceInfo: DeviceInfo): Promise<number> {
    // Simple device risk calculation
    let risk = 0;
    
    if (deviceInfo.userAgent.includes('bot')) risk += 0.8;
    if (deviceInfo.screen === '0x0') risk += 0.5;
    if (!deviceInfo.language) risk += 0.3;
    
    return Math.min(1, risk);
  }

  private generateDeviceFingerprint(deviceInfo: DeviceInfo): string {
    // Simple fingerprint generation
    const components = [
      deviceInfo.userAgent,
      deviceInfo.screen,
      deviceInfo.language,
      deviceInfo.timezone,
      deviceInfo.platform
    ];
    
    return Buffer.from(components.join('|')).toString('base64');
  }

  private calculateDistance(loc1: LocationPoint, loc2: LocationPoint): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLon = this.toRadians(loc2.lng - loc1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(loc1.lat)) * Math.cos(this.toRadians(loc2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
