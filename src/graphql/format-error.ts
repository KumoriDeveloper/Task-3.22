import { HttpException } from '@nestjs/common';
import { unwrapResolverError } from '@apollo/server/errors';
import type { GraphQLFormattedError } from 'graphql';

/**
 * Nest maps only 400/401/403/422 to GraphQL error codes, which turns a 404 or a 409
 * into INTERNAL_SERVER_ERROR and makes conflicts indistinguishable from real crashes.
 * This formatter maps the remaining HTTP statuses so clients can branch on `code`.
 */
const HTTP_STATUS_TO_GRAPHQL_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'BAD_USER_INPUT',
  500: 'INTERNAL_SERVER_ERROR',
};

export function formatGraphqlError(
  formattedError: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const original = unwrapResolverError(error);

  if (!(original instanceof HttpException)) {
    return formattedError;
  }

  const status = original.getStatus();

  return {
    ...formattedError,
    extensions: {
      ...formattedError.extensions,
      code: HTTP_STATUS_TO_GRAPHQL_CODE[status] ?? 'INTERNAL_SERVER_ERROR',
      status,
    },
  };
}
