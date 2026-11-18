import { describe, expect, it } from 'vitest';
import { RoomsApiError, roomsApi } from '../src/host';

describe('the host app’s company', () => {
  it('asks the platform API with the device token', async () => {
    const asked: { url: string; init: RequestInit }[] = [];
    const host = {
      origin: 'https://acme.xenaxio.com/',
      token: 'tok-1234567890abcdefghij',
      fetch: (async (url: string, init: RequestInit) => {
        asked.push({ url, init });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }) as unknown as typeof fetch,
    };
    expect(await roomsApi(host, 'chat/rooms')).toEqual({ ok: true });
    await roomsApi(host, '/chat/send', { body: { text: 'Hallo' } });
    expect(asked[0]?.url).toBe('https://acme.xenaxio.com/api/chat/rooms');
    expect(asked[0]?.init).toMatchObject({ method: 'GET', headers: { Authorization: 'Bearer tok-1234567890abcdefghij' } });
    expect(asked[1]?.init).toMatchObject({ method: 'POST', body: '{"text":"Hallo"}', headers: { 'Content-Type': 'application/json' } });
  });

  it('says what the platform refused', async () => {
    const host = { origin: 'https://acme.xenaxio.com', token: 't', fetch: (async () => new Response('{"error":"unauthorized"}', { status: 401 })) as unknown as typeof fetch };
    await expect(roomsApi(host, '/me')).rejects.toEqual(new RoomsApiError(401, 'unauthorized'));
  });
});
