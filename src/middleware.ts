import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from './lib/auth/session';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Protect /admin and /api/admin
  if (path.startsWith('/admin') || (path.startsWith('/api/admin') && !path.startsWith('/api/admin/login'))) {
    const token = req.cookies.get('omniflow_admin_session')?.value;
    const isValid = token ? await verifySessionToken(token) : false;

    if (!isValid) {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized: Admin login required' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
