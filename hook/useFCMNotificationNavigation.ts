import { useEffect } from 'react';
import { Linking } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { handleNotificationNavigation } from '../services/notificationNavigation';
import { navigate } from '../navigation/RootNavigation';

function parseChatUrl(urlString: string | null) {
  if (!urlString) return null;
  try {
    const prefix = 'elaba://chat';
    if (!urlString.startsWith(prefix)) {
      return null;
    }

    const query = urlString.slice(prefix.length).replace(/^\?/, '');
    const params: Record<string, string> = {};
    query.split('&').forEach(pair => {
      if (!pair) return;
      const [rawKey, rawValue = ''] = pair.split('=');
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    });

    return {
      sender_type: params.sender_type,
      sender_id: params.sender_id,
      sender_name: params.sender_name,
      receiver_type: params.receiver_type,
      receiver_id: params.receiver_id,
      shop_id: params.shop_id,
      shop_name: params.shop_name,
      shop_image_url: params.shop_image_url,
      conversationId: params.conversationId,
    };
  } catch (error) {
    console.warn('[FCM] Failed to parse chat deep link:', urlString, error);
    return null;
  }
}

export const useFCMNotificationNavigation = () => {
  useEffect(() => {
    const navigateToNotifications = (data: any) => {
      const bookingId = Number(data.bookingId ?? data.booking_id);
      navigate('Home', {
        screen: 'Notification',
        params: {
          notificationId: data.notificationId ?? data.notification_id,
          bookingId: Number.isFinite(bookingId) ? bookingId : undefined,
        },
      });
    };

    const handleNotificationOpen = (remoteMessage: any) => {
      const data = remoteMessage?.data;
      if (!data) {
        return;
      }

      if (data.isChat === '1' || data.conversationId) {
        handleNotificationNavigation(data);
        return;
      }

      navigateToNotifications(data);
    };

    const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      handleNotificationOpen(remoteMessage);
    });

    const getInitialNotification = async () => {
      const remoteMessage = await messaging().getInitialNotification();
      if (remoteMessage?.data) {
        handleNotificationOpen(remoteMessage);
      }
    };

    const handleUrl = (url: string | null) => {
      if (url?.startsWith('elaba://notifications')) {
        const query = url.slice('elaba://notifications'.length).replace(/^\?/, '');
        const params: Record<string, string> = {};
        query.split('&').forEach(pair => {
          if (!pair) return;
          const [rawKey, rawValue = ''] = pair.split('=');
          params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
        });
        navigateToNotifications(params);
        return;
      }

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
