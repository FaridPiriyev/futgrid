import { PrismaClient } from "@prisma/client";
import { config } from "../config.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isTest ? [] : ["warn", "error"],
  });

if (!config.isProduction) globalForPrisma.prisma = prisma;
