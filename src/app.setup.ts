import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import { readBooleanEnv } from './config/env.validation';
import { renderSandboxPage } from './graphql/sandbox.page';

export interface ConfigureAppOptions {
  /**
   * The public card lives in `public/` and is what a visitor should see.
   * Vercel serves that directory from its CDN, so the serverless entry turns this off.
   */
  servePublic?: boolean;
  /**
   * The admin UI is not part of `public/`. Both Docker and Vercel serve it from the
   * application, and only at `/admin`, which the card never links to.
   */
  serveAdmin?: boolean;
}

/**
 * HTTP wiring shared by the real bootstrap (main.ts), the Vercel handler
 * (serverless.ts) and the e2e tests, so all runtimes exercise exactly the same
 * validation, static files and Sandbox route.
 */
export function configureApp(
  app: NestExpressApplication,
  { servePublic = true, serveAdmin = true }: ConfigureAppOptions = {},
): void {
  const http = app.getHttpAdapter().getInstance();

  // Express advertises its stack by default; the API does not need to.
  http.disable('x-powered-by');

  http.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('X-Frame-Options', 'DENY');

    const hidden =
      request.path === '/admin' ||
      request.path.startsWith('/admin/') ||
      request.path === '/graphql' ||
      request.path.startsWith('/graphql/');

    if (hidden) {
      response.setHeader('X-Robots-Tag', 'noindex, nofollow');
      response.setHeader('Cache-Control', 'no-store');
    }

    next();
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (servePublic) {
    app.useStaticAssets(join(process.cwd(), 'public'));
  }

  if (serveAdmin) {
    app.useStaticAssets(join(process.cwd(), 'admin-ui'), { prefix: '/admin' });
  }

  // GET /graphql renders Apollo Sandbox only when explicitly enabled (and by default
  // outside production). The public card never advertises the API or the admin panel.
  // POST /graphql stays with Apollo Server.
  const sandboxEnabled = readBooleanEnv('GRAPHQL_SANDBOX', process.env.NODE_ENV !== 'production');

  // Registered before app.init()/listen(), therefore before the GraphQL middleware.
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isSandboxRequest =
      request.method === 'GET' && (request.path === '/graphql' || request.path === '/graphql/');

    if (!isSandboxRequest) {
      next();
      return;
    }

    if (!sandboxEnabled) {
      response.status(404).type('text').send('Not Found');
      return;
    }

    response.type('html').send(renderSandboxPage());
  });
}
