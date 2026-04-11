import axios from 'axios';
import { getBusinessIntegrationSnapshot } from './businessIntegrations';

type MpesaConfig = {
  businessShortCode: string;
  callbackUrl: string;
  consumerKey: string;
  consumerSecret: string;
  environment: 'production' | 'sandbox';
  passkey: string;
  partyB: string;
  shortcode: string;
  transactionType: string;
};

type MpesaStkPushResponse = {
  CheckoutRequestID?: string;
  CustomerMessage?: string;
  MerchantRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  errorCode?: string;
  errorMessage?: string;
};

type MpesaCallbackItem = {
  Name?: string;
  Value?: string | number;
};

type MpesaCallbackPayload = {
  Body?: {
    stkCallback?: {
      CallbackMetadata?: {
        Item?: MpesaCallbackItem[];
      };
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
    };
  };
};

type TokenCacheEntry = {
  token: string;
  expiry: number;
};

const tokenCache = new Map<string, TokenCacheEntry>();

function firstNonEmpty(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return undefined;
}

function getCacheKey(businessId?: string | null) {
  return businessId?.trim() || 'global';
}

function getMpesaBaseUrl(environment: MpesaConfig['environment']) {
  return environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

function maskPhone(phone: string) {
  if (phone.length <= 6) {
    return phone;
  }

  return `${phone.slice(0, 3)}***${phone.slice(-3)}`;
}

function maskCode(value: string) {
  if (value.length <= 4) {
    return value;
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function sanitizeAccountReference(reference: string) {
  const normalized = reference.replace(/[^a-zA-Z0-9]/g, '');

  if (!normalized) {
    return 'AirPulse';
  }

  return normalized.slice(0, 12);
}

function sanitizeTransactionDescription(reference: string) {
  const suffix = sanitizeAccountReference(reference).slice(-6);
  return `AIR${suffix}`.slice(0, 13);
}

function createTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  return [
    partMap.get('year'),
    partMap.get('month'),
    partMap.get('day'),
    partMap.get('hour'),
    partMap.get('minute'),
    partMap.get('second'),
  ].join('');
}

function cleanPhone(phone: string) {
  let normalized = phone.trim();

  if (normalized.startsWith('+')) {
    normalized = normalized.slice(1);
  }

  if (normalized.startsWith('0')) {
    normalized = `254${normalized.slice(1)}`;
  }

  if (/^(7|1)\d{8}$/.test(normalized)) {
    normalized = `254${normalized}`;
  }

  return normalized;
}

async function getMpesaConfig(businessId?: string | null): Promise<MpesaConfig> {
  const business = await getBusinessIntegrationSnapshot(businessId);
  const consumerKey = firstNonEmpty(business?.mpesaConsumerKey, process.env.MPESA_CONSUMER_KEY);
  const consumerSecret = firstNonEmpty(business?.mpesaConsumerSecret, process.env.MPESA_CONSUMER_SECRET);
  const passkey = firstNonEmpty(business?.mpesaPasskey, process.env.MPESA_PASSKEY);
  const shortcode = firstNonEmpty(business?.mpesaShortcode, process.env.MPESA_SHORTCODE);
  const businessShortCode = firstNonEmpty(business?.mpesaBusinessShortcode, process.env.MPESA_BUSINESS_SHORTCODE) ?? shortcode;
  const partyB = firstNonEmpty(business?.mpesaPartyB, process.env.MPESA_PARTYB) ?? businessShortCode;
  const appUrl = firstNonEmpty(process.env.APP_URL);
  const callbackUrl = firstNonEmpty(
    business?.mpesaCallbackUrl,
    process.env.MPESA_CALLBACK_URL,
  ) ?? (appUrl ? `${appUrl}/api/mpesa/callback` : undefined);
  const rawEnvironment = firstNonEmpty(business?.mpesaEnvironment, process.env.MPESA_ENV)?.toLowerCase();
  const environment = rawEnvironment === 'sandbox' ? 'sandbox' : 'production';
  const transactionType = firstNonEmpty(business?.mpesaTransactionType, process.env.MPESA_TRANSACTION_TYPE) ?? 'CustomerPayBillOnline';

  if (!consumerKey || !consumerSecret || !passkey || !shortcode || !businessShortCode || !partyB || !callbackUrl) {
    throw new Error('Missing M-Pesa Daraja credentials');
  }

  return {
    businessShortCode,
    callbackUrl,
    consumerKey,
    consumerSecret,
    environment,
    passkey,
    partyB,
    shortcode,
    transactionType,
  };
}

async function getMpesaAccessToken(config: MpesaConfig, options: { bypassCache?: boolean; cacheKey?: string } = {}) {
  const cacheKey = options.cacheKey || 'global';
  const cachedEntry = tokenCache.get(cacheKey);

  if (!options.bypassCache && cachedEntry && Date.now() < cachedEntry.expiry) {
    return cachedEntry.token;
  }

  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
  const baseUrl = getMpesaBaseUrl(config.environment);
  const response = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  const token = response.data.access_token;
  const expiry = Date.now() + Math.max((response.data.expires_in ?? 3600) - 60, 60) * 1000;
  tokenCache.set(cacheKey, { token, expiry });

  return token;
}

export function clearMpesaTokenCache(businessId?: string | null) {
  if (businessId) {
    tokenCache.delete(getCacheKey(businessId));
    return;
  }

  tokenCache.clear();
}

export async function checkMpesaConnection(businessId?: string | null) {
  try {
    const config = await getMpesaConfig(businessId);
    await getMpesaAccessToken(config, { bypassCache: true, cacheKey: getCacheKey(businessId) });
    return true;
  } catch (error) {
    console.warn('[M-PESA] Connection probe failed', error);
    return false;
  }
}

export async function initiateDarajaStkPush(payerPhone: string, amount: number, reference: string, businessId?: string | null) {
  const config = await getMpesaConfig(businessId);
  const token = await getMpesaAccessToken(config, { cacheKey: getCacheKey(businessId) });
  const timestamp = createTimestamp();
  const phoneNumber = cleanPhone(payerPhone);
  const password = Buffer.from(`${config.businessShortCode}${config.passkey}${timestamp}`).toString('base64');
  const baseUrl = getMpesaBaseUrl(config.environment);
  const accountReference = sanitizeAccountReference(reference);
  const transactionDesc = sanitizeTransactionDescription(reference);
  const requestBody = {
    BusinessShortCode: config.businessShortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: config.transactionType,
    Amount: Math.round(amount),
    PartyA: phoneNumber,
    PartyB: config.partyB,
    PhoneNumber: phoneNumber,
    CallBackURL: config.callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };

  console.log('[M-PESA] STK request payload', {
    amount: requestBody.Amount,
    businessShortCode: maskCode(requestBody.BusinessShortCode),
    callbackUrl: requestBody.CallBackURL,
    environment: config.environment,
    partyA: maskPhone(requestBody.PartyA),
    partyB: maskCode(requestBody.PartyB),
    rawReferenceLength: reference.length,
    safeAccountReference: requestBody.AccountReference,
    safeTransactionDesc: requestBody.TransactionDesc,
    transactionType: requestBody.TransactionType,
  });

  const response = await axios.post<MpesaStkPushResponse>(`${baseUrl}/mpesa/stkpush/v1/processrequest`, requestBody, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('[M-PESA] STK request response', {
    checkoutRequestId: response.data.CheckoutRequestID ?? 'missing',
    customerMessage: response.data.CustomerMessage ?? 'missing',
    merchantRequestId: response.data.MerchantRequestID ?? 'missing',
    responseCode: response.data.ResponseCode ?? 'missing',
    responseDescription: response.data.ResponseDescription ?? response.data.errorMessage ?? 'missing',
  });

  return response.data;
}

export function parseMpesaCallback(payload: MpesaCallbackPayload) {
  const callback = payload.Body?.stkCallback;
  const items = callback?.CallbackMetadata?.Item ?? [];
  const metadata = new Map<string, string | number>();

  for (const item of items) {
    if (item.Name) {
      metadata.set(item.Name, item.Value ?? '');
    }
  }

  return {
    amount: metadata.get('Amount'),
    checkoutRequestId: callback?.CheckoutRequestID ?? '',
    merchantRequestId: callback?.MerchantRequestID ?? '',
    mpesaReceiptNumber: metadata.get('MpesaReceiptNumber'),
    phoneNumber: metadata.get('PhoneNumber'),
    resultCode: callback?.ResultCode ?? -1,
    resultDesc: callback?.ResultDesc ?? 'Missing callback result description',
    transactionDate: metadata.get('TransactionDate'),
  };
}
