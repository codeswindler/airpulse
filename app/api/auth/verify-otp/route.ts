import { NextRequest, NextResponse } from 'next/server';
import { issueAdminToken } from '@/lib/adminTokens';
import { verifyLoginOtp } from '@/lib/authOtp';

export async function POST(req: NextRequest) {
  try {
    const { challengeToken, otp } = await req.json();

    if (typeof challengeToken !== 'string' || typeof otp !== 'string' || !challengeToken.trim() || !otp.trim()) {
      return NextResponse.json({ error: 'Challenge token and OTP are required' }, { status: 400 });
    }

    const verification = await verifyLoginOtp(challengeToken, otp);
    const admin = verification.admin;

    const token = await issueAdminToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
      businessId: admin.businessId,
      phoneNumber: admin.phoneNumber ?? null,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        businessId: admin.businessId,
        phoneNumber: admin.phoneNumber ?? null,
        business: admin.business,
      },
    });
  } catch (error) {
    console.error('[AUTH] OTP verification failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OTP verification failed' },
      { status: 400 },
    );
  }
}
