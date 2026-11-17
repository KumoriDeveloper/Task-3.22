import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createApplication } from './bootstrap';

/**
 * Vercel Function entry point.
 *
 * A serverless invocation has no `listen()` phase, so the Nest application is
 * initialised lazily and then cached: warm invocations reuse the same Prisma
 * connection pool, GraphQL schema and DataLoader factory instead of booting again.
 *
 * The route rewrites in vercel.json send `/graphql` and `/health` here; every other
 * path is served from `public/` by Vercel's CDN.
 */
let serverPromise: Promise<RequestListener> | undefined;

// The Vercel build already applies migrations and seeds the database, so there is no
// reason to repeat that work on every cold start. Set SEED_ON_BOOT=true in the Vercel
// project to opt back in (for example when migrations/seed are skipped in the build).
process.env.SEED_ON_BOOT ??= 'false';

async function createServer(): Promise<RequestListener> {
  const app: NestExpressApplication = await createApplication({ serveStatic: false });
  await app.init();

  new Logger('Serverless').log('Nest application initialised');

  // After init(), Nest has mounted all routes on the underlying Express instance.
  // It is itself a Node request listener, which is exactly what Vercel expects.
  return app.getHttpAdapter().getInstance() as RequestListener;
}

function getServer(): Promise<RequestListener> {
  if (!serverPromise) {
    serverPromise = createServer().catch((error: unknown) => {
      // Do not cache a failed boot: the next invocation gets a fresh attempt.
      serverPromise = undefined;
      throw error;
    });
  }

  return serverPromise;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const server = await getServer();
  server(request, response);
}
