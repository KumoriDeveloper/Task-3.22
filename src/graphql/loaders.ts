import type { Experience, Project, Skill, SocialLink } from '@prisma/client';
import DataLoader from 'dataloader';
import type { PrismaService } from '../prisma/prisma.service';
import type { GraphqlLoaders } from './context';

/**
 * DataLoaders for the nested relations of the card.
 *
 * Why: with plain field resolvers, `projects { technologies { name } }` would run
 * one SQL query per project. A DataLoader collects every key requested during a
 * single tick of the event loop and issues one `WHERE ... IN (...)` query instead,
 * so the number of queries depends on the shape of the GraphQL document, not on
 * the number of rows. It also gives request-scoped caching: resolving the same
 * profile twice inside one request hits the database once.
 */

/** Buckets the rows of a batched query by their foreign key, preserving the key order. */
function groupByKey<T, K>(rows: T[], keyOf: (row: T) => K, keys: readonly K[]): T[][] {
  const buckets = new Map<K, T[]>(keys.map((key) => [key, []]));

  for (const row of rows) {
    buckets.get(keyOf(row))?.push(row);
  }

  return keys.map((key) => buckets.get(key) ?? []);
}

export function createLoaders(prisma: PrismaService): GraphqlLoaders {
  const linksByProfileId = new DataLoader<string, SocialLink[]>(async (profileIds) => {
    const links = await prisma.socialLink.findMany({
      where: { profileId: { in: [...profileIds] } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return groupByKey(links, (link) => link.profileId, profileIds);
  });

  const skillsByProfileId = new DataLoader<string, Skill[]>(async (profileIds) => {
    const skills = await prisma.skill.findMany({
      where: { profileId: { in: [...profileIds] } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return groupByKey(skills, (skill) => skill.profileId, profileIds);
  });

  const experiencesByProfileId = new DataLoader<string, Experience[]>(async (profileIds) => {
    const experiences = await prisma.experience.findMany({
      where: { profileId: { in: [...profileIds] } },
      orderBy: [{ startDate: 'desc' }, { sortOrder: 'asc' }],
    });

    return groupByKey(experiences, (experience) => experience.profileId, profileIds);
  });

  const projectsByProfileId = new DataLoader<string, Project[]>(async (profileIds) => {
    const projects = await prisma.project.findMany({
      where: { profileId: { in: [...profileIds] } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return groupByKey(projects, (project) => project.profileId, profileIds);
  });

  // Many-to-many: the real N+1 risk, hence an explicit batched query for it.
  const technologiesByProjectId = new DataLoader<string, Skill[]>(async (projectIds) => {
    const projects = await prisma.project.findMany({
      where: { id: { in: [...projectIds] } },
      select: {
        id: true,
        technologies: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      },
    });

    const byProjectId = new Map(projects.map((project) => [project.id, project.technologies]));

    return projectIds.map((id) => byProjectId.get(id) ?? []);
  });

  return {
    linksByProfileId,
    skillsByProfileId,
    experiencesByProfileId,
    projectsByProfileId,
    technologiesByProjectId,
  };
}
