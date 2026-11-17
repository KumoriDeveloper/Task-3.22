import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PORTFOLIO_FIXTURE } from './portfolio.fixture';
import { seedPortfolio, syncAdminAccount } from './seed';

/**
 * Prepares the database when a long-running instance boots (Docker, `npm start`).
 *
 * On Vercel the same work runs from `src/database/seed.cli.ts` during the build, so
 * cold starts do not pay for it. Keeping the logic in `seed.ts` means both paths
 * share one implementation.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    // Vercel runs the same work once during the build (scripts/vercel-build.js), so the
    // serverless entry point turns boot seeding off to keep cold starts short.
    if (process.env.SEED_ON_BOOT === 'false') {
      this.logger.log('Boot seeding disabled (SEED_ON_BOOT=false)');
      return;
    }

    const admin = await syncAdminAccount(this.prisma);

    if (admin.status === 'created') {
      this.logger.log(`Admin account ${admin.email} created`);
    } else if (admin.status === 'updated') {
      this.logger.log(`Admin account ${admin.email} synchronised with environment configuration`);
    }

    // Read at bootstrap rather than through ConfigService: the seeder is driven by the
    // process environment, and this keeps it usable in tests that boot twice.
    if (process.env.SEED_PORTFOLIO === 'false') {
      this.logger.warn('SEED_PORTFOLIO=false — portfolio content was not seeded');
      return;
    }

    const seeded = await seedPortfolio(this.prisma);

    if (seeded) {
      this.logger.log(
        `Portfolio seeded: ${PORTFOLIO_FIXTURE.skills.length} skills, ` +
          `${PORTFOLIO_FIXTURE.experiences.length} positions, ` +
          `${PORTFOLIO_FIXTURE.projects.length} projects`,
      );
    } else {
      this.logger.log('Portfolio already contains data, seeding skipped');
    }
  }
}
