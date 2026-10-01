import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  private currentUserId: string = '';
  private currentUserType: 'customer' | 'admin' = 'customer';
  private lifecycleHandlersAttached = false;
  private receiveMessageHandlers = new Set<(message: any) => void>();

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(userId: string, userType: 'customer' | 'admin') {
    if (this.socket?.connected && this.currentUserId === userId && this.currentUserType === userType) {
      console.log('🔌 Socket already connected, skipping');
      return;
    }

    this.currentUserId = userId;
    this.currentUserType = userType;

    if (this.socket && this.socket.disconnected) {
      console.log('🔌 Reusing disconnected socket for', { userId, userType });
      this.attachLifecycleHandlers();
      this.socket.connect();
      return;
    }

    if (this.socket) {
      console.log('🔌 Replacing stale socket connection');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.lifecycleHandlersAttached = false;
    }

    console.log('🔌 Connecting to socket...', { userId, userType });
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: false,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });

    this.attachLifecycleHandlers();
  }

  private attachLifecycleHandlers() {
    if (!this.socket || this.lifecycleHandlersAttached) {
      return;
    }

    this.socket.on('connect', () => {
      console.log('🟢 Connected to server:', this.socket?.id);
      this.socket?.emit('join', { userId: this.currentUserId, userType: this.currentUserType });
      console.log('👤 Joined user room:', { userId: this.currentUserId, userType: this.currentUserType });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔴 Disconnected from server:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to server after', attemptNumber, 'attempts');
      this.socket?.emit('join', { userId: this.currentUserId, userType: this.currentUserType });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Attempting to reconnect...', attemptNumber);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });

    this.lifecycleHandlersAttached = true;
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 [CUSTOMER] Disconnecting socket and cleaning up');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      console.log('✅ [CUSTOMER] Socket disconnected and cleaned up');
    }
    this.currentUserId = '';
    this.currentUserType = 'customer';
    this.lifecycleHandlersAttached = false;
  }

  sendMessage(messageData: {
    sender_type: 'customer' | 'admin';
    sender_id: string;
    receiver_type: 'customer' | 'admin';
    receiver_id: string;
    shop_id: string;
    message_text: string;
  }) {
    if (this.socket?.connected) {
      console.log('📤 Emitting message via socket:', messageData);
      this.socket.emit('sendMessage', messageData);
    } else if (this.socket?.disconnected) {
      console.log('⚠️ Socket disconnected, reconnecting before send');
      this.socket.connect();
    } else {
      console.error('❌ Cannot send message - socket not connected');
    }
  }

  onReceiveMessage(callback: (message: any) => void) {
    if (this.socket) {
      console.log('👂 Setting up message listener');
      this.receiveMessageHandlers.add(callback);
      this.socket.on('receiveMessage', (message) => {
        console.log('📩 Socket received message:', message);
        callback(message);
      });
    }
  }

  offReceiveMessage(callback?: (message: any) => void) {
    if (!this.socket) {
      return;
    }

    if (callback) {
      this.receiveMessageHandlers.delete(callback);
      this.socket.off('receiveMessage', callback);
      return;
    }

    this.receiveMessageHandlers.clear();
    this.socket.off('receiveMessage');
  }

  private buildConversationId(shopId: string, senderId: string, senderType: 'customer' | 'admin', receiverId: string) {
    const customerId = senderType === 'customer' ? senderId : receiverId;
    const adminId = senderType === 'admin' ? senderId : receiverId;
    return `shop_${shopId}_customer_${customerId}_admin_${adminId}`;
  }

  joinConversation(shopId: string, senderId: string, senderType: 'customer' | 'admin', receiverId: string, receiverType: 'customer' | 'admin') {
    if (!this.socket) {
      this.connect(senderId, senderType);
      return;
    }

    if (!this.socket.connected) {
      console.log('⚠️ Socket not connected yet, reconnecting before joining conversation');
      this.socket.connect();
      return;
    }

    const conversationId = this.buildConversationId(shopId, senderId, senderType, receiverId);
    this.socket.emit('joinConversation', conversationId);
    console.log(`🔗 Joined conversation: ${conversationId}`);
  }

  leaveConversation(shopId: string, senderId: string, senderType: 'customer' | 'admin', receiverId: string, receiverType: 'customer' | 'admin') {
    if (this.socket?.connected) {
      const conversationId = this.buildConversationId(shopId, senderId, senderType, receiverId);
      this.socket.emit('leaveConversation', conversationId);
      console.log(`👋 Left conversation: ${conversationId}`);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Listen to in-app notification event emitted by backend
  onNewNotification(callback: (notification: any) => void) {
    if (this.socket) {
      console.log('👂 Setting up newNotification listener');
      this.socket.on('newNotification', (notif) => {
        console.log('🔔 Socket received notification:', notif);
        callback(notif);
      });
    }
  }

  offNewNotification() {
    if (this.socket) {
      this.socket.off('newNotification');
    }
  }

  // Booking updates (status/date) for customer
  onBookingUpdated(callback: (payload: { bookingId?: number; booking_id?: number; status?: string; booking_status?: string; booking_date?: string; payment_status?: string; payment_method?: string }) => void) {
    if (this.socket) {
      console.log('👂 Setting up bookingUpdated listener');
      this.socket.on('bookingUpdated', (payload) => {
        console.log('📝 bookingUpdated:', payload);
        callback(payload);
      });
    }
  }

  offBookingUpdated() {
    if (this.socket) {
      this.socket.off('bookingUpdated');
    }
  }

  onRefundUpdated(callback: (payload: { bookingId?: number; booking_id?: number; refundStatus?: string; status?: string }) => void) {
    if (this.socket) {
      console.log('👂 Setting up refundUpdated listener');
      this.socket.on('refundUpdated', callback);
    }
  }

  offRefundUpdated() {
    if (this.socket) {
      this.socket.off('refundUpdated');
    }
  }

  onRescheduleReviewed(callback: (payload: { bookingId?: number; booking_id?: number; status?: 'Approved' | 'Rejected' }) => void) {
    if (this.socket) {
      console.log('👂 Setting up rescheduleReviewed listener');
      this.socket.on('rescheduleReviewed', callback);
    }
  }

  offRescheduleReviewed() {
    if (this.socket) {
      this.socket.off('rescheduleReviewed');
    }
  }

  // Delivery events
  onDeliveryCreated(callback: (payload: any) => void) {
    if (this.socket) {
      this.socket.on('deliveryCreated', (payload) => {
        console.log('📦 deliveryCreated:', payload);
        callback(payload);
      });
    }
  }
  offDeliveryCreated() {
    if (this.socket) {
      this.socket.off('deliveryCreated');
    }
  }
  onDeliveryUpdated(callback: (payload: any) => void) {
    if (this.socket) {
      this.socket.on('deliveryUpdated', (payload) => {
        console.log('📦 deliveryUpdated:', payload);
        callback(payload);
      });
    }
  }
  offDeliveryUpdated() {
    if (this.socket) {
      this.socket.off('deliveryUpdated');
    }
  }
}

export default SocketService.getInstance();
