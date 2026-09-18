const HOP_BY_HOP_HEADERS = [
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

type StreamingRequestInit = RequestInit & { duplex?: 'half' };

export async function proxyApiRequest(request: Request, backendBaseUrl: string): Promise<Response> {
  const requestUrl = new URL(request.url);
  const backendUrl = new URL(requestUrl.pathname + requestUrl.search, backendBaseUrl);
  const headers = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) headers.delete(header);
  if (!headers.has('x-forwarded-host') && request.headers.has('host')) {
    headers.set('x-forwarded-host', request.headers.get('host')!);
  }
  if (!headers.has('x-forwarded-proto')) {
    headers.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''));
  }

  const init: StreamingRequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  let upstream: Response;
  try {
    upstream = await fetch(backendUrl, init);
  } catch {
    return Response.json(
      { detail: '无法连接后端服务，请确认 API 服务已启动且 BACKEND_PROXY_URL 配置正确。' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  // Next.js adjusts Set-Cookie in Proxy; fetch() response headers are immutable.
  // Rewrap without consuming the stream so AI/SSE responses remain incremental.
  const responseHeaders = new Headers(upstream.headers);
  for (const header of HOP_BY_HOP_HEADERS) responseHeaders.delete(header);
  responseHeaders.delete('content-encoding'); // Node fetch already decompresses the body.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
