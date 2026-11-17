import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';

/** Startup data preparation: migrations themselves run in the container entrypoint. */
@Module({
  providers: [SeedService],
})
export class DatabaseModule {}
