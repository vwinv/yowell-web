import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { Observable, tap } from "rxjs";

import type { AuthUser } from "../auth/auth-user";
import { IS_PUBLIC_KEY } from "../auth/public.decorator";
import { ActivityService, isTrackedActivity } from "./activity.service";

function actionLabel(method: string, path: string): string {
  const clean = path.replace(/^\/api\/?/, "").replace(/\//g, ".");
  return `${method.toLowerCase()}.${clean || "root"}`;
}

function humanSummary(method: string, path: string): string {
  const base = path.split("?")[0] ?? path;

  if (method === "POST" && base === "/api/sales") {
    return "Enregistrement d'une vente";
  }
  if (method === "PATCH" && base.includes("/sales/") && base.includes("/payment-status")) {
    return "Mise à jour du paiement d'une vente";
  }
  if (method === "GET" && base.includes("/sales/") && base.includes("/invoice")) {
    return "Téléchargement d'une facture";
  }

  if (method === "POST" && base === "/api/deliveries") {
    return "Enregistrement d'une course";
  }
  if (method === "PATCH" && base.includes("/deliveries/") && base.endsWith("/remaining")) {
    return "Mise à jour des restants d'une course";
  }
  if (method === "DELETE" && base.startsWith("/api/deliveries/")) {
    return "Suppression d'une course";
  }

  if (method === "POST" && base === "/api/accounting/entries") {
    return "Saisie comptable manuelle";
  }
  if (method === "DELETE" && base.startsWith("/api/accounting/entries/")) {
    return "Suppression d'une écriture comptable";
  }
  if (method === "PATCH" && base === "/api/accounting/caisse") {
    return "Mise à jour de la caisse";
  }

  if (method === "POST" && base === "/api/stock/products") {
    return "Création d'un produit";
  }
  if (method === "DELETE" && base.startsWith("/api/stock/products/")) {
    return "Suppression d'un produit";
  }
  if (method === "POST" && base === "/api/stock/productions") {
    return "Enregistrement d'une production";
  }

  return `${method} ${base}`;
}

@Injectable()
export class ActivityLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly activityService: ActivityService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<
      Request & { user?: AuthUser }
    >();
    const user = request.user;
    const path = request.url.split("?")[0] ?? request.url;
    const method = request.method.toUpperCase();

    if (
      isPublic ||
      !user ||
      !isTrackedActivity(method, path)
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.activityService.log({
          user,
          action: actionLabel(method, path),
          summary: humanSummary(method, path),
          method,
          path,
        });
      }),
    );
  }
}
