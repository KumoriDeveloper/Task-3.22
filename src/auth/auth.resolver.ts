import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminModel } from '../graphql/models/admin.model';
import { AuthPayloadModel } from '../graphql/models/auth-payload.model';
import { LoginInput } from '../graphql/inputs/auth.input';
import type { AdminTokenPayload } from '../graphql/context';
import { AuthService } from './auth.service';
import { CurrentAdmin } from './current-admin.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayloadModel, {
    description: 'Exchanges admin credentials for a JWT access token',
  })
  login(@Args('input', { type: () => LoginInput }) input: LoginInput): Promise<AuthPayloadModel> {
    return this.authService.login(input.email, input.password);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => AdminModel, { description: 'Returns the authenticated admin account' })
  me(@CurrentAdmin() admin: AdminTokenPayload): Promise<AdminModel> {
    return this.authService.me(admin.sub);
  }
}
