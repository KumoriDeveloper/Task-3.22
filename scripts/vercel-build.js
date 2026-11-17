'use strict';

/**
 * Vercel build pipeline.
 *
 * 1. generate the Prisma client for the serverless runtime;
 * 2. compile Nest to dist/ (api/index.js requires dist/serverless.js);
 * 3. apply committed migrations;
 * 4. create/update the admin account from ADMIN_EMAIL / ADMIN_PASSWORD and seed once.
 *
 * Migrations and the seed use DIRECT_URL when it is set, otherwise DATABASE_URL.
 * A pooled connection (Neon, Supabase pgbouncer) breaks Prisma transactions, so
 * production should set DIRECT_URL to the non-pooled string. The deployed function
 * still reads DATABASE_URL from the project settings; this script only changes the
 * variable for its own process.
 *
 * Steps 3-4 are skipped when VERCEL_SKIP_DB_SETUP=1, which is useful for preview
 * deployments that share the production database.
 */
const { execFileSync } = require('node:child_process');

function run(command, args) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', env: process.env });
}

run('npx', ['prisma', 'generate']);
run('npm', ['run', 'build']);

if (process.env.VERCEL_SKIP_DB_SETUP === '1') {
  console.log('\n[vercel] VERCEL_SKIP_DB_SETUP=1 — migrations and seed skipped');
  process.exit(0);
}

const runtimeUrl = process.env.DATABASE_URL?.trim();
const directUrl = process.env.DIRECT_URL?.trim() || runtimeUrl;

if (!directUrl) {
  console.error(
    '\n[vercel] DATABASE_URL is required so the build can migrate the database and create the admin account from ADMIN_EMAIL / ADMIN_PASSWORD.',
  );
  process.exit(1);
}

process.env.DATABASE_URL = directUrl;

run('npx', ['prisma', 'migrate', 'deploy']);
run('node', ['dist/database/seed.cli.js']);

console.log('\n[vercel] build finished');
