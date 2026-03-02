import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum DriverStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  BUSY = 'busy',
  EN_ROUTE_PICKUP = 'en_route_pickup',
  AT_PICKUP = 'at_pickup',
  EN_ROUTE_DROPOFF = 'en_route_dropoff',
}

export class LocationUpdateDto {
  @ApiProperty()
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @IsNumber()
  lng!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  speed?: number;
}

export class DriverStatusUpdateDto {
  @ApiProperty({ enum: DriverStatus })
  @IsEnum(DriverStatus)
  status!: DriverStatus;

  @ApiProperty({ type: LocationUpdateDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationUpdateDto)
  location?: LocationUpdateDto;
}

export class DriverAuthDto {
  @ApiProperty()
  @IsString()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}

export class DriverRegistrationDto extends DriverAuthDto {
  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;
}

export class VehicleInfoDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  make!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  year!: number;

  @ApiProperty()
  color!: string;

  @ApiProperty()
  licensePlate!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty({ required: false })
  photoUrls?: string[];
}

export class DriverProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty()
  rating!: number;

  @ApiProperty()
  totalTrips!: number;

  @ApiProperty({ enum: DriverStatus })
  status!: DriverStatus;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ required: false, type: () => LocationUpdateDto })
  currentLocation?: LocationUpdateDto;

  @ApiProperty({ required: false, type: () => VehicleInfoDto })
  vehicle?: VehicleInfoDto;
}

export class RideOfferDto {
  @ApiProperty()
  offerId!: string;

  @ApiProperty()
  tripId!: string;

  @ApiProperty()
  riderId!: string;

  @ApiProperty()
  riderName!: string;

  @ApiProperty({ required: false })
  riderPhone?: string;

  @ApiProperty()
  pickup!: {
    address: string;
    lat: number;
    lng: number;
  };

  @ApiProperty()
  dropoff!: {
    address: string;
    lat: number;
    lng: number;
  };

  @ApiProperty()
  estimatedFare!: number;

  @ApiProperty()
  netPayout!: number;

  @ApiProperty()
  estimatedDistance!: number;

  @ApiProperty()
  estimatedDuration!: number;

  @ApiProperty()
  pickupEta!: number;

  @ApiProperty()
  category!: string;

  @ApiProperty({ required: false })
  specialInstructions?: string;

  @ApiProperty()
  expiresAt!: string;
}

export class RideOfferResponseDto {
  @ApiProperty()
  @IsString()
  offerId!: string;

  @ApiProperty()
  @IsBoolean()
  accepted!: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EarningsDto {
  @ApiProperty()
  period!: string;

  @ApiProperty()
  grossEarnings!: number;

  @ApiProperty()
  netEarnings!: number;

  @ApiProperty()
  totalTrips!: number;

  @ApiProperty()
  onlineHours!: number;

  @ApiProperty()
  commission!: number;
}

export class TripHistoryDto {
  @ApiProperty()
  tripId!: string;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  time!: string;

  @ApiProperty()
  pickup!: string;

  @ApiProperty()
  dropoff!: string;

  @ApiProperty()
  distance!: number;

  @ApiProperty()
  duration!: number;

  @ApiProperty()
  fare!: number;

  @ApiProperty()
  netEarnings!: number;

  @ApiProperty()
  rating!: number;

  @ApiProperty()
  riderName!: string;
}