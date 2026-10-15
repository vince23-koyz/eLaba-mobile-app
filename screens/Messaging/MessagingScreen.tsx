import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, Platform, StatusBar, SafeAreaView, useWindowDimensions } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/Navigator';
import useShops from '../../hook/useShops';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../../services/socketService';
import { api, API_ENDPOINTS, API_CONFIG } from '../../config/api';
import { resolveEffectiveUnreadState } from '../../utils/messageReadState';
import useUnreadMessages from '../../hook/useUnreadMessages.ts';

// Basic shop interface
interface Shop {
  shop_id: number;
  name: string;
  address?: string;
  website?: string;
  owner_name?: string;
  operation_hours?: string;
  admin_id?: number;
  logo?: string;
}

// Message interface
interface Message {
  message_text: string;
  created_at: string;
  sender_type: 'customer' | 'admin';
  sender_id: string;
  receiver_type: 'customer' | 'admin';
  receiver_id: string;
  is_read?: number;
  is_unsent?: number | boolean | string;
  unsent_at?: string | null;
}

// Interface for shops with the latest message information
interface ShopWithLastMessage extends Shop {
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageTimestamp?: number; // Add timestamp for proper sorting
  hasUnreadMessages?: boolean; // Track if there are unread messages
  unreadCount?: number; // Count of unread messages
}

const isMessageUnsent = (message: Message) =>
  message.is_unsent === true ||
  message.is_unsent === 1 ||
  message.is_unsent === '1';

export default function MessagingScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 370;
  const isTablet = width >= 768;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>(); 
  const isFocused = useIsFocused(); // Hook to detect when screen is focused
  const [activeFilter, setActiveFilter] = useState('All Chats');
  const [userId, setUserId] = useState<string>('');
  const [userType, setUserType] = useState<'customer' | 'admin'>('customer');
  const [shopsWithMessages, setShopsWithMessages] = useState<ShopWithLastMessage[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopWithLastMessage[]>([]);
  const [lastMessageUpdate, setLastMessageUpdate] = useState<number>(Date.now());
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [clearingShopId, setClearingShopId] = useState<string | null>(null);
  const readStateOverridesRef = useRef<Record<string, { hasUnreadMessages: boolean; unreadCount: number }>>({});
  const { consumeLastReadConversationMarker, clearConversationUnreadState } = useUnreadMessages(userId || '', userType);
  
  // Persisted local overrides to prevent UI flashing unread state
  const persistReadOverrides = async (uid?: string) => {
    try {
      if (!uid) return;
      await AsyncStorage.setItem(`readOverrides_${uid}`, JSON.stringify(readStateOverridesRef.current || {}));
    } catch (err) {
      console.log('Error persisting read overrides:', err);
    }
  };

  const loadReadOverrides = async (uid?: string) => {
    try {
      if (!uid) return;
      const raw = await AsyncStorage.getItem(`readOverrides_${uid}`);
      if (raw) {
        readStateOverridesRef.current = JSON.parse(raw) || {};
      }
    } catch (err) {
      console.log('Error loading read overrides:', err);
    }
  };
  
  const { shops, loading, refresh: refreshShops } = useShops();

  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Get customer ID from AsyncStorage (this is how it's stored in LoginScreen)
        const customerId = await AsyncStorage.getItem('customerId');
        const customerName = await AsyncStorage.getItem('customerName');
        
        if (customerId) {
          setUserId(customerId);
          setUserType('customer');
          console.log('✅ Initialized user:', { customerId, customerName });
          // Load any persisted read overrides so UI won't show unread flashes
          await loadReadOverrides(customerId);
        } else {
          console.log('❌ No customer ID found in AsyncStorage');
          // Default values for testing
          setUserId('1');
          setUserType('customer');
        }
      } catch (error) {
        console.error('Error getting user data:', error);
        // Default values
        setUserId('1');
        setUserType('customer');
      }
    };

    initializeUser();
  }, []);

  // Function to get only shops that have messages with the user
  const getShopsWithMessages = async (customerUserId: string) => {
    if (!customerUserId || shops.length === 0) return;
    setMessagesLoading(true);
    try {
      const shopsWithConversations: ShopWithLastMessage[] = [];
      for (const shop of shops) {
        try {
          const response = await api.get(
            `/messages/conversation/${customerUserId}/${shop.admin_id || '1'}/${shop.shop_id}`,
            { params: { _t: Date.now() } }
          );
          const messages: Message[] = response.data || [];
          if (messages.length > 0) {
            const latestMessage = messages.reduce((latest, message) => {
              const latestIsUnsent = isMessageUnsent(latest);
              const messageIsUnsent = isMessageUnsent(message);
              const latestActivity = new Date(
                latestIsUnsent && latest.unsent_at ? latest.unsent_at : latest.created_at
              ).getTime();
              const messageActivity = new Date(
                messageIsUnsent && message.unsent_at ? message.unsent_at : message.created_at
              ).getTime();

              return messageActivity > latestActivity ? message : latest;
            });
            const unreadForCustomer = messages.filter((msg: Message) => 
              msg.receiver_type === 'customer' &&
              msg.receiver_id?.toString() === customerUserId.toString() &&
              Number(msg.is_read) === 0
            );
            const unreadCount = unreadForCustomer.length;
            const hasUnreadMessages = unreadCount > 0;
            const shopIdKey = shop.shop_id?.toString();
            const override = shopIdKey ? readStateOverridesRef.current[shopIdKey] : undefined;
            const { hasUnreadMessages: effectiveUnreadMessages, unreadCount: effectiveUnreadCount } = resolveEffectiveUnreadState({
              serverHasUnreadMessages: hasUnreadMessages,
              serverUnreadCount: unreadCount,
              override,
            });
            const isLastMessageFromCurrentUser =
              latestMessage.sender_type === 'customer' &&
              latestMessage.sender_id?.toString() === customerUserId.toString();
            const isLastMessageUnsent = isMessageUnsent(latestMessage);
            const previewText = isLastMessageUnsent
              ? (isLastMessageFromCurrentUser
                ? 'You unsent a message'
                : 'Unsent a message')
              : isLastMessageFromCurrentUser
                ? `You: ${latestMessage.message_text}`
                : latestMessage.message_text;

            shopsWithConversations.push({
              ...shop,
              lastMessage: previewText,
              lastMessageTime: formatTime(
                isLastMessageUnsent && latestMessage.unsent_at
                  ? latestMessage.unsent_at
                  : latestMessage.created_at
              ),
              lastMessageTimestamp: new Date(
                isLastMessageUnsent && latestMessage.unsent_at
                  ? latestMessage.unsent_at
                  : latestMessage.created_at
              ).getTime(),
              hasUnreadMessages: effectiveUnreadMessages,
              unreadCount: effectiveUnreadCount,
            });
          }
        } catch (error) {
          console.error(`Error fetching messages for shop ${shop.shop_id}:`, error);
        }
      }
      shopsWithConversations.sort((a, b) => {
        if (!a.lastMessageTimestamp && !b.lastMessageTimestamp) return 0;
        if (!a.lastMessageTimestamp) return 1;
        if (!b.lastMessageTimestamp) return -1;
        return b.lastMessageTimestamp - a.lastMessageTimestamp;
      });
      setShopsWithMessages(shopsWithConversations);
      setFilteredShops(shopsWithConversations);
    } catch (error) {
      console.error('Error fetching shops with messages:', error);
      setShopsWithMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Format time helper function
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Load shops with messages when shops or userId changes
  useEffect(() => {
    if (userId && shops.length > 0) {
      getShopsWithMessages(userId);
    }
  }, [userId, shops]);

  // Update filtered shops when shopsWithMessages or activeFilter changes
  useEffect(() => {
    handleFilterPress(activeFilter);
  }, [shopsWithMessages]);

  // Real-time message updates for customer MessagingScreen
  useEffect(() => {
    if (userId && userType === 'customer') {
      console.log('🔄 [CUSTOMER] Setting up real-time message listener for MessagingScreen');
      
      // Ensure socket connection
      socketService.connect(userId, userType);
      
      // Listen for incoming messages to update conversation list
      const handleNewMessage = (newMessage: any) => {
        console.log('📩 [CUSTOMER] MessagingScreen received new message:', newMessage);
        
        // Check if this message involves current customer
        const isForThisCustomer = (
          (newMessage.sender_id === userId && newMessage.sender_type === 'customer') ||
          (newMessage.receiver_id === userId && newMessage.receiver_type === 'customer')
        );
        
        if (isForThisCustomer) {
          console.log('✅ [CUSTOMER] Message is for this customer, refreshing shop conversations');

          const shopIdKey = newMessage?.shop_id?.toString();
          if (shopIdKey && readStateOverridesRef.current[shopIdKey]) {
            delete readStateOverridesRef.current[shopIdKey];
            // Persist change so UI reflects actual incoming unread state
            void persistReadOverrides(userId);
          }

          // Immediately refresh the shop conversations for instant updates
          if (shops.length > 0) {
            getShopsWithMessages(userId);
          }
          // Also trigger the lastMessageUpdate for any additional logic
          setLastMessageUpdate(Date.now());
        } else {
          console.log('🚫 [CUSTOMER] Message not for this customer, ignoring');
        }
      };
      
      socketService.onReceiveMessage(handleNewMessage);
      const handleMessageUnsent = () => {
        if (shops.length > 0) {
          getShopsWithMessages(userId);
        }
      };
      socketService.onMessageUnsent(handleMessageUnsent);
      
      // Cleanup function
      return () => {
        console.log('🧹 [CUSTOMER] Cleaning up MessagingScreen message listener');
        socketService.offReceiveMessage(handleNewMessage);
        socketService.offMessageUnsent(handleMessageUnsent);
      };
    }
  }, [userId, userType, shops]);

  // Auto-refresh conversations when lastMessageUpdate changes
  useEffect(() => {
    if (userId && shops.length > 0 && lastMessageUpdate > 0) {
      console.log('🔄 [CUSTOMER] Auto-refreshing shop conversations due to new message');
      getShopsWithMessages(userId);
    }
  }, [lastMessageUpdate, userId, shops]);

  // Refresh conversations when screen comes into focus (e.g., returning from Convo screen)
  useEffect(() => {
    if (isFocused && userId && shops.length > 0) {
      console.log('🔄 [CUSTOMER] Screen focused - refreshing conversations to show latest messages');
      const refreshFocusedConversations = async () => {
        const marker = await consumeLastReadConversationMarker();
        const markerShopId = marker?.shopId?.toString();

        if (markerShopId) {
          clearUnreadForShop(markerShopId);
        }

        await getShopsWithMessages(userId);

        if (markerShopId) {
          clearUnreadForShop(markerShopId);
        }

        if (clearingShopId) {
          clearUnreadForShop(clearingShopId);
          setClearingShopId(null);
        }

      };

      void refreshFocusedConversations();
    }
  }, [isFocused, userId, shops, clearingShopId, consumeLastReadConversationMarker]);

  const clearUnreadForShop = (shopId?: string | number | null) => {
    const targetShopId = shopId?.toString();
    if (!targetShopId) return;

    readStateOverridesRef.current = {
      ...readStateOverridesRef.current,
      [targetShopId]: { hasUnreadMessages: false, unreadCount: 0 },
    };

    setShopsWithMessages(prev => prev.map(s => 
      s.shop_id?.toString() === targetShopId ? { ...s, hasUnreadMessages: false, unreadCount: 0 } : s
    ));
    setFilteredShops(prev => {
      if (activeFilter === 'Unread') {
        return prev.filter(s => s.shop_id?.toString() !== targetShopId);
      }
      return prev.map(s => 
        s.shop_id?.toString() === targetShopId ? { ...s, hasUnreadMessages: false, unreadCount: 0 } : s
      );
    });
    // Persist override so subsequent fetches don't flip the state back to unread
    void persistReadOverrides(userId);
  };

  const markConversationAsRead = async (shop: ShopWithLastMessage) => {
    if (!userId || !shop.admin_id || !shop.shop_id) return;

    const shopId = shop.shop_id.toString();
    clearUnreadForShop(shopId);

    try {
      await api.put(API_ENDPOINTS.MESSAGES.MARK_READ, {
        senderId: shop.admin_id.toString(),
        receiverId: userId,
        shopId,
        senderType: 'admin',
        receiverType: 'customer',
      });

      await getShopsWithMessages(userId);
      clearUnreadForShop(shopId);
    } catch (e) {
      console.log('mark-read (list) failed:', (e as any)?.response?.data || (e as any)?.message || e);
    }
  };

  const handleChatPress = async (shop: ShopWithLastMessage) => {
    setClearingShopId(shop.shop_id?.toString() || null);
    clearUnreadForShop(shop.shop_id);

    if (userId && shop.shop_id && shop.admin_id) {
      await clearConversationUnreadState({
        sender_id: shop.admin_id.toString(),
        sender_type: 'admin',
        receiver_id: userId,
        receiver_type: 'customer',
        shop_id: shop.shop_id.toString(),
      });
    }

    await markConversationAsRead(shop);

    // Use shop logo as avatar if available, otherwise use creative icon flag
    const logoUri = shop.logo
      ? (shop.logo.startsWith('http') ? shop.logo : `${API_CONFIG.BASE_ORIGIN}${shop.logo}`)
      : null;
    const avatarSource = logoUri ? { uri: logoUri } : null; // Pass null to trigger creative icon in ConvoScreen
    
    navigation.navigate('Convo', { 
      shopName: shop.name,
      shopId: shop.shop_id.toString(),
      receiverId: shop.admin_id?.toString() || '1', // Default admin ID
      receiverType: 'admin',
      avatar: avatarSource,
      useCreativeIcon: !shop.logo // Flag to use creative icon when no logo
    }); 
  };

  const handleFilterPress = (filter: string) => {
    setActiveFilter(filter);
    
    // Apply filtering logic
    switch (filter) {
      case 'All Chats':
        setFilteredShops(shopsWithMessages);
        break;
      case 'Recent':
        // Show only chats from last 24 hours using timestamp
        const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
        const recentChats = shopsWithMessages.filter(shop => {
          return shop.lastMessageTimestamp && shop.lastMessageTimestamp >= last24Hours;
        });
        setFilteredShops(recentChats);
        break;
      case 'Unread':
        // Show only conversations with unread messages
        const unreadChats = shopsWithMessages.filter(shop => shop.hasUnreadMessages);
        setFilteredShops(unreadChats);
        break;
      default:
        setFilteredShops(shopsWithMessages);
    }
  };

  const renderFilterButton = (title: string, count?: number) => {
    const isActive = activeFilter === title;
    return (
      <TouchableOpacity 
        style={[
          styles.filterButton, 
          isActive ? styles.activeFilterButton : styles.inactiveFilterButton
        ]} 
        onPress={() => handleFilterPress(title)}
        activeOpacity={0.7}
      >
        <View style={styles.filterContent}>
          <Text style={[
            styles.filterText, 
            isActive ? styles.activeFilterText : styles.inactiveFilterText
          ]}>
            {title}
          </Text>
          {count !== undefined && count > 0 && (
            <View style={[
              styles.badge,
              isActive ? styles.activeBadge : styles.inactiveBadge
            ]}>
              <Text style={[
                styles.badgeText,
                isActive ? styles.activeBadgeText : styles.inactiveBadgeText
              ]}>
                {count}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: ShopWithLastMessage }) => (
    <TouchableOpacity 
      style={[styles.chatItem, item.hasUnreadMessages && styles.unreadChatItem]}
      onPress={() => handleChatPress(item)}
    >
      <View style={[styles.avatarContainer, item.hasUnreadMessages && styles.unreadAvatarContainer]}>
        {item.logo ? (
          <Image 
            source={{ uri: item.logo.startsWith('http') ? item.logo : `${API_CONFIG.BASE_ORIGIN}${item.logo}` }} 
            style={styles.avatar} 
          />
        ) : (
          <View style={[styles.minimalAvatarInitials, item.hasUnreadMessages && styles.unreadAvatarInitials]}>
            <Text style={styles.minimalAvatarText}>{item.name?.charAt(0) || '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.chatInfo}>
        <Text style={[styles.name, item.hasUnreadMessages && styles.unreadName]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.lastMessage, item.hasUnreadMessages && styles.unreadLastMessage]} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
      <View style={styles.statusContainer}>
        <Text style={[styles.time, item.hasUnreadMessages && styles.unreadTime]}>{item.lastMessageTime}</Text>
        {item.hasUnreadMessages && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{item.unreadCount && item.unreadCount > 9 ? '9+' : item.unreadCount || 1}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <LinearGradient
        colors={['#91e2d9', '#96bcff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.headerContainer, { elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, paddingHorizontal: isCompact ? 8 : 15, paddingBottom: isCompact ? 4 : 8 }]}
      >
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <View style={[styles.filterContainer, { marginHorizontal: isTablet ? 24 : 16 }]}>
        {renderFilterButton('All Chats')}
        {renderFilterButton('Recent')}
        {renderFilterButton('Unread', shopsWithMessages.filter(s => s.hasUnreadMessages).length)}
      </View>

      <FlatList
        data={messagesLoading ? Array.from({ length: 4 }, (_, i) => ({ shop_id: i + 1, name: '', lastMessage: '', lastMessageTime: '', hasUnreadMessages: false })) : filteredShops}
        keyExtractor={(item) => item.shop_id.toString()}
        renderItem={({ item }) =>
          messagesLoading ? (
            <View style={styles.chatSkeletonContainer}>
              <View style={styles.chatSkeletonAvatar} />
              <View style={styles.chatSkeletonTextGroup}>
                <View style={styles.chatSkeletonLine} />
                <View style={[styles.chatSkeletonLine, styles.chatSkeletonLineShort]} />
              </View>
            </View>
          ) : (
            renderItem({ item: item as ShopWithLastMessage })
          )
        }
        contentContainerStyle={{ padding: isTablet ? 20 : 16 }}
        refreshing={loading || messagesLoading}
        onRefresh={async () => {
          await refreshShops();
          if (userId) await getShopsWithMessages(userId);
        }}
        ListEmptyComponent={
          messagesLoading ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeFilter === 'Recent' ? 'No recent conversations' : 
                 activeFilter === 'Unread' ? 'No unread messages' : 
                 'No conversations yet'}
              </Text>
              <Text style={styles.emptySubText}>
                {activeFilter === 'All Chats' ? 
                  'Start a conversation by visiting a shop and tapping the chat icon' :
                  'Try a different filter or start a new conversation'}
              </Text>
            </View>
          )
        }
      />
  </SafeAreaView>
  );
}

const ANDROID_STATUSBAR = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? ANDROID_STATUSBAR + 6 : 24,
    paddingBottom: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 26,
    height: 26,
    tintColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1, 
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#1ca7ec',
  },
  inactiveFilterButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeFilterText: {
    color: '#ffffff',
  },
  inactiveFilterText: {
    color: '#6c757d',
  },
  badge: {
    marginLeft: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  activeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  inactiveBadge: {
    backgroundColor: '#1ca7ec',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeBadgeText: {
    color: '#ffffff',
  },
  inactiveBadgeText: {
    color: '#ffffff',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    backgroundColor: '#fff',
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  unreadChatItem: {
    backgroundColor: '#f2f9ff',
    borderWidth: 1,
    borderColor: '#cce9ff',
  },
  avatarContainer: {
    width: 38,
    height: 38,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadAvatarContainer: {
    borderWidth: 2,
    borderColor: '#1ca7ec',
    borderRadius: 19,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eee',
  },
  minimalAvatarInitials: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadAvatarInitials: {
    backgroundColor: '#dff4ff',
    borderWidth: 2,
    borderColor: '#1ca7ec',
  },
  minimalAvatarText: {
    fontSize: 16,
    color: '#888',
    fontWeight: 'bold',
  },
  minimalUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1ca7ec',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  chatSkeletonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
    backgroundColor: '#fff',
  },
  chatSkeletonAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e8e8ef',
    marginRight: 10,
  },
  chatSkeletonTextGroup: {
    flex: 1,
    justifyContent: 'center',
  },
  chatSkeletonLine: {
    height: 12,
    backgroundColor: '#e8e8ef',
    borderRadius: 6,
    marginBottom: 8,
  },
  chatSkeletonLineShort: {
    width: '60%',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
    marginBottom: 1,
  },
  unreadName: {
    color: '#0f172a',
    fontWeight: '700',
  },
  lastMessage: {
    fontSize: 13,
    color: '#888',
    marginTop: 0,
  },
  unreadLastMessage: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  time: {
    fontSize: 11,
    color: '#bbb',
    marginBottom: 0,
    textAlign: 'right',
  },
  unreadTime: {
    color: '#1ca7ec',
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 60,
  },
  unreadBadge: {
    backgroundColor: '#1ca7ec',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
});