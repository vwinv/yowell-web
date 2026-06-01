import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL est obligatoire.");
  }

  const email = (process.env.ADMIN_EMAIL ?? "admin@yowell.fr").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME ?? "Administrateur").trim() || "Administrateur";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(password, 10);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: UserRole.ADMIN,
      active: true,
      passwordHash,
    },
    create: {
      email,
      name,
      passwordHash,
      role: UserRole.ADMIN,
      active: true,
    },
  });

  console.log(`Admin prêt : ${user.name} <${user.email}> (rôle ${user.role})`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
