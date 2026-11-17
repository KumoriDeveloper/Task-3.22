'use strict';

/**
 * Vercel build pipeline.
 *
 * 1. generate the Prisma client for the serverless runtime;
 * 2. compile Nest to dist/ (api/index.js requires dist/serverless.js);
 * 3. apply committed migrations to DATABASE_URL;
 * 4. create/update the admin account and seed the card once.
 *
 * Steps 3-4 are skipped when VERCEL_SKIP_DB_SETUP=1, which is useful for preview
 * deployments that share the production database. They can also be run manually with
 * `npm run db:deploy` and `npm run db:seed`.
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

run('npx', ['prisma', 'migrate', 'deploy']);
run('node', ['dist/database/seed.cli.js']);

console.log('\n[vercel] build finished');
