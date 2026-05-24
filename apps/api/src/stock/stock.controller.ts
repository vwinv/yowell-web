import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";

import { CreateProductDto } from "./dto/create-product.dto";
import { CreateProductionDto } from "./dto/create-production.dto";
import { photoFilter, productPhotosStorage, toPublicPhotoPath } from "./stock-upload";
import { StockService } from "./stock.service";

@Controller("stock")
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get("overview")
  getOverview() {
    return this.stockService.getOverview();
  }

  @Get("products")
  listProducts() {
    return this.stockService.listProducts();
  }

  @Post("products")
  @UseInterceptors(
    FilesInterceptor("photos", 6, {
      storage: productPhotosStorage,
      fileFilter: photoFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  createProduct(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const photoUrls = (files ?? []).map((f) => toPublicPhotoPath(f.filename));
    const input = this.stockService.productFromDto(dto);
    return this.stockService.createProduct(input, photoUrls);
  }

  @Delete("products/:id")
  deleteProduct(@Param("id") id: string) {
    this.stockService.deleteProduct(id);
    return { ok: true };
  }

  @Get("productions")
  listProductions() {
    return this.stockService.listProductions();
  }

  @Post("productions")
  recordProduction(@Body() dto: CreateProductionDto) {
    return this.stockService.recordProduction(dto);
  }
}
