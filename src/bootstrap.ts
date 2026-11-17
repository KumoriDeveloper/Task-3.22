import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp, type ConfigureAppOptions } from './app.setup';

export interface ApplicationOptions extends ConfigureAppOptions {
  /**
   * Long-running processes (Docker, `npm start`) need shutdown hooks to close the
   * Prisma pool gracefully. Serverless runtimes freeze the instance instead, so the
   * handler keeps them disabled.
   */
  shutdownHooks?: boolean;
}

/**
 * Creates the Nest application with the HTTP wiring shared by every runtime:
 * the local server (src/main.ts), Vercel Functions (src/serverless.ts) and e2e tests.
 */
export async function createApplication(
  options: ApplicationOptions = {},
): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app, {
    servePublic: options.servePublic,
    serveAdmin: options.serveAdmin,
  });

  if (options.shutdownHooks) {
    app.enableShutdownHooks();
  }

  return app;
}
