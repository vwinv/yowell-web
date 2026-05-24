import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

import type { UserRole } from "@yowell/shared";

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
}
