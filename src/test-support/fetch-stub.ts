import { vi, type Mock } from 'vitest';

export type FetchMock = Mock<typeof fetch>;

export type SentRequest = {
  url: URL;
  method?: string;
  contentType?: string;
  /** Parsed JSON body, or `undefined` when none was sent. */
  body?: unknown;
  signal?: AbortSignal;
};

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function stubFetch(implementation: typeof fetch): FetchMock {
  const fetchMock = vi.fn<typeof fetch>(implementation);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Every call answers with a fresh JSON response (a `Response` body can be read only once). */
export function stubFetchJson(body: unknown, status = 200): FetchMock {
  return stubFetch(() => Promise.resolve(jsonResponse(body, status)));
}

export function sentRequest(fetchMock: FetchMock, index = 0): SentRequest {
  const [input, init = {}] = fetchMock.mock.calls[index] ?? [];
  const { method, headers, body, signal } = init;

  return {
    url: new URL(String(input)),
    method,
    contentType: new Headers(headers).get('Content-Type') ?? undefined,
    body: typeof body === 'string' ? JSON.parse(body) : undefined,
    signal: signal ?? undefined,
  };
}
