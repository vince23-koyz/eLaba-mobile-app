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
  shop_name?: string;
  shop_image_url?: string;
}

function getConversationParts(conversationId?: string) {
  const match = conversationId?.match(/^shop_(.+?)_customer_(.+?)_admin_(.+)$/);
  if (!match) return null;

  return {
    shopId: match[1],
    customerId: match[2],
    adminId: match[3],
  };
}

export function handleNotificationNavigation(data: NotificationData) {
  const conversationParts = getConversationParts(data.conversationId);
  const customerId =
    data.customerId ??
    conversationParts?.customerId ??
    (data.sender_type === 'customer' ? data.sender_id : data.receiver_id);
  const shopId = data.shop_id ?? conversationParts?.shopId;
  const adminId =
    data.adminId ??
    conversationParts?.adminId ??
    (data.receiver_type === 'admin' ? data.receiver_id : data.sender_id);
  const displayName =
    data.customerName ?? data.shop_name ?? data.sender_name ?? 'Chat';

  if (!customerId || !shopId || !adminId) {
    console.warn('[notificationNavigation] Missing params, cannot navigate:', data);
    return;
  }

  navigate('Convo', {
    shopName: displayName,
    shopId: shopId.toString(),
    receiverId: adminId.toString(),
    receiverType: 'admin',
    avatar: data.shop_image_url ? { uri: data.shop_image_url } : null,
    useCreativeIcon: !data.shop_image_url,
  });
}
