import { NextRequest, NextResponse } from 'next/server';
import { proxyApiRequest } from '@/lib/api-proxy';

const backendProxyUrl = process.env.BACKEND_PROXY_URL ?? 'http://127.0.0.1:8000';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/auth/')) return NextResponse.next();
  if (pathname.startsWith('/api/')) {
    return proxyApiRequest(request, backendProxyUrl);
  }

  // Preserve saved links from the former language-prefixed routes, including query parameters.
  if (/^\/(zh|en)(?=\/|$)/.test(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = pathname.replace(/^\/(zh|en)(?=\/|$)/, '') || '/';
    return NextResponse.redirect(destination);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
