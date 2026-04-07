import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('admin_session')?.value;

  // 1. Allow access to login, auth APIs, and static assets
  if (
    pathname.startsWith('/login') || 
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/_next') || 
    pathname.includes('.')
  ) {
    if (token && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 2. Protect all other admin routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // 3. Verify JWT
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware JWT Error:', error);
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete('admin_session');
    return res;
  }
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
