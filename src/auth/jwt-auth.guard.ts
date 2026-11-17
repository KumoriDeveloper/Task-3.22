import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import type { AdminTokenPayload, GraphqlContext, RequestWithAdmin } from '../graphql/context';

/**
 * Verifies the "Authorization: Bearer <jwt>" header for GraphQL resolvers and puts
 * the decoded payload on the request, where @CurrentAdmin() reads it from.
 *
 * A custom guard (instead of passport) keeps the dependency surface small: the token
 * format is signed and verified by the same JwtModule configuration, nothing else.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = GqlExecutionContext.create(context).getContext<GraphqlContext>().req;
    const token = extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'Authentication required: send "Authorization: Bearer <token>"',
      );
    }

    try {
      request.admin = await this.jwt.verifyAsync<AdminTokenPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Session is invalid or has expired');
    }
  }
}

function extractBearerToken(request: RequestWithAdmin): string | undefined {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' ? token : undefined;
}
