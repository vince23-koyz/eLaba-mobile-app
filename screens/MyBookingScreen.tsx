import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Image,
  TextInput,
  Animated,
  InteractionManager,
  BackHandler,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { api, API_ENDPOINTS, setBaseOrigin, FALLBACK_ORIGINS, API_CONFIG } from '../config/api';
import socketService from '../services/socketService';
import { useAlert } from '../context/AlertContext';
import Icons from '../components/Icons';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

type MyBookingNavProp = NativeStackNavigationProp<RootStackParamList, 'MyBookingScreen'>;

interface OrderItem {
  booking_id: number;
  booking_type: string;
  booking_date?: string;
  pickup_date?: string;
  created_at?: string;
  booking_status: string;
  total_amount: number;
  shop_id: number;
  shop_name: string;
  customer_id: number;
  customer_first_name: string;
  customer_last_name: string;
  service_name?: string;
  service_description?: string;
  payment_id?: number;
  payment_method?: string;
  payment_status?: string;
  refund_status?: string;
  refund_amount?: number;
  payment_date?: string;
  delivery_status?: string;
  shop_logo?: string;
  logo?: string;
  shop_image?: string;
  image?: string;
}

// Use centralized API config

export default function MyBookingScreen() {
  const navigation = useNavigation<MyBookingNavProp>();
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [orderType, setOrderType] = useState<'all' | 'walkin' | 'pickup'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shopLogos, setShopLogos] = useState<Record<number, string | null>>({});
  const processingRotation = useRef(new Animated.Value(0)).current;
  const processingAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const skeletonShimmer = useRef(new Animated.Value(0)).current;
  const skeletonTranslate = skeletonShimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-260, 260],
  });
  const hasProcessingOrder = orders.some((order) => {
    const status = (order.booking_status || '').toLowerCase();
    return status.includes('progress') || status.includes('process');
  });

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onHardwareBackPress,
      );

      return () => subscription.remove();
    }, [handleBack]),
  );

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(skeletonShimmer, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => {
      animation.stop();
      skeletonShimmer.setValue(0);
    };
  }, [skeletonShimmer]);

  // Normalize status into buckets for UI steppers
  const normalizeWalkInStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending')) return 'pending';
    if (s.includes('confirm')) return 'confirmed';
    if (s.includes('progress') || s.includes('process')) return 'processing';
    if (s.includes('complete')) return 'completed';
    return 'pending';
  };

  const normalizePickupStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending')) return 'pending';
    if (s.includes('out_for_pickup')) return 'out_for_pickup';
    if (s.includes('pickup_scheduled')) return 'out_for_pickup';
    if (s.includes('picked_up')) return 'picked_up';
    if (s.includes('at_shop')) return 'at_shop';
    if (s.includes('ready_for_delivery')) return 'ready_for_delivery';
    if (s.includes('out_for_delivery')) return 'out_for_delivery';
    if (s.includes('deliver')) return 'delivered';
    return 'pending';
  };

  // Load customer ID from storage
  useEffect(() => {
    const getCustomerId = async () => {
      try {
        const id = await AsyncStorage.getItem('customerId');
        if (id) {
          setCustomerId(parseInt(id));
        }
      } catch (error) {
        console.error('Error getting customer ID:', error);
      }
    };
    getCustomerId();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const transitionTask = InteractionManager.runAfterInteractions(() => {
        if (loading || !hasProcessingOrder) {
          processingRotation.setValue(0);
          return;
        }

        processingRotation.setValue(0);
        processingAnimation.current?.stop();
        processingAnimation.current = Animated.loop(
          Animated.timing(processingRotation, {
            toValue: 1,
            duration: 1100,
            easing: Easing.linear,
            isInteraction: false,
            useNativeDriver: true,
          }),
          { resetBeforeIteration: true },
        );
        processingAnimation.current.start();
      });

      return () => {
        transitionTask.cancel();
        processingAnimation.current?.stop();
        processingAnimation.current = null;
        processingRotation.setValue(0);
      };
    }, [hasProcessingOrder, loading, processingRotation]),
  );

  const fetchShopLogos = useCallback(async () => {
    try {
      const response = await api.get('/shop');
      const rows = Array.isArray(response?.data) ? response.data : [];
      const logoMap = rows.reduce((acc: Record<number, string | null>, shop: any) => {
        if (shop?.shop_id) {
          acc[Number(shop.shop_id)] = shop.logo || null;
        }
        return acc;
      }, {});
      setShopLogos(logoMap);
    } catch (error) {
      console.error('Error fetching shop logos:', error);
    }
  }, []);

  // Fetch orders when screen focuses
  useFocusEffect(
    useCallback(() => {
      if (customerId) {
        fetchShopLogos();
        fetchOrders();
      }
    }, [customerId, fetchShopLogos])
  );

  // Real-time refresh: listen to notification events containing booking_id
  useEffect(() => {
    if (customerId && !socketService.isConnected()) {
      socketService.connect(String(customerId), 'customer');
    }

    const onNotif = (notif: any) => {
      if (!notif) return;
      if (notif.booking_id) {
        // Simple strategy: refresh list when any booking notification arrives
        fetchOrders();
      }
    };
    socketService.onNewNotification(onNotif);
    const onBookingUpdated = () => fetchOrders();
    const onRefundUpdated = () => fetchOrders();
    socketService.onBookingUpdated(onBookingUpdated);
    socketService.onRefundUpdated(onRefundUpdated);
    // Also refresh on delivery events
    const onDelCreated = () => fetchOrders();
    const onDelUpdated = () => fetchOrders();
    socketService.onDeliveryCreated(onDelCreated);
    socketService.onDeliveryUpdated(onDelUpdated);
    return () => {
      socketService.offNewNotification();
      socketService.offBookingUpdated();
      socketService.offRefundUpdated();
      socketService.offDeliveryCreated();
      socketService.offDeliveryUpdated();
    };
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      if (!customerId) return undefined;

      const refreshTimer = setInterval(() => {
        fetchOrders(false);
      }, 4000);

      return () => clearInterval(refreshTimer);
    }, [customerId]),
  );

  const fetchOrders = async (showLoading = true) => {
    if (!customerId) return;

    try {
      if (showLoading) setLoading(true);
      // Fetch bookings filtered by customer_id from backend
      const response = await api.get(API_ENDPOINTS.BOOKINGS.BASE, {
        params: { customer_id: customerId },
      });

      // Support both raw array and wrapped { success, data }
      const payload = response?.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      if (Array.isArray(rows)) {
        setOrders(rows as any);
      } else {
        console.error('Invalid response format:', payload);
        setOrders([]);
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error?.message || error);
      const isNetworkError = !error?.response;
      if (error?.response?.status === 404) {
        setOrders([]); // No orders found for this customer
      } else if (isNetworkError) {
        // Fallback attempts for local development (Android emulator / local PC)
        const fallbacks = FALLBACK_ORIGINS; // Centralized dev fallbacks
        let recovered = false;
        for (const base of fallbacks) {
          try {
            const url = `${base}/api${API_ENDPOINTS.BOOKINGS.BASE}`;
            const resp = await axios.get(url, { params: { customer_id: customerId } });
            const payload = resp?.data;
            const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
            if (Array.isArray(rows)) {
              setOrders(rows as any);
              // Switch global base for subsequent calls
              setBaseOrigin(base);
              recovered = true;
              break;
            }
          } catch (e) {
            // try next fallback
          }
        }
        if (!recovered) {
          showAlert('Network Error', getApiErrorMessage(error, 'Unable to load your orders. Please try again.'), undefined, 'error');
        }
      } else {
        showAlert('Error', getApiErrorMessage(error, 'Failed to load your orders. Please try again.'), undefined, 'error');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'pending': '#fef3c7',
      'confirmed': '#dbeafe',
      'processing': '#ede9fe',
      'in_progress': '#ede9fe',
      'ready': '#d1fae5',
      'completed': '#d1fae5',
      'cancelled': '#fee2e2',
    };
    return statusColors[status.toLowerCase()] || '#e2e8f0';
  };

  const getStatusTextColor = (status: string) => {
    const textColors: { [key: string]: string } = {
      'pending': '#b45309',
      'confirmed': '#1d4ed8',
      'processing': '#7c3aed',
      'in_progress': '#7c3aed',
      'ready': '#047857',
      'completed': '#047857',
      'cancelled': '#b91c1c',
    };
    return textColors[status.toLowerCase()] || '#475569';
  };

  const getStatusIconBackground = (status: string) => {
    const iconBackgrounds: { [key: string]: string } = {
      'pending': '#f59e0b',
      'confirmed': '#3b82f6',
      'processing': '#8b5cf6',
      'in_progress': '#8b5cf6',
      'ready': '#10b981',
      'completed': '#10b981',
      'cancelled': '#ef4444',
    };
    return iconBackgrounds[status.toLowerCase()] || '#64748b';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const getShopLogoUri = (shopId: number) => {
    const rawLogo = shopLogos[shopId];
    if (!rawLogo) return null;

    const logoValue = String(rawLogo).trim();
    if (!logoValue) return null;
    if (logoValue.startsWith('http')) return logoValue;
    if (logoValue.startsWith('/')) return `${API_CONFIG.BASE_ORIGIN}${logoValue}`;
    return `${API_CONFIG.BASE_ORIGIN}/${logoValue.replace(/^\/+/, '')}`;
  };

  const getShopInitials = (shopName?: string) => {
    const safeName = (shopName || '').trim();
    if (!safeName) return 'S';

    const words = safeName.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  const getScheduledDate = (order: OrderItem) => {
    const isPickup = (order.booking_type || '').toLowerCase().includes('pick');
    return isPickup ? order.pickup_date : order.booking_date;
  };

  const getCreatedTimestamp = (order: OrderItem) => {
    const timestamp = order.created_at ? Date.parse(order.created_at) : NaN;
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  const getFilteredOrders = () => {
    // Exclude cancelled from My Orders listing; they will appear in Transaction History screen
    let filtered = orders.filter(o => (o.booking_status || '').toLowerCase() !== 'cancelled');
    // Filter by order type
    if (orderType !== 'all') {
      filtered = filtered.filter(order => {
        if (orderType === 'walkin') {
          return order.booking_type?.toLowerCase() === 'walk in';
        } else if (orderType === 'pickup') {
          return order.booking_type?.toLowerCase() === 'pick up' || order.booking_type?.toLowerCase() === 'pickup';
        }
        return true;
      });
    }
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.booking_status.toLowerCase() === filterStatus);
    }
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      filtered = filtered.filter(order => [
        order.booking_id,
        order.shop_name,
        order.service_name,
        order.service_description,
        order.booking_status,
        order.payment_method,
        order.payment_status,
        order.booking_date,
        order.pickup_date,
      ].some(value => String(value ?? '').toLowerCase().includes(normalizedQuery)));
    }
    return filtered.sort((a, b) => {
      const timestampDifference = getCreatedTimestamp(b) - getCreatedTimestamp(a);
      return timestampDifference || b.booking_id - a.booking_id;
    });
  };

  const getStatusMessage = (status: string) => {
    const key = status.toLowerCase();
    const messages: { [key: string]: string } = {
      'pending': 'Waiting for confirmation',
      'confirmed': 'Your booking is confirmed',
      'processing': 'Laundry in progress', // alias for walk-in stepper
      'in_progress': 'Laundry in progress',
      'ready': 'Ready for pickup/delivery',
      'completed': 'Service completed',
      'cancelled': 'Booking cancelled',
    };
    return messages[key] || 'Status unknown';
  };

  const renderFilterButton = (status: string, label: string) => (
    <TouchableOpacity
      key={status}
      style={[
        styles.filterButton,
        filterStatus === status && styles.activeFilterButton,
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filterStatus === status && styles.activeFilterButtonText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const openReceiptFromOrder = (item: OrderItem) => {
    const bookingType = (item.booking_type || '').toLowerCase() === 'pick up' || (item.booking_type || '').toLowerCase() === 'pickup'
      ? 'Pick up'
      : 'Walk in';

    navigation.navigate('MyBookingReceipt', {
      booking_id: item.booking_id,
      receiptNumber: `ELB-${String(item.booking_id).padStart(5, '0')}`,
      booking_type: bookingType,
      serviceName: item.service_name || 'Laundry Service',
      servicePrice: Number(item.total_amount || 0),
      selectedDate: getScheduledDate(item) || new Date().toISOString(),
      payment: (item.payment_method || 'cash').toLowerCase() === 'gcash' ? 'gcash' : (item.payment_method || 'cash').toLowerCase() === 'cash' ? 'cash' : 'cod',
      pickUpFee: 0,
      total: Number(item.total_amount || 0),
      shop_name: item.shop_name || 'Shop',
      customerName: item.customer_first_name || 'Customer',
      customerLastName: item.customer_last_name || '',
      paymentStatus: item.payment_status === 'paid' ? 'paid' : 'pending',
    });
  };

  const renderOrderItem = ({ item, index }: { item: OrderItem; index: number }) => {
    const shopLogoUri = getShopLogoUri(item.shop_id);
    const shopInitials = getShopInitials(item.shop_name);
    const statusKey = (item.booking_status || '').toLowerCase();
    const isPending = statusKey === 'pending';
    const isCompleted = statusKey === 'completed';
    const isProcessing = statusKey.includes('progress') || statusKey.includes('process');

    return (
      <Animated.View style={[styles.orderCard, { opacity: 1 }]}> 
        {/* Common header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>BKG-#{item.booking_id}</Text>
            <Text style={styles.orderDate}>{formatDate(getScheduledDate(item))}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: getStatusColor(item.booking_status),
              borderColor: getStatusTextColor(item.booking_status),
            },
          ]}> 
            {isPending && (
              <View style={[styles.statusBadgeIcon, { backgroundColor: getStatusIconBackground(item.booking_status) }]}> 
                <Icons.Clock size={12} color="#fff" />
              </View>
            )}
            {isCompleted && (
              <View style={[styles.statusBadgeIcon, { backgroundColor: getStatusIconBackground(item.booking_status) }]}> 
                <Icons.Check size={12} color="#fff" />
              </View>
            )}
            {isProcessing && (
              <Animated.View style={[styles.processingIndicator, { backgroundColor: getStatusIconBackground(item.booking_status), transform: [{ rotate: processingRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
                <View style={styles.processingIndicatorDot} />
              </Animated.View>
            )}
            <Text style={[styles.statusText, { color: getStatusTextColor(item.booking_status) }]}>{item.booking_status}</Text>
          </View>
        </View>

        {/* Shared basic details */}
        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Icons.Home size={16} color="#2d79d1" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Shop</Text>
              <View style={styles.shopNameRow}>
                <View style={styles.shopAvatar}>
                  {shopLogoUri ? (
                    <Image source={{ uri: shopLogoUri }} style={styles.shopAvatarImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.shopAvatarPlaceholder}>
                      <Text style={styles.shopAvatarText}>{shopInitials}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.detailValue} numberOfLines={2}>{item.shop_name}</Text>
              </View>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Icons.Package size={16} color="#2d79d1" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Service Type</Text>
              <Text style={styles.detailValue}>{item.booking_type}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Icons.Wallet size={16} color="#2d79d1" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>{formatAmount(item.total_amount)}</Text>
            </View>
          </View>
        </View>

        {/* Type-specific UI: only show pickup stepper inline; walk-in tracking moved to details screen */}
        {item.booking_type?.toLowerCase() !== 'walk in' && (
          <>
            <View style={styles.stepperSection}>
              <Text style={styles.stepperTitle}>Booking Progress</Text>
              <WalkInStepper status={normalizeWalkInStatus(item.booking_status) as 'pending' | 'confirmed' | 'processing' | 'completed'} />
            </View>
            {statusKey !== 'pending' && (
              <View style={styles.stepperSection}>
                <Text style={styles.stepperTitle}>Pickup & Delivery Progress</Text>
                <PickupStepper status={normalizePickupStatus(item.delivery_status || 'pending') as any} />
              </View>
            )}
          </>
        )}

        {/* Payment (if available) */}
        {item.payment_method && (
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Icons.Card size={16} color="#2d79d1" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Payment</Text>
              <View style={styles.paymentContainer}>
                <Text style={styles.detailValue}>{item.payment_method?.toUpperCase()}</Text>
                {item.payment_status && (
                  <View style={[styles.paymentStatusBadge, { backgroundColor: item.payment_status === 'paid' ? '#10b981' : '#f59e0b' }]}>
                    <Text style={styles.paymentStatusText}>{item.payment_status === 'paid' ? 'PAID' : 'PENDING'}</Text>
                  </View>
                )}
                {item.refund_status && (
                  <Text style={styles.paymentStatusText}>
                    {item.refund_status === 'succeeded' ? 'REFUND SUCCESSFUL' : item.refund_status === 'failed' ? 'REFUND FAILED' : 'REFUND PROCESSING'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.orderActions}>
          <TouchableOpacity
            style={[styles.trackButton, { flex: 1 }]}
            onPress={() => {
              if (item.booking_type?.toLowerCase() === 'walk in') {
                navigation.navigate('WalkInBookingDetails', { bookingId: item.booking_id });
              } else {
                navigation.navigate('PickupBookingDetails', { bookingId: item.booking_id });
              }
            }}
          >
            <View style={styles.trackButtonContent}>
              <Icons.Info size={16} color="#fff" />
              <Text style={styles.trackButtonText}>View Details</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.receiptButton, { flex: 1 }]}
            onPress={() => openReceiptFromOrder(item)}
          >
            <View style={styles.trackButtonContent}>
              <Icons.Receipt size={16} color="#fff" />
              <Text style={styles.trackButtonText}>View Receipt</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };
    
  // Walk-in 4-step progress component
  const WalkInStepper: React.FC<{ status: 'pending' | 'confirmed' | 'processing' | 'completed' }> = ({ status }) => {
    const steps = ['Pending', 'Confirmed', 'Processing', 'Completed'];
    const stepIndex = { pending: 0, confirmed: 1, processing: 2, completed: 3 }[status] ?? 0;
    return (
      <View style={styles.stepperContainer}>
        <View style={styles.stepperRow}>
          {steps.map((label, idx) => (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepDot, idx <= stepIndex ? styles.stepDotActive : styles.stepDotInactive]} />
              {idx < steps.length - 1 && (
                <View style={[styles.stepLine, idx < stepIndex ? styles.stepLineActive : styles.stepLineInactive]} />
              )}
              <Text style={[styles.stepLabel, idx <= stepIndex ? styles.stepLabelActive : styles.stepLabelInactive]}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.statusMessageContainer}>
          <Text style={styles.statusMessage}>{getStatusMessage(status)}</Text>
        </View>
      </View>
    );
  };

  // Pickup stepper (delivery-style)
  const PickupStepper: React.FC<{ status: string }> = ({ status }) => {
    const steps = ['Pending', 'Out for Pickup', 'Picked Up', 'At Shop', 'Ready for Delivery', 'Out for Delivery', 'Delivered'];
    const stepIndex = { pending: 0, out_for_pickup: 1, picked_up: 2, at_shop: 3, ready_for_delivery: 4, out_for_delivery: 5, delivered: 6 }[status] ?? 0;
    return (
      <View style={styles.stepperContainer}>
        <View style={styles.stepperRow}>
          {steps.map((label, idx) => (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepDot, idx <= stepIndex ? styles.stepDotActive : styles.stepDotInactive]} />
              {idx < steps.length - 1 && (
                <View style={[styles.stepLine, idx < stepIndex ? styles.stepLineActive : styles.stepLineInactive]} />
              )}
              <Text style={[styles.stepLabel, idx <= stepIndex ? styles.stepLabelActive : styles.stepLabelInactive]}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.statusMessageContainer}>
          <Text style={styles.statusMessage}>
            {status === 'out_for_delivery' ? 'Your laundry is on the way.' : status === 'delivered' ? 'Your laundry has been delivered.' : 'Pickup and delivery status'}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer} />
      <Text style={styles.emptyTitle}>No Orders Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your laundry orders will appear here once you make a booking.
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => navigation.navigate('Home')}
      >
        <LinearGradient
          colors={['#2d79d1', '#6bd0d7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.browseButtonGradient}
        >
          <Text style={styles.browseButtonText}>Book a Laundry</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingSkeleton = () => (
    <View style={styles.loadingSkeletonList}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonHeaderRow}>
            <View style={[styles.skeletonBlock, styles.skeletonBookingId]}>
              <Animated.View style={[styles.skeletonShimmer, { transform: [{ translateX: skeletonTranslate }] }]} />
            </View>
            <View style={[styles.skeletonBlock, styles.skeletonStatus]}>
              <Animated.View style={[styles.skeletonShimmer, { transform: [{ translateX: skeletonTranslate }] }]} />
            </View>
          </View>
          <View style={[styles.skeletonBlock, styles.skeletonWide]}>
            <Animated.View style={[styles.skeletonShimmer, { transform: [{ translateX: skeletonTranslate }] }]} />
          </View>
          <View style={[styles.skeletonBlock, styles.skeletonMedium]}>
            <Animated.View style={[styles.skeletonShimmer, { transform: [{ translateX: skeletonTranslate }] }]} />
          </View>
          <View style={[styles.skeletonBlock, styles.skeletonShort]}>
            <Animated.View style={[styles.skeletonShimmer, { transform: [{ translateX: skeletonTranslate }] }]} />
          </View>
          <View style={styles.skeletonActionsRow}>
            <View style={[styles.skeletonBlock, styles.skeletonAction]} />
            <View style={[styles.skeletonBlock, styles.skeletonAction]} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6bd0d7', '#2d79d1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
        >
          <Image 
            source={require('../assets/img/icon/back.png')} 
            style={styles.backIcon} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Icons.Search size={19} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search ID, shop, service, status, payment, or date"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search bookings"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear booking search"
            style={styles.clearSearchButton}
          >
            <Text style={styles.clearSearchText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Order Type Segmented Control */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentInner}>
          {([
            { key: 'all', label: 'All', icon: <Icons.Home size={14} color="#64748b" /> },
            { key: 'walkin', label: 'Walk In', icon: <Icons.Calendar size={14} color="#64748b" /> },
            { key: 'pickup', label: 'Pickup', icon: <Icons.Truck size={14} color="#64748b" /> },
          ] as const).map((item) => {
            const isActive = orderType === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.segmentItem, isActive && styles.segmentItemActive]}
                onPress={() => setOrderType(item.key as 'all' | 'walkin' | 'pickup')}
              >
                <View style={styles.segmentContent}>
                  {React.cloneElement(item.icon, { color: isActive ? '#1e293b' : '#64748b' })}
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                    {item.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Status filters removed as requested */}

      {/* Orders List */}
      {loading ? (
        renderLoadingSkeleton()
      ) : (
        <FlatList
          data={getFilteredOrders()}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.booking_id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2d79d1']}
              tintColor="#2d79d1"
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  segmentContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  segmentInner: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segmentItemActive: {
    backgroundColor: '#fff',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#1e293b',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 35,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  backIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 2,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#1e293b',
    fontSize: 15,
  },
  clearSearchButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  clearSearchText: {
    color: '#64748b',
    fontSize: 22,
    lineHeight: 24,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#2d79d1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingSkeletonList: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  skeletonHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  skeletonBlock: {
    height: 12,
    borderRadius: 8,
    backgroundColor: '#e8eef5',
    overflow: 'hidden',
  },
  skeletonBookingId: {
    width: '38%',
  },
  skeletonStatus: {
    width: '24%',
  },
  skeletonWide: {
    width: '72%',
    marginBottom: 18,
  },
  skeletonMedium: {
    width: '52%',
    marginBottom: 18,
  },
  skeletonShort: {
    width: '35%',
    marginBottom: 22,
  },
  skeletonActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonAction: {
    flex: 1,
    height: 38,
    borderRadius: 10,
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -260,
    width: 180,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderIdContainer: {
    flex: 1,
  },
  orderIdLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 0.8,
    gap: 6,
  },
  statusBadgeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.55,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  processingIndicatorDot: {
    position: 'absolute',
    top: 3,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  orderDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  detailIcon: {
    fontSize: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shopAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  shopAvatarImage: {
    width: '100%',
    height: '100%',
  },
  shopAvatarPlaceholder: {
    flex: 1,
    backgroundColor: '#2d79d1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d79d1',
  },
  paymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  statusMessageContainer: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusMessage: {
    fontSize: 14,
    color: '#0369a1',
    textAlign: 'center',
    fontWeight: '500',
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  trackButton: {
    flex: 1,
    backgroundColor: '#2d79d1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  receiptButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  trackButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  reorderButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  reorderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  browseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 160,
  },
  browseButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Stepper styles
  stepperContainer: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  stepperSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  stepperTitle: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  stepDotActive: {
    backgroundColor: '#2d79d1',
  },
  stepDotInactive: {
    backgroundColor: '#e2e8f0',
  },
  stepLine: {
    position: 'absolute',
    top: 6 - 1, // center line to dot
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#e2e8f0',
  },
  stepLineActive: {
    backgroundColor: '#2d79d1',
  },
  stepLineInactive: {
    backgroundColor: '#e2e8f0',
  },
  stepLabel: {
    marginTop: 6,
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#1e293b',
  },
  stepLabelInactive: {
    color: '#94a3b8',
  },
});