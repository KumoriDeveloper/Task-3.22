import { PrismaClient } from '@prisma/client';
import { PORTFOLIO_FIXTURE } from './portfolio.fixture';
import { adminAccountFromEnv, seedPortfolio, syncAdminAccount } from './seed';

/**
 * CLI used by `npm run db:seed` and by the Vercel build.
 *
 * It talks to `DATABASE_URL` directly, so it works without booting Nest:
 *
 *   node dist/database/seed.cli.js
 *
 * Set `SEED_PORTFOLIO=false` to create/update only the admin account.
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const admin = await syncAdminAccount(prisma);
    const adminEmail = adminAccountFromEnv().email;
    console.info(`[seed] admin ${adminEmail}: ${admin.status}`);

    if (process.env.SEED_PORTFOLIO === 'false') {
      console.info('[seed] SEED_PORTFOLIO=false — portfolio content skipped');
      return;
    }

    const seeded = await seedPortfolio(prisma);

    if (seeded) {
      console.info(
        `[seed] portfolio created: ${PORTFOLIO_FIXTURE.skills.length} skills, ` +
          `${PORTFOLIO_FIXTURE.experiences.length} positions, ` +
          `${PORTFOLIO_FIXTURE.projects.length} projects`,
      );
    } else {
      console.info('[seed] portfolio already contains data — skipped');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] failed:', error);
  process.exitCode = 1;
});
