import { prisma } from './prisma';
import axios from 'axios';

// Cache in-memory for 5 minutes
let cachedBalance: number | null = null;
let lastFetched: number = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getSmsBalance() {
  const now = Date.now();
  if (cachedBalance !== null && (now - lastFetched < CACHE_TTL)) {
    return cachedBalance;
  }

  try {
    const settings = await prisma.systemSetting.findMany();
    const find = (key: string) => settings.find(s => s.key === key)?.value;

    const provider = find('sms_provider');

    if (provider === 'advanta') {
      const apiKey = find('advanta_api_key');
      const partnerId = find('advanta_partner_id');
      if (apiKey && partnerId) {
        // Advanta balance fetch
        const res = await axios.post('https://quicksms.advantasms.com/api/services/getbalance', {
          apikey: apiKey,
          partnerID: partnerId
        });
        if (res.data?.['response-code'] === 200) {
          cachedBalance = parseFloat(res.data.credit || '0');
          lastFetched = now;
          return cachedBalance;
        }
      }
    } else if (provider === 'onfon') {
      const apiKey = find('onfon_api_key');
      const clientId = find('onfon_client_id');
      const accessKey = find('onfon_access_key');
      if (apiKey && clientId && accessKey) {
        // Onfon balance fetch
        const res = await axios.get('https://api.onfonmedia.co.ke/v1/sms/Balance', {
          params: { ApiKey: apiKey, ClientId: clientId },
          headers: { 'AccessKey': accessKey }
        });
        if (res.data?.ErrorCode === 0 && res.data.Data?.[0]) {
          const creditStr = res.data.Data[0].Credits || '0';
          cachedBalance = parseFloat(creditStr.replace(/[^0-9.]/g, ''));
          lastFetched = now;
          return cachedBalance;
        }
      }
    }
    
    // Fallback if not configured
    return 0;

  } catch (error) {
    console.error('Fetch SMS Balance Error:', error);
    return cachedBalance ?? 0;
  }
}
