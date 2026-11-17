export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://portfolio:portfolio@localhost:5433/portfolio?schema=e2e';

export const TEST_ADMIN = {
  email: 'admin@e2e.test',
  password: 'e2e-admin-password',
  name: 'E2E Admin',
} as const;

export const TEST_JWT_SECRET = 'e2e-jwt-secret-value-at-least-16-chars';

/**
 * Environment for the e2e suite. Applied in `setupFiles`, i.e. before any module
 * (and therefore ConfigModule/PrismaClient) is loaded.
 */
export function applyTestEnv(): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.ADMIN_EMAIL = TEST_ADMIN.email;
  process.env.ADMIN_PASSWORD = TEST_ADMIN.password;
  process.env.ADMIN_NAME = TEST_ADMIN.name;
  process.env.SEED_PORTFOLIO = 'true';
  // Emits Prisma query events so the batching test can count SQL statements.
  process.env.PRISMA_LOG_QUERIES = 'true';
}
