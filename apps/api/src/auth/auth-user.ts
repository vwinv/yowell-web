import type { UserRole } from "@yowell/shared";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};
