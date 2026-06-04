import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

import type { AppModulePermission, UserRole } from "@yowell/shared";
import { ALL_MODULE_PERMISSIONS } from "@yowell/shared";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsIn(["admin", "staff"])
  role?: UserRole;

  @IsOptional()
  @IsArray()
  @IsIn(ALL_MODULE_PERMISSIONS, { each: true })
  permissions?: AppModulePermission[];
}
