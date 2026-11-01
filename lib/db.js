import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  // The pg adapter ignores `?schema=` in the URL, so pass it through explicitly.
  const schema =
    new URL(connectionString).searchParams.get("schema") ?? undefined;
  const adapter = new PrismaPg({ connectionString }, { schema });
  return new PrismaClient({ adapter });
}

// Reuse one client across Next.js hot reloads in dev.
const globalForPrisma = globalThis;

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
