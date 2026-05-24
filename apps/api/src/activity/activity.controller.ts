import { Controller, Get, Query } from "@nestjs/common";
import type { ActivityOverview } from "@yowell/shared";

import type { AuthUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/current-user.decorator";
import { ActivityService } from "./activity.service";

@Controller("activity")
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get("overview")
  getOverview(
    @CurrentUser() user: AuthUser,
    @Query("limit") limit?: string,
  ): ActivityOverview {
    const parsed = limit ? Number.parseInt(limit, 10) : 150;
    return this.activityService.getOverview(
      user,
      Number.isNaN(parsed) ? 150 : parsed,
    );
  }
}
