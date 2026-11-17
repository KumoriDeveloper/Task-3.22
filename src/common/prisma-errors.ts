import { Prisma } from '@prisma/client';

/** P2002 — unique constraint violation, translated into 409 by the services. */
export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
