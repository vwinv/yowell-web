import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

import type { UserRole } from "@yowell/shared";

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsIn(["admin", "staff"])
  role?: UserRole;
}
