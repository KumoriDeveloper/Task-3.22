import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Plain HTTP endpoint used by Docker/orchestrator health checks. GraphQL is not a good
 * target for liveness probes: it is POST-only and shares the schema with business data.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: string; database: string; uptimeSeconds: number }> {
    const databaseUp = await this.prisma.isHealthy();

    if (!databaseUp) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        database: 'down',
        uptimeSeconds: Math.round(process.uptime()),
      });
    }

    return {
      status: 'ok',
      database: 'up',
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
