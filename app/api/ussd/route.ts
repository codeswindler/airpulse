import { NextRequest } from 'next/server';
import { processUssdRequest } from '@/lib/ussdEngine';

function maskPhoneNumber(phoneNumber: string) {
  if (!phoneNumber) return 'unknown';
  if (phoneNumber.length <= 4) return phoneNumber;
  return `${phoneNumber.slice(0, 3)}***${phoneNumber.slice(-3)}`;
}

function logIncomingUssdRequest(method: 'GET' | 'POST', provider: string, sessionId: string, phoneNumber: string, params: Record<string, unknown>) {
  console.log('[USSD] Incoming request', {
    method,
    provider,
    sessionId: sessionId || 'missing',
    phoneNumber: maskPhoneNumber(phoneNumber),
    paramKeys: Object.keys(params).sort(),
  });
}

function getStringParam(params: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return '';
}

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

    const provider = (process.env.USSD_PROVIDER || 'africastalking').toLowerCase();
    const sessionId = getStringParam(params, ['sessionId', 'session_id', 'SESSIONID', 'SESSION_ID', 'transactionId']);
    const phoneNumber = getStringParam(params, ['phoneNumber', 'MSISDN', 'msisdn', 'mobile']);
    const inputRaw = getStringParam(params, ['text', 'INPUT', 'ussd_string', 'command']);

    logIncomingUssdRequest('POST', provider, sessionId, phoneNumber, params);
    const responseText = await processUssdRequest(sessionId, phoneNumber, inputRaw);
    
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

    const provider = (process.env.USSD_PROVIDER || 'africastalking').toLowerCase();
    const sessionId = getStringParam(params, ['sessionId', 'session_id', 'SESSIONID', 'SESSION_ID', 'transactionId']);
    const phoneNumber = getStringParam(params, ['phoneNumber', 'MSISDN', 'msisdn', 'mobile']);
    const inputRaw = getStringParam(params, ['text', 'INPUT', 'ussd_string', 'command']);

    logIncomingUssdRequest('GET', provider, sessionId, phoneNumber, params);
    const responseText = await processUssdRequest(sessionId, phoneNumber, inputRaw);
    
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
