import { HttpException } from '@nestjs/common';
import { unwrapResolverError } from '@apollo/server/errors';
import type { GraphQLFormattedError } from 'graphql';

/**
 * Nest maps only 400/401/403/422 to GraphQL error codes, which turns a 404 or a 409
 * into INTERNAL_SERVER_ERROR and makes conflicts indistinguishable from real crashes.
 * This formatter maps the remaining HTTP statuses so clients can branch on `code`.
 *
 * Unexpected failures keep their detail outside production. In production the client
 * receives a generic message: Prisma queries and stack traces are not public content.
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

const CLIENT_SAFE_CODES = new Set([
  'BAD_REQUEST',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'BAD_USER_INPUT',
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
]);

export function formatGraphqlError(
  formattedError: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const original = unwrapResolverError(error);
  const status = original instanceof HttpException ? original.getStatus() : undefined;
  const code =
    status !== undefined
      ? (HTTP_STATUS_TO_GRAPHQL_CODE[status] ?? 'INTERNAL_SERVER_ERROR')
      : String(formattedError.extensions?.code ?? 'INTERNAL_SERVER_ERROR');

  const isProduction = process.env.NODE_ENV === 'production';
  const message =
    isProduction && !CLIENT_SAFE_CODES.has(code) ? 'Internal server error' : formattedError.message;

  return {
    message,
    locations: formattedError.locations,
    path: formattedError.path,
    extensions: {
      code,
      ...(status !== undefined ? { status } : {}),
    },
  };
}
