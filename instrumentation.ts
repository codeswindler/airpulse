import { startSubscriptionAlertScheduler } from '@/lib/subscriptionAlerts';

let registered = false;

export async function register() {
  if (registered) {
    return;
  }

  registered = true;
  startSubscriptionAlertScheduler();
}
