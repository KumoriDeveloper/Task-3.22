import type { NestExpressApplication } from '@nestjs/platform-express';
import * as bcrypt from 'bcryptjs';
import type { Server } from 'node:http';
import { PORTFOLIO_FIXTURE } from '../src/database/portfolio.fixture';
import { PrismaService } from '../src/prisma/prisma.service';
import { ensureMigrations, resetDatabase } from './utils/database';
import { TEST_ADMIN } from './utils/env';
import { createTestApp, graphql } from './utils/test-app';

describe('database seeding (e2e)', () => {
  beforeAll(() => {
    ensureMigrations();
  });

  it('creates the admin account and seeds the card on an empty database', async () => {
    await resetDatabase();

    const first = await createTestApp();
    const prisma = first.get(PrismaService);

    expect(await prisma.profile.count()).toBe(1);
    expect(await prisma.socialLink.count()).toBe(PORTFOLIO_FIXTURE.links.length);
    expect(await prisma.skill.count()).toBe(PORTFOLIO_FIXTURE.skills.length);
    expect(await prisma.experience.count()).toBe(PORTFOLIO_FIXTURE.experiences.length);
    expect(await prisma.project.count()).toBe(PORTFOLIO_FIXTURE.projects.length);

    const admin = await prisma.adminUser.findUniqueOrThrow({
      where: { email: TEST_ADMIN.email },
    });
    expect(admin.name).toBe(TEST_ADMIN.name);
    expect(await bcrypt.compare(TEST_ADMIN.password, admin.passwordHash)).toBe(true);

    await first.close();

    // Second boot must be a no-op instead of duplicating the fixture.
    const second = await createTestApp();
    const secondPrisma = second.get(PrismaService);
    expect(await secondPrisma.profile.count()).toBe(1);
    expect(await secondPrisma.skill.count()).toBe(PORTFOLIO_FIXTURE.skills.length);
    expect(await secondPrisma.project.count()).toBe(PORTFOLIO_FIXTURE.projects.length);

    await second.close();
  });

  it('never overwrites content edited through the admin API', async () => {
    await resetDatabase();

    const first = await createTestApp();
    const prisma = first.get(PrismaService);
    const profile = await prisma.profile.findFirstOrThrow();
    await prisma.skill.create({
      data: { profileId: profile.id, name: 'Rust', category: 'BACKEND', level: 'BEGINNER' },
    });
    await first.close();

    const second = await createTestApp();
    const secondPrisma = second.get(PrismaService);
    const names = (await secondPrisma.skill.findMany({ select: { name: true } })).map(
      (skill) => skill.name,
    );

    expect(names).toContain('Rust');
    expect(names).toHaveLength(PORTFOLIO_FIXTURE.skills.length + 1);

    await second.close();
  });

  it('synchronises the admin password with the environment', async () => {
    await resetDatabase();

    const first = await createTestApp();
    await first.close();

    const rotatedPassword = 'rotated-e2e-password';
    process.env.ADMIN_PASSWORD = rotatedPassword;

    try {
      const second = await createTestApp();
      const prisma = second.get(PrismaService);
      const admin = await prisma.adminUser.findUniqueOrThrow({
        where: { email: TEST_ADMIN.email },
      });

      expect(await bcrypt.compare(rotatedPassword, admin.passwordHash)).toBe(true);
      await second.close();
    } finally {
      process.env.ADMIN_PASSWORD = TEST_ADMIN.password;
    }
  });

  it('creates only the admin account when SEED_PORTFOLIO=false', async () => {
    await resetDatabase();
    process.env.SEED_PORTFOLIO = 'false';

    try {
      const app = await createTestApp();
      const prisma = app.get(PrismaService);

      expect(await prisma.profile.count()).toBe(0);
      expect(await prisma.adminUser.count()).toBe(1);

      const response = await graphql(app.getHttpServer() as Server, '{ profile { name } }');
      expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');

      await app.close();
    } finally {
      process.env.SEED_PORTFOLIO = 'true';
    }
  });
});
