import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

import { CreateDeliveryRunDto } from "./dto/create-delivery-run.dto";
import { UpdateDeliveryRemainingDto } from "./dto/update-delivery-remaining.dto";
import { DeliveriesService } from "./deliveries.service";

@Controller("deliveries")
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get("overview")
  getOverview() {
    return this.deliveriesService.getOverview();
  }

  @Post()
  create(@Body() dto: CreateDeliveryRunDto) {
    return this.deliveriesService.create(dto);
  }

  @Patch(":id/remaining")
  updateRemaining(
    @Param("id") id: string,
    @Body() dto: UpdateDeliveryRemainingDto,
  ) {
    return this.deliveriesService.updateItemRemaining(id, dto);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    this.deliveriesService.delete(id);
    return { ok: true };
  }
}
