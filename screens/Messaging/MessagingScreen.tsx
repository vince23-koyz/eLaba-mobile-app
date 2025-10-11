import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity } from 'react-native'
import React, { useState, useEffect } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/Navigator';
import useShops from '../../hook/useShops';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import socketService from '../../services/socketService';

// Basic shop interface
interface Shop {
  shop_id: number;
  name: string;
  address?: string;
  website?: string;
  owner_name?: string;
  operation_hours?: string;
  admin_id?: number;
  logo?: string; // Add logo property
}

// Message interface
interface Message {
  message_text: string;
  created_at: string;
  sender_type: 'customer' | 'admin';
  sender_id: string;
  receiver_type: 'customer' | 'admin';
  receiver_id: string;
}

// Interface for shops with the latest message information
interface ShopWithLastMessage extends Shop {
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageTimestamp?: number; // Add timestamp for proper sorting
  hasUnreadMessages?: boolean; // Track if there are unread messages
  unreadCount?: number; // Count of unread messages
}

export default function MessagingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>(); 
  const isFocused = useIsFocused(); // Hook to detect when screen is focused
  const [activeFilter, setActiveFilter] = useState('All Chats');
  const [userId, setUserId] = useState<string>('');
  const [userType, setUserType] = useState<'customer' | 'admin'>('customer');
  const [shopsWithMessages, setShopsWithMessages] = useState<ShopWithLastMessage[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopWithLastMessage[]>([]);
  const [lastMessageUpdate, setLastMessageUpdate] = useState<number>(Date.now());
  
  // User profile data state
  const [userData, setUserData] = useState({
    customer_id: '',
    first_name: '',
    last_name: '',
    username: '',
    profile_picture: ''
  });
  
  const { shops, loading, refresh: refreshShops } = useShops();

  // Function to get initials from customer first and last name
  const getInitials = (firstName: string | null, lastName: string | null): string => {
    if (!firstName && !lastName) return 'NN'; // Default to 'NN' for No Name
    
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    
    if (firstInitial && lastInitial) {
      return firstInitial + lastInitial;
    } else if (firstInitial) {
      return firstInitial;
    } else if (lastInitial) {
      return lastInitial;
    }
    
    return 'NN';
  };

  // Fetch user profile data
  const fetchUserData = async () => {
    try {
      const customerId = await AsyncStorage.getItem('customerId');
      
      if (customerId) {
        const response = await axios.get(`http://10.0.2.2:5000/api/customers/${customerId}`);
        
        if (response.data) {
          console.log('Fetched user data for messaging:', response.data);
          setUserData({
            customer_id: response.data.customer_id || '',
            first_name: response.data.first_name || '',
            last_name: response.data.last_name || '',
            username: response.data.username || '',
            profile_picture: response.data.profile_picture || ''
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching user data for messaging:', error);
    }
  };

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
          // Fetch user profile data
          await fetchUserData();
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

    try {
      const shopsWithConversations: ShopWithLastMessage[] = [];

      for (const shop of shops) {
        try {
          const response = await axios.get(
            `http://10.0.2.2:5000/api/messages/conversation/${customerUserId}/${shop.admin_id || '1'}/${shop.shop_id}`
          );
          
          const messages: Message[] = response.data || [];
          
          // Only include shops that have actual messages
          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            
            // Check for unread messages (messages from admin that came after customer's last message)
            const customerMessages = messages.filter((msg: Message) => msg.sender_type === 'customer');
            const adminMessages = messages.filter((msg: Message) => msg.sender_type === 'admin');
            
            let hasUnreadMessages = false;
            let unreadCount = 0;
            
            if (adminMessages.length > 0) {
              const lastCustomerMessageTime = customerMessages.length > 0 
                ? new Date(customerMessages[customerMessages.length - 1].created_at).getTime()
                : 0;
              
              // Count admin messages that came after customer's last message
              unreadCount = adminMessages.filter((msg: Message) => 
                new Date(msg.created_at).getTime() > lastCustomerMessageTime
              ).length;
              
              hasUnreadMessages = unreadCount > 0;
            }
            
            shopsWithConversations.push({
              ...shop,
              lastMessage: latestMessage.message_text,
              lastMessageTime: formatTime(latestMessage.created_at),
              lastMessageTimestamp: new Date(latestMessage.created_at).getTime(), // Add timestamp
              hasUnreadMessages,
              unreadCount,
            });
          }
        } catch (error) {
          console.error(`Error fetching messages for shop ${shop.shop_id}:`, error);
          // Skip shops with errors
        }
      }

      // Sort by latest message timestamp (most recent first)
      shopsWithConversations.sort((a, b) => {
        if (!a.lastMessageTimestamp && !b.lastMessageTimestamp) return 0;
        if (!a.lastMessageTimestamp) return 1;
        if (!b.lastMessageTimestamp) return -1;
        
        return b.lastMessageTimestamp - a.lastMessageTimestamp; // Most recent first
      });

      setShopsWithMessages(shopsWithConversations);
      setFilteredShops(shopsWithConversations);
    } catch (error) {
      console.error('Error fetching shops with messages:', error);
      setShopsWithMessages([]);
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
      
      // Cleanup function
      return () => {
        console.log('🧹 [CUSTOMER] Cleaning up MessagingScreen message listener');
        socketService.offReceiveMessage();
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
      getShopsWithMessages(userId);
      // Also refresh user data to get latest profile picture
      fetchUserData();
    }
  }, [isFocused, userId, shops]);

  const handleProfile = () => {
    navigation.navigate('MyProfile');
  };

  const handleChatPress = (shop: ShopWithLastMessage) => {
    // Use shop logo as avatar if available, otherwise use creative icon flag
    const avatarSource = shop.logo 
      ? { uri: `http://10.0.2.2:5000${shop.logo}` }
      : null; // Pass null to trigger creative icon in ConvoScreen
    
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
      style={[
        styles.chatItem, 
        item.hasUnreadMessages && styles.unreadChatItem // Highlight unread conversations
      ]} 
      onPress={() => handleChatPress(item)}
    >
      {/* Shop Avatar - Show image or creative icon */}
      <View style={styles.avatarContainer}>
        {item.logo ? (
          <Image 
            source={{ uri: `http://10.0.2.2:5000${item.logo}` }} 
            style={styles.avatar} 
          />
        ) : (
          <View style={styles.creativeAvatarContainer}>
            {/* Laundry Machine Icon */}
            <View style={styles.washingMachine}>
              <View style={styles.machineBody} />
              <View style={styles.machineWindow} />
              <View style={styles.machineControl1} />
              <View style={styles.machineControl2} />
            </View>
            {/* Floating Bubbles */}
            <View style={styles.bubble1} />
            <View style={styles.bubble2} />
            <View style={styles.bubble3} />
          </View>
        )}
      </View>
      <View style={styles.chatInfo}>
        <Text style={[
          styles.name,
          item.hasUnreadMessages && styles.unreadName // Bold name for unread
        ]}>
          {item.name}
        </Text>
        <Text 
          style={[
            styles.lastMessage,
            item.hasUnreadMessages && styles.unreadLastMessage // Bold message for unread
          ]} 
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
      <View style={styles.statusContainer}>
        <Text style={[
          styles.time,
          item.hasUnreadMessages && styles.unreadTime // Bold time for unread
        ]}>
          {item.lastMessageTime}
        </Text>
        {item.hasUnreadMessages && item.unreadCount && item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <LinearGradient
        colors={['#91e2d9', '#96bcff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.headerContainer, { elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 }]}
      >
        {/* Left side (Back) */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={require('../../assets/img/icon/back.png')} style={styles.backIcon} />
        </TouchableOpacity>

        {/* Center Title */}
        <Text style={styles.headerTitle}>Messaging</Text>

        {/* Right side (Profile) */}
        <TouchableOpacity onPress={handleProfile} style={styles.profileButton}>
          <View style={styles.profileIconContainer}>
            {userData.profile_picture ? (
              <Image 
                source={{
                  uri: `http://10.0.2.2:5000/uploads/customer-profile/${userData.profile_picture}`,
                  cache: 'reload'
                }}
                style={styles.profileIcon}
                onError={() => {
                  console.log('Failed to load profile image in messaging:', userData.profile_picture);
                  // Fallback to initials if image fails to load
                  setUserData(prev => ({ ...prev, profile_picture: '' }));
                }}
              />
            ) : (
              <View style={styles.profileInitialsContainer}>
                <Text style={styles.profileInitials}>
                  {getInitials(userData.first_name, userData.last_name)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.filterContainer}>
        {renderFilterButton('All Chats')}
        {renderFilterButton('Recent')}
        {renderFilterButton('Unread', shopsWithMessages.filter(s => s.hasUnreadMessages).length)}
      </View>

      <FlatList
        data={filteredShops}
        keyExtractor={item => item.shop_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshing={loading}
        onRefresh={() => {
          refreshShops();
          if (userId) getShopsWithMessages(userId);
        }}
        ListEmptyComponent={
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
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 14,
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
  profileButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  profileInitialsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activeFilterButton: {
    backgroundColor: '#1ca7ec',
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadChatItem: {
    backgroundColor: '#f0f8ff', // Light blue background for unread conversations
    borderLeftWidth: 4,
    borderLeftColor: '#1ca7ec', // Blue accent border
  },
  avatarContainer: {
    width: 48,
    height: 48,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eee',
  },
  // Creative Avatar Styles for MessagingScreen
  creativeAvatarContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#4A90E2',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  washingMachine: {
    width: 24,
    height: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  machineBody: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 5,
    position: 'absolute',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  machineWindow: {
    width: 14,
    height: 14,
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
    borderRadius: 7,
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  machineControl1: {
    width: 2,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 1,
    position: 'absolute',
    top: -8,
    left: -5,
  },
  machineControl2: {
    width: 2,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 1,
    position: 'absolute',
    top: -8,
    right: -5,
  },
  bubble1: {
    width: 4,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 2,
    position: 'absolute',
    top: 10,
    left: 10,
  },
  bubble2: {
    width: 3,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 1.5,
    position: 'absolute',
    top: 6,
    right: 8,
  },
  bubble3: {
    width: 2,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 1,
    position: 'absolute',
    top: 12,
    right: 14,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  unreadName: {
    fontSize: 16,
    fontWeight: '800', // Extra bold for unread
    color: '#1ca7ec', // Blue color for unread
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  unreadLastMessage: {
    fontSize: 14,
    fontWeight: '600', // Bold for unread
    color: '#333', // Darker color for unread
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 4,
    textAlign: 'right',
  },
  unreadTime: {
    fontSize: 12,
    fontWeight: '600', // Bold for unread
    color: '#1ca7ec', // Blue color for unread
    marginBottom: 4,
    textAlign: 'right',
  },
  statusContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 60,
  },
  unreadBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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