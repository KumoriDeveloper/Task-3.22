/**
 * Validates the process environment once, at bootstrap.
 *
 * Failing fast with an explicit message is much friendlier than a runtime
 * "undefined is not a function" deep inside Prisma or the JWT module.
 */
export type AppConfig = Record<string, string>;

const REQUIRED_KEYS = ['DATABASE_URL', 'JWT_SECRET'] as const;

/** Reads a boolean env flag. Accepts true/1/yes (case-insensitive). */
export function readBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return value === 'true' || value === '1' || value === 'yes';
}

export function validateEnv(config: Record<string, unknown>): AppConfig {
  const normalized: AppConfig = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      normalized[key] = value;
    }
  }

  const errors: string[] = [];

  for (const key of REQUIRED_KEYS) {
    if (!normalized[key]?.trim()) {
      errors.push(`${key} is required`);
    }
  }

  if (normalized.JWT_SECRET && normalized.JWT_SECRET.length < 16) {
    errors.push('JWT_SECRET must be at least 16 characters long');
  }

  const adminEmail = normalized.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = normalized.ADMIN_PASSWORD;

  if (!adminEmail) {
    errors.push('ADMIN_EMAIL is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    errors.push('ADMIN_EMAIL must be a valid email address');
  }

  if (!adminPassword) {
    errors.push('ADMIN_PASSWORD is required');
  } else if (adminPassword.length < 8) {
    errors.push('ADMIN_PASSWORD must be at least 8 characters long');
  }

  const port = Number(normalized.APP_PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('APP_PORT must be an integer between 1 and 65535');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  const isProduction = normalized.NODE_ENV === 'production';
  const graphqlToolsDefault = isProduction ? 'false' : 'true';

  return {
    ...normalized,
    APP_PORT: String(port),
    ADMIN_EMAIL: adminEmail ?? '',
    ADMIN_PASSWORD: adminPassword ?? '',
    ADMIN_NAME: normalized.ADMIN_NAME?.trim() || 'Portfolio Admin',
    SEED_PORTFOLIO: normalized.SEED_PORTFOLIO ?? 'true',
    GRAPHQL_SANDBOX: normalized.GRAPHQL_SANDBOX ?? graphqlToolsDefault,
    GRAPHQL_INTROSPECTION: normalized.GRAPHQL_INTROSPECTION ?? graphqlToolsDefault,
  };
}
