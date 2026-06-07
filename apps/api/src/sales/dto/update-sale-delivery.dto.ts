import { IsIn } from "class-validator";

import type { SaleDeliveryStatus } from "@yowell/shared";

export class UpdateSaleDeliveryDto {
  @IsIn(["delivered", "not_delivered"])
  deliveryStatus!: SaleDeliveryStatus;
}
