import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { permissionForApiPath, userCanMutate } from "@yowell/shared";
import type { Request } from "express";

import { UsersService } from "../users/users.service";
import type { AuthUser } from "./auth-user";
import { IS_PUBLIC_KEY } from "./public.decorator";

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    if (!user) return true;

    if (user.role === "admin") return true;

    const method = request.method.toUpperCase();
    if (!MUTATION_METHODS.has(method)) return true;

    const path = request.url.split("?")[0] ?? request.url;

    if (path === "/api/auth/password") return true;

    const module = permissionForApiPath(path);
    if (!module) {
      throw new ForbiddenException(
        "Action non autorisee pour votre compte.",
      );
    }

    const fresh = this.usersService.toPublic(
      await this.usersService.findById(user.id),
    );

    if (!userCanMutate(fresh, module)) {
      throw new ForbiddenException(
        "Vous n'avez pas les droits d'action sur ce module.",
      );
    }

    return true;
  }
}
