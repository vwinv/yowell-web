import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";

import { CreateClientDto } from "./dto/create-client.dto";
import { ClientsService } from "./clients.service";

@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get("overview")
  getOverview() {
    return this.clientsService.getOverview();
  }

  @Get()
  list() {
    return this.clientsService.list();
  }

  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.clientsService.delete(id);
    return { ok: true };
  }
}
