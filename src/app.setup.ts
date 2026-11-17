import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import { readBooleanEnv } from './config/env.validation';
import { renderSandboxPage } from './graphql/sandbox.page';

export interface ConfigureAppOptions {
  /**
   * Vercel serves `public/` from its CDN and ignores Express static middleware, so the
   * serverless entry point turns this off. Local/Docker runs keep it on.
   */
  serveStatic?: boolean;
}

/**
 * HTTP wiring shared by the real bootstrap (main.ts), the Vercel handler
 * (serverless.ts) and the e2e tests, so all runtimes exercise exactly the same
 * validation, static files and Sandbox route.
 */
export function configureApp(
  app: NestExpressApplication,
  { serveStatic = true }: ConfigureAppOptions = {},
): void {
  // Express advertises its stack by default; the API does not need to.
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (serveStatic) {
    // Static frontends: the public card at "/", the admin panel at "/admin/".
    app.useStaticAssets(join(process.cwd(), 'public'));
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
