import 'server-only';

import { PrismaClient } from '../generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// This prevents creating multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const connectionString = process.env.DATABASE_URL || "postgresql://griffinhampton@localhost:5432/my_project_dev";
if (!connectionString){
    throw new Error('Fault at DATABASE_URL, not defined in env')
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
