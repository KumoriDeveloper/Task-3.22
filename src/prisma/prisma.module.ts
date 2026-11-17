import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Exposes a single PrismaClient instance for the whole process.
 *
 * Prisma manages its own connection pool, so the client must not be
 * instantiated per request.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
