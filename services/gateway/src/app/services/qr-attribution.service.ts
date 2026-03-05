import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { LedgerService } from './ledger.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * QrAttributionService — CANONICAL §8.4 "QR code attribution, bonuses, and wallet-based incentives"
 *
 * - Each branded vehicle gets a unique QR code
 * - Attribution tracking: which vehicle/tenant generated the lead
 * - Scan → ride → bonus workflow (policy-controlled)
 * - Bonus funding source and settlement recorded in ledger
 * - Incentives as double-entry ledger entries to avoid drift
 */

export interface QrCode {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  driver_id?: string;
  code: string;
  url: string;
  status: 'active' | 'inactive';
  scan_count: number;
  ride_count: number;
  created_at: string;
}

export interface QrScan {
  id: string;
  qr_code_id: string;
  tenant_id: string;
  rider_id?: string;
  scanned_at: string;
  ip_hash?: string;
  converted_trip_id?: string;
  bonus_ledger_entry_id?: string;
}

export interface QrBonusConfig {
  enabled: boolean;
  bonus_cents: number;
  bonus_recipient: 'driver' | 'rider' | 'both';
  max_bonuses_per_day: number;
  funding_source: 'tenant' | 'platform';
}

@Injectable()
export class QrAttributionService {
  private readonly logger = new Logger(QrAttributionService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly ledgerService: LedgerService,
  ) {}

  /**
   * Generate a unique QR code for a branded vehicle.
   */
  async generateQrCode(tenantId: string, vehicleId: string, driverId?: string): Promise<QrCode> {
    const supabase = this.supabaseService.getClient();

    const code = `QR-${tenantId.substring(0, 8)}-${vehicleId.substring(0, 8)}-${uuidv4().substring(0, 8)}`.toUpperCase();
    const url = `https://urwaydispatch.com/qr/${code}`;

    const { data, error } = await supabase
      .from('qr_codes')
      .insert({
        tenant_id: tenantId,
        vehicle_id: vehicleId,
        driver_id: driverId || null,
        code,
        url,
        status: 'active',
        scan_count: 0,
        ride_count: 0,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to generate QR code: ${error.message}`);

    this.logger.log(`QR code generated: ${code} for vehicle ${vehicleId} tenant ${tenantId}`);
    return data;
  }

  /**
   * Record a QR code scan and attribute it to the vehicle/tenant.
   */
  async recordScan(code: string, riderId?: string, ipHash?: string): Promise<QrScan> {
    const supabase = this.supabaseService.getClient();

    // Look up QR code
    const { data: qrCode } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('code', code)
      .eq('status', 'active')
      .single();

    if (!qrCode) throw new NotFoundException(`QR code not found or inactive: ${code}`);

    // Record scan
    const { data: scan, error } = await supabase
      .from('qr_scans')
      .insert({
        qr_code_id: qrCode.id,
        tenant_id: qrCode.tenant_id,
        rider_id: riderId || null,
        scanned_at: new Date().toISOString(),
        ip_hash: ipHash || null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to record scan: ${error.message}`);

    // Increment scan count
    await supabase
      .from('qr_codes')
      .update({ scan_count: qrCode.scan_count + 1 })
      .eq('id', qrCode.id);

    this.logger.log(`QR scan recorded: code=${code} tenant=${qrCode.tenant_id} rider=${riderId || 'anonymous'}`);
    return scan;
  }

  /**
   * Attribute a completed ride to a QR scan and distribute bonus.
   * Called after trip completion if the rider was acquired via QR scan.
   */
  async attributeRideAndDistributeBonus(
    tripId: string,
    scanId: string,
    tenantId: string,
  ): Promise<{ bonusDistributed: boolean; ledgerEntryId?: string }> {
    const supabase = this.supabaseService.getClient();

    // Get scan details
    const { data: scan } = await supabase
      .from('qr_scans')
      .select('*, qr_codes(*)')
      .eq('id', scanId)
      .single();

    if (!scan) throw new NotFoundException(`QR scan not found: ${scanId}`);
    if (scan.converted_trip_id) {
      return { bonusDistributed: false }; // Already attributed
    }

    // Get tenant bonus configuration
    const bonusConfig = await this.getBonusConfig(tenantId);

    // Mark scan as converted
    await supabase
      .from('qr_scans')
      .update({ converted_trip_id: tripId })
      .eq('id', scanId);

    // Increment ride count on QR code
    await supabase
      .from('qr_codes')
      .update({ ride_count: (scan.qr_codes?.ride_count || 0) + 1 })
      .eq('id', scan.qr_code_id);

    if (!bonusConfig.enabled || bonusConfig.bonus_cents <= 0) {
      return { bonusDistributed: false };
    }

    // Check daily bonus limit
    const today = new Date().toISOString().split('T')[0];
    const { count: todayBonuses } = await supabase
      .from('qr_scans')
      .select('*', { count: 'exact', head: true })
      .eq('qr_code_id', scan.qr_code_id)
      .not('bonus_ledger_entry_id', 'is', null)
      .gte('scanned_at', `${today}T00:00:00Z`);

    if ((todayBonuses || 0) >= bonusConfig.max_bonuses_per_day) {
      this.logger.warn(`QR bonus daily limit reached for code ${scan.qr_code_id}`);
      return { bonusDistributed: false };
    }

    // Distribute bonus via ledger (double-entry)
    const driverId = scan.qr_codes?.driver_id;
    const riderId = scan.rider_id;

    let ledgerEntryId: string | undefined;

    if (bonusConfig.bonus_recipient === 'driver' && driverId) {
      ledgerEntryId = await this.ledgerService.record({
        tenant_id: tenantId,
        type: 'qr_bonus',
        debit_account: `${bonusConfig.funding_source}_bonus_pool`,
        credit_account: `driver:${driverId}:earnings`,
        amount_cents: bonusConfig.bonus_cents,
        reference_id: tripId,
        metadata: { scan_id: scanId, qr_code_id: scan.qr_code_id, recipient: 'driver' },
      });
    } else if (bonusConfig.bonus_recipient === 'rider' && riderId) {
      ledgerEntryId = await this.ledgerService.record({
        tenant_id: tenantId,
        type: 'qr_bonus',
        debit_account: `${bonusConfig.funding_source}_bonus_pool`,
        credit_account: `rider:${riderId}:wallet`,
        amount_cents: bonusConfig.bonus_cents,
        reference_id: tripId,
        metadata: { scan_id: scanId, qr_code_id: scan.qr_code_id, recipient: 'rider' },
      });
    } else if (bonusConfig.bonus_recipient === 'both') {
      const halfBonus = Math.floor(bonusConfig.bonus_cents / 2);
      if (driverId) {
        await this.ledgerService.record({
          tenant_id: tenantId,
          type: 'qr_bonus',
          debit_account: `${bonusConfig.funding_source}_bonus_pool`,
          credit_account: `driver:${driverId}:earnings`,
          amount_cents: halfBonus,
          reference_id: tripId,
          metadata: { scan_id: scanId, recipient: 'driver' },
        });
      }
      if (riderId) {
        ledgerEntryId = await this.ledgerService.record({
          tenant_id: tenantId,
          type: 'qr_bonus',
          debit_account: `${bonusConfig.funding_source}_bonus_pool`,
          credit_account: `rider:${riderId}:wallet`,
          amount_cents: bonusConfig.bonus_cents - halfBonus,
          reference_id: tripId,
          metadata: { scan_id: scanId, recipient: 'rider' },
        });
      }
    }

    // Update scan with ledger entry
    if (ledgerEntryId) {
      await supabase
        .from('qr_scans')
        .update({ bonus_ledger_entry_id: ledgerEntryId })
        .eq('id', scanId);
    }

    this.logger.log(`QR bonus distributed: ${bonusConfig.bonus_cents} cents for trip ${tripId}`);
    return { bonusDistributed: true, ledgerEntryId };
  }

  /**
   * Get QR codes for a tenant (with optional vehicle filter).
   */
  async getQrCodes(tenantId: string, vehicleId?: string): Promise<QrCode[]> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('qr_codes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  /**
   * Get scan history for a QR code.
   */
  async getScanHistory(qrCodeId: string, tenantId: string): Promise<QrScan[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('qr_scans')
      .select('*')
      .eq('qr_code_id', qrCodeId)
      .eq('tenant_id', tenantId)
      .order('scanned_at', { ascending: false })
      .limit(100);

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  /**
   * Deactivate a QR code.
   */
  async deactivateQrCode(qrCodeId: string, tenantId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('qr_codes')
      .update({ status: 'inactive' })
      .eq('id', qrCodeId)
      .eq('tenant_id', tenantId);

    if (error) throw new BadRequestException(error.message);
  }

  /**
   * Get QR attribution stats for a tenant.
   */
  async getAttributionStats(tenantId: string): Promise<{
    totalCodes: number;
    activeCodes: number;
    totalScans: number;
    totalConversions: number;
    conversionRate: number;
  }> {
    const supabase = this.supabaseService.getClient();

    const { count: totalCodes } = await supabase
      .from('qr_codes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: activeCodes } = await supabase
      .from('qr_codes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    const { count: totalScans } = await supabase
      .from('qr_scans')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const { count: totalConversions } = await supabase
      .from('qr_scans')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('converted_trip_id', 'is', null);

    const scans = totalScans || 0;
    const conversions = totalConversions || 0;

    return {
      totalCodes: totalCodes || 0,
      activeCodes: activeCodes || 0,
      totalScans: scans,
      totalConversions: conversions,
      conversionRate: scans > 0 ? Math.round((conversions / scans) * 10000) / 100 : 0,
    };
  }

  /**
   * Get bonus configuration for a tenant (from tenant onboarding or defaults).
   */
  private async getBonusConfig(tenantId: string): Promise<QrBonusConfig> {
    const supabase = this.supabaseService.getClient();

    const { data } = await supabase
      .from('tenant_onboarding')
      .select('qr_bonus_config')
      .eq('tenant_id', tenantId)
      .single();

    if (data?.qr_bonus_config) {
      return data.qr_bonus_config as QrBonusConfig;
    }

    // Default config
    return {
      enabled: false,
      bonus_cents: 500, // $5.00 default bonus
      bonus_recipient: 'driver',
      max_bonuses_per_day: 10,
      funding_source: 'tenant',
    };
  }
}
