import { useEffect } from 'react';
import { Linking } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { handleNotificationNavigation } from '../services/notificationNavigation';

function parseChatUrl(urlString: string | null) {
  if (!urlString) return null;
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'elaba:' || url.hostname !== 'chat') {
      return null;
    }

    return {
      sender_type: url.searchParams.get('sender_type') ?? undefined,
      sender_id: url.searchParams.get('sender_id') ?? undefined,
      sender_name: url.searchParams.get('sender_name') ?? undefined,
      receiver_type: url.searchParams.get('receiver_type') ?? undefined,
      receiver_id: url.searchParams.get('receiver_id') ?? undefined,
      shop_id: url.searchParams.get('shop_id') ?? undefined,
      conversationId: url.searchParams.get('conversationId') ?? undefined,
    };
  } catch (error) {
    console.warn('[FCM] Failed to parse chat deep link:', urlString, error);
    return null;
  }
}

export const useFCMNotificationNavigation = () => {
  useEffect(() => {
    const handleNotificationOpen = (remoteMessage: any) => {
      if (remoteMessage?.data) {
        handleNotificationNavigation(remoteMessage.data as any);
      }
    };

    const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      handleNotificationOpen(remoteMessage);
    });

    const getInitialNotification = async () => {
      const remoteMessage = await messaging().getInitialNotification();
      if (remoteMessage?.data) {
        handleNotificationNavigation(remoteMessage.data as any);
      }
    };

    const handleUrl = (url: string | null) => {
      const data = parseChatUrl(url);
      if (data) {
        handleNotificationNavigation(data as any);
      }
    };

    const onUrlEvent = ({ url }: { url: string }) => handleUrl(url);
    const urlSubscription = Linking.addEventListener('url', onUrlEvent);

    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log('[FCM] foreground message received:', remoteMessage);
    });

    Linking.getInitialURL().then(handleUrl).catch(() => null);
    getInitialNotification();

    return () => {
      unsubscribeOpened();
      unsubscribeForeground();
      urlSubscription?.remove?.();
    };
  }, []);
};
