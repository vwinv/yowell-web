import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === undefined || value === "") return fallback;
  const n = Number.parseFloat(String(value));
  return Number.isNaN(n) ? fallback : n;
}

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  format1LEnabled!: boolean;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  price1L!: number;

  @IsOptional()
  @Transform(({ value }) => toNumber(value, 0))
  @IsNumber()
  @Min(0)
  minQuantity1L?: number;

  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  format250Enabled!: boolean;

  @Transform(({ value }) => toNumber(value))
  @IsNumber()
  @Min(0)
  price250!: number;

  @IsOptional()
  @Transform(({ value }) => toNumber(value, 0))
  @IsNumber()
  @Min(0)
  minQuantity250?: number;
}
