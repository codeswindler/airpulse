import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendLoginOtp } from '@/lib/authOtp';
import { issueAdminToken } from '@/lib/adminTokens';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const admin = await prisma.admin.findUnique({
      where: { email },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    try {
      const otpChallenge = await sendLoginOtp({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        phoneNumber: admin.phoneNumber ?? null,
        role: admin.role,
        businessId: admin.businessId,
        business: admin.business,
      });

      return NextResponse.json({ 
        success: true, 
        otpRequired: true,
        challengeToken: otpChallenge.challengeToken,
        otpDelivery: otpChallenge.delivery,
        otpExpiresAt: otpChallenge.expiresAt,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          businessId: admin.businessId,
          phoneNumber: admin.phoneNumber ?? null,
          business: admin.business,
        }
      });
    } catch (otpError) {
      const isBootstrapAdmin = admin.role === 'SUPERADMIN' && admin.email === 'admin@airpulse.svc';
      const noDeliveryChannel = otpError instanceof Error
        && otpError.message === 'No OTP delivery channel is configured for this account';

      if (!isBootstrapAdmin || !noDeliveryChannel) {
        throw otpError;
      }

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
        otpRequired: false,
        bootstrapLogin: true,
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
    }

  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
