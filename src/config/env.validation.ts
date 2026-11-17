/**
 * Validates the process environment once, at bootstrap.
 *
 * Failing fast with an explicit message is much friendlier than a runtime
 * "undefined is not a function" deep inside Prisma or the JWT module.
 */
export type AppConfig = Record<string, string>;

const REQUIRED_KEYS = ['DATABASE_URL', 'JWT_SECRET'] as const;

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

  const port = Number(normalized.APP_PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('APP_PORT must be an integer between 1 and 65535');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  return {
    ...normalized,
    APP_PORT: String(port),
    SEED_PORTFOLIO: normalized.SEED_PORTFOLIO ?? 'true',
  };
}
