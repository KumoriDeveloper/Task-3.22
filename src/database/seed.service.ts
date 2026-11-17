import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { PORTFOLIO_FIXTURE } from './portfolio.fixture';

/** Advisory lock key, so two replicas starting at the same time cannot double-seed. */
const SEED_LOCK_KEY = 8419271;

/**
 * Prepares the database on startup:
 *
 *  1. synchronises the admin account with ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
 *     (the environment is the source of truth, so credentials are reproducible);
 *  2. seeds the card content exactly once — only when the database has no profile.
 *
 * Seeding is idempotent by design: restarting the container never duplicates rows and
 * never overwrites edits made through the admin panel. The schema itself is applied by
 * `prisma migrate deploy` in the container entrypoint.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureAdminAccount();

    if (this.config.get<string>('SEED_PORTFOLIO') === 'false') {
      this.logger.warn('SEED_PORTFOLIO=false — portfolio content was not seeded');
      return;
    }

    await this.seedPortfolio();
  }

  private async ensureAdminAccount(): Promise<void> {
    const email = (this.config.get<string>('ADMIN_EMAIL') ?? 'admin@example.com')
      .trim()
      .toLowerCase();
    const password = this.config.get<string>('ADMIN_PASSWORD') ?? 'admin12345';
    const name = this.config.get<string>('ADMIN_NAME') ?? 'Portfolio Admin';

    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await this.prisma.adminUser.findUnique({ where: { email } });

    if (!existing) {
      await this.prisma.adminUser.create({ data: { email, name, passwordHash } });
      this.logger.log(`Admin account ${email} created`);
      return;
    }

    const upToDate =
      (await bcrypt.compare(password, existing.passwordHash)) && existing.name === name;

    if (!upToDate) {
      await this.prisma.adminUser.update({
        where: { id: existing.id },
        data: { passwordHash, name },
      });
      this.logger.log(`Admin account ${email} synchronised with environment configuration`);
    }
  }

  private async seedPortfolio(): Promise<void> {
    const seeded = await this.prisma.$transaction(
      async (tx) => {
        // Transaction-scoped advisory lock: concurrent starts queue up here, and the
        // second one then sees the already-created profile and does nothing.
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${SEED_LOCK_KEY})`);

        const profiles = await tx.profile.count();
        if (profiles > 0) {
          return false;
        }

        const { profile, links, skills, experiences, projects } = PORTFOLIO_FIXTURE;

        const created = await tx.profile.create({
          data: {
            name: profile.name,
            headline: profile.headline,
            description: profile.description,
            email: profile.email,
            location: profile.location ?? null,
            avatarUrl: profile.avatarUrl ?? null,
            links: {
              create: links.map((link) => ({
                label: link.label,
                url: link.url,
                kind: link.kind,
                sortOrder: link.sortOrder ?? 0,
              })),
            },
            skills: {
              create: skills.map((skill) => ({
                name: skill.name,
                category: skill.category,
                level: skill.level,
                sortOrder: skill.sortOrder ?? 0,
              })),
            },
            experiences: {
              create: experiences.map((experience) => ({
                company: experience.company,
                position: experience.position,
                startDate: new Date(experience.startDate),
                endDate: experience.endDate ? new Date(experience.endDate) : null,
                location: experience.location ?? null,
                summary: experience.summary ?? null,
                achievements: experience.achievements,
                sortOrder: experience.sortOrder ?? 0,
              })),
            },
          },
          select: { id: true },
        });

        const skillIdsByName = new Map(
          (
            await tx.skill.findMany({
              where: { profileId: created.id },
              select: { id: true, name: true },
            })
          ).map((skill) => [skill.name, skill.id]),
        );

        for (const project of projects) {
          const technologyIds = project.technologies.map((name) => {
            const id = skillIdsByName.get(name);
            if (!id) {
              throw new Error(
                `Seed fixture references unknown skill "${name}" in project "${project.name}"`,
              );
            }
            return { id };
          });

          await tx.project.create({
            data: {
              profileId: created.id,
              name: project.name,
              description: project.description ?? null,
              url: project.url ?? null,
              repositoryUrl: project.repositoryUrl ?? null,
              sortOrder: project.sortOrder ?? 0,
              technologies: { connect: technologyIds },
            },
          });
        }

        return true;
      },
      { timeout: 20_000 },
    );

    if (seeded) {
      this.logger.log(
        `Portfolio seeded: ${PORTFOLIO_FIXTURE.skills.length} skills, ` +
          `${PORTFOLIO_FIXTURE.experiences.length} positions, ${PORTFOLIO_FIXTURE.projects.length} projects`,
      );
    } else {
      this.logger.log('Portfolio already contains data, seeding skipped');
    }
  }
}
