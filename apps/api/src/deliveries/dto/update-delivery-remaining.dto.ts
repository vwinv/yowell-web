import {
  IsBoolean,
  IsOptional,
  IsString,
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
}
