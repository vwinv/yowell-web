import { Body, Controller, Get, Post } from "@nestjs/common";
import type { AppUser, AuthResponse } from "@yowell/shared";

import type { AuthUser } from "./auth-user";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./public.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto.email, dto.password);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser): Promise<AppUser> {
    return this.authService.me(user);
  }
}
