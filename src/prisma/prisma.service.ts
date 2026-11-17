import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Typing the client with `log` as a plain list keeps `$on('query')` available, so the
 * e2e test can count SQL statements without reaching into Prisma internals.
 */
type PrismaLogOptions = { log: Prisma.LogDefinition[] };

/**
 * A serverless instance must not open a pool sized for a long-running server.
 * The caller's URL wins when it already names a limit (Neon and Supabase poolers).
 */
function serverlessDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;

  if (!url || process.env.VERCEL !== '1' || /[?&]connection_limit=/.test(url)) {
    return undefined;
  }

  return `${url}${url.includes('?') ? '&' : '?'}connection_limit=1`;
}

@Injectable()
export class PrismaService
  extends PrismaClient<PrismaLogOptions>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const databaseUrl = serverlessDatabaseUrl();

    super({
      ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'query' },
      ],
    });

    // One logging channel: Prisma events go through the Nest logger, so `logger: false`
    // in tests silences the database too.
    this.$on('warn', (event) => this.logger.warn(event.message));
    this.$on('error', (event) => this.logger.error(event.message));

    // Query events are always available for tests; printing them is opt-in.
    if (process.env.PRISMA_LOG_QUERIES === 'true') {
      this.$on('query', (event) => this.logger.debug(event.query));
    }
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
