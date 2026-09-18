import { afterEach, describe, expect, it, vi } from 'vitest';
import { proxyApiRequest } from './api-proxy';

describe('API proxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a diagnostic JSON error when the backend cannot be reached', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('fetch failed'); });
    const response = await proxyApiRequest(new Request('http://localhost/api/resume'), 'http://backend:8000');
    expect(response.status).toBe(502);
    expect((await response.json()).detail).toContain('BACKEND_PROXY_URL');
  });

  it('returns the backend response stream without consuming it', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('first'));
        controller.enqueue(encoder.encode('second'));
        controller.close();
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(stream, { headers: { 'content-type': 'text/event-stream' } }),
      ),
    );

    const response = await proxyApiRequest(
      new Request('http://localhost/api/ai/chat'),
      'http://backend:8000',
    );
    const reader = response.body!.getReader();

    expect(new TextDecoder().decode((await reader.read()).value)).toBe('first');
    expect(new TextDecoder().decode((await reader.read()).value)).toBe('second');
  });

  it('forwards request bodies with Node streaming enabled', async () => {
    let capturedInit: (RequestInit & { duplex?: string }) | undefined;
    vi.stubGlobal('fetch', async (_url: URL, init: RequestInit & { duplex?: string }) => {
      capturedInit = init;
      return new Response(null, { status: 204 });
    });

    await proxyApiRequest(
      new Request('http://localhost/api/resume', {
        method: 'POST',
        body: '{"title":"test"}',
        headers: { 'content-type': 'application/json' },
      }),
      'http://backend:8000',
    );

    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.body).toBeInstanceOf(ReadableStream);
    expect(capturedInit?.duplex).toBe('half');
  });

  it('preserves mutable response headers and streaming', async () => {
    const backendHeaders = new Headers();
    backendHeaders.append('set-cookie', 'preference=compact; Path=/; SameSite=Lax');
    backendHeaders.append('set-cookie', 'old_cookie=; Max-Age=0; Path=/');
    backendHeaders.set('content-length', '1234');
    backendHeaders.set('content-encoding', 'gzip');
    const upstream = new Response('{"user":{}}', { headers: backendHeaders });
    vi.stubGlobal('fetch', async () => upstream);
    const response = await proxyApiRequest(new Request('http://localhost/api/resume'), 'http://backend:8000');
    expect(response).not.toBe(upstream);
    expect(response.body).toBe(upstream.body);
    expect(response.headers.getSetCookie()).toEqual(backendHeaders.getSetCookie());
    expect(() => response.headers.append('set-cookie', 'next_cookie=value')).not.toThrow();
    expect(response.headers.has('content-length')).toBe(false);
    expect(response.headers.has('content-encoding')).toBe(false);
  });
});
