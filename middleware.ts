import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/callback', '/onboarding'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith('/api/') || pathname.startsWith('/invite/')) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('sb-auth-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
