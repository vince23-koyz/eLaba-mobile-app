import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity } from 'react-native'
import React, { useState, useEffect } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/Navigator';
import useShops from '../../hook/useShops';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Basic shop interface
interface Shop {
  shop_id: number;
  name: string;
  address?: string;
  website?: string;
  owner_name?: string;
  operation_hours?: string;
  admin_id?: number;
}

// Interface for shops with the latest message information
interface ShopWithLastMessage extends Shop {
  lastMessage?: string;
  lastMessageTime?: string;
}

export default function MessagingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>(); 
  const [activeFilter, setActiveFilter] = useState('All Chats');
  const [userId, setUserId] = useState<string>('');
  const [userType, setUserType] = useState<'customer' | 'admin'>('customer');
  const [shopsWithMessages, setShopsWithMessages] = useState<ShopWithLastMessage[]>([]);
  const [filteredShops, setFilteredShops] = useState<ShopWithLastMessage[]>([]);
  
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
          
          const messages = response.data || [];
          
          // Only include shops that have actual messages
          if (messages.length > 0) {
            const latestMessage = messages[messages.length - 1];
            
            shopsWithConversations.push({
              ...shop,
              lastMessage: latestMessage.message_text,
              lastMessageTime: formatTime(latestMessage.created_at),
            });
          }
        } catch (error) {
          console.error(`Error fetching messages for shop ${shop.shop_id}:`, error);
          // Skip shops with errors
        }
      }

      // Sort by latest message time (most recent first)
      shopsWithConversations.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        
        const timeA = new Date(a.lastMessageTime).getTime();
        const timeB = new Date(b.lastMessageTime).getTime();
        return timeB - timeA; // Most recent first
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

  const handleProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleChatPress = (shop: ShopWithLastMessage) => {
    navigation.navigate('Convo', { 
      shopName: shop.name,
      shopId: shop.shop_id.toString(),
      receiverId: shop.admin_id?.toString() || '1', // Default admin ID
      receiverType: 'admin',
      avatar: require('../../assets/img/washnfold.png'), // Default shop avatar
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
        // Show only chats from last 24 hours
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentChats = shopsWithMessages.filter(shop => {
          if (!shop.lastMessageTime) return false;
          const messageTime = new Date(shop.lastMessageTime);
          return messageTime >= last24Hours;
        });
        setFilteredShops(recentChats);
        break;
      case 'Unread':
        // For now, show empty since we don't have unread logic yet
        setFilteredShops([]);
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
          {count !== undefined && (
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
    <TouchableOpacity style={styles.chatItem} onPress={() => handleChatPress(item)}>
      <Image source={require('../../assets/img/washnfold.png')} style={styles.avatar} />
      <View style={styles.chatInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
      <View style={styles.statusContainer}>
        <Text style={styles.time}>{item.lastMessageTime}</Text>
        <View style={styles.onlineIndicator} />
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
        <TouchableOpacity onPress={handleProfile}>
          <Image source={require('../../assets/img/default-profile.png')} style={styles.profileIcon} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.filterContainer}>
        {renderFilterButton('All Chats', shopsWithMessages.length)}
        {renderFilterButton('Recent', shopsWithMessages.filter(s => {
          if (!s.lastMessageTime) return false;
          const messageTime = new Date(s.lastMessageTime);
          const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return messageTime >= last24Hours;
        }).length)}
        {renderFilterButton('Unread', 0)}
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
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
    backgroundColor: '#eee',
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
    backgroundColor: '#e74c3c',
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    backgroundColor: '#eee',
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
  lastMessage: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 4,
    textAlign: 'right',
  },
  statusContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 60,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
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