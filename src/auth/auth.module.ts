import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Global on purpose: every admin resolver guards itself with JwtAuthGuard, so the
 * JwtService (and the guard itself) must be resolvable from any module without
 * repeating JwtModule.registerAsync in each of them.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ?? '12h') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  providers: [AuthService, AuthResolver, JwtAuthGuard],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
