// BookingScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, 
  ScrollView, SafeAreaView, Image, Alert, ActivityIndicator,
  BackHandler
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Calendar } from 'react-native-calendars';
import { RouteProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

type BookingServiceNavProp = NativeStackNavigationProp<RootStackParamList, 'BookingService'>;
type BookingServiceRouteProp = RouteProp<RootStackParamList, 'BookingService'>;

type Service = {
  service_id: number;
  offers: string;
  price: number;
  description?: string;
};

export default function BookingScreen({ route }: { route: BookingServiceRouteProp }) {
  const navigation = useNavigation<BookingServiceNavProp>();
  const { type: booking_type, services, shop_id } = route.params;

  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [payment, setPayment] = useState<'gcash' | 'cash' | 'cod' | null>(null);
  const [loading] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);

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
    const fetchCustomerId = async () => {
      const id = await AsyncStorage.getItem('customerId'); 
      if (id) setCustomerId(parseInt(id));
    };
    fetchCustomerId();
  }, []);

  const servicePrice = selectedService 
    ? Number(services.find((s: Service) => s.service_id === selectedService)?.price || 0)
    : 0;

  const pickUpFee = booking_type.toLowerCase() === 'pick up' ? 40 : 0;
  const total = servicePrice + pickUpFee;
  
  const goToConfirmation = () => {
    if (!selectedService || !selectedDate || !payment || !customerId) {
      Alert.alert('Error', 'Please select service, date, payment method, and make sure you are logged in.');
      return;
    }

    const service = services.find((s: Service) => s.service_id === selectedService);

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
      customer_id: customerId,
    });
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
        Alert.alert(
          "Cancel Booking?",
          "You have already selected some details. Are you sure you want to cancel this booking?",
          [
            { text: "No", style: "cancel" },
            { text: "Yes", style: "destructive", onPress: () => navigation.goBack() }
          ]
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
            Alert.alert(
              "Cancel Booking?",
              "You have already selected some details. Are you sure you want to cancel this booking?",
              [
                { text: "No", style: "cancel" },
                { text: "Yes", style: "destructive", onPress: () => navigation.goBack() }
              ]
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

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Image
            source={require('../../assets/img/icon/laundry.png')}
            style={{ width: 22, height: 22, resizeMode: 'contain', marginRight: 10 }}
          />
          <Text style={styles.sectionTitle}>Select a Service</Text>
        </View>
        <FlatList 
          data={services}
          scrollEnabled={false}
          keyExtractor={(item) => item.service_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.serviceCard, selectedService === item.service_id && styles.selectedCard]}
              onPress={() => setSelectedService(prev => prev === item.service_id ? null : item.service_id)}
            >
              <View style={styles.serviceRow}>
                <Text style={styles.serviceText}>{item.offers}</Text>
              </View>
              <Text style={styles.servicePrice}>₱{item.price}</Text>
            </TouchableOpacity>
          )}
        />

        {selectedService && (
            <View style={[styles.descriptionContainer, { borderRadius: 12, borderWidth: 1, borderColor: "#cce6ff", backgroundColor: "#f4faff" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Image
              source={require('../../assets/img/icon/info.png')}
              style={{ width: 18, height: 18, marginRight: 7, tintColor: "#007bff" }}
              />
              <Text style={{ fontWeight: "700", fontSize: 16, color: "#007bff" }}>Service Details</Text>
            </View>
            <Text style={styles.descriptionText}>
              {services.find((s: Service) => s.service_id === selectedService)?.description || "No description available."}
            </Text>
            </View>
        )}

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Image
            source={require('../../assets/img/icon/calendar.png')}
            style={{ width: 22, height: 22, resizeMode: 'contain', marginRight: 10 }}
          />
          <Text style={styles.sectionTitle}>Set Date of Booking</Text>
        </View>
        <View 
          style={styles.dateDisplay}>
          <Text style={styles.dateText}>
            {selectedDate ? selectedDate.toDateString() : "Select a Date"}
          </Text>
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
        {['gcash', 'cash', 'cod'].map((method) => (
          <TouchableOpacity 
            key={method} 
            style={[styles.paymentBtn, payment === method && styles.paymentSelected]}
            onPress={() => setPayment(method as 'gcash' | 'cash' | 'cod')}
          >
            <Text style={[styles.paymentText, payment === method && { color: "#fff" }]}>
              {method.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
            <Text style={styles.totalValue}>₱{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* 🚀 Redirect to Confirmation */}
        <TouchableOpacity 
          style={[styles.confirmBtnFooter, { opacity: loading ? 0.6 : 1 }]}
          onPress={goToConfirmation}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#2896a7', '#4367c1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmBtnGradient}
          >
            <Text style={styles.confirmText}>{loading ? "Processing..." : "Confirm"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  serviceRow: { flexDirection: "row", alignItems: "center" },
  serviceText: { fontSize: 16, fontWeight: "500", color: "#333" },
  servicePrice: { fontWeight: "700", color: "#007bff", fontSize: 15 },
  descriptionContainer: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: "#fff",
    elevation: 2,
  },
  descriptionText: { fontSize: 15, color: "#555", lineHeight: 20 },
  // Date
  dateDisplay: { 
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
  paymentText: { fontSize: 16, fontWeight: "600", color: "#333" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 18,
    paddingHorizontal: 20,
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
