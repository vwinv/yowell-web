import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import type { User as PrismaUser } from "@prisma/client";
import type { AppUser, CreateUserInput, UpdateUserInput } from "@yowell/shared";
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
    const email = (process.env.ADMIN_EMAIL ?? "admin@yowell.fr").trim().toLowerCase();
    const name = (process.env.ADMIN_NAME ?? "Administrateur").trim() || "Administrateur";
    const password = process.env.ADMIN_PASSWORD ?? "admin123";
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.upsert({
      where: { email },
      update: {
        name,
        role: toPrismaUserRole("admin"),
        active: true,
      },
      create: {
        email,
        name,
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

  async update(id: string, input: UpdateUserInput): Promise<AppUser> {
    const existing = await this.findById(id);

    const email = input.email?.trim().toLowerCase();
    if (email && email !== existing.email) {
      const conflict = await this.findByEmail(email);
      if (conflict && conflict.id !== id) {
        throw new BadRequestException("Un compte existe deja avec cet e-mail.");
      }
    }

    const data: {
      email?: string;
      name?: string;
      passwordHash?: string;
      role?: ReturnType<typeof toPrismaUserRole>;
    } = {};

    if (email) data.email = email;
    if (input.name?.trim()) data.name = input.name.trim();
    if (input.password) {
      data.passwordHash = await bcrypt.hash(input.password, 10);
    }
    if (input.role) {
      data.role = toPrismaUserRole(input.role);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.toPublic(updated);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(userId);
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException("Mot de passe actuel incorrect.");
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit etre different de l'actuel.",
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
      },
    });
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
