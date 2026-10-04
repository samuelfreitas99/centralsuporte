import { request } from './api';

export interface PushConfig {
  enabled: boolean;
  public_key: string | null;
}

interface SubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const pushService = {
  getConfig: () => request<PushConfig>('/push/config'),
  subscribe: (sub: SubscriptionPayload) =>
    request<void>('/push/subscriptions', { method: 'POST', body: JSON.stringify(sub) }),
  sendTest: () => request<{ sent: number }>('/push/test', { method: 'POST' }),
  unsubscribe: (sub: SubscriptionPayload) =>
    request<void>('/push/unsubscribe', { method: 'POST', body: JSON.stringify(sub) }),
};
