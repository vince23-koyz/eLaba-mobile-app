import { useState, useEffect, useRef } from 'react';
import { api, API_CONFIG } from '../config/api';
import socketService from '../services/socketService';

export interface Message {
  id?: number;
  message_id?: number;
  sender_type: 'customer' | 'admin';
  sender_id: string;
  receiver_type: 'customer' | 'admin';
  receiver_id: string;
  shop_id: string;
  message_text: string;
  created_at?: string;
  reply_to_message_id?: number | null;
  reply_to_message_text?: string | null;
  is_unsent?: number | boolean;
  unsent_at?: string | null;
}

export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  avatar: any;
  shop_id: string;
  receiver_id: string;
  receiver_type: 'customer' | 'admin';
}

const useMessaging = (userId: string, userType: 'customer' | 'admin') => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<{
    shopId: string;
    receiverId: string;
    senderId: string;
  } | null>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Connect to socket when hook is initialized
  useEffect(() => {
    if (userId) {
      console.log('🔌 Initializing socket connection for:', { userId, userType });
      socketService.connect(userId, userType);

      // Listen for incoming messages
      socketService.onReceiveMessage((newMessage: Message) => {
        console.log('📩 Received message via socket:', newMessage);
        
        // Filter messages to only show those that belong to the current conversation
        if (currentConversation) {
          const isMessageForCurrentConversation = (
            newMessage.shop_id === currentConversation.shopId &&
            (
              // Message sent by current user
              (newMessage.sender_id === currentConversation.senderId) ||
              // Message received by current user from the current conversation partner
              (newMessage.sender_id === currentConversation.receiverId && 
               (newMessage.receiver_id === currentConversation.senderId || newMessage.receiver_id === userId))
            )
          );

          if (!isMessageForCurrentConversation) {
            console.log('🚫 Message not for current conversation, ignoring:', {
              messageShopId: newMessage.shop_id,
              messageSenderId: newMessage.sender_id,
              messageReceiverId: newMessage.receiver_id,
              currentShopId: currentConversation.shopId,
              currentSenderId: currentConversation.senderId,
              currentReceiverId: currentConversation.receiverId
            });
            return;
          }
        }
        
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(msg => 
            msg.message_text === newMessage.message_text && 
            msg.sender_id === newMessage.sender_id &&
            Math.abs(new Date(msg.created_at || '').getTime() - new Date(newMessage.created_at || '').getTime()) < 1000
          );
          
          if (exists) {
            console.log('🚫 Duplicate message detected, ignoring');
            return prev;
          }
          
          console.log('✅ Adding new message to state');
          return [...prev, newMessage];
        });
      });

      const handleIncomingMessage = (newMessage: Message) => {
        console.log('📩 Received message via socket:', newMessage);
        
        // Filter messages to only show those that belong to the current conversation
        if (currentConversation) {
          const isMessageForCurrentConversation = (
            newMessage.shop_id === currentConversation.shopId &&
            (
              // Message sent by current user
              (newMessage.sender_id === currentConversation.senderId) ||
              // Message received by current user from the current conversation partner
              (newMessage.sender_id === currentConversation.receiverId && 
               (newMessage.receiver_id === currentConversation.senderId || newMessage.receiver_id === userId))
            )
          );

          if (!isMessageForCurrentConversation) {
            console.log('🚫 Message not for current conversation, ignoring:', {
              messageShopId: newMessage.shop_id,
              messageSenderId: newMessage.sender_id,
              messageReceiverId: newMessage.receiver_id,
              currentShopId: currentConversation.shopId,
              currentSenderId: currentConversation.senderId,
              currentReceiverId: currentConversation.receiverId
            });
            return;
          }
        }
        
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(msg => 
            msg.message_text === newMessage.message_text && 
            msg.sender_id === newMessage.sender_id &&
            Math.abs(new Date(msg.created_at || '').getTime() - new Date(newMessage.created_at || '').getTime()) < 1000
          );
          
          if (exists) {
            console.log('🚫 Duplicate message detected, ignoring');
            return prev;
          }
          
          console.log('✅ Adding new message to state');
          return [...prev, newMessage];
        });
      };

      // Listen for incoming messages
      socketService.onReceiveMessage(handleIncomingMessage);
      const handleMessageUnsent = (payload: {
        message_id: number;
        is_unsent: boolean;
        unsent_at?: string;
      }) => {
        setMessages(prev => prev.map(message =>
          (message.id ?? message.message_id)?.toString() === payload.message_id.toString()
            ? { ...message, is_unsent: payload.is_unsent, unsent_at: payload.unsent_at }
            : message
        ));
      };
      socketService.onMessageUnsent(handleMessageUnsent);

      // Cleanup function
      return () => {
        console.log('🧹 Cleaning up socket listeners');
        socketService.offReceiveMessage(handleIncomingMessage);
        socketService.offMessageUnsent(handleMessageUnsent);
        setCurrentConversation(null);
      };

    }
  }, [userId, userType, currentConversation?.shopId, currentConversation?.receiverId, currentConversation?.senderId]);

  // Send message function
  const sendMessage = async (messageData: Omit<Message, 'id' | 'created_at'>) => {
    try {
      console.log('📤 Sending message via socket:', messageData);
      
      // Check if socket is connected
      if (!socketService.isConnected()) {
        console.log('⚠️ Socket not connected, reconnecting...');
        socketService.connect(userId, userType);
        
        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // If still not connected, continue anyway and rely on API
        if (!socketService.isConnected()) {
          console.log('⚠️ Socket still not connected, relying on API only');
        }
      }
      
      // Also save to database via API (this ensures message is always saved)
      console.log('💾 Saving message to database');
      const response = await api.post('/messages', messageData);
      console.log('✅ Message saved to database:', response.status);
      const persistedMessageId = response.data.message_id;

      if (!persistedMessageId) {
        throw new Error('Message was saved without a database message ID.');
      }

      const persistedMessageData = {
        ...messageData,
        message_id: persistedMessageId,
      };

      // Broadcast only after persistence so every client receives the real database ID.
      if (socketService.isConnected()) {
        socketService.sendMessage(persistedMessageData);
      }
      
      // If socket wasn't connected, add message manually to local state
      if (!socketService.isConnected()) {
        console.log('📱 Adding message to local state (socket not connected)');
        const newMessage: Message = {
          ...persistedMessageData,
          id: persistedMessageId,
          created_at: new Date().toISOString(),
        };

        setMessages(prev => [...prev, newMessage]);
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  };

  const unsendMessage = async (message: Message) => {
    const messageId = message.id ?? message.message_id;
    if (!messageId || message.is_unsent) {
      throw new Error('This message cannot be unsent.');
    }

    try {
      const response = await api.put(`/messages/${messageId}/unsend`, {
        sender_id: userId,
        sender_type: userType,
      });
      const unsentMessage = response.data?.message;

      setMessages(prev => prev.map(currentMessage =>
        (currentMessage.id ?? currentMessage.message_id)?.toString() === messageId.toString()
          ? {
              ...currentMessage,
              is_unsent: 1,
              unsent_at: unsentMessage?.unsent_at,
            }
          : currentMessage
      ));

      socketService.sendMessageUnsent({
        message_id: messageId,
        sender_type: userType,
        sender_id: userId,
        receiver_type: message.receiver_type,
        receiver_id: message.receiver_id,
        shop_id: message.shop_id,
        is_unsent: true,
        unsent_at: unsentMessage?.unsent_at,
      });
    } catch (error) {
      console.error('❌ Error unsending message:', error);
      throw error;
    }
  };

  // Load conversation history
  const loadConversation = async (customerId: string, adminId: string, shopId: string) => {
    try {
      setLoading(true);
      
      // Set current conversation context for message filtering
      setCurrentConversation({
        shopId: shopId,
        receiverId: userType === 'customer' ? adminId : customerId,
        senderId: userId
      });
      
      console.log('📡 Loading conversation with API call:', {
        url: `${API_CONFIG.BASE_URL}/messages/conversation/${customerId}/${adminId}/${shopId}`,
        customerId,
        adminId,
        shopId
      });
      
      const response = await api.get(
        `/messages/conversation/${customerId}/${adminId}/${shopId}`
      );
      
      const exactMessages = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      let conversationMessages = exactMessages;
      if (conversationMessages.length === 0) {
        const shopResponse = await api.get(`/messages/shop/${shopId}`);
        const shopMessages = Array.isArray(shopResponse.data)
          ? shopResponse.data
          : Array.isArray(shopResponse.data?.data)
            ? shopResponse.data.data
            : [];
        const customerKey = customerId.toString();
        const adminKey = adminId.toString();
        conversationMessages = shopMessages.filter((message: Message) =>
          message.shop_id?.toString() === shopId.toString() &&
          (
            (message.sender_type === 'customer' &&
              message.sender_id?.toString() === customerKey &&
              message.receiver_type === 'admin' &&
              message.receiver_id?.toString() === adminKey) ||
            (message.sender_type === 'admin' &&
              message.sender_id?.toString() === adminKey &&
              message.receiver_type === 'customer' &&
              message.receiver_id?.toString() === customerKey)
          )
        );
        console.warn('[Messaging] Exact customer conversation was empty; used shop history fallback.', {
          customerId,
          adminId,
          shopId,
          count: conversationMessages.length,
        });
      }

      console.log('📨 Conversation API response:', {
        status: response.status,
        dataLength: conversationMessages.length,
        data: conversationMessages,
      });
      
      setMessages(conversationMessages.map((message: Message) => ({
        ...message,
        id: message.id ?? message.message_id,
        sender_id: message.sender_id?.toString(),
        receiver_id: message.receiver_id?.toString(),
        shop_id: message.shop_id?.toString(),
      })));
      
      // Join the conversation room
      console.log('🏠 Joining conversation room:', { userType, userId, adminId, shopId });
      if (userType === 'customer') {
        socketService.joinConversation(shopId, userId, 'customer', adminId, 'admin');
      } else {
        socketService.joinConversation(shopId, userId, 'admin', customerId, 'customer');
      }
      
      // Verify socket connection after joining
      console.log('🔌 Socket connected after join:', socketService.isConnected());
      
    } catch (error: any) {
      console.error('❌ Error loading conversation:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load conversations list (for messaging screen)
  const loadConversations = async () => {
    try {
      setLoading(true);
      // This would need to be implemented in your backend
      // For now, let's use sample data
      const sampleConversations: Conversation[] = [
        { 
          id: '1', 
          name: 'Denniel Shop', 
          lastMessage: 'Your order is ready for pickup!', 
          time: '09:15', 
          avatar: require('../assets/img/washnfold.png'),
          shop_id: '1',
          receiver_id: '1',
          receiver_type: 'admin'
        },
        { 
          id: '2', 
          name: 'Clean Pro Laundry', 
          lastMessage: 'Thank you for choosing us!', 
          time: '08:42', 
          avatar: require('../assets/img/bhive.png'),
          shop_id: '2',
          receiver_id: '2',
          receiver_type: 'admin'
        },
      ];
      setConversations(sampleConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear messages (when leaving conversation)
  const clearMessages = () => {
    setMessages([]);
    setCurrentConversation(null);
  };

  // Leave conversation room
  const leaveConversation = (customerId: string, adminId: string, shopId: string) => {
    // Clear conversation context when leaving
    setCurrentConversation(null);
    
    if (userType === 'customer') {
      socketService.leaveConversation(shopId, userId, 'customer', adminId, 'admin');
    } else {
      socketService.leaveConversation(shopId, userId, 'admin', customerId, 'customer');
    }
  };

  return {
    messages,
    conversations,
    loading,
    sendMessage,
    unsendMessage,
    loadConversation,
    loadConversations,
    clearMessages,
    leaveConversation,
  };
};

export default useMessaging;
