import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

import type { JuiceVolume } from "@yowell/shared";

export class CreateProductionDto {
  @IsUUID()
  productId!: string;

  @IsIn(["1L", "250ml"])
  volume!: JuiceVolume;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsDateString()
  producedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
