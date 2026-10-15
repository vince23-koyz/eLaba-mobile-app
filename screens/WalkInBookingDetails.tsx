import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/Navigator';
import axios from 'axios';
import { api, API_ENDPOINTS, setBaseOrigin, FALLBACK_ORIGINS } from '../config/api';
import { useAlert } from '../context/AlertContext';
import socketService from '../services/socketService';
import { useUserData } from '../hook/useUserData';

type Order = {
  booking_id: number;
  booking_type: string;
  booking_date: string;
  booking_status: string;
  total_amount: number;
  service_name?: string | null;
  shop_id: number;
  shop_name: string;
  customer_id: number;
  payment_method?: string;
  payment_status?: string;
};

const isPaidGcash = (order: Order) =>
  (order.payment_method || '').toLowerCase() === 'gcash' &&
  ['paid', 'success', 'succeeded', 'completed'].includes((order.payment_status || '').toLowerCase());

type RescheduleRequest = {
  reschedule_id: number;
  requested_date: string;
  reason?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
};

type Props = NativeStackScreenProps<RootStackParamList, 'WalkInBookingDetails'>;

const WalkInBookingDetails: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const { showAlert } = useAlert();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { userData } = useUserData();
  const skeletonShimmer = useRef(new Animated.Value(0)).current;
  const skeletonTranslate = skeletonShimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-260, 260],
  });

  useEffect(() => {
    if (!loading) {
      return;
    }

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
  }, [loading, skeletonShimmer]);

  const normalizeStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending')) return 'pending';
    if (s.includes('confirm')) return 'confirmed';
    if (s.includes('progress') || s.includes('process')) return 'processing';
    if (s.includes('complete')) return 'completed';
    if (s.includes('cancel')) return 'cancelled';
    return 'pending';
  };

  type WalkInStep = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
  const status = normalizeStatus(order?.booking_status || 'pending') as WalkInStep;
  const [rescheduleRequest, setRescheduleRequest] = useState<RescheduleRequest | null>(null);
  const steps = ['Pending', 'Confirmed', 'Processing', 'Completed'];
  const stepMap: Record<Exclude<WalkInStep, 'cancelled'>, number> = {
    pending: 0,
    confirmed: 1,
    processing: 2,
    completed: 3,
  };
  const stepIndex = stepMap[(status === 'cancelled' ? 'pending' : status) as Exclude<WalkInStep, 'cancelled'>];

  const getStatusMessage = (key: string) => {
    if (key === 'confirmed' && rescheduleRequest?.status === 'Pending') {
      return 'Your booking is confirmed. Reschedule request is pending staff review.';
    }
    if (key === 'confirmed' && rescheduleRequest?.status === 'Approved') {
      return 'Your booking is confirmed. Please bring your laundry on the new assigned date.';
    }
    if (key === 'confirmed' && rescheduleRequest?.status === 'Rejected') {
      return 'Your booking is confirmed. Please bring your laundry on the current booking date.';
    }
    const messages: { [key: string]: string } = {
      pending: 'Waiting for confirmation',
      confirmed: 'Your booking is confirmed. Please bring your laundry on the scheduled date.',
      processing: 'Laundry in progress',
      completed: 'Service completed',
      cancelled: 'Booking cancelled',
    };
    return messages[key] || 'Status unknown';
  };

  const fetchOrder = useMemo(() => {
    return async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        // Fetch by ID (support both raw object and wrapped data)
        const res = await api.get(`${API_ENDPOINTS.BOOKINGS.BASE}/${bookingId}`);
        const payload = res?.data;
        const orderData = payload && typeof payload === 'object' && !Array.isArray(payload)
          ? (payload.booking_id ? payload : payload.data)
          : null;
        if (orderData && orderData.booking_id) {
          setOrder(orderData as Order);
        } else {
          setOrder(null);
        }
      } catch (e: any) {
        const isNetworkError = !e?.response;
        if (e?.response?.status === 404) {
          setOrder(null);
        } else if (isNetworkError) {
          // Network failover to local dev servers
          const fallbacks = FALLBACK_ORIGINS;
          let recovered = false;
          for (const base of fallbacks) {
            try {
              const url = `${base}/api/bookings/${bookingId}`;
              const resp = await axios.get(url);
              const payload = resp?.data;
              const orderData = payload && typeof payload === 'object' && !Array.isArray(payload)
                ? (payload.booking_id ? payload : payload.data)
                : null;
              if (orderData && orderData.booking_id) {
                setOrder(orderData as Order);
                setBaseOrigin(base);
                recovered = true;
                break;
              }
            } catch {}
          }
          if (!recovered && !silent) {
            showAlert('Network Error', 'Unable to reach the server. Please try again later.', undefined, 'error');
          }
        } else if (!silent) {
          const msg = e?.response?.data?.message || 'Failed to load order';
          showAlert('Error', msg, undefined, 'error');
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    };
  }, [bookingId, showAlert]);

  useEffect(() => {
    // Initial load
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrder(true);
    });

    return unsubscribe;
  }, [fetchOrder, navigation]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchOrder(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchOrder]);

  // Realtime: connect and subscribe to booking updates and in-app notifications
  useEffect(() => {
    const customerId = userData?.customerId || null;
    if (customerId && !socketService.isConnected()) {
      try {
        socketService.connect(customerId, 'customer');
      } catch (e) {
        // non-fatal
      }
    }

    const onBookingUpdated = (payload: { bookingId?: number; booking_id?: number; status?: string; booking_status?: string; booking_date?: string; payment_status?: string; payment_method?: string }) => {
      if (!payload) return;
      const incomingBookingId = Number(payload.bookingId ?? payload.booking_id);
      if (!incomingBookingId || incomingBookingId !== Number(bookingId)) return;

      setOrder((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (payload.booking_status) next.booking_status = payload.booking_status;
        else if (payload.status) next.booking_status = payload.status;
        if (payload.booking_date) next.booking_date = payload.booking_date;
        if (payload.payment_status) next.payment_status = payload.payment_status;
        if (payload.payment_method) next.payment_method = payload.payment_method;
        return next;
      });

      // Refetch to keep all fields in sync
      fetchOrder(true);
    };
    const onNewNotif = (notif: any) => {
      const nBookingId = Number(notif?.booking_id || notif?.bookingId);
      const isPaymentUpdate = notif?.type === 'payment_status_updated' || notif?.message === 'Payment status updated';
      if ((nBookingId && nBookingId === Number(bookingId)) || isPaymentUpdate) {
        fetchOrder(true);
      }
    };

    socketService.onBookingUpdated(onBookingUpdated);
    socketService.onNewNotification(onNewNotif);

    return () => {
      socketService.offBookingUpdated();
      socketService.offNewNotification();
    };
  }, [bookingId, fetchOrder, userData?.customerId]);

  const fetchRescheduleRequest = useCallback(async () => {
    if (!userData?.customerId) return;
    try {
      const response = await api.get(`${API_ENDPOINTS.BOOKINGS.RESCHEDULE(bookingId)}?customer_id=${userData.customerId}`);
      setRescheduleRequest(response.data || null);
    } catch {
      setRescheduleRequest(null);
    }
  }, [bookingId, userData?.customerId]);

  useEffect(() => {
    fetchRescheduleRequest();
  }, [fetchRescheduleRequest]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchRescheduleRequest);
    return unsubscribe;
  }, [fetchRescheduleRequest, navigation]);

  useEffect(() => {
    const onRescheduleReviewed = (payload: { bookingId?: number; booking_id?: number; status?: 'Approved' | 'Rejected' }) => {
      const incomingBookingId = Number(payload?.bookingId ?? payload?.booking_id);
      if (!incomingBookingId || incomingBookingId !== Number(bookingId) || !payload.status) return;

      setRescheduleRequest((previous) => previous ? { ...previous, status: payload.status as RescheduleRequest['status'] } : previous);
      fetchOrder(true);
      fetchRescheduleRequest();
    };

    socketService.onRescheduleReviewed(onRescheduleReviewed);
    return () => socketService.offRescheduleReviewed();
  }, [bookingId, fetchOrder, fetchRescheduleRequest]);

  const formatDateOnly = (value: string) => value.split('T')[0];

  const canReschedule = status === 'pending';

  const renderSkeletonBlock = (style: object) => (
    <View style={[styles.skeletonBlock, style]}>
      <Animated.View
        style={[styles.skeletonShimmer, { transform: [{ translateX: skeletonTranslate }] }]}
      />
    </View>
  );

  const renderLoadingSkeleton = () => (
    <>
      <View style={styles.card}>
        {renderSkeletonBlock(styles.skeletonTitle)}
        <View style={styles.skeletonStepper}>
          {steps.map((step) => (
            <View key={step} style={styles.skeletonStep}>
              {renderSkeletonBlock(styles.skeletonDot)}
              {renderSkeletonBlock(styles.skeletonStepLabel)}
            </View>
          ))}
        </View>
        {renderSkeletonBlock(styles.skeletonMessage)}
      </View>
      <View style={styles.card}>
        {renderSkeletonBlock(styles.skeletonTitle)}
        {renderSkeletonBlock(styles.skeletonRow)}
        {renderSkeletonBlock(styles.skeletonRow)}
        {renderSkeletonBlock(styles.skeletonRow)}
        {renderSkeletonBlock(styles.skeletonRow)}
      </View>
    </>
  );

  const handleCancel = () => {
    if (!order) return;
    if (status !== 'pending') {
      showAlert('Not allowed', 'You can only cancel a booking while it is pending staff confirmation.', undefined, 'warning');
      return;
    }
    showAlert(
      'Cancel Booking',
      `Are you sure you want to cancel Order #${order.booking_id}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          primary: true,
          onPress: async () => {
            try {
              const response = await api.patch(`${API_ENDPOINTS.BOOKINGS.BASE}/${order.booking_id}/status`, {
                status: 'cancelled',
                customer_id: order.customer_id,
              });
              setOrder({ ...order, booking_status: 'cancelled' as any });
              if (isPaidGcash(order)) {
                const refundStatus = String(response.data?.refund?.status || '').toLowerCase();
                const refundMessage = response.data?.refund_error || refundStatus === 'failed'
                  ? 'Your booking was cancelled, but the automatic refund failed to start. Check Refunds for its status.'
                  : refundStatus === 'succeeded'
                    ? 'Your booking was cancelled and the GCash refund succeeded.'
                    : refundStatus
                      ? 'Your booking was cancelled and the automatic GCash refund is being processed. Check Refunds for its status.'
                      : 'Your booking was cancelled. The system will handle the refund when the GCash payment is confirmed.';
                showAlert(
                  'Booking Cancelled',
                  refundMessage,
                  [
                    { text: 'Done', style: 'cancel', onPress: () => navigation.goBack() },
                    { text: 'View Refunds', primary: true, onPress: () => navigation.navigate('Transaction', { initialTab: 'refunds' }) },
                  ],
                  'success'
                );
              } else {
                showAlert('Cancelled', 'Your booking has been cancelled.', [
                  { text: 'OK', primary: true, onPress: () => navigation.goBack() }
                ], 'success');
              }
            } catch (e: any) {
              showAlert('Error', e?.response?.data?.message || 'Failed to cancel booking', undefined, 'error');
            }
          },
        },
      ],
      'confirm'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#6bd0d7', '#2d79d1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Image source={require('../assets/img/icon/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{bookingId}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading ? (
        renderLoadingSkeleton()
      ) : !order ? (
        <View style={styles.card}><Text>Order not found</Text></View>
      ) : status !== 'cancelled' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Walk-in Progress</Text>
          <View style={styles.stepperRow}>
            {steps.map((label, idx) => (
              <View key={label} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepDot,
                    idx <= stepIndex ? styles.stepDotActive : undefined,
                    idx === stepIndex ? styles.stepDotCurrent : undefined,
                  ]}
                />
                {idx < steps.length - 1 && (
                  <View style={[styles.stepLine, idx < stepIndex ? styles.stepLineActive : undefined]} />
                )}
                <Text
                  style={[
                    styles.stepLabel,
                    idx <= stepIndex ? styles.stepLabelActive : undefined,
                    idx === stepIndex ? styles.stepLabelCurrent : undefined,
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.statusMessageContainer}>
            <Text style={styles.statusMessage}>{getStatusMessage(status)}</Text>
          </View>
        </View>
      )}

      {order && (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Details</Text>
        <View style={styles.row}><Text style={styles.label}>Shop</Text><Text style={styles.value}>{order.shop_name}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Service</Text><Text style={styles.value}>{order.service_name || 'Not specified'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Date</Text><Text style={styles.value}>{new Date(order.booking_date).toLocaleDateString()}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Amount</Text><Text style={styles.value}>₱{Number(order.total_amount).toFixed(2)}</Text></View>
        {rescheduleRequest && (
          <View style={styles.rescheduleStatus}>
            <Text style={styles.label}>Reschedule Request</Text>
            <Text style={styles.value}>{rescheduleRequest.status} - {formatDateOnly(rescheduleRequest.requested_date)}</Text>
          </View>
        )}
        {/* Hide payment info when cancelled */}
        {status !== 'cancelled' && order.payment_method ? (
          <View style={styles.row}><Text style={styles.label}>Payment</Text><Text style={styles.value}>{order.payment_method?.toUpperCase()} {order.payment_status ? `(${order.payment_status})` : ''}</Text></View>
        ) : null}

        {/* Actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          {status !== 'cancelled' && canReschedule && rescheduleRequest?.status !== 'Pending' && (
            <TouchableOpacity
              onPress={() => navigation.navigate('RescheduleBooking', { bookingId: order.booking_id })}
              style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#2d79d1', borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Reschedule</Text>
            </TouchableOpacity>
          )}
          {status === 'pending' && (
            <TouchableOpacity
              onPress={handleCancel}
              style={{ paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#ef4444', borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    width: 300,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalIconCircle: {
    backgroundColor: '#e0f2fe',
    borderRadius: 32,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 36,
    height: 36,
    tintColor: '#2d79d1',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#2d79d1',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  reasonInput: {
    width: '100%',
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  reasonActions: { flexDirection: 'row', gap: 8 },
  secondaryModalButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  secondaryModalButtonText: { color: '#334155', fontWeight: '700' },
  rescheduleStatus: { backgroundColor: '#f0f9ff', padding: 10, borderRadius: 8, marginVertical: 4 },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 35, paddingBottom: 15, paddingHorizontal: 15 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  backIcon: { width: 24, height: 24, resizeMode: 'contain', tintColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  card: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, elevation: 2 },
  skeletonBlock: { height: 12, borderRadius: 8, backgroundColor: '#e8eef5', overflow: 'hidden' },
  skeletonShimmer: { position: 'absolute', top: 0, bottom: 0, left: -260, width: 180, backgroundColor: 'rgba(255,255,255,0.7)' },
  skeletonTitle: { width: '42%', height: 16, marginBottom: 18 },
  skeletonStepper: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  skeletonStep: { flex: 1, alignItems: 'center', gap: 8 },
  skeletonDot: { width: 14, height: 14, borderRadius: 7 },
  skeletonStepLabel: { width: '70%' },
  skeletonMessage: { width: '100%', height: 38, borderRadius: 10 },
  skeletonRow: { width: '100%', height: 30, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  stepItem: { flex: 1, alignItems: 'center', position: 'relative' },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e2e8f0' },
  stepDotActive: { backgroundColor: '#2d79d1' },
  stepDotCurrent: { width: 16, height: 16, borderRadius: 8 },
  stepLine: { position: 'absolute', top: 5, left: '50%', right: '-50%', height: 2, backgroundColor: '#e2e8f0' },
  stepLineActive: { backgroundColor: '#2d79d1' },
  stepLabel: { marginTop: 6, fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  stepLabelActive: { color: '#1e293b' },
  stepLabelCurrent: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  statusMessageContainer: { backgroundColor: '#f0f9ff', padding: 12, borderRadius: 12, marginTop: 8 },
  statusMessage: { fontSize: 14, color: '#0369a1', textAlign: 'center', fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { color: '#64748b', fontSize: 12 },
  value: { color: '#1e293b', fontWeight: '600' },
});

export default WalkInBookingDetails;
