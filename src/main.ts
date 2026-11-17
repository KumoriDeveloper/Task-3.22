import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { renderSandboxPage } from './graphql/sandbox.page';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = Number(app.get(ConfigService).get<string>('APP_PORT') ?? 3000);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  // Static frontends: the public card at "/", the admin panel at "/admin/".
  app.useStaticAssets(join(process.cwd(), 'public'));

  // GET /graphql renders Apollo Sandbox; POST /graphql stays with Apollo Server.
  // Registered before app.listen(), therefore before the GraphQL middleware.
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isSandboxRequest =
      request.method === 'GET' && (request.path === '/graphql' || request.path === '/graphql/');

    if (!isSandboxRequest) {
      next();
      return;
    }

    response.type('html').send(renderSandboxPage());
  });

  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`GraphQL API + Apollo Sandbox: http://localhost:${port}/graphql`);
  logger.log(`Admin panel:                  http://localhost:${port}/admin/`);
  logger.log(`Health check:                 http://localhost:${port}/health`);
}

void bootstrap();
