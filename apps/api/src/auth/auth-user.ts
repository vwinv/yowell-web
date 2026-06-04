import type { AppModulePermission, UserRole } from "@yowell/shared";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: AppModulePermission[];
};
