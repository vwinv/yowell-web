import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AppUser, AuthResponse } from "@yowell/shared";

import { UsersService } from "../users/users.service";
import type { AuthUser } from "./auth-user";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AuthResponse> {
    const record = await this.usersService.validateCredentials(email, password);
    if (!record) {
      throw new UnauthorizedException("E-mail ou mot de passe incorrect.");
    }

    const user = this.usersService.toPublic(record);
    const payload: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    return { token, user };
  }

  async me(user: AuthUser): Promise<AppUser> {
    return this.usersService.toPublic(await this.usersService.findById(user.id));
  }

  async changePassword(
    user: AuthUser,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.usersService.changePassword(
      user.id,
      currentPassword,
      newPassword,
    );
  }
}
