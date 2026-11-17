import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createApplication } from './bootstrap';

const REWRITTEN_FUNCTION_PATHS = new Set(['/api', '/api/']);
const ORIGINAL_PATH_HEADERS = ['x-forwarded-uri', 'x-original-uri', 'x-vercel-original-path'];

/**
 * Vercel Function entry point.
 *
 * A serverless invocation has no `listen()` phase, so the Nest application is
 * initialised lazily and then cached: warm invocations reuse the same Prisma
 * connection pool, GraphQL schema and DataLoader factory instead of booting again.
 *
 * The route rewrites in vercel.json send `/graphql`, `/health` and `/admin` here.
 * The public card stays in `public/` and is served by Vercel's CDN.
 *
 * Developer tools stay off unless the project explicitly opts in. A visitor must not
 * get Apollo Sandbox or schema introspection just because NODE_ENV was left unset.
 */
process.env.GRAPHQL_SANDBOX ??= 'false';
process.env.GRAPHQL_INTROSPECTION ??= 'false';
let serverPromise: Promise<RequestListener> | undefined;

// The Vercel build already applies migrations and seeds the database, so there is no
// reason to repeat that work on every cold start. Set SEED_ON_BOOT=true in the Vercel
// project to opt back in (for example when migrations/seed are skipped in the build).
process.env.SEED_ON_BOOT ??= 'false';

function headerValue(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  const first = Array.isArray(value) ? value[0] : value;

  return first?.trim() || undefined;
}

/**
 * vercel.json rewrites choose this function. Some runtimes then report the destination
 * (`/api`) as the URL, which would miss the Nest routes. Prefer the original path.
 */
function restoreIncomingPath(request: IncomingMessage): void {
  const current = request.url ?? '/';
  const pathname = current.split('?')[0];

  if (!REWRITTEN_FUNCTION_PATHS.has(pathname)) {
    return;
  }

  for (const name of ORIGINAL_PATH_HEADERS) {
    const value = headerValue(request, name);

    if (!value || value.startsWith('/api')) {
      continue;
    }

    request.url = value.startsWith('http') ? new URL(value).pathname + new URL(value).search : value;
    return;
  }
}

async function createServer(): Promise<RequestListener> {
  const app: NestExpressApplication = await createApplication({
    servePublic: false,
    serveAdmin: true,
  });
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
  restoreIncomingPath(request);
  const server = await getServer();
  server(request, response);
}
