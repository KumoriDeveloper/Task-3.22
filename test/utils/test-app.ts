import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'node:http';
import request from 'supertest';
import type { Test as SupertestTest } from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

/**
 * Boots the real AppModule with exactly the HTTP configuration used in main.ts,
 * so validation, guards and error formatting are part of what the tests cover.
 */
export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });

  configureApp(app);
  await app.init();

  return app;
}

export function graphql(
  server: Server,
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
): SupertestTest {
  const http = request(server).post('/graphql');

  if (token) {
    http.set('Authorization', `Bearer ${token}`);
  }

  return http.send({ query, variables });
}
