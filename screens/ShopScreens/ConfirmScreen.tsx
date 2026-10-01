// screens/ShopScreens/ConfirmationScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, Image, BackHandler } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { RouteProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/Navigator";
import { api, API_ENDPOINTS } from '../../config/api';
import { createDelivery } from '../../services/deliveryService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../../context/AlertContext';

type ConfirmationRouteProp = RouteProp<RootStackParamList, "Confirmation">;
type ConfirmationNavProp = NativeStackNavigationProp<RootStackParamList, "Confirmation">;

export default function ConfirmationScreen({ route }: { route: ConfirmationRouteProp }) {
  const navigation = useNavigation<ConfirmationNavProp>();
  const { showAlert } = useAlert();
  const { booking_type, selectedService, serviceName, servicePrice, selectedDate, payment, pickUpFee, total, shop_id, customer_id, paymentStatus, paymongoPaymentId, paymentIntentId, shop_name, pickup_address, delivery_address, delivery_time } = route.params as any;

  const [loading, setLoading] = useState(false);
  const [customerLastName, setCustomerLastName] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [bookingLocked, setBookingLocked] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const isPickupBooking = (booking_type || '').toLowerCase() === 'pick up';
  const customerAddressDisplay = isPickupBooking ? (pickup_address || delivery_address || 'Customer address') : null;

  useFocusEffect(
    useCallback(() => {
      if (!bookingLocked) return;

      const backAction = () => true;
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

      return () => backHandler.remove();
    }, [bookingLocked])
  );

  // Generate a pseudo receipt number
  const receiptNumber = `RCPT-${shop_id}-${customer_id}-${selectedService}`;
  const receiptDate = new Date(selectedDate).toLocaleString();

  useEffect(() => {
    const loadCustomerName = async () => {
      try {
        const name = await AsyncStorage.getItem('customerName');
        if (name) {
          setCustomerName(name);
        }
      } catch (e) {
        console.log("Error loading customer name:", e);
      }
    };
    loadCustomerName();
  }, []);

  useEffect(() => {
    const loadCustomerLastName = async () => {
      try {
        const lastName = await AsyncStorage.getItem('customerLastName');
        if (lastName) {
          setCustomerLastName(lastName);
        }
      } catch (e) {
        console.log("Error loading customer last name:", e);
      }
    };
    loadCustomerLastName();
  }, []);

  const goToPaymentIfNeeded = () => {
    if (payment === 'gcash' && paymentStatus !== 'paid') {
      navigation.navigate('PaymentMethod', {
        booking_type,
        selectedService,
        serviceName,
        servicePrice,
        selectedDate,
        pickUpFee,
        total,
        shop_id,
        shop_name: '',
        customer_id
      });
      return true;
    }
    return false;
  };

  const finalizeBooking = async () => {
    if (bookingLocked) return;
    // If payment required and not yet done, redirect first
    if (goToPaymentIfNeeded()) return;
    setLoading(true);
    try {
      // Create booking
      const isPickup = (booking_type || '').toLowerCase() === 'pick up';
      const bookingPayload: any = {
        booking_type,
        status: "Pending",
        total_amount: total,
        shop_id,
        service_id: selectedService,
        customer_id,
      };
      
      // For pick up, use pickup_date; for walk-in, use booking_date
      if (isPickup) {
        bookingPayload.pickup_date = selectedDate;
      } else {
        bookingPayload.booking_date = selectedDate;
      }

      console.log('📤 Booking Payload:', bookingPayload);

      const bookingRes = await api.post(API_ENDPOINTS.BOOKINGS.BASE, bookingPayload);

      const booking_id = bookingRes.data.booking_id;

      // Keep payment vocabulary aligned with backend ('paid' | 'pending').
      const paymentStatuses = paymentStatus === 'paid' ? 'paid' : 'pending';
  await api.post(API_ENDPOINTS.PAYMENTS.BASE, {
        booking_id,
        customer_id,
        shop_id,
        service_id: selectedService,
        payment_method: payment,
        amount: Number(total),
        status: paymentStatuses,
        paymongo_payment_id: paymongoPaymentId || null,
        payment_intent_id: paymentIntentId || null,
      });

      // If Pick up, create delivery record
      if ((booking_type || '').toLowerCase() === 'pick up') {
        try {
          const customerAddress = pickup_address || 'Shop location';
          await createDelivery({
            pickup_address: customerAddress,
            delivery_address: customerAddress, // Same as pickup_address for pickup type
            delivery_time: null,
            status: 'pending',
            booking_id,
            customer_id,
            shop_id,
            service_id: selectedService,
          });
        } catch (e: any) {
          console.warn('⚠️ Failed to create delivery record:', e?.response?.data || e?.message || e);
        }
      }

      // Backend sends the shop notification when the booking is created.
      // Avoid sending a duplicate notification from the client here to prevent redundant entries/pushes.
      

      const finalReceiptNumber = `ELB-${String(booking_id).padStart(5, '0')}`;
      const nextReceiptData: RootStackParamList['BookingReceipt'] = {
        booking_id,
        receiptNumber: finalReceiptNumber,
        booking_type,
        serviceName,
        servicePrice: Number(servicePrice || 0),
        selectedDate,
        payment,
        pickUpFee,
        total,
        shop_name: shop_name || 'Shop',
        customerName: customerName || 'Customer',
        customerLastName: customerLastName || '',
        paymentStatus: paymentStatus === 'paid' ? 'paid' : 'pending',
        showSuccessModal: true,
        pickup_address,
        delivery_address,
      };

      setBookingLocked(true);
      navigation.replace('BookingReceipt', nextReceiptData);
    } catch (err: any) {
      console.error("Booking error:", err.response?.data || err);
      showAlert('Error', err.response?.data?.message || 'Something went wrong.', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
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
            if (bookingLocked) return;
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <Image 
            source={require('../../assets/img/icon/back.png')} 
            style={styles.backIcon} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmation</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.confirmCard}>
          <Text style={styles.reviewPrompt}>Please review your booking details</Text>

          {/* Customer Info */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{customerName} {customerLastName}</Text>
          </View>
          {customerAddressDisplay && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{customerAddressDisplay}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shop</Text>
            <Text style={styles.infoValue}>{shop_name ? shop_name : 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Booking Type</Text>
            <Text style={styles.infoValue}>{booking_type}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service</Text>
            <Text style={styles.infoValue}>{serviceName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Schedule Date</Text>
            <Text style={styles.infoValue}>{new Date(selectedDate).toDateString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment</Text>
            <Text style={styles.infoValue}>
              {payment.toUpperCase()}
              {paymentStatus === 'paid' && payment === 'gcash' && (
                <Text style={{ color: '#28a745', fontWeight: '700' }}> ✓ PAID</Text>
              )}
            </Text>
          </View>
          <View style={styles.divider} />

          {/* Price Breakdown */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service Fee</Text>
            <Text style={styles.infoValue}>₱{servicePrice}</Text>
          </View>
          {pickUpFee > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pick-up Fee</Text>
              <Text style={styles.infoValue}>₱{pickUpFee}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>₱{total}</Text>
          </View>
          <View style={styles.divider} />

          {/* Status Banner for GCash Payments */}
          {payment === 'gcash' && paymentStatus === 'paid' && (
            <View style={styles.paymentSuccessContainer}>
              <View style={styles.successIcon}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
              <View style={styles.successTextContainer}>
                <Text style={styles.paymentSuccessTitle}>Payment Successful!</Text>
                <Text style={styles.paymentSuccessSubtext}>Your GCash payment has been received successfully.</Text>
              </View>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { opacity: loading || bookingLocked ? 0.7 : 1 }]}
              disabled={loading || bookingLocked}
              onPress={() => setShowCancelModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { opacity: loading || bookingLocked ? 0.7 : 1, flex: 1 }]}
              disabled={loading || bookingLocked}
              onPress={finalizeBooking}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#2896a7", "#4367c1"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.confirmText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmText}>
                    {payment === 'gcash' && paymentStatus !== 'paid' ? 'Proceed to Payment' : (paymentStatus === 'paid' ? 'Complete Booking' : 'Confirm Booking')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
        {showCancelModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalIconContainerWarning}>
                <Text style={styles.modalCheckMark}>?</Text>
              </View>
              <Text style={styles.modalTitle}>Cancel Booking?</Text>
              <Text style={styles.modalMessage}>Are you sure you want to cancel this booking and return to Home?</Text>
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.modalSecondaryButton, { marginRight: 10 }]}
                  onPress={() => setShowCancelModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalSecondaryText}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setShowCancelModal(false);
                    navigation.navigate('Home');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonText}>Yes, Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 35,
    paddingBottom: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
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
    tintColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 20,
    paddingTop: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontWeight: "400",
  },
  sectionContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#e8f4f8",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  infoLabel: {
    fontSize: 15,
    color: "#7f8c8d",
    fontWeight: "500",
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    color: "#2c3e50",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  priceLabel: {
    fontSize: 15,
    color: "#7f8c8d",
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 15,
    color: "#2c3e50",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#e8e8e8",
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    color: "#2c3e50",
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 20,
    color: "#007bff",
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  cancelBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#dfe3e8',
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  gradientBtn: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginLeft: 8,
  },
  
    confirmCard: {
      backgroundColor: '#fff',
      borderRadius: 18,
      padding: 24,
      marginBottom: 30,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      borderWidth: 1,
      borderColor: '#e0e0e0',
    },
    brandHeader: {
      alignItems: 'center',
      marginBottom: 10,
    },
    brandTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#2d79d1',
      letterSpacing: 1,
      marginBottom: 6,
    },
    reviewPrompt: {
      fontSize: 15,
      color: '#555',
      textAlign: 'center',
      fontWeight: '600',
      lineHeight: 22,
    },
  // Legacy styles (keeping for backward compatibility)
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    marginBottom: 20,
  },
  item: {
    fontSize: 16,
    marginBottom: 8,
    color: "#444",
  },
  label: {
    fontWeight: "700",
    color: "#000",
  },
  total: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007bff",
    textAlign: "right",
  },
  
  // Payment success styles
  paymentSuccessContainer: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  successIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#28a745',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkMark: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  successTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  paymentSuccessTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#155724',
    marginBottom: 2,
  },
  paymentSuccessSubtext: {
    fontSize: 14,
    color: '#155724',
    textAlign: 'justify',
    lineHeight: 20,
  },

    // Modal styles
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
    },
    modalContainer: {
      backgroundColor: '#fff',
      borderRadius: 18,
      padding: 32,
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      minWidth: 260,
    },
    modalIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#2d79d1',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    modalCheckMark: {
      fontSize: 32,
      color: '#fff',
      fontWeight: 'bold',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#2d79d1',
      marginBottom: 8,
    },
    modalMessage: {
      fontSize: 15,
      color: '#444',
      textAlign: 'center',
      marginBottom: 18,
    },
    modalActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    modalSecondaryButton: {
      flex: 1,
      backgroundColor: '#e5e7eb',
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalSecondaryText: {
      color: '#374151',
      fontSize: 16,
      fontWeight: '700',
    },
    modalButton: {
      backgroundColor: '#2896a7',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 32,
      marginTop: 4,
      flex: 1,
      alignItems: 'center',
    },
    modalButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    modalIconContainerWarning: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#f59e0b',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
});
