import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import { Message } from './useMessaging';
import { mergeUnreadMessagesByConversation, removeUnreadMessagesForConversation } from '../utils/unreadConversationState';

const useUnreadMessages = (userId: string, userType: 'customer' | 'admin') => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);

  const storageKey = `unreadMessages_${userId}`;
  const storageDataKey = `unreadMessagesData_${userId}`;

  const saveUnreadState = useCallback(async (messages: Message[], count: number) => {
    try {
      await AsyncStorage.setItem(storageKey, count.toString());
      await AsyncStorage.setItem(storageDataKey, JSON.stringify(messages));
    } catch (error) {
      console.log('Error saving unread state:', error);
    }
  }, [storageKey, storageDataKey]);

  const loadUnreadState = useCallback(async () => {
    try {
      const savedCount = await AsyncStorage.getItem(storageKey);
      const savedMessages = await AsyncStorage.getItem(storageDataKey);

      let parsedMessages: Message[] = [];
      if (savedMessages) {
        try {
          parsedMessages = JSON.parse(savedMessages) as Message[];
        } catch {
          parsedMessages = [];
        }
      }

      const parsedCount = Number.parseInt(savedCount || '0', 10) || 0;
      const hasValidUnreadState = parsedMessages.length > 0 || parsedCount > 0;

      if (!hasValidUnreadState) {
        setUnreadCount(0);
        setUnreadMessages([]);
        await saveUnreadState([], 0);
        return;
      }

      setUnreadCount(parsedMessages.length > 0 ? parsedMessages.length : parsedCount);
      setUnreadMessages(parsedMessages);

      if (parsedMessages.length === 0 && parsedCount > 0) {
        await saveUnreadState([], 0);
        setUnreadCount(0);
      }
    } catch (err) {
      console.log('Error loading unread state:', err);
    }
  }, [saveUnreadState, storageKey, storageDataKey]);

  useEffect(() => {
    if (userId) {
      void loadUnreadState();
    }
  }, [userId, loadUnreadState]);

  useEffect(() => {
    if (!userId) return;

    socketService.connect(userId, userType);

    const handleIncomingMessage = (newMessage: Message) => {
      // Only count messages that are not from the current user
      if (newMessage.sender_id !== userId) {
        setUnreadMessages(prev => {
          const nextUnreadMessages = mergeUnreadMessagesByConversation(prev, newMessage);
          const newCount = nextUnreadMessages.length;

          if (newCount !== prev.length) {
            setUnreadCount(newCount);
            void saveUnreadState(nextUnreadMessages, newCount);
          }

          return nextUnreadMessages;
        });
      }
    };

    socketService.onReceiveMessage(handleIncomingMessage);

    return () => {
      socketService.offReceiveMessage(handleIncomingMessage);
    };
  }, [userId, userType, saveUnreadState]);

  const clearUnreadMessages = useCallback(async () => {
    setUnreadCount(0);
    setUnreadMessages([]);
    await saveUnreadState([], 0);
  }, [saveUnreadState]);

  const markConversationAsRead = useCallback(async (message: Partial<Message>) => {
    let nextUnreadMessages: Message[] = [];

    setUnreadMessages(prev => {
      nextUnreadMessages = removeUnreadMessagesForConversation(prev, message);
      const newCount = nextUnreadMessages.length;
      setUnreadCount(newCount);
      return nextUnreadMessages;
    });

    await saveUnreadState(nextUnreadMessages, nextUnreadMessages.length);
  }, [saveUnreadState]);

  const clearConversationUnreadState = useCallback(async (message: Partial<Message>) => {
    let nextUnreadMessages: Message[] = [];

    setUnreadMessages(prev => {
      nextUnreadMessages = removeUnreadMessagesForConversation(prev, message);
      const newCount = nextUnreadMessages.length;
      setUnreadCount(newCount);
      return nextUnreadMessages;
    });

    await saveUnreadState(nextUnreadMessages, nextUnreadMessages.length);
  }, [saveUnreadState]);

  const consumeLastReadConversationMarker = useCallback(async () => {
    if (!userId) return null;

    const markerKey = `lastReadConversation_${userId}`;
    const markerValue = await AsyncStorage.getItem(markerKey);

    if (!markerValue) return null;

    let parsedMarker: {
      shopId?: string;
      receiverId?: string;
      receiverType?: 'customer' | 'admin';
    } | null = null;

    try {
      const marker = JSON.parse(markerValue) as {
        shopId?: string;
        receiverId?: string;
        receiverType?: 'customer' | 'admin';
      };
      parsedMarker = marker;

      if (marker.shopId && marker.receiverId && marker.receiverType) {
        await clearConversationUnreadState({
          sender_id: marker.receiverId,
          sender_type: marker.receiverType,
          receiver_id: userId,
          receiver_type: userType,
          shop_id: marker.shopId,
        });
      }
    } catch (error) {
      console.log('Error consuming read marker:', error);
    } finally {
      await AsyncStorage.removeItem(markerKey);
    }

    return parsedMarker;
  }, [clearConversationUnreadState, userId, userType]);

  const markMessageAsRead = useCallback(async (messageId: number | string) => {
    let nextUnreadMessages: Message[] = [];

    setUnreadMessages(prev => {
      nextUnreadMessages = prev.filter(msg => msg.id !== messageId);
      const newCount = nextUnreadMessages.length;
      setUnreadCount(newCount);
      return nextUnreadMessages;
    });

    await saveUnreadState(nextUnreadMessages, nextUnreadMessages.length);
  }, [saveUnreadState]);

  return {
    unreadCount,
    unreadMessages,
    clearUnreadMessages,
    refreshUnreadMessages: loadUnreadState,
    markConversationAsRead,
    clearConversationUnreadState,
    consumeLastReadConversationMarker,
    markMessageAsRead,
  };
};

export default useUnreadMessages;
