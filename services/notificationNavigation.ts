import { navigate } from '../navigation/RootNavigation';

interface NotificationData {
  sender_type?: string;
  sender_id?: string;
  sender_name?: string;
  receiver_type?: string;
  receiver_id?: string;
  shop_id?: string;
  conversationId?: string;
  customerId?: string;
  adminId?: string;
  customerName?: string;
}

export function handleNotificationNavigation(data: NotificationData) {
  const customerId =
    data.customerId ??
    (data.sender_type === 'customer' ? data.sender_id : data.receiver_id);
  const shopId = data.shop_id;
  const adminId =
    data.adminId ??
    (data.receiver_type === 'admin' ? data.receiver_id : data.sender_id);
  const displayName =
    data.customerName ?? data.sender_name ?? 'Chat';

  if (!customerId || !shopId || !adminId) {
    console.warn('[notificationNavigation] Missing params, cannot navigate:', data);
    return;
  }

  navigate('Convo', {
    shopName: displayName,
    shopId: shopId.toString(),
    receiverId:
      data.sender_type === 'admin'
        ? data.sender_id ?? ''
        : data.receiver_id ?? '',
    receiverType: data.sender_type === 'admin' ? 'admin' : 'customer',
    avatar: null,
  });
}
