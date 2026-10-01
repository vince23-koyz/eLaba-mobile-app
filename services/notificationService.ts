import { api, API_ENDPOINTS } from '../config/api';

export interface NotificationItem {
  notification_id: number;
  account_type: 'customer' | 'admin';
  account_id: number;
  booking_id: number | null;
  title: string;
  message: string;
  is_read: 0 | 1;
  created_at: string;
  updated_at?: string;
}

export async function updateDeviceToken(params: {
  accountId: number | string;
  accountType: 'customer' | 'admin';
  token: string;
  shopId?: number | string | null;
}) {
  const { accountId, accountType, token, shopId } = params;
  await api.post(API_ENDPOINTS.NOTIFICATIONS.UPDATE_DEVICE_TOKEN, {
    accountId,
    accountType,
    token,
    shopId: shopId ?? null,
  });
}

export async function deactivateDeviceToken(token: string) {
  await api.post(API_ENDPOINTS.NOTIFICATIONS.DEACTIVATE_DEVICE_TOKEN, { token });
}

export async function deleteDeviceToken(token: string) {
  await api.post(API_ENDPOINTS.NOTIFICATIONS.DELETE_DEVICE_TOKEN, { token });
}

export async function fetchNotifications(accountId: number | string, accountType: 'customer' | 'admin') {
  const res = await api.get<NotificationItem[]>(API_ENDPOINTS.NOTIFICATIONS.LIST, {
    params: { accountId, accountType },
  });
  return res.data;
}

export async function markNotificationAsRead(notificationId: number) {
  const res = await api.put(API_ENDPOINTS.NOTIFICATIONS.READ(notificationId));
  return res.data;
}

export async function markAllNotificationsAsRead(accountId: number | string, accountType: 'customer' | 'admin') {
  const res = await api.put(API_ENDPOINTS.NOTIFICATIONS.READ_ALL, { accountId, accountType });
  return res.data;
}
