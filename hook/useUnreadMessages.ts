import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import { Message } from './useMessaging';

const useUnreadMessages = (userId: string, userType: 'customer' | 'admin') => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);

  // Load unread count from storage
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const savedCount = await AsyncStorage.getItem(`unreadMessages_${userId}`);
        if (savedCount) {
          setUnreadCount(parseInt(savedCount, 10));
        }
      } catch (error) {
        console.log('Error loading unread count:', error);
      }
    };

    if (userId) {
      loadUnreadCount();
    }
  }, [userId]);

  // Save unread count to storage
  const saveUnreadCount = async (count: number) => {
    try {
      await AsyncStorage.setItem(`unreadMessages_${userId}`, count.toString());
    } catch (error) {
      console.log('Error saving unread count:', error);
    }
  };

  // Listen for new messages when not in messaging screen
  useEffect(() => {
    if (!userId) return;

    // Connect to socket
    socketService.connect(userId, userType);

    // Listen for incoming messages
    socketService.onReceiveMessage((newMessage: Message) => {
      console.log('📩 New message received for unread tracking:', newMessage);
      
      // Only count messages that are not from the current user
      if (newMessage.sender_id !== userId) {
        setUnreadMessages(prev => {
          // Check if message already exists
          const exists = prev.some(msg => 
            msg.id === newMessage.id || 
            (msg.message_text === newMessage.message_text && 
             msg.sender_id === newMessage.sender_id &&
             Math.abs(new Date(msg.created_at || '').getTime() - new Date(newMessage.created_at || '').getTime()) < 1000)
          );
          
          if (!exists) {
            const newUnreadMessages = [...prev, newMessage];
            const newCount = newUnreadMessages.length;
            setUnreadCount(newCount);
            saveUnreadCount(newCount);
            return newUnreadMessages;
          }
          
          return prev;
        });
      }
    });

    // Cleanup
    return () => {
      socketService.offReceiveMessage();
    };
  }, [userId, userType]);

  // Clear unread messages
  const clearUnreadMessages = async () => {
    setUnreadCount(0);
    setUnreadMessages([]);
    await saveUnreadCount(0);
  };

  // Mark specific message as read
  const markMessageAsRead = async (messageId: number | string) => {
    setUnreadMessages(prev => {
      const filtered = prev.filter(msg => msg.id !== messageId);
      const newCount = filtered.length;
      setUnreadCount(newCount);
      saveUnreadCount(newCount);
      return filtered;
    });
  };

  return {
    unreadCount,
    unreadMessages,
    clearUnreadMessages,
    markMessageAsRead,
  };
};

export default useUnreadMessages;