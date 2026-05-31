import { IsIn, IsOptional, ValidateIf } from "class-validator";

import type { PaymentChannel, SalePaymentStatus } from "@yowell/shared";

export class UpdateSalePaymentDto {
  @IsIn(["paid", "unpaid"])
  paymentStatus!: SalePaymentStatus;

  @ValidateIf((dto: UpdateSalePaymentDto) => dto.paymentStatus === "paid")
  @IsIn(["cash", "om", "wave"])
  paymentChannel?: PaymentChannel;
}
