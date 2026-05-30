import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";

import type { JuiceVolume } from "@yowell/shared";

function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === undefined || value === "") return fallback;
  const n = Number.parseFloat(String(value));
  return Number.isNaN(n) ? fallback : n;
}

export class CreateSaleLineDto {
  @IsUUID()
  productId!: string;

  @IsIn(["1L", "250ml"])
  volume!: JuiceVolume;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateSaleDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsDateString()
  orderedAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleLineDto)
  items!: CreateSaleLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  personalization?: boolean;

  @IsOptional()
  @Transform(({ value }) => toNumber(value, 0))
  @IsInt()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsIn(["paid", "unpaid"])
  paymentStatus?: "paid" | "unpaid";
}
