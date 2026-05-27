import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class UpdateDeliveryRemainingDto {
  @IsString()
  @MinLength(1)
  itemId!: string;

  @IsBoolean()
  hasRemaining!: boolean;

  @ValidateIf((o: UpdateDeliveryRemainingDto) => o.hasRemaining === true)
  @IsString()
  @MinLength(1, { message: "Indique ce qu'il reste." })
  remainingNote?: string;

  @ValidateIf((o: UpdateDeliveryRemainingDto) => o.hasRemaining === true)
  @IsNumber()
  @Min(0.01, { message: "Le stock initial restant doit être supérieur à 0." })
  initialRemainingStock?: number;
}
