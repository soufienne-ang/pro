import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isConnectionError =
        error instanceof Error &&
        (error.message.includes("Closed") ||
         error.message.includes("Connection pool") ||
         error.message.includes("Can't reach database") ||
         error.message.includes("kind: Closed"));

      if (isConnectionError && attempt < retries) {
        console.warn(`Prisma connection error (attempt ${attempt}/${retries}), retrying...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Unreachable");
}