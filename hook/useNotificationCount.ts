import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import { fetchNotifications, NotificationItem } from '../services/notificationService';
import notifBus from '../services/notificationBus';

export default function useNotificationCount() {
  const [count, setCount] = useState(0);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const id = await AsyncStorage.getItem('customerId');
      setCustomerId(id);
      if (id) {
        try {
          const list = await fetchNotifications(id, 'customer');
          const unread = list.filter((n) => n.is_read === 0).length;
          setCount(unread);
        } catch (e) {
          console.log('[NotifCount] Failed to fetch', e);
        }
      }
    };
    init();

    const onNew = (notif: NotificationItem) => {
      // only increment if it's for this user (backend emits to room already; keep just in case)
      if (customerId && `${notif.account_id}` === `${customerId}`) {
        setCount((c) => c + 1);
      } else {
        setCount((c) => c + 1);
      }
    };
    socketService.onNewNotification(onNew);
    // React to local read events (single and all)
    const offAll = notifBus.on('notifications:allRead', () => setCount(0));
    const offOne = notifBus.on('notifications:readOne', () => setCount((c) => Math.max(0, c - 1)));
    return () => {
      socketService.offNewNotification();
      offAll();
      offOne();
    };
  }, [customerId]);

  const clearCount = () => setCount(0);
  const decrement = (n = 1) => setCount((c) => Math.max(0, c - n));

  return { count, clearCount, decrement };
}
