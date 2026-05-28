import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";

import type { JuiceVolume } from "@yowell/shared";

export class UpdateSaleLineDto {
  @IsUUID()
  productId!: string;

  @IsIn(["1L", "250ml"])
  volume!: JuiceVolume;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class UpdateSaleDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsDateString()
  orderedAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateSaleLineDto)
  items!: UpdateSaleLineDto[];

  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(["paid", "unpaid"])
  paymentStatus?: "paid" | "unpaid";
}
