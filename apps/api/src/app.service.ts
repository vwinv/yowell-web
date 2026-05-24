import { Injectable } from "@nestjs/common";
import type { HealthStatus } from "@yowell/shared";

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
    };
  }
}
