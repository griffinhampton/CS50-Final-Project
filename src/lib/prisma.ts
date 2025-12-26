import 'server-only';

import { PrismaClient } from '../generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// This prevents creating multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error(
        "DATABASE_URL is not set. Configure it in your environment (e.g. Vercel Project → Settings → Environment Variables)."
    );
}

// In serverless (Vercel), keep pool sizes tiny to avoid exhausting managed Postgres poolers.
// Override via PG_POOL_MAX if needed.
const pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? '1'),
    idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_TIMEOUT_MS ?? '10000'),
    connectionTimeoutMillis: Number(process.env.PG_POOL_CONN_TIMEOUT_MS ?? '10000'),
    allowExitOnIdle: true,
});
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
