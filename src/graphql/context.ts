import type { Experience, Project, Skill, SocialLink } from '@prisma/client';
import type { Request } from 'express';
import type DataLoader from 'dataloader';

/** Payload of the admin JWT (see AuthService). */
export interface AdminTokenPayload {
  sub: string;
  email: string;
}

export type RequestWithAdmin = Request & { admin?: AdminTokenPayload };

/**
 * Per-request loaders. A new instance is created for every GraphQL request,
 * which gives batching + request-level caching without leaking state between
 * requests (or serving stale rows after a mutation in the same request).
 */
export interface GraphqlLoaders {
  linksByProfileId: DataLoader<string, SocialLink[]>;
  skillsByProfileId: DataLoader<string, Skill[]>;
  experiencesByProfileId: DataLoader<string, Experience[]>;
  projectsByProfileId: DataLoader<string, Project[]>;
  technologiesByProjectId: DataLoader<string, Skill[]>;
}

export interface GraphqlContext {
  req: RequestWithAdmin;
  loaders: GraphqlLoaders;
}
