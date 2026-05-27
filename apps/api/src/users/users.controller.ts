import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { AppUser } from "@yowell/shared";

import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(RolesGuard)
@Roles("admin")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(): Promise<AppUser[]> {
    return this.usersService.list();
  }

  @Post()
  create(@Body() dto: CreateUserDto): Promise<AppUser> {
    return this.usersService.create(dto);
  }

  @Delete(":id")
  async deactivate(@Param("id") id: string): Promise<void> {
    await this.usersService.deactivate(id);
  }
}
