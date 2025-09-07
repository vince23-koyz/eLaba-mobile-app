import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';

export interface Message {
  id?: number;
  sender_type: 'customer' | 'admin';
  sender_id: string;
  receiver_type: 'customer' | 'admin';
  receiver_id: string;
  shop_id: string;
  message_text: string;
  created_at?: string;
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

      // Cleanup function
      return () => {
        console.log('🧹 Cleaning up socket listeners');
        socketService.offReceiveMessage();
      };
    }
  }, [userId, userType]);

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
      
      // Send via socket for real-time (if connected)
      if (socketService.isConnected()) {
        socketService.sendMessage(messageData);
      }

      // Also save to database via API (this ensures message is always saved)
      console.log('💾 Saving message to database');
      const response = await axios.post('http://10.0.2.2:5000/api/messages', messageData);
      console.log('✅ Message saved to database:', response.status);
      
      // If socket wasn't connected, add message manually to local state
      if (!socketService.isConnected()) {
        console.log('📱 Adding message to local state (socket not connected)');
        const newMessage: Message = {
          ...messageData,
          id: response.data.id || Date.now(),
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, newMessage]);
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  };

  // Load conversation history
  const loadConversation = async (customerId: string, adminId: string, shopId: string) => {
    try {
      setLoading(true);
      console.log('📡 Loading conversation with API call:', {
        url: `http://10.0.2.2:5000/api/messages/conversation/${customerId}/${adminId}/${shopId}`,
        customerId,
        adminId,
        shopId
      });
      
      const response = await axios.get(
        `http://10.0.2.2:5000/api/messages/conversation/${customerId}/${adminId}/${shopId}`
      );
      
      console.log('📨 Conversation API response:', {
        status: response.status,
        dataLength: response.data?.length || 0,
        data: response.data
      });
      
      setMessages(response.data || []);
      
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
  };

  // Leave conversation room
  const leaveConversation = (customerId: string, adminId: string, shopId: string) => {
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
    loadConversation,
    loadConversations,
    clearMessages,
    leaveConversation,
  };
};

export default useMessaging;
