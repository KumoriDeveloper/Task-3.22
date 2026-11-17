import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = Number(app.get(ConfigService).get<string>('APP_PORT') ?? 3000);

  configureApp(app);
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`GraphQL API + Apollo Sandbox: http://localhost:${port}/graphql`);
  logger.log(`Admin panel:                  http://localhost:${port}/admin/`);
  logger.log(`Health check:                 http://localhost:${port}/health`);
}

void bootstrap();
