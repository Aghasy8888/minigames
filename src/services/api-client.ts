export const API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com';

export const NETWORK_ERROR_STATUS = 0;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type ApiListResponse<TData, TMeta = never> = {
  data: TData;
  meta?: TMeta;
};

export type RequestQueryValue = string | number | boolean | undefined;

export type RequestOptions = {
  query?: Record<string, RequestQueryValue>;
  signal?: AbortSignal;
};

const NETWORK_ERROR_MESSAGE = 'Could not reach the server. Check your connection and try again.';
const UNEXPECTED_RESPONSE_MESSAGE = 'Unexpected server response. Try again.';
const FALLBACK_ERROR_MESSAGE = 'Something went wrong. Try again.';

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorMessage(body: unknown): string | undefined {
  if (!isRecord(body) || typeof body.error !== 'string') {
    return undefined;
  }

  const message = body.error.trim();
  return message === '' ? undefined : message;
}

function buildQueryString(query: Record<string, RequestQueryValue> | undefined): string {
  if (!query) {
    return '';
  }

  const searchParameters = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    searchParameters.set(key, String(value));
  }

  const serialized = searchParameters.toString();
  return serialized === '' ? '' : `?${serialized}`;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, response.status);
  }
}

export async function request<TData, TMeta = never>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiListResponse<TData, TMeta>> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQueryString(options.query)}`, {
      signal: options.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new ApiError(NETWORK_ERROR_MESSAGE, NETWORK_ERROR_STATUS);
  }

  const body = await parseJson(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(body) ?? FALLBACK_ERROR_MESSAGE, response.status);
  }

  if (!isRecord(body) || !('data' in body)) {
    throw new ApiError(UNEXPECTED_RESPONSE_MESSAGE, response.status);
  }

  return {
    data: body.data as TData,
    meta: 'meta' in body ? (body.meta as TMeta) : undefined,
  };
}
