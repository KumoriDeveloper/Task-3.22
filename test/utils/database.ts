import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { TEST_DATABASE_URL } from './env';

/** All domain tables; the implicit m2m join table is cleaned by CASCADE. */
const TABLES = '"Project", "Skill", "Experience", "SocialLink", "Profile", "AdminUser"';

let migrationsApplied = false;

/**
 * Applies the committed migrations to the isolated e2e schema. Prisma Migrate
 * creates the schema from the connection string when it does not exist yet.
 */
export function ensureMigrations(): void {
  if (migrationsApplied) {
    return;
  }

  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });

  migrationsApplied = true;
}

/** Empties the e2e schema so a suite starts from a known state. */
export async function resetDatabase(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES} RESTART IDENTITY CASCADE;`);
  } finally {
    await prisma.$disconnect();
  }
}
