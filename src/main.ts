import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createApplication } from './bootstrap';

async function bootstrap(): Promise<void> {
  const app = await createApplication({ shutdownHooks: true });
  const port = Number(app.get(ConfigService).get<string>('APP_PORT') ?? 3000);

  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`GraphQL API:                  http://localhost:${port}/graphql`);
  logger.log(`Admin panel:                  http://localhost:${port}/admin/`);
  logger.log(`Health check:                 http://localhost:${port}/health`);
}

void bootstrap();
