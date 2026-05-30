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
import { UpdateSaleDto } from "./dto/update-sale.dto";
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

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSaleDto) {
    return this.salesService.update(id, dto);
  }

  @Post(":id/convert-to-sale")
  convertToSale(@Param("id") id: string) {
    return this.salesService.convertToSale(id);
  }

  @Get(":id/invoice")
  async getInvoice(@Param("id") id: string, @Res() res: Response) {
    const sale = await this.salesService.findById(id);
    const buffer = await this.salesService.generateInvoicePdf(id);
    const shortId = id.slice(0, 8);
    const prefix = sale.kind === "quote" ? "devis" : "facture";
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${prefix}-${shortId}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  }
}
