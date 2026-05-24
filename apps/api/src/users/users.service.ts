import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import type { AppUser, CreateUserInput, UserRole } from "@yowell/shared";
import * as bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";

import { UsersStore, type UserRecord } from "./users.store";

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly store = new UsersStore();

  async onModuleInit() {
    this.store.load();
    await this.seedDefaultAdmin();
  }

  private async seedDefaultAdmin() {
    const data = this.store.getData();
    if (data.users.length > 0) return;

    const email = process.env.ADMIN_EMAIL ?? "admin@yowell.fr";
    const password = process.env.ADMIN_PASSWORD ?? "admin123";
    const passwordHash = await bcrypt.hash(password, 10);

    data.users.push({
      id: randomUUID(),
      email: email.toLowerCase(),
      name: "Administrateur",
      passwordHash,
      role: "admin",
      active: true,
      createdAt: new Date().toISOString(),
    });
    this.store.setData(data);
  }

  list(): AppUser[] {
    return this.store
      .getData()
      .users.filter((u) => u.active)
      .map((u) => this.toPublic(u))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }

  findByEmail(email: string): UserRecord | undefined {
    const normalized = email.trim().toLowerCase();
    return this.store.getData().users.find((u) => u.email === normalized);
  }

  findById(id: string): UserRecord {
    const user = this.store.getData().users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable.");
    }
    return user;
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<UserRecord | null> {
    const user = this.findByEmail(email);
    if (!user || !user.active) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async create(input: CreateUserInput): Promise<AppUser> {
    const email = input.email.trim().toLowerCase();
    if (this.findByEmail(email)) {
      throw new BadRequestException("Un compte existe déjà avec cet e-mail.");
    }

    const data = this.store.getData();
    const user: UserRecord = {
      id: randomUUID(),
      email,
      name: input.name.trim(),
      passwordHash: await bcrypt.hash(input.password, 10),
      role: input.role === "admin" ? "admin" : "staff",
      active: true,
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    this.store.setData(data);
    return this.toPublic(user);
  }

  deactivate(id: string): void {
    const data = this.store.getData();
    const user = data.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable.");
    }
    user.active = false;
    this.store.setData(data);
  }

  toPublic(user: UserRecord): AppUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    };
  }
}
