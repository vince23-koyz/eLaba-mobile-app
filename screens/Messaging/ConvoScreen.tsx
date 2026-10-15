import { AppState, Animated, Image, PanResponder, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions, ScrollView, Keyboard, BackHandler, Platform } from 'react-native'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation, useRoute, RouteProp, useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/Navigator'
import useMessaging, { Message } from '../../hook/useMessaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../../services/socketService';
import { api, API_ENDPOINTS } from '../../config/api';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../../context/AlertContext';
import useUnreadMessages from '../../hook/useUnreadMessages.ts';

type ConvoScreenRouteProp = RouteProp<RootStackParamList, 'Convo'>;

const screenHeight = Dimensions.get("window").height;

export default function ConvoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>(); 
  const route = useRoute<ConvoScreenRouteProp>();
  const { shopName, shopId, receiverId, receiverType, avatar, useCreativeIcon } = route.params;
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);
  const isFocused = useIsFocused();
  const { showAlert } = useAlert();
  
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [userId, setUserId] = useState<string>('');
  const [userType, setUserType] = useState<'customer' | 'admin'>('customer');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [messageToUnsend, setMessageToUnsend] = useState<Message | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const swipeAnimationsRef = useRef<Record<string, Animated.Value>>({});
  const actionMenuAnimation = useRef(new Animated.Value(0)).current;
  const unsendModalAnimation = useRef(new Animated.Value(0)).current;
  const conversationReadMarkerKey = userId ? `lastReadConversation_${userId}` : '';
  const lastReadSignatureRef = useRef<string>('');
  const readSyncInFlightRef = useRef(false);
  const readSyncPendingRef = useRef(false);
  const readSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { messages, loading, sendMessage, unsendMessage, loadConversation, clearMessages, leaveConversation } = useMessaging(userId, userType);
  const { clearConversationUnreadState } = useUnreadMessages(userId || '', userType);

  const clearConversationNotification = useCallback(async () => {
    if (!receiverId || !shopId) return;

    const conversationId = `shop_${shopId}_customer_${userId}_admin_${receiverId}`;
    try {
      const { ChatNotificationModule } = require('react-native').NativeModules;
      if (ChatNotificationModule?.clearConversationNotification) {
        ChatNotificationModule.clearConversationNotification(conversationId);
      }
    } catch (error) {
      console.log('Failed to clear conversation notification:', error);
    }
  }, [receiverId, shopId, userId]);

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

  const getUnreadIncomingSignature = useCallback(() => {
    if (!userId || !receiverId || !shopId) {
      return '';
    }

    const unreadMessages = messages.filter((message) => {
      const runtimeMessage = message as Message & { is_read?: number | boolean };
      return (
        message.sender_type === receiverType &&
        message.sender_id?.toString() === receiverId.toString() &&
        message.receiver_type === userType &&
        message.receiver_id?.toString() === userId.toString() &&
        Number(runtimeMessage.is_read ?? 0) === 0
      );
    });

    if (unreadMessages.length === 0) {
      return '';
    }

    return unreadMessages
      .map((message) => [
        message.id ?? 'no-id',
        message.created_at ?? 'no-created-at',
        message.sender_id,
        message.receiver_id,
        message.message_text,
      ].join('|'))
      .join('||');
  }, [messages, receiverId, receiverType, shopId, userId, userType]);

  async function flushReadSync(signature: string) {
    if (!signature || !userId || !receiverId || !shopId || !isFocused) {
      return;
    }

    if (signature === lastReadSignatureRef.current) {
      return;
    }

    if (readSyncInFlightRef.current) {
      readSyncPendingRef.current = true;
      return;
    }

    readSyncInFlightRef.current = true;

    try {
      // Capture the IDs of currently-unread incoming messages before we mark them read
      const unreadMessageIds = messages
        .filter((message) => {
          const runtimeMessage = message as Message & { is_read?: number | boolean };
          return (
            message.sender_type === receiverType &&
            message.sender_id?.toString() === receiverId.toString() &&
            message.receiver_type === userType &&
            message.receiver_id?.toString() === userId.toString() &&
            Number(runtimeMessage.is_read ?? 0) === 0
          );
        })
        .map((m) => m.id)
        .filter(Boolean)
        .map((id) => id?.toString() ?? '');

      await api.put(API_ENDPOINTS.MESSAGES.MARK_READ, {
        senderId: receiverId,
        receiverId: userId,
        shopId,
        senderType: receiverType,
        receiverType: userType,
      });

      await clearConversationUnreadState({
        sender_id: receiverId,
        sender_type: receiverType,
        receiver_id: userId,
        receiver_type: userType,
        shop_id: shopId,
      });

      try {
        const conversationId = `shop_${shopId}_customer_${userId}_admin_${receiverId}`;
        const { ChatNotificationModule } = require('react-native').NativeModules;
        if (ChatNotificationModule?.markConversationRead) {
          ChatNotificationModule.markConversationRead(conversationId);
        }
        if (ChatNotificationModule?.clearConversationNotification) {
          ChatNotificationModule.clearConversationNotification(conversationId);
        }
      } catch (err) {
        console.log('Failed to clear native conversation notification history:', err);
      }

      if (conversationReadMarkerKey) {
        await AsyncStorage.setItem(
          conversationReadMarkerKey,
          JSON.stringify({
            shopId,
            receiverId,
            receiverType,
            timestamp: Date.now(),
          })
        );
      }

      lastReadSignatureRef.current = signature;
    } catch (e: any) {
      console.log('Failed to mark messages as read:', e?.response?.data || e?.message || e);
    } finally {
      readSyncInFlightRef.current = false;

      if (readSyncPendingRef.current) {
        readSyncPendingRef.current = false;
        const latestSignature = getUnreadIncomingSignature();
        if (latestSignature && latestSignature !== lastReadSignatureRef.current) {
          void flushReadSync(latestSignature);
        }
      }
    }
  }

  useEffect(() => {
    if (!isFocused || !userId || !receiverId || !shopId) {
      return;
    }

    const signature = getUnreadIncomingSignature();
    if (!signature || signature === lastReadSignatureRef.current) {
      return;
    }

    if (readSyncTimerRef.current) {
      clearTimeout(readSyncTimerRef.current);
    }

    readSyncTimerRef.current = setTimeout(() => {
      void flushReadSync(signature);
    }, 120);

    return () => {
      if (readSyncTimerRef.current) {
        clearTimeout(readSyncTimerRef.current);
        readSyncTimerRef.current = null;
      }
    };
  }, [isFocused, userId, receiverId, shopId, getUnreadIncomingSignature]);

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
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && userId && receiverId && shopId) {
        void clearConversationNotification();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [userId, receiverId, shopId, clearConversationNotification]);

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

  // Mark messages as read when the conversation is opened or refocused
  useFocusEffect(
    useCallback(() => {
      const persistReadMarker = async () => {
        if (!conversationReadMarkerKey || !shopId || !receiverId || !userId) return;

        await AsyncStorage.setItem(
          conversationReadMarkerKey,
          JSON.stringify({
            shopId,
            receiverId,
            receiverType,
            timestamp: Date.now(),
          })
        );
      };

      const clearNativeNotification = async () => {
        if (!userId || !receiverId || !shopId) return;
        await clearConversationNotification();
      };

      void persistReadMarker();
      void clearNativeNotification();

      return () => {
        if (userId && receiverId && shopId) {
          void persistReadMarker();
        }
      };
    }, [userId, receiverId, shopId, receiverType, conversationReadMarkerKey])
  );

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
      reply_to_message_id: replyingTo?.id ?? replyingTo?.message_id ?? null,
      reply_to_message_text: replyingTo?.message_text ?? null,
    };

    console.log('📤 Sending message:', messageData);
    console.log('🔌 Socket connected:', isSocketConnected);

    try {
      await sendMessage(messageData);
      setInputText('');
      setInputHeight(40);
      setReplyingTo(null);
      Keyboard.dismiss();
      
      // Immediately scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('❌ Send message error:', error);
      showAlert('Error', 'Failed to send message. Please try again.', undefined, 'error');
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleUnsendMessage = (message: Message) => {
    setActionMessage(null);
    setMessageToUnsend(message);
    unsendModalAnimation.setValue(0);
    Animated.spring(unsendModalAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 85,
      friction: 9,
    }).start();
  };

  const closeUnsendModal = () => {
    Animated.timing(unsendModalAnimation, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => setMessageToUnsend(null));
  };

  const confirmUnsendMessage = async () => {
    if (!messageToUnsend) return;

    const message = messageToUnsend;
    closeUnsendModal();
    try {
      await unsendMessage(message);
    } catch (error) {
      showAlert('Error', 'Failed to unsend message. Please try again.', undefined, 'error');
    }
  };

  const openMessageActions = (message: Message) => {
    setActionMessage(message);
    actionMenuAnimation.setValue(0);
    Animated.spring(actionMenuAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 90,
      friction: 9,
    }).start();
  };

  const closeMessageActions = () => {
    Animated.timing(actionMenuAnimation, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => setActionMessage(null));
  };

  const handleReplyFromActions = () => {
    if (!actionMessage) return;
    setReplyingTo(actionMessage);
    closeMessageActions();
  };

  const renderMessage = (message: Message, index: number) => {
    // Convert both to strings for comparison to avoid type issues
    const isMyMessage = message.sender_id.toString() === userId.toString() && message.sender_type === userType;
    
    // Additional validation: Only show messages that belong to this conversation
    const isValidMessage = (
      message.shop_id?.toString() === shopId.toString() &&
      (
        // Message sent by current user
        (message.sender_id?.toString() === userId.toString()) ||
        // Message received by current user from the expected sender
        (message.sender_id?.toString() === receiverId.toString() && 
         (message.receiver_id?.toString() === userId.toString()))
      )
    );

    if (!isValidMessage) {
      console.log('🚫 Invalid message for this conversation, skipping:', {
        messageShopId: message.shop_id,
        currentShopId: shopId,
        messageSenderId: message.sender_id,
        currentUserId: userId,
        messageReceiverId: message.receiver_id,
        expectedReceiverId: receiverId,
        messageText: message.message_text.substring(0, 20)
      });
      return null;
    }
    
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
    
    const messageId = message.id ?? message.message_id;
    const messageKey = String(messageId ?? index);
    const swipeX = swipeAnimationsRef.current[messageKey] ||
      (swipeAnimationsRef.current[messageKey] = new Animated.Value(0));
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderGrant: () => {
        swipeX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const clampedOffset = Math.max(-80, Math.min(80, gestureState.dx));
        swipeX.setValue(clampedOffset);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 55 && messageId) {
          setReplyingTo(message);
        }
        Animated.spring(swipeX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipeX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }).start();
      },
    });

    return (
      <View
        key={message.id || index}
        {...panResponder.panHandlers}
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.replySwipeHint,
            {
              opacity: swipeX.interpolate({
                inputRange: [-80, -25, 0, 25, 80],
                outputRange: [1, 0, 0, 0, 1],
              }),
            },
          ]}
        >
          <Text style={styles.replySwipeHintText}>Reply</Text>
        </Animated.View>
        <Animated.View
          style={{
            transform: [{ translateX: swipeX }],
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              if (actionMessage) {
                closeMessageActions();
              }
            }}
            onLongPress={() => {
              if (!message.is_unsent) {
                openMessageActions(message);
              }
            }}
            delayLongPress={450}
            style={[
            styles.messageBubble,
            message.is_unsent
              ? styles.unsentMessageBubble
              : isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}>
          {!message.is_unsent && message.reply_to_message_id && message.reply_to_message_text ? (
            <View style={[
              styles.replyQuote,
              isMyMessage ? styles.myReplyQuote : styles.otherReplyQuote,
            ]}>
              <Text
                numberOfLines={2}
                style={[styles.replyQuoteText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}
              >
                {message.reply_to_message_text}
              </Text>
            </View>
          ) : null}
          <Text style={[
            styles.messageText,
            message.is_unsent
              ? styles.unsentMessageText
              : isMyMessage ? styles.myMessageText : styles.otherMessageText,
          ]}>
            {message.is_unsent ? 'Message unsent' : message.message_text}
          </Text>
          {!message.is_unsent ? <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
          ]}>
            {formatTime(message.created_at)}
          </Text> : null}
          </TouchableOpacity>
        </Animated.View>
        {actionMessage &&
        (actionMessage.id ?? actionMessage.message_id) === messageId ? (
          <Animated.View
            style={[
              styles.messageActionsMenu,
              isMyMessage ? styles.myMessageActionsMenu : styles.otherMessageActionsMenu,
              {
                opacity: actionMenuAnimation,
                transform: [
                  {
                    scale: actionMenuAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.82, 1],
                    }),
                  },
                  {
                    translateY: actionMenuAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {isMyMessage && !actionMessage.is_unsent ? (
              <TouchableOpacity
                style={styles.messageActionButton}
                onPress={() => handleUnsendMessage(actionMessage)}
              >
                <Text style={styles.unsendActionText}>Unsent</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.messageActionButton}
              onPress={handleReplyFromActions}
            >
              <Text style={styles.replyActionText}>Reply</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </View>
    );
  };

  const handleBack = () => {
    // Clear messages and leave conversation before navigating back
    if (userId && receiverId) {
      leaveConversationRef.current(userId, receiverId, shopId);
    }
    clearMessagesRef.current();
    navigation.goBack();
  }

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        console.log('🔙 Android back button pressed');
        handleBack();
        return true; // Prevent default back action
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [userId, receiverId, shopId])
  );

  return (
    <LinearGradient
      colors={['#a6fdf3', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={[styles.header, { marginTop: insets.top || 40 }]}>
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
          {useCreativeIcon ? (
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
          ) : (
            <Image source={avatar} style={styles.avatar} />
          )}
        </View>
      </View>

      <View style={styles.content}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollViewContainer}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={closeMessageActions}
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
                messages
                  .map((message, index) => renderMessage(message, index))
                  .filter(Boolean)
              )}
            </View>
          )}
        </ScrollView>

        {messageToUnsend ? (
          <View style={styles.unsendModalLayer}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.unsendModalBackdrop}
              onPress={closeUnsendModal}
            />
            <Animated.View
              style={[
                styles.unsendModalCard,
                {
                  opacity: unsendModalAnimation,
                  transform: [
                    {
                      scale: unsendModalAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.86, 1],
                      }),
                    },
                    {
                      translateY: unsendModalAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.unsendModalIcon}>
                <Text style={styles.unsendModalIconText}>!</Text>
              </View>
              <Text style={styles.unsendModalTitle}>Unsend message?</Text>
              <Text style={styles.unsendModalDescription}>
                This message will be removed for everyone in this conversation.
              </Text>
              <View style={styles.unsendModalActions}>
                <TouchableOpacity
                  style={[styles.unsendModalButton, styles.cancelUnsendButton]}
                  onPress={closeUnsendModal}
                >
                  <Text style={styles.cancelUnsendText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unsendModalButton, styles.confirmUnsendButton]}
                  onPress={confirmUnsendMessage}
                >
                  <Text style={styles.confirmUnsendText}>Unsend</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        ) : null}

        {/* Footer (Messaging Input) with safe area */}
        <SafeAreaView edges={['bottom']} style={[styles.footerSafe, { paddingBottom: bottomInset }]}>
          <View style={styles.footerInner}>
            {replyingTo ? (
              <View style={styles.replyPreview}>
                <View style={styles.replyPreviewContent}>
                  <Text style={styles.replyPreviewLabel}>Replying to message</Text>
                  <Text numberOfLines={1} style={styles.replyPreviewText}>{replyingTo.message_text}</Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Cancel reply"
                  onPress={() => setReplyingTo(null)}
                  style={styles.cancelReplyButton}
                >
                  <Text style={styles.cancelReplyText}>×</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.inputPlaceholder,
                  { height: Math.min(Math.max(40, inputHeight), screenHeight * 0.2) }
                ]}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                keyboardType="default"
                multiline={true}
                value={inputText}
                onChangeText={setInputText}
                onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
              />
            </View>
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Image source={require('../../assets/img/icon/sent2.png')} style={styles.sendIcon} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
    marginVertical: 2,
    paddingHorizontal: 0,
    position: 'relative',
  },
  replySwipeHint: {
    position: 'absolute',
    top: '50%',
    marginTop: -12,
    left: -52,
    right: -52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replySwipeHintText: {
    color: '#224ee0',
    fontSize: 12,
    fontWeight: '600',
  },
  myMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    marginRight: 0,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    marginLeft: 0,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
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
  unsentMessageBubble: {
    backgroundColor: '#e5e5e5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  replyQuote: {
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 6,
    paddingLeft: 8,
    paddingVertical: 3,
  },
  myReplyQuote: {
    borderLeftColor: 'rgba(255, 255, 255, 0.75)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  otherReplyQuote: {
    borderLeftColor: '#224ee0',
    backgroundColor: '#e3e3e3',
  },
  replyQuoteText: {
    fontSize: 13,
    lineHeight: 17,
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
  unsentMessageText: {
    color: '#777777',
    fontStyle: 'italic',
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
  messageActionsMenu: {
    position: 'absolute',
    bottom: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 6,
    marginBottom: 8,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  myMessageActionsMenu: {
    right: 0,
  },
  otherMessageActionsMenu: {
    left: 0,
  },
  unsendModalLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsendModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  unsendModalCard: {
    width: '84%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
  },
  unsendModalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff1f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  unsendModalIconText: {
    color: '#d92d20',
    fontSize: 26,
    fontWeight: '700',
  },
  unsendModalTitle: {
    color: '#1f2937',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  unsendModalDescription: {
    color: '#667085',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  unsendModalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  unsendModalButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelUnsendButton: {
    backgroundColor: '#f2f4f7',
  },
  confirmUnsendButton: {
    backgroundColor: '#d92d20',
  },
  cancelUnsendText: {
    color: '#344054',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmUnsendText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  messageActionButton: {
    minWidth: 88,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unsendActionText: {
    color: '#d92d20',
    fontSize: 15,
    fontWeight: '600',
  },
  replyActionText: {
    color: '#224ee0',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    width: '100%',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderTopColor: '#4f4f4f45',
    borderTopWidth: 1,
  },
  footerSafe: {
    backgroundColor: '#ffffff',
    borderTopColor: '#4f4f4f45',
    borderTopWidth: 1,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingTop: 8,
    flexWrap: 'wrap',
  },
  replyPreview: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderLeftWidth: 3,
    borderLeftColor: '#224ee0',
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewLabel: {
    color: '#224ee0',
    fontSize: 12,
    fontWeight: '600',
  },
  replyPreviewText: {
    color: '#555',
    fontSize: 13,
    marginTop: 2,
  },
  cancelReplyButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cancelReplyText: {
    color: '#555',
    fontSize: 24,
    lineHeight: 24,
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
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
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
  // Creative Avatar Styles
  creativeAvatarContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#4A90E2',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  washingMachine: {
    width: 20,
    height: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  machineBody: {
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    position: 'absolute',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  machineWindow: {
    width: 12,
    height: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
    borderRadius: 6,
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
    top: -6,
    left: -4,
  },
  machineControl2: {
    width: 2,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 1,
    position: 'absolute',
    top: -6,
    right: -4,
  },
  bubble1: {
    width: 4,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 2,
    position: 'absolute',
    top: 8,
    left: 8,
  },
  bubble2: {
    width: 3,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 1.5,
    position: 'absolute',
    top: 4,
    right: 6,
  },
  bubble3: {
    width: 2,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 1,
    position: 'absolute',
    top: 10,
    right: 12,
  },
})
