import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/Navigator';
import { api, API_ENDPOINTS } from '../config/api';
import { getDeliveries } from '../services/deliveryService';
import { useAlert } from '../context/AlertContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PickupBookingDetails'>;

type Booking = {
  booking_id: number;
  booking_type: string;
  booking_date: string;
  pickup_date?: string;
  booking_status: string;
  total_amount: number;
  customer_id: number;
  shop_name: string;
  service_name?: string;
  payment_method?: string;
  payment_status?: string;
};

const isPaidGcash = (booking: Booking) =>
  (booking.payment_method || '').toLowerCase() === 'gcash' &&
  ['paid', 'success', 'succeeded', 'completed'].includes((booking.payment_status || '').toLowerCase());

type Delivery = {
  pickup_address?: string;
  delivery_address?: string;
  delivery_time?: string;
  status?: string;
};

type BookingStatus = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled';
type DeliveryStatus = 'pending' | 'out_for_pickup' | 'picked_up' | 'at_shop' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered';

const PickupBookingDetails: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const { showAlert } = useAlert();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeBookingStatus = (value?: string): BookingStatus => {
    const status = (value || '').toLowerCase();
    if (status.includes('cancel')) return 'cancelled';
    if (status.includes('complete')) return 'completed';
    if (status.includes('process')) return 'processing';
    if (status.includes('confirm')) return 'confirmed';
    return 'pending';
  };

  const normalizeDeliveryStatus = (value?: string): DeliveryStatus => {
    const status = (value || '').toLowerCase().replace(/ /g, '_');
    if (status.includes('deliver') && status.includes('out')) return 'out_for_delivery';
    if (status.includes('ready_for_delivery')) return 'ready_for_delivery';
    if (status.includes('picked_up')) return 'picked_up';
    if (status.includes('at_shop')) return 'at_shop';
    if (status.includes('out_for_pickup')) return 'out_for_pickup';
    if (status.includes('pickup_scheduled')) return 'out_for_pickup';
    if (status.includes('deliver')) return 'delivered';
    return 'pending';
  };

  const fetchDetails = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [bookingResponse, deliveries] = await Promise.all([
        api.get(`${API_ENDPOINTS.BOOKINGS.BASE}/${bookingId}`),
        getDeliveries({ booking_id: bookingId }),
      ]);
      const bookingPayload = bookingResponse?.data;
      const bookingData = bookingPayload?.booking_id ? bookingPayload : bookingPayload?.data;
      const deliveryRows = Array.isArray(deliveries) ? deliveries : [];
      setBooking(bookingData?.booking_id ? bookingData : null);
      setDelivery(deliveryRows[0] || null);
    } catch (error: any) {
      if (!silent) {
        showAlert('Error', error?.response?.data?.message || 'Failed to load pickup booking.', undefined, 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [bookingId, showAlert]);

  useEffect(() => {
    fetchDetails();
    const intervalId = setInterval(() => fetchDetails(true), 5000);
    return () => clearInterval(intervalId);
  }, [fetchDetails]);

  const bookingStatus = normalizeBookingStatus(booking?.booking_status);
  const deliveryStatus = normalizeDeliveryStatus(delivery?.status);
  const bookingSteps: Array<{ key: BookingStatus; label: string }> = [
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'processing', label: 'Processing' },
    { key: 'completed', label: 'Completed' },
  ];
  const deliverySteps: Array<{ key: DeliveryStatus; label: string }> = [
    { key: 'pending', label: 'Pending' },
    { key: 'out_for_pickup', label: 'Out for Pickup' },
    { key: 'picked_up', label: 'Picked Up' },
    { key: 'at_shop', label: 'At Shop' },
    { key: 'ready_for_delivery', label: 'Ready for Delivery' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' },
  ];
  const bookingStepIndex = bookingStatus === 'cancelled'
    ? -1
    : bookingSteps.findIndex((step) => step.key === bookingStatus);
  const deliveryStepIndex = deliverySteps.findIndex((step) => step.key === deliveryStatus);

  const statusMessage: Record<BookingStatus | DeliveryStatus, string> = {
    pending: 'Waiting for pickup confirmation.',
    confirmed: 'Your pickup has been confirmed.',
    processing: 'Laundry is being processed.',
    out_for_pickup: 'Your pickup is on the way.',
    picked_up: 'Your laundry has been picked up.',
    at_shop: 'Your laundry has arrived at the shop.',
    ready_for_delivery: 'Your laundry is ready for delivery.',
    out_for_delivery: 'Your laundry is on the way.',
    delivered: 'Your laundry has been delivered.',
    completed: 'Laundry service completed.',
    cancelled: 'Booking cancelled.',
  };

  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString() : 'Not specified';
  const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString() : 'Not specified';
  const formatAmount = (value?: number) => `₱${Number(value || 0).toFixed(2)}`;

  const handleCancel = () => {
    if (!booking || bookingStatus !== 'pending') return;
    showAlert('Cancel Booking', `Are you sure you want to cancel Order #${booking.booking_id}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        primary: true,
        onPress: async () => {
          try {
            await api.patch(`${API_ENDPOINTS.BOOKINGS.BASE}/${booking.booking_id}/status`, {
              status: 'cancelled',
              customer_id: booking.customer_id,
            });
            await fetchDetails();
            if (isPaidGcash(booking)) {
              showAlert(
                'Booking Cancelled',
                'Your pickup booking has been cancelled. You paid this booking through GCash. Would you like to request a refund now?',
                [
                  { text: 'Later', style: 'cancel', onPress: () => navigation.goBack() },
                  { text: 'Request now', primary: true, onPress: () => navigation.navigate('Transaction', { initialTab: 'refunds' }) },
                ],
                'success'
              );
            } else {
              showAlert('Cancelled', 'Your pickup booking has been cancelled.', undefined, 'success');
            }
          } catch (error: any) {
            showAlert('Error', error?.response?.data?.message || 'Failed to cancel booking.', undefined, 'error');
          }
        },
      },
    ], 'confirm');
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
        <Text style={styles.headerTitle}>Pickup #{bookingId}</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2d79d1" /></View>
      ) : !booking ? (
        <View style={styles.card}><Text style={styles.value}>Pickup booking not found.</Text></View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Booking Progress</Text>
            {bookingStatus === 'cancelled' ? (
              <View style={styles.cancelled}><Text style={styles.cancelledText}>{statusMessage.cancelled}</Text></View>
            ) : (
              <View style={styles.stepper}>
                {bookingSteps.map((step, index) => (
                  <View style={styles.stepItem} key={step.key}>
                    <View style={[styles.dot, index <= bookingStepIndex && styles.activeDot]} />
                    {index < bookingSteps.length - 1 && <View style={[styles.line, index < bookingStepIndex && styles.activeLine]} />}
                    <Text style={[styles.stepLabel, index <= bookingStepIndex && styles.activeLabel]}>{step.label}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.message}>{statusMessage[bookingStatus]}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pickup & Delivery Progress</Text>
            <View style={styles.stepper}>
              {deliverySteps.map((step, index) => (
                <View style={styles.stepItem} key={step.key}>
                  <View style={[styles.dot, index <= deliveryStepIndex && styles.activeDot]} />
                  {index < deliverySteps.length - 1 && <View style={[styles.line, index < deliveryStepIndex && styles.activeLine]} />}
                  <Text style={[styles.stepLabel, index <= deliveryStepIndex && styles.activeLabel]}>{step.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.message}>{statusMessage[deliveryStatus]}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pickup Details</Text>
            <Detail label="Shop" value={booking.shop_name} />
            <Detail label="Service" value={booking.service_name || 'Laundry service'} />
            <Detail label="Pickup address" value={delivery?.pickup_address || 'Not specified'} />
            <Detail label="Delivery address" value={delivery?.delivery_address || 'Not specified'} />
            <Detail label="Pickup time" value={formatDateTime(delivery?.delivery_time)} />
            <Detail label="Pickup date" value={formatDate(booking.pickup_date)} />
            <Detail label="Total amount" value={formatAmount(booking.total_amount)} />
            {booking.payment_method && <Detail label="Payment" value={`${booking.payment_method.toUpperCase()}${booking.payment_status ? ` (${booking.payment_status})` : ''}`} />}
            {bookingStatus !== 'cancelled' && (bookingStatus === 'pending' || bookingStatus === 'confirmed') && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 35, paddingBottom: 15, paddingHorizontal: 15 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  backIcon: { width: 24, height: 24, resizeMode: 'contain', tintColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 40 },
  content: { flex: 1 },
  contentContainer: { paddingVertical: 1, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12, elevation: 2 },
  sectionTitle: { color: '#1e293b', fontSize: 16, fontWeight: '700', marginBottom: 14 },
  stepper: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  stepItem: { flex: 1, alignItems: 'center', position: 'relative' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e2e8f0' },
  activeDot: { backgroundColor: '#2d79d1' },
  line: { position: 'absolute', top: 5, left: '50%', right: '-50%', height: 2, backgroundColor: '#e2e8f0' },
  activeLine: { backgroundColor: '#2d79d1' },
  stepLabel: { marginTop: 7, color: '#94a3b8', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  activeLabel: { color: '#1e293b' },
  message: { marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: '#f0f9ff', color: '#0369a1', textAlign: 'center' },
  cancelled: { padding: 12, borderRadius: 10, backgroundColor: '#fef2f2' },
  cancelledText: { color: '#b91c1c', textAlign: 'center', fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 9, gap: 12 },
  label: { color: '#64748b', fontSize: 12, flex: 1 },
  value: { color: '#1e293b', fontWeight: '600', textAlign: 'right', flex: 2 },
  cancelButton: { alignSelf: 'flex-end', marginTop: 12, backgroundColor: '#ef4444', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  cancelButtonText: { color: '#fff', fontWeight: '700' },
});

export default PickupBookingDetails;
