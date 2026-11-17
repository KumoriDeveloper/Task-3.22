import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { ExperiencesModule } from './experiences/experiences.module';
import type { RequestWithAdmin } from './graphql/context';
import { formatGraphqlError } from './graphql/format-error';
import { createLoaders } from './graphql/loaders';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { ProfileModule } from './profile/profile.module';
import { ProjectsModule } from './projects/projects.module';
import { SkillsModule } from './skills/skills.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),

    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [PrismaModule],
      inject: [PrismaService],
      useFactory: (prisma: PrismaService): ApolloDriverConfig => ({
        // Code-first: the schema is generated from decorators at boot, so schema and
        // models cannot drift apart.
        autoSchemaFile: true,
        sortSchema: true,
        introspection: true,
        formatError: formatGraphqlError,
        // Stack traces are a development aid, never part of a public API response.
        includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
        // The playground/landing page is served by main.ts (src/graphql/sandbox.page.ts):
        // the driver's own landing-page plugin would conflict with Apollo Sandbox.
        playground: false,
        // One loader set per request — see src/graphql/loaders.ts.
        context: (context: unknown) => {
          const { req } = context as { req: RequestWithAdmin };
          return { req, loaders: createLoaders(prisma) };
        },
      }),
    }),

    PrismaModule,
    AuthModule,
    ProfileModule,
    SkillsModule,
    ExperiencesModule,
    ProjectsModule,
    DatabaseModule,
    HealthModule,
  ],
})
export class AppModule {}
