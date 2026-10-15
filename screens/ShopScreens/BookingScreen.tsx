// BookingScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Animated,
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  ScrollView, SafeAreaView, Image, ActivityIndicator,
  BackHandler, Modal, TextInput,
  Platform
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Calendar } from 'react-native-calendars';
import { RouteProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { api, API_ENDPOINTS } from '../../config/api';
import paymongoService from '../../services/paymongoService';
import { AlertAction, AlertType } from '../../components/CustomAlertModal';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useAlert } from '../../context/AlertContext';
import { isServiceAvailableForBooking } from '../../utils/serviceAvailability';
import { isShopOpenForBookings } from '../../utils/shopAvailability';


type BookingServiceNavProp = NativeStackNavigationProp<RootStackParamList, 'BookingService'>;
type BookingServiceRouteProp = RouteProp<RootStackParamList, 'BookingService'>;

type Service = {
  service_id: number;
  offers: string;
  price: number;
  description?: string;
  status?: string | number;
};

type PaymentMethod = 'cash' | 'cod' | 'gcash';

export default function BookingScreen({ route }: { route: BookingServiceRouteProp }) {
  const navigation = useNavigation<BookingServiceNavProp>();
  const { type: booking_type, services, shop_id, shop_name } = route.params as any;
  const { showAlert } = useAlert();

  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);

  const availableServices = Array.isArray(services) ? services : [];
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerNameDisplay, setCustomerNameDisplay] = useState<string>('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  // Inline GCash WebView states
  const [showGCashWebView, setShowGCashWebView] = useState<boolean>(false);
  const [gcashRedirectUrl, setGcashRedirectUrl] = useState<string | null>(null);
  const [gcashPaymentIntentId, setGcashPaymentIntentId] = useState<string | null>(null);
  const [gcashPaymongoPaymentId, setGcashPaymongoPaymentId] = useState<string | null>(null);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const detailOpacity = useRef(new Animated.Value(0)).current;
  const detailTranslateY = useRef(new Animated.Value(8)).current;

  const fullyBookedDates = ['2025-08-30', '2025-09-02'];
  const markedDates = fullyBookedDates.reduce((acc, date) => {
    acc[date] = {
      selected: true,
      selectedColor: 'red',
      disabled: true, 
      disableTouchEvent: true
    };
    return acc;
  }, {} as any);

  if (selectedDate) {
    const selectedDateString = typeof selectedDate === "string"
      ? selectedDate
      : selectedDate.toISOString().split("T")[0];
    markedDates[selectedDateString] = {
      selected: true,
      selectedColor: '#007bff'
    };
  }

  useEffect(() => {
    const fetchCustomerProfile = async () => {
      try {
        const [
          customerIdValue,
          customerNameValue,
          customerLastNameValue,
          customerAddressValue,
          customerStreetValue,
          customerZoneValue,
          customerBarangayValue,
          customerCityValue,
        ] = await AsyncStorage.multiGet([
          'customerId',
          'customerName',
          'customerLastName',
          'customerAddress',
          'customerStreet',
          'customerZone',
          'customerBarangay',
          'customerCity',
        ]);

        const storedCustomerId = customerIdValue[1];
        if (storedCustomerId) setCustomerId(parseInt(storedCustomerId));

        const fallbackName = [customerNameValue[1], customerLastNameValue[1]].filter(Boolean).join(' ').trim();
        const fallbackAddress = [
          customerAddressValue[1],
          customerStreetValue[1],
          customerZoneValue[1],
          customerBarangayValue[1],
          customerCityValue[1],
        ]
          .filter(Boolean)
          .join(', ')
          .trim();

        let resolvedName = fallbackName || 'Customer';
        let resolvedAddress = fallbackAddress;

        if (storedCustomerId) {
          try {
            const response = await api.get(API_ENDPOINTS.CUSTOMERS.BY_ID(storedCustomerId));
            const customer = response.data || {};
            const fullNameFromApi = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim();
            const fullAddressFromApi = [
              customer.address,
              customer.street,
              customer.zone,
              customer.barangay,
              customer.city,
            ]
              .filter(Boolean)
              .join(', ')
              .trim();

            if (fullNameFromApi) {
              resolvedName = fullNameFromApi;
              setCustomerNameDisplay(resolvedName);
            }
            if (fullAddressFromApi) {
              resolvedAddress = fullAddressFromApi;
            }
          } catch (apiError) {
            console.log('Failed to fetch fresh customer info:', apiError);
          }
        }

        setCustomerNameDisplay(resolvedName || 'Customer');
        setCustomerAddress(resolvedAddress);
        if (resolvedAddress) {
          setPickupAddress(resolvedAddress);
          setDeliveryAddress(resolvedAddress);
        }
      } catch (error) {
        console.error('Error loading customer profile data:', error);
      }
    };

    fetchCustomerProfile();
  }, []);

  const selectedServiceData = availableServices.find((s: Service) => s.service_id === selectedService);
  const servicePrice = selectedServiceData && isServiceAvailableForBooking(selectedServiceData)
    ? Number(selectedServiceData.price || 0)
    : 0;

  useEffect(() => {
    const isExpanded = !!selectedService && !!selectedServiceData && isServiceAvailableForBooking(selectedServiceData);
    Animated.parallel([
      Animated.timing(detailOpacity, {
        toValue: isExpanded ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(detailTranslateY, {
        toValue: isExpanded ? 0 : 8,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedService, selectedServiceData]);

  const pickUpFee = booking_type.toLowerCase() === 'pick up' ? 40 : 0;
  const total = servicePrice + pickUpFee;
  
  const goToConfirmation = async () => {
    if (!selectedService || !selectedDate || !payment || !customerId) {
      showAlert(
        'Incomplete Details',
        'Please select a service, date, and payment method, and make sure you are logged in.',
        undefined,
        'warning'
      );
      return;
    }

    try {
      const { data: shopData } = await api.get(`/shop/${shop_id}`);
      const currentShop = shopData?.shop || shopData;
      if (!isShopOpenForBookings(currentShop?.status)) {
        showAlert('Shop Closed', 'This shop is currently closed and cannot accept bookings.', undefined, 'warning');
        return;
      }
    } catch (error) {
      console.warn('Unable to verify shop availability:', error);
      showAlert('Shop Unavailable', 'Unable to verify this shop right now. Please try again.', undefined, 'warning');
      return;
    }

    const service = availableServices.find((s: Service) => s.service_id === selectedService);
    if (!service || !isServiceAvailableForBooking(service)) {
      showAlert(
        'Service Unavailable',
        'This service is currently inactive or disabled and cannot be booked.',
        undefined,
        'warning'
      );
      setSelectedService(null);
      return;
    }

    // Validate pickup/delivery details when booking type is Pick up
    if (booking_type.toLowerCase() === 'pick up') {
      const resolvedAddress = customerAddress || pickupAddress || deliveryAddress;
      if (!resolvedAddress) {
        showAlert('Missing Address', 'Customer address is not available for this pickup booking.', undefined, 'warning');
        return;
      }

      setPickupAddress(resolvedAddress);
      setDeliveryAddress(resolvedAddress);
    }

    // If GCash is selected, go to GCash payment screen
    if (payment === 'gcash') {
      try {
        setLoading(true);
        // Load customer info from storage (fallback defaults like in GCashPaymentScreen)
        const name = (await AsyncStorage.getItem('customerName')) || 'Customer';
        const lastName = (await AsyncStorage.getItem('customerLastName')) || '';
        const email = (await AsyncStorage.getItem('customerEmail')) || 'customer@elaba.com';
        const phone = (await AsyncStorage.getItem('customerPhone')) || '09123456789';
        const customerInfo = { name: `${name} ${lastName}`.trim(), email, phone };

        const description = `eLaba - ${shop_name ? `${shop_name} - ` : ''}${service?.offers || 'Service'} (${booking_type})`;
        const result = await paymongoService.createGCashPayment(
          total,
          description,
          customerInfo
        );
        setGcashPaymentIntentId(result.paymentIntentId);
        setGcashPaymongoPaymentId(result.paymongoPaymentId || null);
        setGcashRedirectUrl(result.redirectUrl);

        if (result.redirectUrl) {
          setShowGCashWebView(true);
        } else {
          // Mock mode or missing redirect: poll briefly then proceed on success
          setIsCheckingStatus(true);
          const status = await paymongoService.pollPaymentStatus(result.paymentIntentId, { intervalMs: 1500, timeoutMs: 20000 });
          setIsCheckingStatus(false);
          if (status === 'succeeded') {
            const details = await paymongoService.getPaymentStatusDetails(result.paymentIntentId);
            navigateToConfirmation('paid', result.paymongoPaymentId || details.paymongoPaymentId || null, result.paymentIntentId);
          } else if (status === 'canceled') {
            showAlert('Payment Canceled', 'Your payment was canceled.', undefined, 'warning');
          } else {
            showAlert('Payment Pending', 'Payment is still processing, please try again.', undefined, 'info');
          }
        }
      } catch (e: any) {
        console.error('GCash init error:', e);
        showAlert('Payment Error', e?.message || 'Failed to initialize GCash payment', undefined, 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // For cash and cod, go directly to confirmation
      navigation.navigate("Confirmation", {
        booking_type,
        selectedService,
        serviceName: service?.offers || "",
        servicePrice: service?.price || 0,
        selectedDate: selectedDate.toISOString().split("T")[0],
        payment,
        pickUpFee,
        total,
        shop_id,
        shop_name,
        customer_id: customerId,
        // pass pickup fields if any
        pickup_address: booking_type.toLowerCase() === 'pick up' ? pickupAddress : undefined,
        delivery_address: booking_type.toLowerCase() === 'pick up' ? deliveryAddress : undefined,
      });
    }
  };

  const navigateToConfirmation = (paymentStatus: 'paid' | 'unpaid' = 'paid', paymongoPaymentId?: string | null, paymentIntentId?: string | null) => {
    const service = availableServices.find((s: Service) => s.service_id === selectedService);
    navigation.reset({
      index: 0,
      routes: [
        { name: 'Home' as any },
        {
          name: 'Confirmation' as any,
          params: {
            booking_type,
            selectedService,
            serviceName: service?.offers || '',
            servicePrice: service?.price || 0,
            selectedDate: selectedDate?.toISOString().split('T')[0],
            payment: 'gcash',
            pickUpFee,
            total,
            shop_id,
            shop_name,
            customer_id: customerId,
            paymentStatus,
            paymongoPaymentId: paymongoPaymentId || gcashPaymongoPaymentId || undefined,
            paymentIntentId: paymentIntentId || gcashPaymentIntentId || undefined,
          },
        },
      ],
    });
  };

  const handleWebViewNav = async (navState: any) => {
    const url: string = navState?.url || '';
    // Mirror example project behavior and also support our backend success page
    if (url.startsWith('https://example.com/success') || url.includes('Payment Successful') || (url.includes('success') && url.includes('payment'))) {
      setShowGCashWebView(false);
      if (gcashPaymentIntentId) {
        try {
          setIsCheckingStatus(true);
          const status = await paymongoService.pollPaymentStatus(gcashPaymentIntentId, { intervalMs: 2000, timeoutMs: 20000 });
          setIsCheckingStatus(false);
          if (status === 'succeeded') {
            const details = await paymongoService.getPaymentStatusDetails(gcashPaymentIntentId);
            navigateToConfirmation('paid', gcashPaymongoPaymentId || details.paymongoPaymentId || null, gcashPaymentIntentId);
          } else if (status === 'canceled') {
            showAlert('Payment Canceled', 'Your payment was canceled.', undefined, 'warning');
          } else {
            showAlert('Payment Pending', 'Payment verification is still in progress.', undefined, 'info');
          }
        } catch (e) {
          setIsCheckingStatus(false);
          showAlert('Verification Error', 'Could not verify payment.', undefined, 'error');
        }
      } else {
        navigateToConfirmation('paid', gcashPaymongoPaymentId, gcashPaymentIntentId);
      }
    } else if (url.startsWith('https://example.com/cancel') || url.includes('cancel')) {
      setShowGCashWebView(false);
      showAlert('Payment Canceled', 'You cancelled the payment.', undefined, 'warning');
    }
  };

  if (!services || services.length === 0) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{ marginTop: 10 }}>Loading services...</Text>
      </View>
    );
  }

  // Back button handler
useFocusEffect(
  useCallback(() => {
    const backAction = () => {
      if (selectedService || selectedDate || payment) {
        showAlert(
          'Cancel Booking?',
          'You have already selected some details. Are you sure you want to cancel this booking?',
          [
            { text: 'No', style: 'cancel' },
            { text: 'Yes', style: 'destructive', onPress: () => navigation.goBack(), primary: true },
          ],
          'confirm'
        );
        return true; 
      }
      return false; 
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => backHandler.remove(); // cleanup kapag nag-blur yung screen
  }, [navigation, selectedService, selectedDate, payment])
);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9f9f9" }}>
      {/* Header */}
      <LinearGradient
        colors={['#6bd0d7', '#2d79d1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerContainer}
      >
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => {
          if (selectedService || selectedDate || payment) {
            showAlert(
              'Cancel Booking?',
              'You have already selected some details. Are you sure you want to cancel this booking?',
              [
                { text: 'No', style: 'cancel' },
                { text: 'Yes', style: 'destructive', onPress: () => navigation.goBack(), primary: true },
              ],
              'confirm'
            );
          } else {
            navigation.goBack(); // ✅ normal back
          }
        }}
      >
        <Image source={require('../../assets/img/icon/back.png')} style={styles.backIcon} />
      </TouchableOpacity>

        <Text style={styles.headerTitle}>Booking a Service</Text>
      </LinearGradient>

      {/* Content */}
      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}>
        {/* Booking type */}
        <View style={styles.bookingTypeRow}>
          <Text style={styles.subHeader}>
            Booking Type: <Text style={styles.highlight}>{booking_type}</Text>
          </Text>
          <Image
            source={
              booking_type.toLowerCase() === 'pick up'
                ? require('../../assets/img/icon/pickup.png')
                : require('../../assets/img/icon/walkin.png')
            }
            style={styles.bookingIcon}
          />
        </View>

        <View style={styles.divider} />

          {/* Pickup/Delivery Info (only for Pick up) */}
          {booking_type.toLowerCase() === 'pick up' && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Image
                  source={require('../../assets/img/icon/pickup.png')}
                  style={{ width: 22, height: 22, resizeMode: 'contain', marginRight: 10 }}
                />
                <Text style={styles.sectionTitle}>Customer info</Text>
              </View>
              <View style={styles.customerAddressCard}>
                <Text style={styles.customerNameValue}>
                  {customerNameDisplay || 'Customer'}
                </Text>
                <Text style={styles.customerAddressValue}>
                  {customerAddress || 'Address not available'}
                </Text>
              </View>
            </View>
          )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Image
            source={require('../../assets/img/icon/laundry.png')}
            style={{ width: 22, height: 22, resizeMode: 'contain', marginRight: 10 }}
          />
          <Text style={styles.sectionTitle}>Select a Service</Text>
        </View>
        <FlatList 
          data={availableServices}
          scrollEnabled={false}
          keyExtractor={(item) => item.service_id.toString()}
          renderItem={({ item }) => {
            const serviceEnabled = isServiceAvailableForBooking(item);
            const isSelected = selectedService === item.service_id;
            return (
              <View>
                <TouchableOpacity 
                  style={[
                    styles.serviceCard,
                    isSelected && styles.selectedCard,
                    !serviceEnabled && styles.disabledServiceCard,
                  ]}
                  onPress={() => {
                    if (!serviceEnabled) return;
                    setSelectedService(prev => prev === item.service_id ? null : item.service_id);
                  }}
                  disabled={!serviceEnabled}
                  activeOpacity={serviceEnabled ? 0.9 : 1}
                >
                  <View style={styles.serviceRow}>
                    <Text style={[styles.serviceText, !serviceEnabled && styles.disabledServiceText]}>{item.offers}</Text>
                    {!serviceEnabled && <Text style={styles.disabledBadge}>Unavailable</Text>}
                  </View>
                  <Text style={[styles.servicePrice, !serviceEnabled && styles.disabledServiceText]}>₱{item.price}</Text>
                </TouchableOpacity>

                {serviceEnabled && isSelected && (
                  <Animated.View
                    style={[
                      styles.serviceDetailsPanel,
                      {
                        opacity: detailOpacity,
                        transform: [{ translateY: detailTranslateY }],
                      },
                    ]}
                  >
                    <View style={styles.detailHeaderRow}>
                      <Image
                        source={require('../../assets/img/icon/info.png')}
                        style={styles.detailIcon}
                      />
                      <Text style={styles.detailTitle}>Service Details</Text>
                    </View>
                    <Text style={styles.descriptionText}>
                      {item.description || 'No description available.'}
                    </Text>
                  </Animated.View>
                )}
              </View>
            );
          }}
        />

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Image
            source={require('../../assets/img/icon/calendar.png')}
            style={{ width: 22, height: 22, resizeMode: 'contain', marginRight: 10 }}
          />
          <Text style={styles.sectionTitle}>Set Date of Booking</Text>
        </View>
        <View style={styles.dateSelectionRow}>
          <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>
            {selectedDate ? selectedDate.toDateString() : "Select a Date"}
          </Text>
          </View>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => setSelectedDate(new Date())}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
        <Calendar
          style={{backgroundColor: '#ffffff', borderColor: '#46d4e4', borderWidth: 0.8, borderRadius: 12, elevation: 5 }}
          minDate={new Date().toISOString().split("T")[0]}
          onDayPress={(day) => {
            if (!fullyBookedDates.includes(day.dateString)) {
              setSelectedDate(new Date(day.dateString));
            }
          }}
          markedDates={markedDates}
          theme={{
            selectedDayBackgroundColor: '#007bff',
            todayTextColor: '#1c1c1c',
            arrowColor: '#4367c1',
          }}
        />      

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Image 
            source={require('../../assets/img/icon/payment.png')} 
            style={{ width: 22, height: 22, resizeMode: 'contain' }} />
          <Text style={[styles.sectionTitle, { marginLeft: 10 }]}>Select Payment</Text>
        </View>
        {/* Payment methods */}
        {['cash', 'cod', 'gcash'].map((method) => {
          const isCashDisabled = booking_type === 'Pick up' && method === 'cash';
          const isCoDDisabled = booking_type === 'Walk in' && method === 'cod';
          const isDisabled = isCashDisabled || isCoDDisabled;
          
          return (
            <TouchableOpacity 
              key={method} 
              style={[
                styles.paymentBtn, 
                payment === method && styles.paymentSelected,
                isDisabled && styles.paymentDisabled
              ]}
              onPress={() => !isDisabled && setPayment(method as PaymentMethod)}
              disabled={isDisabled}
            >
              <Text style={[
                styles.paymentText, 
                payment === method && { color: "#fff" },
                isDisabled && styles.paymentTextDisabled
              ]}>
                {method === 'cash' ? 'Cash' : method === 'cod' ? 'CoD' : 'GCash'}
                {isDisabled && ' (Not available)'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* GCash WebView Modal */}
      <Modal
        visible={showGCashWebView}
        animationType="slide"
        onRequestClose={() => setShowGCashWebView(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          {gcashRedirectUrl ? (
            <WebView
              source={{ uri: gcashRedirectUrl }}
              onNavigationStateChange={handleWebViewNav}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#137cbd" />
                  <Text style={{ marginTop: 8 }}>Loading GCash…</Text>
                </View>
              )}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#137cbd" />
              <Text style={{ marginTop: 8 }}>Preparing payment…</Text>
            </View>
          )}
          {webViewError ? (
            <View style={{ padding: 12, backgroundColor: '#dc3545' }}>
              <Text style={{ color: '#fff' }}>WebView error: {webViewError}</Text>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerDetailsContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service</Text>
            <Text style={styles.priceValue}>₱{servicePrice}</Text>
          </View>
          {booking_type === 'Pick up' && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Pick Up Fee</Text>
              <Text style={styles.priceValue}>₱{pickUpFee}</Text>
            </View>
          )}
          <View style={styles.dividerFooter} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{(() => {
              const whole = Math.floor(total);
              const cents = Math.round((total - whole) * 100);
              return `${whole}.${cents.toString().padStart(2, '0')}`;
            })()}</Text>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity 
          style={[styles.confirmBtnFooter, 
            { 
              opacity: loading || !selectedService || !selectedDate || !payment ? 0.5 : 1,
            }
          ]}
          onPress={goToConfirmation}
          disabled={loading || !selectedService || !selectedDate || !payment}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#2896a7', '#4367c1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmBtnGradient}
          >
            <Text style={styles.confirmText}>
              {loading ? "Processing..." : "Confirm"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <LoadingOverlay
        visible={loading || isCheckingStatus}
        title={isCheckingStatus ? 'Verifying GCash payment' : 'Preparing GCash payment'}
        subtitle={
          isCheckingStatus
            ? 'Please wait while we confirm your transaction.'
            : 'Please wait while we connect to GCash.'
        }
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 35,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
    height: '10%',
    paddingHorizontal: 15
  },
  backButton: { padding: 8, marginRight: 10 },
  backIcon: { width: 25, height: 25, resizeMode: 'contain' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  subHeader: { fontSize: 16, marginBottom: 20, color: "#666", marginTop: 20 },
  highlight: { fontWeight: "700", color: "#007bff" },
  bookingTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20, 
    marginBottom: 20,
  },
  bookingIcon: {
    width: 22,
    height: 22,
    marginLeft: 8,
    resizeMode: 'contain',
  },

  sectionTitle: { fontSize: 18, fontWeight: "600", marginTop: 15, marginBottom: 10, color: "#000000" },
  customerAddressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfeaf5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  customerNameValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 2,
  },
  customerAddressValue: {
    fontSize: 14,
    fontWeight: '400',
    color: '#475569',
    lineHeight: 21,
  },

  // Service cards
  serviceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee"
  },
  selectedCard: { borderColor: "#007bff", borderWidth: 2, backgroundColor: "#eef6ff" },
  disabledServiceCard: {
    backgroundColor: '#f5f7fa',
    borderColor: '#e2e8f0',
    opacity: 0.72,
  },
  serviceRow: { flexDirection: "row", alignItems: "center" },
  serviceText: { fontSize: 16, fontWeight: "500", color: "#333" },
  disabledServiceText: { color: '#94a3b8' },
  disabledBadge: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  servicePrice: { fontWeight: "700", color: "#007bff", fontSize: 15 },
  serviceDetailsPanel: {
    marginTop: -4,
    marginBottom: 12,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cce6ff',
    backgroundColor: '#f4faff',
    overflow: 'hidden',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    width: 18,
    height: 18,
    marginRight: 7,
    tintColor: '#007bff',
  },
  detailTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#007bff',
  },
  descriptionText: { fontSize: 15, color: "#555", lineHeight: 20 },
  // Date
  dateSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
  },
  dateDisplay: { 
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff", 
    padding: 10,
    marginBottom: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#eee"
  },
  dateText: { fontSize: 16, color: "#444" },
  todayButton: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  todayButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Payment
  paymentBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  paymentSelected: { backgroundColor: "#3eb2ff", borderColor: "#007bff", borderWidth: 2 },
  paymentDisabled: { backgroundColor: "#e8e8e8", borderColor: "#ccc", opacity: 0.6 },
  paymentText: { fontSize: 16, fontWeight: "600", color: "#333" },
  paymentTextDisabled: { color: "#999", fontWeight: "400" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 18,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'android' ? 36 : 18, // Extra space for Android nav bar
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    gap: 10,
  },
  footerDetailsContainer: {
    flex: 1,
    marginRight: 6,
    paddingVertical: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  priceLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  dividerFooter: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#222',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '700',
  },
  confirmBtnFooter: {
    borderRadius: 15,
    overflow: 'hidden',
    minWidth: 100,
    elevation: 2,
    marginLeft: 6,
  },
  confirmBtnGradient: {
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 16, textAlign: "center", letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: "#ddd", marginVertical: 15 },
});
