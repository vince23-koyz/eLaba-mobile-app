import React, { useState, useRef, useEffect } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// ✅ Bottom Tab navigator param list
type BottomTabsParamList = {
  Home: undefined;
  Notification: undefined;
  Profile: undefined;
};

// ✅ Navigation prop type for this screen
type NotificationScreenNavigationProp = BottomTabNavigationProp<
  BottomTabsParamList,
  'Notification'
>;

type Props = {
  navigation: NotificationScreenNavigationProp;
};

// Mock notification data with different types
const notificationData = [
  {
    id: 1,
    type: 'confirmed',
    title: 'Booking Confirmed!',
    message: 'Hi Customer, your booking has been successfully confirmed! You can track your order number #11111. Our team is preparing your order. Please wait for updates regarding dispatch and delivery.',
    time: '2 min ago',
    icon: require('../assets/img/icon/confirmed.png'),
    isRead: false,
  },
  {
    id: 2,
    type: 'progress',
    title: 'Service in Progress',
    message: 'Your service request is currently being processed. Our professional is on the way to your location. Expected arrival time: 15 minutes.',
    time: '10 min ago',
    icon: require('../assets/img/icon/confirmed.png'),
    isRead: false,
  },
  {
    id: 3,
    type: 'completed',
    title: 'Service Completed',
    message: 'Great news! Your service has been completed successfully. Please rate your experience and help us improve our services.',
    time: '1 hour ago',
    icon: require('../assets/img/icon/confirmed.png'),
    isRead: true,
  },
  {
    id: 4,
    type: 'promotion',
    title: 'Special Offer Available!',
    message: 'Get 20% off on your next booking! Use code SAVE20 and enjoy premium services at discounted rates. Offer valid until end of month.',
    time: '2 hours ago',
    icon: require('../assets/img/icon/confirmed.png'),
    isRead: true,
  },
  {
    id: 5,
    type: 'reminder',
    title: 'Appointment Reminder',
    message: 'Don\'t forget! You have an appointment scheduled for tomorrow at 2:00 PM. Please be available at the specified time.',
    time: '1 day ago',
    icon: require('../assets/img/icon/confirmed.png'),
    isRead: true,
  },
];

export default function NotificationScreen({ navigation }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState(notificationData);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animate in the notifications
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const CheckProgress = (notificationId: number) => {
    Alert.alert('Checking Progress', `Loading details for notification #${notificationId}...`);
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    Alert.alert('Success', 'All notifications marked as read');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'confirmed': return '#4CAF50';
      case 'progress': return '#FF9800';
      case 'completed': return '#2196F3';
      case 'promotion': return '#E91E63';
      case 'reminder': return '#9C27B0';
      default: return '#757575';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'confirmed': return '✅';
      case 'progress': return '🔄';
      case 'completed': return '✨';
      case 'promotion': return '🎉';
      case 'reminder': return '⏰';
      default: return '🔔';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate fetching new notifications
    setTimeout(() => {
      setRefreshing(false);
      Alert.alert('Refreshed!', 'Notifications updated.');
    }, 1500);
  };

  // Scroll to top when tab is pressed
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      e.preventDefault(); // prevent default jump
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      navigation.navigate('Notification'); // stay on the same tab
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <LinearGradient
      colors={['#a2fff4', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
              progressBackgroundColor="#fff"
            />
          }
        >
          <View style={styles.notificationContainer}>
            <Text style={styles.notifLabel}>Notifications</Text>
            <Text style={styles.subtitle}>Stay updated with your latest activities</Text>
          </View>

          <View style={styles.contentContainer}>
            {/* Summary Section */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                {notifications.filter(n => !n.isRead).length} unread notifications
              </Text>
              <TouchableOpacity 
                style={styles.markAllButton}
                onPress={markAllAsRead}
              >
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            </View>

            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationCard,
                      !notification.isRead && styles.unreadCard,
                      { 
                        transform: [{ 
                          scale: expanded === index ? 1.02 : 1 
                        }] 
                      }
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setExpanded(expanded === index ? null : index);
                      if (!notification.isRead) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    {/* Unread indicator */}
                    {!notification.isRead && <View style={styles.unreadDot} />}
                    
                    {/* Header Row */}
                    <View style={styles.cardHeader}>
                      <View style={styles.iconContainer}>
                        <View style={[styles.iconBadge, { backgroundColor: getTypeColor(notification.type) }]}>
                          <Text style={styles.iconEmoji}>{getTypeIcon(notification.type)}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.headerContent}>
                        <Text style={[styles.notificationTitle, !notification.isRead && styles.unreadTitle]}>
                          {notification.title}
                        </Text>
                        <Text style={styles.timeStamp}>{notification.time}</Text>
                      </View>
                      
                      <TouchableOpacity
                        onPress={() => setExpanded(expanded === index ? null : index)}
                        style={styles.expandButton}
                      >
                        <Text style={styles.expandIcon}>
                          {expanded === index ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Message Content */}
                    <View style={styles.messageContainer}>
                      <Text style={[styles.messageText, expanded === index && styles.expandedText]}>
                        {expanded === index
                          ? notification.message
                          : `${notification.message.substring(0, 80)}...`}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    {expanded === index && (
                      <View style={styles.actionContainer}>
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.primaryButton]} 
                          onPress={() => CheckProgress(notification.id)}
                        >
                          <Text style={styles.primaryButtonText}>Check Progress</Text>
                        </TouchableOpacity>
                        
                        {notification.type === 'promotion' && (
                          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
                            <Text style={styles.secondaryButtonText}>View Offer</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <LinearGradient
                    colors={['#a2fff4', '#96bcff']}
                    style={styles.emptyIconContainer}
                  >
                    <Text style={styles.emptyIcon}>🔔</Text>
                  </LinearGradient>
                  <Text style={styles.emptyTitle}>No Notifications</Text>
                  <Text style={styles.emptySubtitle}>You're all caught up! Check back later for updates.</Text>
                  <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  notificationContainer: { 
    alignItems: 'center', 
    marginTop: '15%',
    paddingHorizontal: 20,
  },
  notifLabel: { 
    fontSize: 24, 
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  contentContainer: {
    backgroundColor: '#f8f9fa',
    width: '100%',
    flex: 1,
    marginTop: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '500',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#007AFF',
  },
  markAllText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    backgroundColor: '#f8f9ff',
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconEmoji: {
    fontSize: 20,
    color: '#fff',
  },
  headerContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#000',
  },
  timeStamp: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
  },
  expandButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f2f2f7',
  },
  expandIcon: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#48484a',
    textAlign: 'left',
  },
  expandedText: {
    lineHeight: 22,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#f2f2f7',
    borderWidth: 1,
    borderColor: '#d1d1d6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 32,
    color: '#fff',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
