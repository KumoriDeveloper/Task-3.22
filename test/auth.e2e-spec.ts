import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'node:http';
import { ensureMigrations, resetDatabase } from './utils/database';
import { loginAsAdmin } from './utils/auth';
import { TEST_ADMIN } from './utils/env';
import { createTestApp, graphql } from './utils/test-app';

const UNKNOWN_ID = '11111111-1111-4111-8111-111111111111';

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
    }
  }
`;

/** Every admin mutation plus the authenticated `me` query. */
const PROTECTED_OPERATIONS: Array<[string, string]> = [
  ['updateProfile', 'mutation { updateProfile(input: { name: "Hacked" }) { id } }'],
  [
    'createSocialLink',
    'mutation { createSocialLink(input: { label: "x", url: "https://example.com", kind: OTHER }) { id } }',
  ],
  ['deleteSocialLink', `mutation { deleteSocialLink(id: "${UNKNOWN_ID}") }`],
  [
    'createSkill',
    'mutation { createSkill(input: { name: "Hacked", category: BACKEND, level: EXPERT }) { id } }',
  ],
  [
    'updateSkill',
    `mutation { updateSkill(id: "${UNKNOWN_ID}", input: { name: "Hacked" }) { id } }`,
  ],
  ['deleteSkill', `mutation { deleteSkill(id: "${UNKNOWN_ID}") }`],
  [
    'createExperience',
    'mutation { createExperience(input: { company: "x", position: "y", startDate: "2024-01-01T00:00:00.000Z" }) { id } }',
  ],
  [
    'updateExperience',
    `mutation { updateExperience(id: "${UNKNOWN_ID}", input: { company: "x" }) { id } }`,
  ],
  ['deleteExperience', `mutation { deleteExperience(id: "${UNKNOWN_ID}") }`],
  ['createProject', 'mutation { createProject(input: { name: "x" }) { id } }'],
  ['updateProject', `mutation { updateProject(id: "${UNKNOWN_ID}", input: { name: "x" }) { id } }`],
  ['deleteProject', `mutation { deleteProject(id: "${UNKNOWN_ID}") }`],
  ['me', '{ me { email } }'],
];

describe('admin mutation protection (e2e)', () => {
  let app: NestExpressApplication;
  let server: Server;

  beforeAll(async () => {
    ensureMigrations();
    await resetDatabase();
    app = await createTestApp();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(PROTECTED_OPERATIONS)('rejects %s without a token', async (_name, query) => {
    const response = await graphql(server, query);

    expect(response.body.data).toBeNull();
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a malformed token', async () => {
    const response = await graphql(server, PROTECTED_OPERATIONS[0][1], undefined, 'not-a-jwt');

    expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('does not reveal whether an email is registered', async () => {
    const knownEmail = await graphql(server, LOGIN_MUTATION, {
      input: { email: TEST_ADMIN.email, password: 'wrong-password' },
    });
    const unknownEmail = await graphql(server, LOGIN_MUTATION, {
      input: { email: 'nobody@example.com', password: 'wrong-password' },
    });

    expect(knownEmail.body.errors[0].message).toBe(unknownEmail.body.errors[0].message);
    expect(knownEmail.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('accepts mutations with a valid token', async () => {
    const token = await loginAsAdmin(server);

    const me = await graphql(server, '{ me { email } }', undefined, token);
    expect(me.body.data.me.email).toBe(TEST_ADMIN.email);

    const created = await graphql(
      server,
      'mutation { createSkill(input: { name: "Rust", category: BACKEND, level: BEGINNER }) { id } }',
      undefined,
      token,
    );
    expect(created.body.errors).toBeUndefined();

    const card = await graphql(server, '{ profile { skills { name } } }');
    expect(card.body.data.profile.skills.map((skill: { name: string }) => skill.name)).toContain(
      'Rust',
    );

    const removed = await graphql(
      server,
      `mutation { deleteSkill(id: "${created.body.data.createSkill.id}") }`,
      undefined,
      token,
    );
    expect(removed.body.data.deleteSkill).toBe(true);
  });

  it('maps domain and validation errors to stable GraphQL codes', async () => {
    const token = await loginAsAdmin(server);

    const duplicate = await graphql(
      server,
      'mutation { createSkill(input: { name: "TypeScript", category: BACKEND, level: EXPERT }) { id } }',
      undefined,
      token,
    );
    expect(duplicate.body.errors[0].extensions.code).toBe('CONFLICT');

    const missing = await graphql(
      server,
      `mutation { deleteSkill(id: "${UNKNOWN_ID}") }`,
      undefined,
      token,
    );
    expect(missing.body.errors[0].extensions.code).toBe('NOT_FOUND');

    const reversedPeriod = await graphql(
      server,
      'mutation { createExperience(input: { company: "x", position: "y", startDate: "2024-06-01T00:00:00.000Z", endDate: "2024-01-01T00:00:00.000Z" }) { id } }',
      undefined,
      token,
    );
    expect(reversedPeriod.body.errors[0].extensions.code).toBe('BAD_REQUEST');

    const invalidInput = await graphql(
      server,
      `mutation { createSkill(input: { name: "${'x'.repeat(80)}", category: BACKEND, level: EXPERT }) { id } }`,
      undefined,
      token,
    );
    expect(invalidInput.body.errors[0].extensions.code).toBe('BAD_REQUEST');
  });
});
