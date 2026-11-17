import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AdminTokenPayload, GraphqlContext } from '../graphql/context';

/** Injects the authenticated admin payload (populated by JwtAuthGuard). */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminTokenPayload => {
    const request = GqlExecutionContext.create(context).getContext<GraphqlContext>().req;

    if (!request.admin) {
      throw new UnauthorizedException('Authentication required');
    }

    return request.admin;
  },
);
