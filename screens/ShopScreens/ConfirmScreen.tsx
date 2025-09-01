// screens/ShopScreens/ConfirmationScreen.tsx
import React, { use, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView, ScrollView, Image } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/Navigator";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

type ConfirmationRouteProp = RouteProp<RootStackParamList, "Confirmation">;
type ConfirmationNavProp = NativeStackNavigationProp<RootStackParamList, "Confirmation">;

export default function ConfirmationScreen({ route }: { route: ConfirmationRouteProp }) {
  const navigation = useNavigation<ConfirmationNavProp>();
  const { booking_type, selectedService, serviceName, servicePrice, selectedDate, payment, pickUpFee, total, shop_id, customer_id } = route.params;

  const [loading, setLoading] = useState(false);
  const [customerLastName, setCustomerLastName] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);

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

  const finalizeBooking = async () => {
    setLoading(true);
    try {
      // Create booking
      const bookingRes = await axios.post("http://10.0.2.2:5000/api/bookings", {
        booking_type,
        booking_date: selectedDate,
        status: "Pending",
        total_amount: total,
        shop_id,
        service_id: selectedService,
        customer_id,
      });

      const booking_id = bookingRes.data.booking_id;

      // Create payment
      await axios.post("http://10.0.2.2:5000/api/payments", {
        booking_id,
        customer_id,
        shop_id,
        service_id: selectedService,
        payment_method: payment,
        status: "Pending",
      });

      Alert.alert("Success", "Booking confirmed!");
      navigation.navigate("Home");
    } catch (err: any) {
      console.error("Booking error:", err.response?.data || err);
      Alert.alert("Error", err.response?.data?.message || "Something went wrong.");
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
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Image 
            source={require('../../assets/img/icon/back.png')} 
            style={styles.backIcon} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Confirmation</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.subtitle}>Please review your booking details below</Text>
        </View>

        {/* Customer Information */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{customerName} {customerLastName}</Text>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Booking Details</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Booking Type</Text>
            <Text style={styles.infoValue}>{booking_type}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service</Text>
            <Text style={styles.infoValue}>{serviceName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{new Date(selectedDate).toDateString()}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method</Text>
            <Text style={styles.infoValue}>{payment.toUpperCase()}</Text>
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service Fee</Text>
            <Text style={styles.priceValue}>₱{servicePrice}</Text>
          </View>
          
          {pickUpFee > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Pick-up Fee</Text>
              <Text style={styles.priceValue}>₱{pickUpFee}</Text>
            </View>
          )}
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₱{total}</Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, { opacity: loading ? 0.7 : 1 }]}
          disabled={loading}
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
              <Text style={styles.confirmText}>Confirm Booking</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
    width: 40, // Same width as back button to center the title
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
  confirmBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 20,
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
    paddingVertical: 18,
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
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginLeft: 8,
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
});
