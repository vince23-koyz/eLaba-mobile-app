import { Animated, Easing, StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS } from '../config/api';
import { useUserData } from '../hook/useUserData';
import socketService from '../services/socketService';

type TransactionRoute = NativeStackScreenProps<RootStackParamList, 'Transaction'>['route'];

type Order = {
  booking_id: number;
  booking_type: string;
  booking_date: string;
  pickup_date?: string;
  booking_status: string;
  total_amount: number;
  shop_id: number;
  shop_name: string;
  customer_id: number;
  service_name?: string;
  payment_method?: string;
  payment_status?: string;
  refund_id?: number;
  refund_amount?: number;
  refund_status?: string;
  date?: string; // payment date
};

export default function TransactionHistory() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<TransactionRoute>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'refunds'>(route.params?.initialTab || 'history');
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-220, 220],
  });
  const { userData } = useUserData();
  const customerFullName = [userData.customerName, userData.customerLastName].filter(Boolean).join(' ');

  useEffect(() => {
    AsyncStorage.getItem('customerId').then(id => {
      if (id) setCustomerId(parseInt(id));
    });
  }, []);

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

  const fetchOrders = useCallback(async (showLoading = true) => {
    if (!customerId) return;
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const res = await api.get(API_ENDPOINTS.BOOKINGS.BASE, { params: { customer_id: customerId } });
      const list: Order[] = Array.isArray(res.data) ? res.data : [];
      const visibleOrders = list.filter(order => (order.booking_status || '').trim().toLowerCase() !== 'pending');
      const refundsToSync = visibleOrders.filter(order =>
        order.refund_id && ['pending', 'processing'].includes((order.refund_status || '').toLowerCase())
      );
      const syncResults = await Promise.all(refundsToSync.map(async order => {
        try {
          const statusResponse = await api.get(
            API_ENDPOINTS.PAYMENTS.REFUND_STATUS(order.booking_id, customerId)
          );
          return { bookingId: order.booking_id, status: statusResponse.data?.refund?.status };
        } catch {
          return null;
        }
      }));
      const syncedStatuses = new Map(
        syncResults
          .filter((result): result is { bookingId: number; status: string } => Boolean(result?.status))
          .map(result => [result.bookingId, result.status])
      );
      setOrders(visibleOrders.map(order => ({
        ...order,
        refund_status: syncedStatuses.get(order.booking_id) || order.refund_status,
      })));
      if (!Array.isArray(res.data)) {
        setError('Failed to load transactions');
      }
    } catch (e) {
      setOrders([]);
      setError('Failed to load transactions');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const hasActiveRefund = orders.some(order =>
      ['pending', 'processing'].includes((order.refund_status || '').toLowerCase())
    );
    if (activeTab !== 'refunds' || !hasActiveRefund) return;

    const intervalId = setInterval(() => fetchOrders(false), 12000);
    return () => clearInterval(intervalId);
  }, [activeTab, fetchOrders, orders]);

  useEffect(() => {
    if (!customerId) return;
    if (!socketService.isConnected()) {
      socketService.connect(String(customerId), 'customer');
    }

    const refreshForRefundUpdate = (payload: { bookingId?: number; booking_id?: number }) => {
      const bookingId = payload.bookingId ?? payload.booking_id;
      if (!bookingId || orders.some((order) => order.booking_id === bookingId)) {
        fetchOrders();
      }
    };

    socketService.onRefundUpdated(refreshForRefundUpdate);
    return () => socketService.offRefundUpdated();
  }, [customerId, fetchOrders, orders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const formatDate = (d?: string) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString();
    } catch { return d; }
  };

  const formatAmount = (n?: number) => n != null ? `₱${Number(n).toFixed(2)}` : '-';

  const getScheduledDate = (order: Order) => {
    const isPickup = ['pick up', 'pickup'].includes((order.booking_type || '').toLowerCase());
    return (isPickup ? order.pickup_date : order.booking_date) || order.booking_date || order.pickup_date;
  };


  const getTime = (o: Order) => {
    const d = o.date || getScheduledDate(o);
    const t = d ? Date.parse(d) : NaN;
    return Number.isNaN(t) ? 0 : t;
  };
  const sortedOrders = [...orders].sort((a, b) => getTime(b) - getTime(a));
  const refundableOrders = orders.filter((order) =>
    (order.booking_status || '').toLowerCase() === 'cancelled' &&
    (order.payment_method || '').toLowerCase() === 'gcash' &&
    ['paid', 'success', 'succeeded', 'completed'].includes((order.payment_status || '').toLowerCase())
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2d79d1"]} />}
    >
      <LinearGradient
        colors={['#a2fff4', '#96bcff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image source={require('../assets/img/icon/back.png')} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.title}>Transaction History</Text>
        </View>
        <View style={styles.toggleContainer}>
          <TouchableOpacity style={[styles.toggleButton, activeTab === 'history' && styles.toggleButtonActive]} onPress={() => setActiveTab('history')}>
            <Text style={[styles.toggleText, activeTab === 'history' && styles.toggleTextActive]}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleButton, activeTab === 'refunds' && styles.toggleButtonActive]} onPress={() => setActiveTab('refunds')}>
            <Text style={[styles.toggleText, activeTab === 'refunds' && styles.toggleTextActive]}>Refunds</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.form}>
          {loading ? (
            <View style={styles.skeletonList}>
              {Array.from({ length: 6 }).map((_, index) => (
                <View key={index} style={styles.skeletonCard}>
                  <View style={styles.skeletonRowTop}>
                    <View style={[styles.skeletonLine, { width: '55%' }]}>
                      <Animated.View
                        style={[
                          styles.skeletonShimmer,
                          { transform: [{ translateX: shimmerTranslate }] },
                        ]}
                      />
                    </View>
                    <View style={[styles.skeletonLine, { width: '25%' }]}>
                      <Animated.View
                        style={[
                          styles.skeletonShimmer,
                          { transform: [{ translateX: shimmerTranslate }] },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={[styles.skeletonLine, { width: '80%' }]}> 
                    <Animated.View
                      style={[
                        styles.skeletonShimmer,
                        { transform: [{ translateX: shimmerTranslate }] },
                      ]}
                    />
                  </View>
                  <View style={[styles.skeletonRow, { justifyContent: 'space-between' }]}> 
                    <View style={[styles.skeletonLine, { width: '45%' }]}>
                      <Animated.View
                        style={[
                          styles.skeletonShimmer,
                          { transform: [{ translateX: shimmerTranslate }] },
                        ]}
                      />
                    </View>
                    <View style={[styles.skeletonBadge, { width: '30%' }]}>
                      <Animated.View
                        style={[
                          styles.skeletonShimmer,
                          { transform: [{ translateX: shimmerTranslate }] },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : activeTab === 'refunds' ? (
            refundableOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No refunds yet</Text>
                <Text style={styles.emptyText}>Refunds for cancelled paid GCash bookings will appear here.</Text>
              </View>
            ) : refundableOrders.map((order) => {
              const refundStatus = (order.refund_status || '').toLowerCase();
              const hasRefundRecord = ['pending', 'processing', 'succeeded', 'failed'].includes(refundStatus);
              return (
                <View key={order.booking_id} style={styles.refundCard}>
                  <View style={styles.shopHeaderFull}>
                    <Text style={styles.shopName}>{order.shop_name}</Text>
                    <Text style={styles.refundCancelled}>CANCELLED</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.customer}>Booking #{order.booking_id}</Text>
                    <View style={styles.row}>
                      <Text style={styles.service}>{order.service_name || 'Laundry service'}</Text>
                      <Text style={styles.total}>{formatAmount(order.total_amount)}</Text>
                    </View>
                    {hasRefundRecord ? (
                      <View style={styles.refundStatusBox}>
                        <Text style={styles.refundStatusText}>{refundStatus === 'succeeded' ? 'REFUNDED' : `REFUND ${refundStatus.toUpperCase()}`}</Text>
                      </View>
                    ) : (
                      <View style={styles.refundStatusBox}>
                        <Text style={styles.refundStatusText}>REFUND STATUS UPDATING</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          ) : orders.length === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#64748b' }}>
                {error ? 'Unable to load transactions.' : 'You don’t have any transactions yet.'}
              </Text>
              {error ? <Text style={{ color: '#ff4d4f', marginTop: 8 }}>{error}</Text> : null}
            </View>
          ) : (
            sortedOrders.map(tx => {
              const status = (tx.booking_status || '').toLowerCase();
              let statusStyle = styles.statusPending;
              let statusLabel = tx.booking_status || 'Pending';
              if (status === 'cancelled') {
                statusStyle = styles.statusCancelled;
                statusLabel = 'Cancelled';
              } else if (status === 'completed' || status === 'confirmed') {
                statusStyle = styles.statusConfirmed;
                statusLabel = status === 'completed' ? 'Completed' : 'Confirmed';
              } else if (status === 'pending') {
                statusStyle = styles.statusPending;
                statusLabel = 'Pending';
              }

              return (
                <TouchableOpacity key={tx.booking_id} style={styles.transactionCard} activeOpacity={0.8}>
                  <View style={styles.shopHeaderFull}>
                    <Text style={styles.shopName}>{tx.shop_name}</Text>
                    <Text style={styles.date}>{formatDate(getScheduledDate(tx))}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.customer}>{customerFullName || 'Customer'}</Text>
                    <View style={styles.row}>
                      <Text style={styles.service}>Service: {tx.service_name || '—'}</Text>
                      <Text style={styles.total}>Total: {formatAmount(tx.total_amount)}</Text>
                    </View>
                    <View style={styles.row}>
                      {status === 'cancelled' ? (
                        <Text style={styles.pickup}>{tx.booking_type || 'Booking'}</Text>
                      ) : (
                        <Text style={styles.pickup}>{(tx.booking_type || 'Booking') + ': ' + formatDate(getScheduledDate(tx))}</Text>
                      )}
                      <Text style={statusStyle}>{statusLabel}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </LinearGradient>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  gradientBackground: {
    flex: 1,
    minHeight: '100%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
    marginRight: 24, // To offset the back button and center the title
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#2d79d1',
  },
  toggleText: {
    color: '#475569',
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  form: {
    backgroundColor: '#f6f6f6',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10, 
    elevation: 6,
    marginBottom: 20,
    height: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f3f8',
  },
  shopHeaderFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eaff',
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    letterSpacing: -0.2,
  },
  date: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
    backgroundColor: '#e8eaff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  cardContent: {
    padding: 16,
  },
  customer: {
    fontSize: 14,
    marginBottom: 10,
    color: '#4a5568',
    fontWeight: '600',
  },
  skeletonList: {
    paddingVertical: 8,
    minHeight: 700,
  },
  skeletonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e9eef7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  skeletonRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 8,
    backgroundColor: '#e8e8ef',
    marginBottom: 8,
    overflow: 'hidden',
  },
  skeletonBadge: {
    height: 12,
    borderRadius: 8,
    backgroundColor: '#e8e8ef',
    overflow: 'hidden',
  },
  skeletonShimmer: {
    position: 'absolute',
    left: -220,
    top: 0,
    bottom: 0,
    width: 220,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    alignItems: 'center',
  },
  service: {
    fontSize: 13,
    color: '#2d3748',
    fontWeight: '500',
  },
  total: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3748',
    backgroundColor: '#f0fff4',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c6f6d5',
  },
  pickup: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  statusConfirmed: {
    fontSize: 12,
    color: '#218838',
    fontWeight: '600',
    backgroundColor: '#eaf7ee',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#b7e4c2',
  },
  statusCancelled: {
    fontSize: 12,
    color: '#b42318',
    fontWeight: '600',
    backgroundColor: '#fff1f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#f5c2c0',
  },
  statusPending: {
    fontSize: 12,
    color: '#a15c00',
    fontWeight: '600',
    backgroundColor: '#fff7e6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#f2d39b',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 16,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  refundCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbe7f2',
    shadowColor: '#1e3a5f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  refundCancelled: {
    color: '#64748b',
    backgroundColor: '#eef2f6',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  refundStatusBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 13,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  refundStatusText: {
    color: '#1d4ed8',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.3,
  },
})