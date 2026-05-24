import { IsIn } from "class-validator";

import type { SalePaymentStatus } from "@yowell/shared";

export class UpdateSalePaymentDto {
  @IsIn(["paid", "unpaid"])
  paymentStatus!: SalePaymentStatus;
}
