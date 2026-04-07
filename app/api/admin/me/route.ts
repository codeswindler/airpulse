import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_32_chars_long_12345');

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return NextResponse.json({ 
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role
    });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
  }
}
