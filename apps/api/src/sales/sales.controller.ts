import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from "@nestjs/common";
import type { Response } from "express";

import { CreateSaleDto } from "./dto/create-sale.dto";
import { UpdateSalePaymentDto } from "./dto/update-sale-payment.dto";
import { SalesService } from "./sales.service";

@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get("overview")
  getOverview() {
    return this.salesService.getOverview();
  }

  @Post()
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.create(dto);
  }

  @Patch(":id/payment-status")
  updatePaymentStatus(
    @Param("id") id: string,
    @Body() dto: UpdateSalePaymentDto,
  ) {
    return this.salesService.updatePaymentStatus(id, dto);
  }

  @Get(":id/invoice")
  async getInvoice(@Param("id") id: string, @Res() res: Response) {
    const buffer = await this.salesService.generateInvoicePdf(id);
    const shortId = id.slice(0, 8);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facture-${shortId}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  }
}
