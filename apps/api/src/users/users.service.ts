import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import type { User as PrismaUser } from "@prisma/client";
import type { AppUser, CreateUserInput } from "@yowell/shared";
import * as bcrypt from "bcrypt";

import { mapUser, toPrismaUserRole } from "../prisma/prisma.mappers";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultAdmin();
  }

  private async seedDefaultAdmin() {
    const count = await this.prisma.user.count();
    if (count > 0) return;

    const email = process.env.ADMIN_EMAIL ?? "admin@yowell.fr";
    const password = process.env.ADMIN_PASSWORD ?? "admin123";
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: "Administrateur",
        passwordHash,
        role: toPrismaUserRole("admin"),
        active: true,
      },
    });
  }

  async list(): Promise<AppUser[]> {
    const users = await this.prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    return users.map((user) => this.toPublic(user));
  }

  async findByEmail(email: string): Promise<PrismaUser | null> {
    const normalized = email.trim().toLowerCase();
    return this.prisma.user.findUnique({
      where: { email: normalized },
    });
  }

  async findById(id: string): Promise<PrismaUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable.");
    }
    return user;
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<PrismaUser | null> {
    const user = await this.findByEmail(email);
    if (!user || !user.active) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async create(input: CreateUserInput): Promise<AppUser> {
    const email = input.email.trim().toLowerCase();
    if (await this.findByEmail(email)) {
      throw new BadRequestException("Un compte existe déjà avec cet e-mail.");
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash: await bcrypt.hash(input.password, 10),
        role: toPrismaUserRole(input.role ?? "staff"),
        active: true,
      },
    });
    return this.toPublic(user);
  }

  async deactivate(id: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException("Utilisateur introuvable.");
    }
    await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
  }

  toPublic(user: PrismaUser): AppUser {
    return mapUser(user);
  }
}
