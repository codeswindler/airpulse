import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './prisma';

const baseUrl = 'https://api.tupay.africa/v1';

let cachedToken = '';
let tokenExpiry = 0;

type AirPulseConfig = {
  apiKey?: string;
  businessName?: string;
  secret?: string;
  uuid?: string;
};

function firstNonEmpty(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return undefined;
}

async function getAirPulseConfig(): Promise<AirPulseConfig> {
  const envConfig: AirPulseConfig = {
    uuid: firstNonEmpty(process.env.AIRPULSE_CONSUMER_UUID, process.env.AIRPULSE_UUID),
    apiKey: firstNonEmpty(process.env.AIRPULSE_API_KEY),
    secret: firstNonEmpty(process.env.AIRPULSE_SIGNING_SECRET, process.env.AIRPULSE_SECRET),
    businessName: firstNonEmpty(process.env.AIRPULSE_BUSINESS_NAME),
  };

  if (envConfig.uuid && envConfig.apiKey && envConfig.secret && envConfig.businessName) {
    return envConfig;
  }

  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: ['airpulse_uuid', 'airpulse_api_key', 'airpulse_secret', 'airpulse_business_name'],
      },
    },
  });

  const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]));

  return {
    uuid: envConfig.uuid ?? firstNonEmpty(settingMap.get('airpulse_uuid')),
    apiKey: envConfig.apiKey ?? firstNonEmpty(settingMap.get('airpulse_api_key')),
    secret: envConfig.secret ?? firstNonEmpty(settingMap.get('airpulse_secret')),
    businessName: envConfig.businessName ?? firstNonEmpty(settingMap.get('airpulse_business_name')),
  };
}

export async function getAirPulseToken(config?: AirPulseConfig) {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const resolvedConfig = config ?? await getAirPulseConfig();
  const uuid = resolvedConfig.uuid;
  const key = resolvedConfig.apiKey;
  if (!uuid || !key) throw new Error('Missing AirPulse Credentials');

  const auth = Buffer.from(`${uuid}:${key}`).toString('base64');

  const res = await axios.post(`${baseUrl}/token`, {}, {
    headers: { Authorization: `Basic ${auth}` }
  });

  cachedToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000; // Buffer of 60s
  return cachedToken;
}

export function clearAirPulseTokenCache() {
  cachedToken = '';
  tokenExpiry = 0;
}

export async function initiateStkPush(payerPhone: string, targetPhone: string, amount: number, transactionId: string) {
  const config = await getAirPulseConfig();
  const token = await getAirPulseToken(config);
  const secret = config.secret;
  if (!secret) throw new Error('Missing signing secret');

  const body = {
    name: config.businessName || 'AirPulse',
    phone: cleanPhone(payerPhone),
    service: 'mpesa',
    idempotencyKey: uuidv4(),
    payables: [
      {
        name: 'Airtime',
        account: cleanPhone(targetPhone),
        currency: 'KES',
        amount: amount
      }
    ]
  };

  const bodyStr = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const signatureData = timestamp + 'POST' + '/v1/pay/accept' + bodyHash;
  const signature = crypto.createHmac('sha256', secret).update(signatureData).digest('hex');

  const res = await axios.post(`${baseUrl}/pay/accept`, bodyStr, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Api-Timestamp': timestamp,
      'X-Api-Signature': signature
    }
  });

  return res.data;
}

export async function buyAirtimeFromBalance(targetPhone: string, amount: number, reference: string) {
  const token = await getAirPulseToken(await getAirPulseConfig());
  
  const body = {
    service: getNetwork(targetPhone),
    account: targetPhone,
    amount,
    currency: 'KES',
    reference,
    idempotencyKey: uuidv4()
  };

  const res = await axios.post(`${baseUrl}/airtime`, body, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return res.data;
}

function cleanPhone(phone: string) {
  // Ensure starts with 254
  let p = phone.trim();
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '254' + p.slice(1);
  return p;
}

function getNetwork(phone: string) {
  // Simple heuristic, real implementation requires HLR lookup or strict prefix mapping
  const p = cleanPhone(phone);
  if (p.match(/^254(70|71|72|79|74|11)/)) return 'safaricom';
  if (p.match(/^254(73|78)/)) return 'airtel';
  if (p.match(/^254(77)/)) return 'telkom';
  return 'safaricom'; // Default
}
