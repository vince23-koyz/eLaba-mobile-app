import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Alert,
  Image,
  BackHandler,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { RouteProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { captureRef } from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import { RootStackParamList } from '../../navigation/Navigator';


type BookingReceiptRouteProp = RouteProp<RootStackParamList, 'BookingReceipt'>;
type BookingReceiptNavProp = NativeStackNavigationProp<RootStackParamList, 'BookingReceipt'>;

export default function BookingReceiptScreen({ route }: { route: BookingReceiptRouteProp }) {
  const navigation = useNavigation<BookingReceiptNavProp>();
  const {
    booking_id,
    receiptNumber,
    booking_type,
    serviceName,
    servicePrice,
    selectedDate,
    payment,
    pickUpFee,
    total,
    shop_name,
    customerName,
    customerLastName,
    paymentStatus,
    showSuccessModal = false,
    pickup_address,
    delivery_address,
  } = route.params;

  const receiptRef = useRef<View>(null);
  const [saving, setSaving] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showBookingSentModal, setShowBookingSentModal] = useState(Boolean(showSuccessModal));
  const [savedMessage, setSavedMessage] = useState('Your receipt has been saved.');

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }, [navigation])
  );

  const formatCurrency = (value: number) => `₱${Number(value || 0).toFixed(2)}`;
  const formattedDate = new Date(selectedDate).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const ensureStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    if (Platform.Version >= 33) return true;

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Save receipt image',
          message: 'Allow eLaba to save the booking receipt to your device.',
          buttonPositive: 'Allow',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.log('Permission error:', error);
      return false;
    }
  };

  const saveReceiptAsImage = async () => {
    try {
      if (!receiptRef.current) {
        Alert.alert('Receipt not ready', 'Please try again in a moment.');
        return;
      }

      setSaving(true);
      const hasPermission = await ensureStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission denied', 'Storage access is required to save the receipt image.');
        setSaving(false);
        return;
      }

      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      const destDir = `${RNFS.DownloadDirectoryPath}/eLabaReceipts`;
      await RNFS.mkdir(destDir);
      const filename = `receipt-${receiptNumber.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
      const destination = `${destDir}/${filename}`;
      await RNFS.copyFile(uri, destination);

      setSavedMessage('Receipt saved successfully to your gallery or downloads folder.');
      setShowSavedModal(true);
    } catch (error: any) {
      console.log('Save receipt error:', error);
      Alert.alert('Failed to save receipt', error?.message || 'Unable to save the receipt image.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#6bd0d7', '#2d79d1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
          style={styles.closeButton}
          activeOpacity={0.8}
        >
          <Text style={styles.closeText}>Done</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View ref={receiptRef} collapsable={false} style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <View style={styles.brandBlock}>
              <Image
                source={require('../../assets/img/elaba.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.brand}>eLaba</Text>
            </View>
            <Text style={styles.receiptLabel}>Booking Receipt</Text>
          </View>

          <View style={styles.receiptMetaStack}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Receipt No.</Text>
              <Text style={styles.metaValue}>{receiptNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Schedule</Text>
              <Text style={styles.metaValue}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Customer</Text>
            <Text style={styles.sectionValue}>{customerName} {customerLastName || ''}</Text>
          </View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Shop</Text>
            <Text style={styles.sectionValue}>{shop_name}</Text>
          </View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Service</Text>
            <Text style={styles.sectionValue}>{serviceName}</Text>
          </View>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Type</Text>
            <Text style={styles.sectionValue}>{booking_type}</Text>
          </View>
          {booking_type === 'Pick up' && (pickup_address || delivery_address) && (
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>Address</Text>
              <Text style={styles.sectionValue}>{pickup_address || delivery_address}</Text>
            </View>
          )}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Payment</Text>
            <Text style={styles.sectionValue}>{payment.toUpperCase()}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Service Fee</Text>
            <Text style={styles.totalValue}>{formatCurrency(servicePrice)}</Text>
          </View>
          {pickUpFee > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Pick-up Fee</Text>
              <Text style={styles.totalValue}>{formatCurrency(pickUpFee)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
          </View>

          <Text style={styles.footerMessage}>Thank you for booking with eLaba!</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveReceiptAsImage}
          disabled={saving}
          activeOpacity={0.9}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Receipt'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {showBookingSentModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIcon}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Booking Sent!</Text>
            <Text style={styles.modalMessage}>Your booking has been sent successfully. You can track its status in My Bookings.</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowBookingSentModal(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showSavedModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIcon}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Receipt Saved</Text>
            <Text style={styles.modalMessage}>{savedMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSavedModal(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f6fb',
  },
  header: {
    paddingTop: 32,
    paddingBottom: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  closeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 56,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  receiptCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dfeaf8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoImage: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1c8ec9',
    textAlign: 'center',
  },
  receiptLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2d3d',
    textAlign: 'center',
  },
  receiptMetaStack: {
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  metaLabel: {
    color: '#7b8a99',
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    color: '#1f2d3d',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9eef5',
    marginVertical: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    color: '#6b7b8f',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sectionValue: {
    color: '#1f2d3d',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    color: '#455668',
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    color: '#1f2d3d',
    fontSize: 14,
    fontWeight: '700',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#dfeaf8',
  },
  grandTotalLabel: {
    color: '#1f2d3d',
    fontSize: 18,
    fontWeight: '800',
  },
  grandTotalValue: {
    color: '#1c8ec9',
    fontSize: 18,
    fontWeight: '800',
  },
  footerMessage: {
    marginTop: 18,
    textAlign: 'center',
    color: '#2d3b4f',
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    marginTop: 18,
    backgroundColor: '#1c8ec9',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#dff7ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalIcon: {
    color: '#1fae67',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 30,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2d3d',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: '#52657a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  modalButton: {
    width: '100%',
    backgroundColor: '#1c8ec9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
