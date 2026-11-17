import type { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PORTFOLIO_FIXTURE, type PortfolioFixture } from './portfolio.fixture';

/**
 * Startup data preparation, extracted from the Nest provider so the same logic can
 * run from a CLI during a Vercel build (`node dist/database/seed.cli.js`).
 *
 * Both operations are idempotent:
 *  - the admin account follows the environment, so credentials are reproducible;
 *  - portfolio content is written only when no profile exists, so edits made in the
 *    admin panel are never overwritten.
 */

/** Advisory lock key, so two replicas starting at the same time cannot double-seed. */
export const SEED_LOCK_KEY = 8419271;

export interface AdminAccountConfig {
  email: string;
  password: string;
  name: string;
}

export type AdminSyncStatus = 'created' | 'updated' | 'unchanged';

export interface AdminSyncResult {
  status: AdminSyncStatus;
  email: string;
}

const BCRYPT_COST = 10;
const SEED_TRANSACTION_TIMEOUT_MS = 20_000;

export function adminAccountFromEnv(env: NodeJS.ProcessEnv = process.env): AdminAccountConfig {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment');
  }

  return {
    email,
    password,
    name: env.ADMIN_NAME?.trim() || 'Portfolio Admin',
  };
}

/** Creates the admin on first run and rotates its name/password when env changed. */
export async function syncAdminAccount(
  prisma: PrismaClient,
  config: AdminAccountConfig = adminAccountFromEnv(),
): Promise<AdminSyncResult> {
  const existing = await prisma.adminUser.findUnique({ where: { email: config.email } });

  if (!existing) {
    await prisma.adminUser.create({
      data: {
        email: config.email,
        name: config.name,
        passwordHash: await bcrypt.hash(config.password, BCRYPT_COST),
      },
    });

    return { status: 'created', email: config.email };
  }

  const upToDate =
    existing.name === config.name && (await bcrypt.compare(config.password, existing.passwordHash));

  if (upToDate) {
    return { status: 'unchanged', email: config.email };
  }

  await prisma.adminUser.update({
    where: { id: existing.id },
    data: {
      name: config.name,
      passwordHash: await bcrypt.hash(config.password, BCRYPT_COST),
    },
  });

  return { status: 'updated', email: config.email };
}

/** Seeds the card exactly once. Returns true when this call created the content. */
export async function seedPortfolio(
  prisma: PrismaClient,
  fixture: PortfolioFixture = PORTFOLIO_FIXTURE,
): Promise<boolean> {
  return prisma.$transaction(
    async (tx) => {
      // Transaction-scoped advisory lock: concurrent starts queue up here, and the
      // second one then sees the already-created profile and does nothing.
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${SEED_LOCK_KEY})`);

      const profiles = await tx.profile.count();
      if (profiles > 0) {
        return false;
      }

      const { profile, links, skills, experiences, projects } = fixture;

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
        // Reading the created skills back in the same statement avoids a second query.
        select: { id: true, skills: { select: { id: true, name: true } } },
      });

      const skillIdsByName = new Map(created.skills.map((skill) => [skill.name, skill.id]));

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
    { timeout: SEED_TRANSACTION_TIMEOUT_MS },
  );
}
