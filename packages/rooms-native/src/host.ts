// What the host app gives Rooms. The package has no sign-in of its own: the
// XenRooms app (one per company) and the Xenaxio app (its Rooms tab) sign in
// through the platform (step 151 part A) and hand over the company's address
// and the device's token.

export interface RoomsHost {
  /** The company's portal, e.g. `https://acme.xenaxio.com`; the API is under `/api`. */
  origin: string;
  /** The device token of this company (a platform session, `Authorization: Bearer`). */
  token: string;
  /** For tests and the host's own networking. */
  fetch?: typeof fetch;
}

export class RoomsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`rooms_api_${status}_${code}`);
    this.name = 'RoomsApiError';
  }
}

/** A JSON request to the platform API of the host's company. */
export async function roomsApi<T>(host: RoomsHost, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${host.token}`, Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const url = `${host.origin.replace(/\/+$/, '')}/api${path.startsWith('/') ? path : `/${path}`}`;
  const res = await (host.fetch ?? fetch)(url, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers,
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new RoomsApiError(res.status, typeof data?.error === 'string' ? data.error : 'unknown');
  return data as T;
}
