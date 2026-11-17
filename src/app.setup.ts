import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import { renderSandboxPage } from './graphql/sandbox.page';

/**
 * HTTP wiring shared by the real bootstrap (main.ts) and the e2e tests, so the
 * tests exercise exactly the same validation, static files and Sandbox route.
 */
export function configureApp(app: NestExpressApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Static frontends: the public card at "/", the admin panel at "/admin/".
  app.useStaticAssets(join(process.cwd(), 'public'));

  // GET /graphql renders Apollo Sandbox; POST /graphql stays with Apollo Server.
  // Registered before app.init()/listen(), therefore before the GraphQL middleware.
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isSandboxRequest =
      request.method === 'GET' && (request.path === '/graphql' || request.path === '/graphql/');

    if (!isSandboxRequest) {
      next();
      return;
    }

    response.type('html').send(renderSandboxPage());
  });
}
