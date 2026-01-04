import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  // If the path starts with /meeting/meeting/, redirect to /meeting/
  if (url.pathname.startsWith('/meeting/meeting/')) {
    url.pathname = url.pathname.replace('/meeting/meeting/', '/meeting/');
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/meeting/meeting/:path*'],
};
