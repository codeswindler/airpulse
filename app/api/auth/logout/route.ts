import { NextRequest, NextResponse } from 'next/server';
import { deleteCookie } from 'cookies-next';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('admin_session');
  return res;
}
