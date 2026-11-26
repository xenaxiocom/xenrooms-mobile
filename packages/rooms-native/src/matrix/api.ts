// The chat server's client API, always through the platform's proxy
// (`<company>/api/chat/matrix`) with the company's device token. Ported from the web
// client (xenaxiocom/webmail, lib/xenaxio/chat/api.ts at 491c2a07d): there the session
// cookie authenticates; on a phone each company has its own token (step 151 A), so every
// company gets its own transport. The platform adds the chat token; this code never sees one.
import type { RoomsHost } from '../host';

/** Where the platform proxies the chat server's client API. */
export const CHAT_BASE = '/api/chat/matrix';

export class ChatError extends Error {
  constructor(
    readonly status: number,
    readonly errcode: string,
    message?: string,
  ) {
    super(message ?? errcode);
    this.name = 'ChatError';
  }
}

export interface CallOptions {
  /** Stops the request (the long poll when the company is put away). */
  signal?: AbortSignal;
  /** Raw body (uploads) instead of JSON. */
  raw?: { body: BodyInit; type: string };
}

/** One call to the chat server's client API; `path` starts with /_matrix/. */
export type Transport = <T = Record<string, unknown>>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, opts?: CallOptions) => Promise<T>;

function base(host: RoomsHost): string {
  return `${host.origin.replace(/\/+$/, '')}${CHAT_BASE}`;
}

/** The company's transport: its address and its device token. */
export function createTransport(host: RoomsHost): Transport {
  return async <T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, opts: CallOptions = {}): Promise<T> => {
    let res: Response;
    try {
      res = await (host.fetch ?? fetch)(`${base(host)}${path}`, {
        method,
        signal: opts.signal,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${host.token}`,
          ...(opts.raw ? { 'Content-Type': opts.raw.type || 'application/octet-stream' } : body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(opts.raw ? { body: opts.raw.body } : body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') throw err;
      throw new ChatError(0, 'M_NETWORK');
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new ChatError(res.status, typeof data.errcode === 'string' ? data.errcode : 'M_UNKNOWN', typeof data.error === 'string' ? data.error : undefined);
    return data as T;
  };
}

const enc = encodeURIComponent;

/** "mxc://server/id" → [server, id], or null for anything else. */
export function parseMxc(mxc: string | undefined | null): [string, string] | null {
  const m = /^mxc:\/\/([^/]+)\/([A-Za-z0-9_-]+)$/.exec(mxc ?? '');
  return m ? [m[1] as string, m[2] as string] : null;
}

/**
 * A chat file for an image or a download: the address and the header the phone sends
 * with it (React Native's Image takes `{ uri, headers }`); the platform adds the chat token.
 */
export function mediaSource(
  host: RoomsHost,
  mxc: string | undefined | null,
  opts: { thumbnail?: { width: number; height: number }; filename?: string } = {},
): { uri: string; headers: Record<string, string> } | null {
  const parts = parseMxc(mxc);
  if (!parts) return null;
  const [server, id] = parts;
  const media = `${base(host)}/_matrix/client/v1/media`;
  const uri = opts.thumbnail
    ? `${media}/thumbnail/${enc(server)}/${enc(id)}?width=${opts.thumbnail.width}&height=${opts.thumbnail.height}&method=scale`
    : `${media}/download/${enc(server)}/${enc(id)}${opts.filename ? `/${enc(opts.filename)}` : ''}`;
  return { uri, headers: { Authorization: `Bearer ${host.token}` } };
}

let txnCounter = 0;
/** Transaction id of a message: the chat server ignores a repeat with the same id. */
export function newTxnId(): string {
  txnCounter += 1;
  return `x${Date.now().toString(36)}${txnCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const paths = {
  sync: '/_matrix/client/v3/sync',
  whoami: '/_matrix/client/v3/account/whoami',
  createRoom: '/_matrix/client/v3/createRoom',
  publicRooms: '/_matrix/client/v3/publicRooms',
  search: '/_matrix/client/v3/search',
  userDirectory: '/_matrix/client/v3/user_directory/search',
  join: (room: string) => `/_matrix/client/v3/join/${enc(room)}`,
  alias: (alias: string) => `/_matrix/client/v3/directory/room/${enc(alias)}`,
  leave: (room: string) => `/_matrix/client/v3/rooms/${enc(room)}/leave`,
  invite: (room: string) => `/_matrix/client/v3/rooms/${enc(room)}/invite`,
  send: (room: string, type: string, txn: string) => `/_matrix/client/v3/rooms/${enc(room)}/send/${enc(type)}/${enc(txn)}`,
  redact: (room: string, event: string, txn: string) => `/_matrix/client/v3/rooms/${enc(room)}/redact/${enc(event)}/${enc(txn)}`,
  state: (room: string, type: string, key = '') => `/_matrix/client/v3/rooms/${enc(room)}/state/${enc(type)}/${enc(key)}`,
  messages: (room: string) => `/_matrix/client/v3/rooms/${enc(room)}/messages`,
  members: (room: string) => `/_matrix/client/v3/rooms/${enc(room)}/members`,
  context: (room: string, event: string) => `/_matrix/client/v3/rooms/${enc(room)}/context/${enc(event)}`,
  relations: (room: string, event: string, relType: string) => `/_matrix/client/v1/rooms/${enc(room)}/relations/${enc(event)}/${enc(relType)}`,
  threads: (room: string) => `/_matrix/client/v1/rooms/${enc(room)}/threads`,
  receipt: (room: string, event: string) => `/_matrix/client/v3/rooms/${enc(room)}/receipt/m.read/${enc(event)}`,
  readMarkers: (room: string) => `/_matrix/client/v3/rooms/${enc(room)}/read_markers`,
  typing: (room: string, user: string) => `/_matrix/client/v3/rooms/${enc(room)}/typing/${enc(user)}`,
  presence: (user: string) => `/_matrix/client/v3/presence/${enc(user)}/status`,
  accountData: (user: string, type: string) => `/_matrix/client/v3/user/${enc(user)}/account_data/${enc(type)}`,
  roomAccountData: (user: string, room: string, type: string) => `/_matrix/client/v3/user/${enc(user)}/rooms/${enc(room)}/account_data/${enc(type)}`,
  tag: (user: string, room: string, tag: string) => `/_matrix/client/v3/user/${enc(user)}/rooms/${enc(room)}/tags/${enc(tag)}`,
  pushRules: '/_matrix/client/v3/pushrules/',
  pushRule: (kind: string, id: string) => `/_matrix/client/v3/pushrules/global/${enc(kind)}/${enc(id)}`,
  profile: (user: string) => `/_matrix/client/v3/profile/${enc(user)}`,
};
