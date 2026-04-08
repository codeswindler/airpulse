import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/ussd') ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/internal') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  );
}

function unauthorizedResponse(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/login', req.url));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('admin_session')?.value;

  if (isPublicPath(pathname)) {
    if (token && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  }

  if (!token) {
    return unauthorizedResponse(req);
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (error) {
    console.error('Proxy JWT Error:', error);

    const response = unauthorizedResponse(req);
    response.cookies.delete('admin_session');
    return response;
  }
}

export const config = {
  matcher: ['/((?!api/auth|api/ussd|api/webhook|api/internal|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
