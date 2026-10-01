import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAlert } from '../context/AlertContext';
import { api, API_ENDPOINTS } from '../config/api';
import { RootStackParamList } from '../navigation/Navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifBus from '../services/notificationBus';

type Props = NativeStackScreenProps<RootStackParamList, 'RescheduleBooking'>;

type Booking = {
  booking_id: number;
  booking_date: string;
  booking_status: string;
};

export default function RescheduleBooking({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const { showAlert } = useAlert();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const toDateOnly = (value: string) =>
    new Date(value).toISOString().slice(0, 10);

  const formatLongDate = (value: string) => {
    const date = new Date(`${value}T00:00:00`);

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const addOneDay = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + 1);

    return date.toISOString().slice(0, 10);
  };

  const today = toDateOnly(new Date().toISOString());

  useEffect(() => {
    const load = async () => {
      try {
        const id = await AsyncStorage.getItem('customerId');
        setCustomerId(id);

        const response = await api.get(
          `${API_ENDPOINTS.BOOKINGS.BASE}/${bookingId}`,
        );

        const payload = response.data?.booking_id
          ? response.data
          : response.data?.data;

        if (!payload) {
          throw new Error('Booking not found');
        }

        setBooking(payload);

        setSelectedDate('');

        if (id) {
          const requestResponse = await api.get(
            `${API_ENDPOINTS.BOOKINGS.RESCHEDULE(
              bookingId,
            )}?customer_id=${id}`,
          );

          setExistingStatus(requestResponse.data?.status || null);
        }
      } catch (error: any) {
        showAlert(
          'Error',
          error?.response?.data?.message ||
            'Unable to load booking details.',
          undefined,
          'error',
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [bookingId, showAlert]);

  const sendRescheduleRequest = async () => {
    if (!booking || !customerId || !selectedDate) {
      return;
    }

    try {
      setSubmitting(true);

      await api.post(
        API_ENDPOINTS.BOOKINGS.RESCHEDULE(booking.booking_id),
        {
          requested_date: selectedDate,
          reason: reason.trim() || undefined,
          customer_id: customerId,
        },
      );
      notifBus.emit('notifications:removeDeclinedBooking', booking.booking_id);

      showAlert(
        'Request Submitted',
        'Your reschedule request will be sent to the shop for approval.',
        [
          {
            text: 'OK',
            primary: true,
            onPress: handleBack,
          },
        ],
        'success',
      );
    } catch (error: any) {
      showAlert(
        'Error',
        error?.response?.data?.message ||
          'Failed to submit reschedule request.',
        undefined,
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitRequest = () => {
    if (!booking || !customerId || !selectedDate) {
      return;
    }

    if (!['pending', 'declined'].includes(booking.booking_status.toLowerCase())) {
      showAlert(
        'Not allowed',
        'Only pending or declined bookings can be rescheduled.',
        undefined,
        'warning',
      );
      return;
    }

    if (existingStatus === 'Pending') {
      showAlert(
        'Request pending',
        'This booking already has a pending reschedule request.',
        undefined,
        'info',
      );
      return;
    }

    if (
      selectedDate <= today ||
      selectedDate <= toDateOnly(booking.booking_date)
    ) {
      showAlert(
        'Invalid date',
        'Please select a date later than the current booking date and today.',
        undefined,
        'warning',
      );
      return;
    }

    showAlert(
      'Confirm Reschedule',
      `You are requesting to change your booking date from ${formatLongDate(
        toDateOnly(booking.booking_date),
      )} to ${formatLongDate(
        selectedDate,
      )}. The new date will only take effect after the shop approves your request.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Request',
          primary: true,
          onPress: sendRescheduleRequest,
        },
      ],
      'confirm',
    );
  };

  const showRescheduleInfo = () => {
    showAlert(
      'About Rescheduling',
      'You can only reschedule your booking to a later date. If you need an earlier date, please cancel your current booking and create a new booking with your preferred date.',
      [
        {
          text: 'Got it',
          primary: true,
        },
      ],
      'info',
    );
  };

  const currentBookingDate = booking
    ? toDateOnly(booking.booking_date)
    : today;

  // User can only select a date AFTER the current booking date
  // and AFTER today.
  const minimumDate =
    currentBookingDate > today
      ? addOneDay(currentBookingDate)
      : addOneDay(today);

  /*
   * Calendar highlights:
   * 🔴 Red = Current booking date
   * 🔵 Blue = Selected reschedule date
   */
  const markedDates: Record<string, any> = {
    [currentBookingDate]: {
      selected: true,
      selectedColor: '#dc2626',
      selectedTextColor: '#fff',
    },
  };

  if (selectedDate && selectedDate !== currentBookingDate) {
    markedDates[selectedDate] = {
      selected: true,
      selectedColor: '#2d79d1',
      selectedTextColor: '#fff',
    };
  }

  return (
    <SafeAreaView style={styles.container}>
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

        <Text style={styles.headerTitle}>Reschedule Booking</Text>

        <View style={styles.headerSpacer} />
      </LinearGradient>

      {loading ? (
        <Text style={styles.loading}>Loading booking...</Text>
      ) : !booking ? (
        <Text style={styles.loading}>Booking not found.</Text>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.summary}>
              <View style={styles.titleRow}>
                <Image
                  source={require('../assets/img/icon/calendar.png')}
                  style={styles.calendarIcon}
                />

                <Text style={styles.title}>Choose a new date</Text>
              </View>

              <Text style={styles.subtitle}>Current booking date</Text>

              <Text style={styles.currentDate}>
                {formatLongDate(currentBookingDate)}
              </Text>
            </View>

            {existingStatus === 'Pending' && (
              <View style={styles.pendingBox}>
                <Text style={styles.pendingText}>
                  A reschedule request is already pending review.
                </Text>
              </View>
            )}

            <View style={styles.calendarCard}>
              <Text style={styles.sectionLabel}>
                Select your preferred date
              </Text>

              <Text style={styles.calendarHint}>
                Past dates and dates before your current booking are
                unavailable.
              </Text>

              {/* Informational note */}
              <TouchableOpacity
                style={styles.infoNote}
                onPress={showRescheduleInfo}
                activeOpacity={0.7}
              >
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>i</Text>
                </View>

                <Text style={styles.infoNoteText}>
                  Need an earlier date?{' '}
                  <Text style={styles.infoNoteLink}>
                    Tap to learn more.
                  </Text>
                </Text>
              </TouchableOpacity>

              <Calendar
                style={styles.calendar}
                minDate={minimumDate}
                markedDates={markedDates}
                onDayPress={day => {
                  setSelectedDate(day.dateString);
                }}
                theme={{
                  todayTextColor: '#1c1c1c',
                  arrowColor: '#4367c1',
                  selectedDayBackgroundColor: '#007bff',
                  selectedDayTextColor: '#fff',
                  textDayFontWeight: '500',
                  textMonthFontWeight: '700',
                  textDayHeaderFontWeight: '600',
                }}
              />

              {/* Calendar legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      styles.currentDateDot,
                    ]}
                  />
                  <Text style={styles.legendText}>
                    Current booking date
                  </Text>
                </View>

                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      styles.selectedDateDot,
                    ]}
                  />
                  <Text style={styles.legendText}>
                    Selected date
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.fieldLabel}>
              Reason <Text style={styles.optional}>(optional)</Text>
            </Text>

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason for rescheduling (optional)"
              placeholderTextColor="#94a3b8"
              style={styles.reasonInput}
              multiline
              maxLength={255}
              scrollEnabled
            />

            <Text style={styles.characterCount}>
              {reason.length}/255
            </Text>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (submitting || existingStatus === 'Pending') &&
                  styles.disabledButton,
              ]}
              onPress={submitRequest}
              disabled={submitting || existingStatus === 'Pending'}
            >
              <Text style={styles.submitText}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f9ff',
  },

  flex: {
    flex: 1,
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
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  headerSpacer: {
    width: 40,
  },

  content: {
    padding: 16,
    paddingBottom: 32,
  },

  loading: {
    padding: 24,
    textAlign: 'center',
    color: '#475569',
  },

  summary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#46d4e4',
    elevation: 2,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },

  calendarIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginRight: 8,
    tintColor: '#2d79d1',
  },

  title: {
    color: '#1e293b',
    fontSize: 17,
    fontWeight: '700',
  },

  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 2,
  },

  currentDate: {
    color: '#2d79d1',
    fontSize: 14,
    fontWeight: '700',
  },

  pendingBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },

  pendingText: {
    color: '#9a3412',
    fontWeight: '600',
  },

  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 8,
    marginBottom: 16,
    elevation: 2,
  },

  sectionLabel: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingTop: 8,
  },

  calendarHint: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 8,
  },

  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginHorizontal: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },

  infoIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d79d1',
    marginRight: 8,
  },

  infoIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  infoNoteText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
  },

  infoNoteLink: {
    color: '#2d79d1',
    fontWeight: '700',
  },

  calendar: {
    backgroundColor: '#fff',
    borderColor: '#46d4e4',
    borderWidth: 0.8,
    borderRadius: 12,
    elevation: 3,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 14,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },

  currentDateDot: {
    backgroundColor: '#dc2626',
  },

  selectedDateDot: {
    backgroundColor: '#2d79d1',
  },

  legendText: {
    color: '#64748b',
    fontSize: 11,
  },

  fieldLabel: {
    color: '#334155',
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 8,
  },

  optional: {
    color: '#64748b',
    fontWeight: '400',
  },

  reasonInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    minHeight: 84,
    maxHeight: 120,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#1e293b',
  },

  characterCount: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },

  submitButton: {
    backgroundColor: '#2d79d1',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 16,
    elevation: 2,
  },

  disabledButton: {
    opacity: 0.55,
  },

  submitText: {
    color: '#fff',
    fontWeight: '700',
  },
});
