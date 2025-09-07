import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions, ScrollView, Alert, Keyboard } from 'react-native'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/Navigator'
import useMessaging, { Message } from '../../hook/useMessaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../../services/socketService';

type ConvoScreenRouteProp = RouteProp<RootStackParamList, 'Convo'>;

const screenHeight = Dimensions.get("window").height;

export default function ConvoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>(); 
  const route = useRoute<ConvoScreenRouteProp>();
  const { shopName, shopId, receiverId, receiverType, avatar } = route.params;
  
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [userId, setUserId] = useState<string>('');
  const [userType, setUserType] = useState<'customer' | 'admin'>('customer');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { messages, loading, sendMessage, loadConversation, clearMessages, leaveConversation } = useMessaging(userId, userType);

  // Stable references to avoid infinite loops
  const loadConversationRef = useRef(loadConversation);
  const leaveConversationRef = useRef(leaveConversation);
  const clearMessagesRef = useRef(clearMessages);

  // Update refs when functions change
  useEffect(() => {
    loadConversationRef.current = loadConversation;
    leaveConversationRef.current = leaveConversation;
    clearMessagesRef.current = clearMessages;
  }, [loadConversation, leaveConversation, clearMessages]);

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

  useEffect(() => {
    if (userId && receiverId) {
      // Load conversation history
      console.log('🔄 Loading conversation:', { 
        userId, 
        receiverId, 
        shopId, 
        userType,
        shopName 
      });
      
      // Always pass customer ID first, then admin ID, regardless of who is viewing
      loadConversationRef.current(userId, receiverId, shopId);
      
      // Check socket connection status periodically
      const checkConnection = () => {
        const connected = socketService.isConnected();
        setIsSocketConnected(connected);
        console.log('🔌 Socket connection status:', connected);
      };
      
      checkConnection();
      const interval = setInterval(checkConnection, 5000); // Check every 5 seconds
      
      return () => clearInterval(interval);
    }

    // Clear messages when leaving
    return () => {
      if (userType === 'customer') {
        leaveConversationRef.current(userId, receiverId, shopId);
      } else {
        leaveConversationRef.current(receiverId, userId, shopId);
      }
      clearMessagesRef.current();
    };
  }, [userId, receiverId, shopId, userType]); // Removed function dependencies

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    // Check socket connection before sending
    if (!isSocketConnected) {
      console.log('⚠️ Socket not connected, attempting to reconnect...');
      socketService.connect(userId, userType);
      
      // Wait a bit for connection
      setTimeout(() => {
        setIsSocketConnected(socketService.isConnected());
      }, 1000);
    }

    const messageData: Omit<Message, 'id' | 'created_at'> = {
      sender_type: userType,
      sender_id: userId,
      receiver_type: receiverType,
      receiver_id: receiverId,
      shop_id: shopId,
      message_text: inputText.trim(),
    };

    console.log('📤 Sending message:', messageData);
    console.log('🔌 Socket connected:', isSocketConnected);

    try {
      await sendMessage(messageData);
      setInputText('');
      setInputHeight(40);
      Keyboard.dismiss();
      
      // Immediately scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('❌ Send message error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message, index: number) => {
    // Convert both to strings for comparison to avoid type issues
    const isMyMessage = message.sender_id.toString() === userId.toString() && message.sender_type === userType;
    
    // Debug logging to see what's happening
    console.log('🔍 Message check:', {
      messageIndex: index,
      messageSenderId: message.sender_id,
      messageSenderType: message.sender_type,
      currentUserId: userId,
      currentUserType: userType,
      isMyMessage: isMyMessage,
      messageText: message.message_text.substring(0, 20)
    });
    
    return (
      <View
        key={message.id || index}
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText,
          ]}>
            {message.message_text}
          </Text>
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
          ]}>
            {formatTime(message.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const handleBack = () => {
    // Clear messages and leave conversation before navigating back
    if (userType === 'customer') {
      leaveConversationRef.current(userId, receiverId, shopId);
    } else {
      leaveConversationRef.current(receiverId, userId, shopId);
    }
    clearMessagesRef.current();
    navigation.goBack();
  }

  return (
    <LinearGradient
      colors={['#a6fdf3', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Image source={require('../../assets/img/icon/back.png')} style={styles.backIcon} />
        </TouchableOpacity>

        {/* Shop Name and Connection Status */}
        <View style={styles.centerContainer}>
          <Text style={styles.shopName}>{shopName}</Text>
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot, 
              { backgroundColor: isSocketConnected ? '#4CAF50' : '#F44336' }
            ]} />
            <Text style={styles.connectionText}>
              {isSocketConnected ? 'Connected' : 'Connecting...'}
            </Text>
          </View>
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image source={avatar} style={styles.avatar} />
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollViewContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading messages...</Text>
          </View>
        ) : (
          <View style={styles.messagesContainer}>
            {messages.length === 0 ? (
              <View style={styles.noMessagesContainer}>
                <Text style={styles.noMessagesText}>No messages yet. Start the conversation!</Text>
              </View>
            ) : (
              messages.map((message, index) => renderMessage(message, index))
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer (Messaging Input) */}
      <View style={styles.footer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.inputPlaceholder, 
              { height: Math.min(Math.max(40, inputHeight), screenHeight * 0.20) } 
            ]}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            keyboardType="default"
            multiline={true}
            value={inputText}
            onChangeText={setInputText}
            onContentSizeChange={(e) =>
              setInputHeight(e.nativeEvent.contentSize.height)
            }
          />
        </View>
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <Image source={require('../../assets/img/icon/sent2.png')} style={styles.sendIcon} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    width: '100%',
    height: 60,
    backgroundColor: '#ffffff',
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
    borderBottomColor: '#4f4f4f45',
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  backIcon: {
    width: 25,
    height: 25,
    tintColor: '#224ee0',
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  connectionText: {
    fontSize: 10,
    color: '#666',
  },
  avatarContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 2,
  },
  myMessageBubble: {
    backgroundColor: '#224ee0',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#999999',
  },
  footer: {
    width: '100%',
    backgroundColor: '#ffffff',
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 14, 
  },
  inputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  inputPlaceholder: {
    color: '#000',
    fontSize: 16,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 3,
  },
  sendIcon: {
    width: 28,
    height: 28,
    tintColor: '#224ee0',
    marginBottom: 3,
  },
  scrollViewContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginBottom: 70,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  messagesContainer: {
    paddingVertical: 10,
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  noMessagesText: {
    color: '#666',
    fontSize: 16,
  },
})
