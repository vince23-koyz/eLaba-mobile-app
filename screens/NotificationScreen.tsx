import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  View,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import notifBus from '../services/notificationBus';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationItem,
} from '../services/notificationService';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/Navigator';
import { useAlert } from '../context/AlertContext';
import Icons from '../components/Icons';
import { api, API_ENDPOINTS } from '../config/api';

const notificationIcons: Record<string, number> = {
  booking: require('../assets/img/icon/confirm.png'),
  payment: require('../assets/img/icon/payment.png'),
  service: require('../assets/img/icon/service.png'),
  delivery: require('../assets/img/icon/pickup.png'),
};

const getNotificationType = (title: string): string => {
  const value = title.toLowerCase();
  if (value.includes('payment') || value.includes('paid')) return 'payment';
  if (value.includes('delivery') || value.includes('pickup')) return 'delivery';
  if (value.includes('service') || value.includes('order')) return 'service';
  return 'booking';
};

const isSubmittedRescheduleNotification = (notification: NotificationItem) =>
  notification.title.trim().toLowerCase() === 'reschedule request submitted';

const isDeclinedBookingNotification = (notification: NotificationItem) =>
  notification.title.trim().toLowerCase() === 'booking declined';

const getDeclinedBookingMessageParts = (message: string) => {
  const match = message.match(/^(.*?)(?:\s+|\n+)+Reason:\s*(.*)$/is);
  return {
    summary: match?.[1]?.trim() || message,
    reason: match?.[2]?.trim() || '',
  };
};

const consolidateBookingNotifications = (items: NotificationItem[]) => {
  const latestByBooking = new Map<string, NotificationItem>();
  const result: NotificationItem[] = [];

  for (const item of items) {
    if (!item.booking_id) {
      result.push(item);
      continue;
    }

    const bookingKey = String(item.booking_id);
    const existing = latestByBooking.get(bookingKey);
    if (existing) {
      const existingIndex = result.indexOf(existing);
      if (existingIndex !== -1) result.splice(existingIndex, 1);
    }
    latestByBooking.set(bookingKey, item);
    result.push(item);
  }

  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

type BottomTabsParamList = {
  Home: undefined;
  Notification: undefined;
  Profile: undefined;
};

type NotificationScreenNavigationProp = BottomTabNavigationProp<
  BottomTabsParamList,
  'Notification'
>;

type Props = { navigation: NotificationScreenNavigationProp };
type NotificationRoute = {
  key: string;
  name: 'Notification';
  params?: {
    notificationId?: string;
    bookingId?: number;
  };
};

export default function NotificationScreen({ navigation }: Props) {
  const route = useRoute<NotificationRoute>();
  const { width } = useWindowDimensions();
  const compactLayout = width <= 360;
  const { showAlert } = useAlert();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [focusedNotificationId, setFocusedNotificationId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 220],
  });

  useEffect(() => {
    const targetNotificationId = route.params?.notificationId;
    const targetBookingId = route.params?.bookingId;
    if (
      loading ||
      notifications.length <= 1 ||
      (!targetNotificationId && !targetBookingId)
    ) {
      return;
    }

    const targetIndex = notifications.findIndex(notification =>
      (targetNotificationId &&
        String(notification.notification_id) === String(targetNotificationId)) ||
      (targetBookingId &&
        Number(notification.booking_id) === Number(targetBookingId))
    );
    if (targetIndex < 0) {
      return;
    }

    const target = notifications[targetIndex];
    if (target.is_read !== 0) {
      setFocusedNotificationId(null);
      return;
    }

    setFocusedNotificationId(target.notification_id);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, targetIndex * 150 - 180),
        animated: true,
      });
    });
  }, [
    loading,
    notifications,
    route.params?.bookingId,
    route.params?.notificationId,
  ]);

  // Load customer ID and initial notifications
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const id = await AsyncStorage.getItem('customerId');
      setCustomerId(id);
      if (id) {
        await loadNotifications(id);
      } else {
        setLoading(false);
      }
    };
    init();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    shimmerAnim.setValue(0);
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);

  // Socket realtime updates
  useEffect(() => {
    const handler = (notif: NotificationItem) => {
      if (isSubmittedRescheduleNotification(notif)) return;
      setNotifications((prev) => {
        const existingIndex = prev.findIndex((item) =>
          item.notification_id === notif.notification_id ||
          (item.booking_id != null && notif.booking_id != null &&
            String(item.booking_id) === String(notif.booking_id))
        );
        const next = [...prev];
        if (existingIndex === -1) next.unshift(notif);
        else next.splice(existingIndex, 1, notif);
        return consolidateBookingNotifications(next);
      });
    };
    socketService.onNewNotification(handler);
    return () => {
      socketService.offNewNotification();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = notifBus.on('notifications:removeDeclinedBooking', (bookingId) => {
      setNotifications((prev) => prev.filter((notification) =>
        !(isDeclinedBookingNotification(notification) && notification.booking_id === Number(bookingId))
      ));
    });
    return unsubscribe;
  }, []);

  const loadNotifications = async (id: string) => {
    setLoading(true);
    try {
      const list = await fetchNotifications(id, 'customer');
      setNotifications(consolidateBookingNotifications(
        list.filter((notification) => !isSubmittedRescheduleNotification(notification))
      ));
    } catch (e) {
      console.log('Failed to fetch notifications', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!customerId) return;
    setRefreshing(true);
    try {
      await loadNotifications(customerId);
    } finally {
      setRefreshing(false);
    }
  };

  const relativeTime = (iso: string) => {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const markAsRead = async (notificationId: number) => {
    setFocusedNotificationId(null);
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: 1 } : n))
      );
      // Decrement global unread badge
      notifBus.emit('notifications:readOne');
    } catch (e) {
      console.log('Failed to mark as read', e);
    }
  };

  const markAll = async () => {
    if (!customerId) return;
    try {
      await markAllNotificationsAsRead(customerId, 'customer');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      // Clear global unread badge
      notifBus.emit('notifications:allRead');
    } catch (e) {
      console.log('Failed to mark all as read', e);
    }
  };

  // Scroll to top when tab is pressed
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      e.preventDefault();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      navigation.navigate('Notification');
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setExpanded(null);
    });
    return unsubscribe;
  }, [navigation]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.is_read === 0).length,
    [notifications]
  );

  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const CheckProgress = async (notif: NotificationItem) => {
    const title = (notif.title || '').toLowerCase();
    if (notif.booking_id && (title.includes('reschedule approved') || title.includes('reschedule rejected'))) {
      rootNav.navigate('WalkInBookingDetails', { bookingId: notif.booking_id });
    } else if (notif.booking_id && (title.includes('booking') || title.includes('confirm') || title.includes('progress') || getNotificationType(title) === 'delivery')) {
      try {
        const response = await api.get(`${API_ENDPOINTS.BOOKINGS.BASE}/${notif.booking_id}`);
        const booking = response?.data?.booking_id ? response.data : response?.data?.data;
        const bookingType = (booking?.booking_type || '').toLowerCase();
        if (bookingType === 'pick up' || bookingType === 'pickup') {
          rootNav.navigate('PickupBookingDetails', { bookingId: notif.booking_id });
        } else {
          rootNav.navigate('WalkInBookingDetails', { bookingId: notif.booking_id });
        }
      } catch {
        // Delivery notifications have enough context to use the pickup screen safely.
        if (getNotificationType(title) === 'delivery') {
          rootNav.navigate('PickupBookingDetails', { bookingId: notif.booking_id });
        } else {
          rootNav.navigate('WalkInBookingDetails', { bookingId: notif.booking_id });
        }
      }
    } else {
      showAlert('Info', 'This notification has no booking to track.', undefined, 'info');
    }
  };

  const handleDeclinedCancel = (notification: NotificationItem) => {
    if (!notification.booking_id) return;

    showAlert(
      'Cancel Booking',
      `Are you sure you want to cancel booking #${notification.booking_id}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          primary: true,
          onPress: async () => {
            try {
              await api.patch(
                `${API_ENDPOINTS.BOOKINGS.BASE}/${notification.booking_id}/status`,
                { status: 'cancelled' },
              );
              notifBus.emit('notifications:removeDeclinedBooking', notification.booking_id);
              setExpanded(null);
              showAlert(
                'Cancelled',
                'Your booking has been cancelled.',
                undefined,
                'success',
              );
            } catch (error: any) {
              showAlert(
                'Error',
                error?.response?.data?.message || 'Failed to cancel booking.',
                undefined,
                'error',
              );
            }
          },
        },
      ],
      'confirm',
    );
  };

  const handleDeclinedReschedule = (notification: NotificationItem) => {
    if (!notification.booking_id) return;
    rootNav.navigate('RescheduleBooking', { bookingId: notification.booking_id });
  };

  const formatNotificationMessage = (notification: NotificationItem) => {
    if ((notification.title || '').toLowerCase().includes('reschedule approved')) {
      return notification.message
        .replace(/(\d{4}-\d{2}-\d{2})[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g, '$1')
        .replace(/(\w{3} \w{3} \d{1,2} \d{4}) \d{2}:\d{2}:\d{2} GMT[^\s]+(?: \([^)]*\))?/g, '$1')
        .replace(/(\d{1,2}\/\d{1,2}\/\d{4}),?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?/gi, '$1')
        .replace(/(\w+ \d{1,2}, \d{4}),?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?/gi, '$1');
    }
    return notification.message;
  };

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
          style={styles.notificationScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notificationScrollContent}
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
            {notifications.length > 0 && unreadCount > 0 ? (
              <Text style={{ color: '#fff', marginTop: 4 }}>{unreadCount} unread</Text>
            ) : null}
          </View>

          <View style={styles.contentContainer}>
            {notifications.length > 0 && unreadCount > 0 ? (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>{unreadCount} unread notifications</Text>
                <TouchableOpacity style={styles.markAllButton} onPress={markAll}>
                  <Text style={styles.markAllText}>Mark all as read</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <View key={`skeleton-${index}`} style={styles.skeletonCard}>
                    <View style={styles.skeletonHeader}>
                      <View style={styles.skeletonIcon}>
                        <Animated.View
                          style={[
                            styles.skeletonShimmer,
                            { transform: [{ translateX: shimmerTranslate }] },
                          ]}
                        />
                      </View>
                      <View style={styles.skeletonTitleGroup}>
                        <View style={styles.skeletonTitle}>
                          <Animated.View
                            style={[
                              styles.skeletonShimmer,
                              { transform: [{ translateX: shimmerTranslate }] },
                            ]}
                          />
                        </View>
                        <View style={styles.skeletonTime}>
                          <Animated.View
                            style={[
                              styles.skeletonShimmer,
                              { transform: [{ translateX: shimmerTranslate }] },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                    <View style={styles.skeletonLine}>
                      <Animated.View
                        style={[
                          styles.skeletonShimmer,
                          { transform: [{ translateX: shimmerTranslate }] },
                        ]}
                      />
                    </View>
                    <View style={[styles.skeletonLine, styles.skeletonLineShort]}>
                      <Animated.View
                        style={[
                          styles.skeletonShimmer,
                          { transform: [{ translateX: shimmerTranslate }] },
                        ]}
                      />
                    </View>
                  </View>
                ))
              ) : notifications.length > 0 ? (
                notifications.map((notification, index) => (
                  <View
                    key={notification.notification_id}
                    style={[
                      styles.notificationCard,
                      notification.is_read === 0 && styles.unreadCard,
                      focusedNotificationId === notification.notification_id &&
                        styles.focusedNotificationCard,
                    ]}
                  >
                    {notification.is_read === 0 && <View style={styles.unreadDot} />}

                    <TouchableOpacity
                      style={styles.cardHeader}
                      activeOpacity={0.8}
                      onPress={() => {
                        setFocusedNotificationId(null);
                        if (notification.is_read === 0) {
                          markAsRead(notification.notification_id);
                        }
                        const message = formatNotificationMessage(notification);
                        if (message.length > 80) {
                          setExpanded(expanded === index ? null : index);
                        } else {
                          CheckProgress(notification);
                        }
                      }}
                    >
                      {isDeclinedBookingNotification(notification) ? (
                        <View style={styles.declinedCardIcon}>
                          <Icons.CircleX size={30} color="#ef4444" />
                        </View>
                      ) : (
                        <Image
                          source={notificationIcons[getNotificationType(notification.title)] || notificationIcons.service}
                          style={styles.cardIcon}
                        />
                      )}

                      <View style={styles.headerContent}>
                        <Text
                          style={[
                            styles.notificationTitle,
                            notification.is_read === 0 && styles.unreadTitle,
                          ]}
                        >
                          {notification.title}
                        </Text>
                        <Text style={styles.timeStamp}>
                          {relativeTime(notification.created_at)}
                        </Text>
                        <View style={styles.messageContainer}>
                          {isDeclinedBookingNotification(notification) ? (() => {
                            const { summary, reason } = getDeclinedBookingMessageParts(
                              formatNotificationMessage(notification),
                            );
                            return (
                              <>
                                <Text style={[styles.messageText, expanded === index && styles.expandedText]}>
                                  {summary}
                                </Text>
                                {reason ? <Text style={styles.reasonText}>Reason: {reason}</Text> : null}
                              </>
                            );
                          })() : (
                            <Text style={[styles.messageText, expanded === index && styles.expandedText]}>
                              {expanded === index || formatNotificationMessage(notification).length <= 80
                                ? formatNotificationMessage(notification)
                                : `${formatNotificationMessage(notification).substring(0, 80)}...`}
                            </Text>
                          )}
                        </View>
                      </View>

                      {formatNotificationMessage(notification).length > 80 && (
                        <View style={styles.expandButton}>
                          <Text style={styles.expandIcon}>
                            {expanded === index ? '▲' : '▼'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {expanded === index && (
                      <View style={styles.actionContainer}>
                        {!isDeclinedBookingNotification(notification) && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.primaryButton]}
                            onPress={() => {
                              setFocusedNotificationId(null);
                              CheckProgress(notification);
                            }}
                          >
                            <Text style={styles.primaryButtonText}>View Details</Text>
                          </TouchableOpacity>
                        )}
                        {isDeclinedBookingNotification(notification) && notification.booking_id && (
                          <>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.dangerButton]}
                              onPress={() => handleDeclinedCancel(notification)}
                            >
                              <Text style={styles.primaryButtonText}>Cancel Booking</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.secondaryButton]}
                              onPress={() => handleDeclinedReschedule(notification)}
                            >
                              <Text style={styles.secondaryButtonText}>Reschedule</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrapper}>
                    <LinearGradient colors={['#a2fff4', '#96bcff']} style={styles.emptyIconContainer}>
                      <Icons.Bell color="#fff" size={28} strokeWidth={2.4} />
                    </LinearGradient>
                  </View>
                  <Text style={styles.emptyTitle}>No notifications</Text>
                  <Text style={styles.emptySubtitle}>
                    We’ll notify you when something arrives.
                  </Text>
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
  container: { flex: 1 },
  notificationContainer: {
    alignItems: 'center',
    marginTop: '10%',
    paddingHorizontal: 12,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  notifLabel: {
    fontSize: 20,
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
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 720,
    flex: 1,
    marginTop: 12,
    alignSelf: 'center',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  notificationScroll: { flex: 1 },
  notificationScrollContent: { flexGrow: 1, paddingBottom: 80 },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  summaryText: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '500',
  },
  markAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#007AFF',
  },
  markAllText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    marginBottom: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#ececec',
    position: 'relative',
  },
  focusedNotificationCard: {
    borderWidth: 2,
    borderColor: '#ffb020',
    backgroundColor: '#fffaf0',
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    backgroundColor: '#f9fbff',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    width: 34,
    height: 34,
    marginRight: 10,
    resizeMode: 'contain',
  },
  declinedCardIcon: {
    width: 34,
    height: 34,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  iconLetter: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
  headerContent: {
    flex: 1,
    marginRight: 6,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 1,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#000',
  },
  timeStamp: {
    fontSize: 11,
    color: '#8e8e93',
    fontWeight: '500',
  },
  expandButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f2f2f7',
  },
  expandIcon: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  messageContainer: {
    marginBottom: 8,
  },
  messageText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#4e5968',
  },
  reasonText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#4e5968',
    marginTop: 8,
  },
  expandedText: {
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 6,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
    marginRight: 4,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  secondaryButton: {
    backgroundColor: '#f2f2f7',
    borderWidth: 1,
    borderColor: '#d1d1d6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    flex: 1,
    minHeight: 260,
  },
  emptyIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e8e8ec',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6e7eb',
    marginRight: 10,
  },
  skeletonTitleGroup: {
    flex: 1,
  },
  skeletonTitle: {
    width: '60%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e6e7eb',
    marginBottom: 8,
    overflow: 'hidden',
  },
  skeletonTime: {
    width: '40%',
    height: 10,
    borderRadius: 6,
    backgroundColor: '#f0f0f4',
    overflow: 'hidden',
  },
  skeletonLine: {
    width: '100%',
    height: 10,
    borderRadius: 6,
    backgroundColor: '#e6e7eb',
    marginBottom: 8,
    overflow: 'hidden',
  },
  skeletonLineShort: {
    width: '80%',
    overflow: 'hidden',
  },
  skeletonShimmer: {
    position: 'absolute',
    left: -220,
    top: 0,
    bottom: 0,
    width: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  emptyIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
