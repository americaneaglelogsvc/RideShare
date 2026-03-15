/**
 * @file dispatch.dto.ts
 * @description DTOs for all dispatch controller endpoints with class-validator decorations.
 * ValidationPipe (whitelist: true) strips unknown props — these DTOs define the contract.
 */
import {
  IsString, IsNumber, IsOptional, IsNotEmpty, IsIn, Matches,
  Min, Max, ValidateNested, IsArray, ArrayMinSize,
  IsLatitude, IsLongitude,
} from 'class-validator';

// PostgreSQL accepts any 8-4-4-4-12 hex pattern as UUID, not just RFC 4122 v1-v5
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Note: The `!` (definite assignment assertion) is required on all DTO properties
// because class-validator + class-transformer populate them at runtime via `transform: true`.

// ── Shared nested types ──

export class LocationDto {
  @ApiProperty({ example: '123 Main St, Chicago IL' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 41.8781 })
  @IsNumber()
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: -87.6298 })
  @IsNumber()
  @IsLongitude()
  lng!: number;
}

// ── Find Drivers ──

export class FindDriversDto {
  @ApiProperty({ example: 41.8781 })
  @IsNumber()
  @IsLatitude()
  pickup_lat!: number;

  @ApiProperty({ example: -87.6298 })
  @IsNumber()
  @IsLongitude()
  pickup_lng!: number;

  @ApiProperty({ example: 'black_sedan' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  max_distance?: number;
}

// ── Dispatch Ride ──

export class DispatchRideDto {
  @ApiProperty()
  @Matches(UUID_REGEX, { message: 'rider_id must be a UUID' })
  rider_id!: string;

  @ApiProperty({ example: 'Alice Smith' })
  @IsString()
  @IsNotEmpty()
  rider_name!: string;

  @ApiProperty({ example: '+13125550101' })
  @IsString()
  @IsNotEmpty()
  rider_phone!: string;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  pickup!: LocationDto;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  dropoff!: LocationDto;

  @ApiProperty({ example: 'black_sedan' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ example: 2500, description: 'Estimated fare in cents' })
  @IsNumber()
  @Min(0)
  estimated_fare!: number;

  @ApiPropertyOptional({ example: 'Please wait at the lobby' })
  @IsOptional()
  @IsString()
  special_instructions?: string;
}

// ── Accept Offer ──

export class AcceptOfferDto {
  @ApiProperty()
  @Matches(UUID_REGEX, { message: 'rider_id must be a UUID' })
  driver_id!: string;
}

// ── Accept Trip ──

export class AcceptTripDto {
  @ApiProperty()
  @Matches(UUID_REGEX, { message: 'rider_id must be a UUID' })
  trip_id!: string;

  @ApiProperty()
  @Matches(UUID_REGEX, { message: 'rider_id must be a UUID' })
  driver_id!: string;
}

// ── Start / Complete Trip ──

export class TripIdDto {
  @ApiProperty()
  @Matches(UUID_REGEX, { message: 'rider_id must be a UUID' })
  trip_id!: string;
}

// ── Cancel Trip ──

const CANCELLATION_ACTORS = ['rider', 'driver', 'system'] as const;
type CancellationActor = typeof CANCELLATION_ACTORS[number];

export class CancelTripDto {
  @ApiProperty()
  @Matches(UUID_REGEX, { message: 'rider_id must be a UUID' })
  trip_id!: string;

  @ApiProperty({ enum: CANCELLATION_ACTORS })
  @IsIn(CANCELLATION_ACTORS)
  cancelled_by!: CancellationActor;

  @ApiPropertyOptional({ example: 'Changed plans' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ── Adjust Trip ──

const ADJUSTMENT_TYPES = [
  'extra_stop', 'mess_fee', 'damage_fee', 'route_deviation',
  'min_wage_supplement', 'wait_time', 'toll', 'gratuity', 'discount',
] as const;
type AdjustmentType = typeof ADJUSTMENT_TYPES[number];

export class TripAdjustmentItemDto {
  @ApiProperty({ enum: ADJUSTMENT_TYPES })
  @IsIn(ADJUSTMENT_TYPES)
  type!: AdjustmentType;

  @ApiProperty({ example: 'Extra stop at pharmacy' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  amount_cents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  applied_by?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class AdjustTripDto {
  @ApiProperty()
  @Matches(UUID_REGEX, { message: 'rider_id must be a UUID' })
  trip_id!: string;

  @ApiProperty({ type: [TripAdjustmentItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TripAdjustmentItemDto)
  adjustments!: TripAdjustmentItemDto[];
}

// ── Close Trip ──

export class CloseTripDto {
  @ApiProperty()
  @Matches(UUID_REGEX, { message: 'rider_id must be a UUID' })
  trip_id!: string;

  @ApiPropertyOptional({ example: 'system' })
  @IsOptional()
  @IsString()
  closed_by?: string;
}
