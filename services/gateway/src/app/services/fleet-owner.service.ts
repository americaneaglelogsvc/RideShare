import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

// §5.8 Fleet owner workflows
// Fleet owners manage multiple vehicles and drivers under their account

export interface FleetOwnerInput {
  tenantId: string;
  userId: string;
  companyName: string;
  taxId?: string;
  contactEmail: string;
  contactPhone: string;
}

export interface FleetVehicleInput {
  fleetOwnerId: string;
  tenantId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vin?: string;
  category: 'black_sedan' | 'black_suv' | 'black_ev';
  insuranceExpiry?: string;
  registrationExpiry?: string;
}

@Injectable()
export class FleetOwnerService {
  private readonly logger = new Logger(FleetOwnerService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ═══════════════ Fleet Owner CRUD ═══════════════

  async registerFleetOwner(input: FleetOwnerInput) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('fleet_owners')
      .insert({
        tenant_id: input.tenantId,
        user_id: input.userId,
        company_name: input.companyName,
        tax_id: input.taxId || null,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone,
        status: 'pending_approval',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Fleet owner registered: ${data.id} — ${input.companyName}`);
    return data;
  }

  async approveFleetOwner(fleetOwnerId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('fleet_owners')
      .update({ status: 'active', approved_at: new Date().toISOString() })
      .eq('id', fleetOwnerId)
      .eq('status', 'pending_approval')
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getFleetOwner(fleetOwnerId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('fleet_owners')
      .select('*, fleet_vehicles(count), fleet_driver_assignments(count)')
      .eq('id', fleetOwnerId)
      .single();

    if (error) throw new NotFoundException('Fleet owner not found');
    return data;
  }

  async listFleetOwners(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('fleet_owners')
      .select('*, fleet_vehicles(count)')
      .eq('tenant_id', tenantId)
      .order('company_name');

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ═══════════════ Vehicle Management ═══════════════

  async addVehicle(input: FleetVehicleInput) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('fleet_vehicles')
      .insert({
        fleet_owner_id: input.fleetOwnerId,
        tenant_id: input.tenantId,
        make: input.make,
        model: input.model,
        year: input.year,
        color: input.color,
        license_plate: input.licensePlate,
        vin: input.vin || null,
        category: input.category,
        insurance_expiry: input.insuranceExpiry || null,
        registration_expiry: input.registrationExpiry || null,
        status: 'available',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Fleet vehicle added: ${data.id} — ${input.year} ${input.make} ${input.model}`);
    return data;
  }

  async listVehicles(fleetOwnerId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('fleet_vehicles')
      .select('*, fleet_driver_assignments(driver_id, assigned_at)')
      .eq('fleet_owner_id', fleetOwnerId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async updateVehicleStatus(vehicleId: string, status: 'available' | 'in_use' | 'maintenance' | 'retired') {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('fleet_vehicles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ═══════════════ Driver Assignment ═══════════════

  async assignDriverToVehicle(fleetOwnerId: string, vehicleId: string, driverId: string) {
    const supabase = this.supabaseService.getClient();

    // Verify vehicle belongs to fleet owner
    const { data: vehicle } = await supabase
      .from('fleet_vehicles')
      .select('id, fleet_owner_id')
      .eq('id', vehicleId)
      .eq('fleet_owner_id', fleetOwnerId)
      .maybeSingle();

    if (!vehicle) throw new NotFoundException('Vehicle not found in your fleet');

    const { data, error } = await supabase
      .from('fleet_driver_assignments')
      .upsert({
        fleet_owner_id: fleetOwnerId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        assigned_at: new Date().toISOString(),
        status: 'active',
      }, { onConflict: 'vehicle_id,driver_id' })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Driver ${driverId} assigned to vehicle ${vehicleId}`);
    return data;
  }

  async unassignDriver(vehicleId: string, driverId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('fleet_driver_assignments')
      .update({ status: 'inactive', unassigned_at: new Date().toISOString() })
      .eq('vehicle_id', vehicleId)
      .eq('driver_id', driverId)
      .eq('status', 'active');

    if (error) throw new BadRequestException(error.message);
  }

  async getFleetDrivers(fleetOwnerId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('fleet_driver_assignments')
      .select('*, fleet_vehicles(make, model, year, license_plate, category)')
      .eq('fleet_owner_id', fleetOwnerId)
      .eq('status', 'active')
      .order('assigned_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ═══════════════ Fleet Analytics ═══════════════

  async getFleetStats(fleetOwnerId: string) {
    const supabase = this.supabaseService.getClient();

    const [vehicles, assignments] = await Promise.all([
      supabase.from('fleet_vehicles').select('status').eq('fleet_owner_id', fleetOwnerId),
      supabase.from('fleet_driver_assignments').select('status').eq('fleet_owner_id', fleetOwnerId),
    ]);

    const vehicleList = vehicles.data || [];
    const assignmentList = assignments.data || [];

    return {
      totalVehicles: vehicleList.length,
      availableVehicles: vehicleList.filter(v => v.status === 'available').length,
      inUseVehicles: vehicleList.filter(v => v.status === 'in_use').length,
      maintenanceVehicles: vehicleList.filter(v => v.status === 'maintenance').length,
      activeDrivers: assignmentList.filter(a => a.status === 'active').length,
      utilizationRate: vehicleList.length > 0
        ? Math.round((vehicleList.filter(v => v.status === 'in_use').length / vehicleList.length) * 100)
        : 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CANONICAL §5.8: Leased Vehicle Workflows
  // ═══════════════════════════════════════════════════════════════

  async requestLease(tenantId: string, vehicleId: string, fleetOwnerId: string, lesseeDriverId: string, terms: Record<string, any>) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('vehicle_leases')
      .insert({
        tenant_id: tenantId,
        vehicle_id: vehicleId,
        fleet_owner_id: fleetOwnerId,
        lessee_driver_id: lesseeDriverId,
        terms,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Lease request failed: ${error.message}`);
    this.logger.log(`Lease requested: vehicle=${vehicleId} driver=${lesseeDriverId}`);
    return data;
  }

  async approveLease(leaseId: string, fleetOwnerId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('vehicle_leases')
      .update({
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', leaseId)
      .eq('fleet_owner_id', fleetOwnerId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) throw new BadRequestException(`Lease approval failed: ${error.message}`);
    this.logger.log(`Lease approved: ${leaseId}`);
    return data;
  }

  async terminateLease(leaseId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('vehicle_leases')
      .update({ status: 'terminated', end_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
      .eq('id', leaseId)
      .eq('status', 'active')
      .select()
      .single();

    if (error) throw new BadRequestException(`Lease termination failed: ${error.message}`);
    return data;
  }

  async getLeases(tenantId: string, fleetOwnerId?: string) {
    const supabase = this.supabaseService.getClient();
    let query = supabase.from('vehicle_leases').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (fleetOwnerId) query = query.eq('fleet_owner_id', fleetOwnerId);
    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ═══════════════════════════════════════════════════════════════
  // CANONICAL §5.8: Co-Driving Proposals
  // ═══════════════════════════════════════════════════════════════

  async proposeCoDriving(tenantId: string, vehicleId: string, primaryDriverId: string, secondaryDriverId: string, shiftSchedule: Record<string, any>) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('co_driving_proposals')
      .insert({
        tenant_id: tenantId,
        vehicle_id: vehicleId,
        primary_driver_id: primaryDriverId,
        secondary_driver_id: secondaryDriverId,
        shift_schedule: shiftSchedule,
        status: 'proposed',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Co-driving proposal failed: ${error.message}`);
    this.logger.log(`Co-driving proposed: vehicle=${vehicleId} primary=${primaryDriverId} secondary=${secondaryDriverId}`);
    return data;
  }

  async respondToCoDriving(proposalId: string, driverId: string, accept: boolean) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('co_driving_proposals')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', proposalId)
      .eq('secondary_driver_id', driverId)
      .eq('status', 'proposed')
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // CANONICAL §5.8: Shift Exchanges
  // ═══════════════════════════════════════════════════════════════

  async proposeShiftExchange(
    tenantId: string,
    offeringDriverId: string,
    vehicleId: string,
    shiftDate: string,
    startTime: string,
    endTime: string,
  ) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('shift_exchanges')
      .insert({
        tenant_id: tenantId,
        offering_driver_id: offeringDriverId,
        vehicle_id: vehicleId,
        shift_date: shiftDate,
        start_time: startTime,
        end_time: endTime,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Shift exchange failed: ${error.message}`);
    this.logger.log(`Shift exchange posted: driver=${offeringDriverId} date=${shiftDate}`);
    return data;
  }

  async claimShiftExchange(exchangeId: string, receivingDriverId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('shift_exchanges')
      .update({
        receiving_driver_id: receivingDriverId,
        status: 'claimed',
      })
      .eq('id', exchangeId)
      .eq('status', 'open')
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Shift exchange claimed: ${exchangeId} by driver=${receivingDriverId}`);
    return data;
  }

  async getOpenShiftExchanges(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('shift_exchanges')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .gte('shift_date', new Date().toISOString().split('T')[0])
      .order('shift_date', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }
}
