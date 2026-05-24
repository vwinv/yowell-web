import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
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
  @IsIn(["paid", "unpaid"])
  paymentStatus?: "paid" | "unpaid";
}
