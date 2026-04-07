import { NextRequest } from 'next/server';
import { processUssdRequest } from '@/lib/ussdEngine';

export async function POST(req: NextRequest) {
  try {
    // Attempt to parse Form Data first, then JSON
    let params: any = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      formData.forEach((value, key) => { params[key] = value; });
    } else if (contentType.includes('application/json')) {
      params = await req.json();
    } else {
      const qs = new URLSearchParams(await req.text());
      qs.forEach((value, key) => { params[key] = value; });
    }

    // Merge with URL search params just in case Moneymaker sends POST with query string
    req.nextUrl.searchParams.forEach((val, key) => { params[key] = val; });

    const sessionId = params.sessionId ?? params.SESSIONID ?? params.SESSION_ID ?? params.transactionId ?? '';
    const phoneNumber = params.phoneNumber ?? params.MSISDN ?? params.msisdn ?? params.mobile ?? '';
    const inputRaw = params.text ?? params.INPUT ?? params.ussd_string ?? params.command ?? '';

    const responseText = await processUssdRequest(sessionId, phoneNumber, inputRaw);

    const provider = (process.env.USSD_PROVIDER || 'africastalking').toLowerCase();
    
    if (provider === 'moneymaker') {
      return new Response(responseText, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
        },
      });
    }

    return new Response(responseText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('USSD POST Error:', error);
    return new Response('END Internal Gateway Error', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}

export async function GET(req: NextRequest) {
  try {
    const params: any = {};
    req.nextUrl.searchParams.forEach((val, key) => { params[key] = val; });

    const sessionId = params.sessionId ?? params.SESSIONID ?? params.SESSION_ID ?? params.transactionId ?? '';
    const phoneNumber = params.phoneNumber ?? params.MSISDN ?? params.msisdn ?? params.mobile ?? '';
    const inputRaw = params.text ?? params.INPUT ?? params.ussd_string ?? params.command ?? '';

    const responseText = await processUssdRequest(sessionId, phoneNumber, inputRaw);

    const provider = (process.env.USSD_PROVIDER || 'africastalking').toLowerCase();
    
    if (provider === 'moneymaker') {
      return new Response(responseText, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
        },
      });
    }

    return new Response(responseText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('USSD GET Error:', error);
    return new Response('END Internal Gateway Error', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
