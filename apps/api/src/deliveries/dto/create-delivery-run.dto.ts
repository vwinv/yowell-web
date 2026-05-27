import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CreateDeliveryRunLineDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateDeliveryRunFeeDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsNumber()
  @Min(0)
  amount!: number;
}

export class CreateDeliveryRunDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryRunLineDto)
  items!: CreateDeliveryRunLineDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryRunFeeDto)
  fees?: CreateDeliveryRunFeeDto[];
}
