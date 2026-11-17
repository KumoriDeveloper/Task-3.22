import type { Server } from 'node:http';
import { TEST_ADMIN } from './env';
import { graphql } from './test-app';

const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
    }
  }
`;

export async function loginAsAdmin(
  server: Server,
  password: string = TEST_ADMIN.password,
): Promise<string> {
  const response = await graphql(server, LOGIN_MUTATION, {
    input: { email: TEST_ADMIN.email, password },
  });

  const accessToken: string | undefined = response.body?.data?.login?.accessToken;

  if (!accessToken) {
    throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
  }

  return accessToken;
}
