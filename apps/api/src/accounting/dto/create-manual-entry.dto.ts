import { IsDateString, IsIn, IsNumber, IsString, Min, MinLength } from "class-validator";

export class CreateManualEntryDto {
  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsIn(["income", "expense"])
  type!: "income" | "expense";

  @IsIn(["cash", "om", "wave"])
  paymentChannel!: "cash" | "om" | "wave";
}
