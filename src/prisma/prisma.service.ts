import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // PRISMA_LOG_QUERIES=true prints every SQL statement — handy to verify that
    // nested GraphQL selections are batched instead of causing N+1 queries.
    const log: Prisma.LogLevel[] = ['warn', 'error'];
    if (process.env.PRISMA_LOG_QUERIES === 'true') {
      log.push('query');
    }

    super({ log });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Used by the health endpoint: proves the pool can serve a query, not just open a socket. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.stack : error,
      );
      return false;
    }
  }
}
