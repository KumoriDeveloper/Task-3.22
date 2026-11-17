/**
 * Minimal GraphQL client shared by the card and the admin panel.
 *
 * The API always answers with a GraphQL payload; HTTP status alone is not enough
 * because GraphQL errors are usually returned with 200. The helper therefore turns
 * `errors[0]` into a typed exception with `code` and `status`, which lets the admin
 * panel detect an expired session without parsing message strings.
 */

export class GraphqlError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.name = 'GraphqlError';
    this.code = code;
    this.status = status;
  }
}

export async function graphqlRequest(query, variables = {}, { token, endpoint = '/graphql' } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new GraphqlError('Не удалось связаться с API. Проверьте подключение к сети.');
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.errors?.length) {
    const apiError = payload?.errors?.[0];

    throw new GraphqlError(apiError?.message ?? `Запрос не выполнен (HTTP ${response.status})`, {
      code: apiError?.extensions?.code,
      status: response.status,
    });
  }

  return payload.data;
}
