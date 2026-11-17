import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'node:http';
import { PORTFOLIO_FIXTURE } from '../src/database/portfolio.fixture';
import { PrismaService } from '../src/prisma/prisma.service';
import { ensureMigrations, resetDatabase } from './utils/database';
import { createTestApp, graphql } from './utils/test-app';

const CARD_QUERY = `
  query Card {
    profile {
      id
      name
      headline
      description
      email
      location
      links {
        id
        label
        url
        kind
      }
      skills {
        id
        name
        category
        level
        sortOrder
      }
      experiences {
        id
        company
        position
        startDate
        endDate
        achievements
      }
      projects {
        id
        name
        repositoryUrl
        technologies {
          id
          name
        }
      }
    }
  }
`;

/** A single query touching every nested relation of the card. */
const FULL_CARD_QUERY = `
  query FullCard {
    profile {
      name
      description
      links { label }
      skills { name }
      experiences { company achievements }
      projects { name technologies { name } }
    }
  }
`;

describe('profile query (e2e)', () => {
  let app: NestExpressApplication;
  let server: Server;
  let prisma: PrismaService;

  beforeAll(async () => {
    ensureMigrations();
    await resetDatabase();
    app = await createTestApp();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the seeded card with every nested relation resolved', async () => {
    const response = await graphql(server, CARD_QUERY);

    expect(response.body.errors).toBeUndefined();

    const profile = response.body.data.profile;

    expect(profile.name).toBe(PORTFOLIO_FIXTURE.profile.name);
    expect(profile.links.map((link: { label: string }) => link.label)).toEqual(
      PORTFOLIO_FIXTURE.links.map((link) => link.label),
    );
    expect(profile.skills.map((skill: { name: string }) => skill.name)).toEqual(
      PORTFOLIO_FIXTURE.skills.map((skill) => skill.name),
    );
    expect(profile.experiences.map((job: { company: string }) => job.company)).toEqual(
      PORTFOLIO_FIXTURE.experiences.map((job) => job.company),
    );
    expect(profile.experiences[0].endDate).toBeNull();
    expect(profile.experiences[0].achievements).toEqual(
      PORTFOLIO_FIXTURE.experiences[0].achievements,
    );

    expect(profile.projects.map((project: { name: string }) => project.name)).toEqual(
      PORTFOLIO_FIXTURE.projects.map((project) => project.name),
    );

    profile.projects.forEach(
      (project: { technologies: Array<{ name: string }> }, index: number) => {
        expect(project.technologies.map((technology) => technology.name).sort()).toEqual(
          [...PORTFOLIO_FIXTURE.projects[index].technologies].sort(),
        );
      },
    );
  });

  it('loads only the fields the document selects', async () => {
    const response = await graphql(server, '{ profile { name } }');

    expect(response.body).toEqual({
      data: { profile: { name: PORTFOLIO_FIXTURE.profile.name } },
    });
  });

  it('keeps the number of SQL statements flat while rows are added', async () => {
    let statements = 0;
    prisma.$on('query', () => {
      statements += 1;
    });

    const measure = async (): Promise<number> => {
      statements = 0;
      await graphql(server, FULL_CARD_QUERY);
      return statements;
    };

    const baseline = await measure();

    expect(baseline).toBeGreaterThan(0);
    // One statement per relation plus three for the m2m batch — never one per row.
    expect(baseline).toBeLessThanOrEqual(10);

    const profile = await prisma.profile.findFirstOrThrow();
    const skill = await prisma.skill.findFirstOrThrow();

    for (let index = 0; index < 5; index += 1) {
      await prisma.project.create({
        data: {
          profileId: profile.id,
          name: `Extra project ${index}`,
          technologies: { connect: { id: skill.id } },
        },
      });
    }

    expect(await measure()).toBe(baseline);

    const response = await graphql(server, CARD_QUERY);
    expect(response.body.data.profile.projects).toHaveLength(PORTFOLIO_FIXTURE.projects.length + 5);
  });
});
