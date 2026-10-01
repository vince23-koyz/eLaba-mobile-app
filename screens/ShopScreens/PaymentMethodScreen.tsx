import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, ActivityIndicator, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import paymongoService from '../../services/paymongoService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { useAlert } from '../../context/AlertContext';

 type PaymentMethodRouteProp = RouteProp<RootStackParamList, 'PaymentMethod'>;
 type PaymentMethodNavProp = NativeStackNavigationProp<RootStackParamList, 'PaymentMethod'>;

 const methods: { key: 'gcash' | 'cash' | 'cod'; label: string; description: string }[] = [
  { key: 'gcash', label: 'GCash', description: 'Pay securely via GCash (test / mock mode)' },
  { key: 'cash', label: 'Cash (In-Person)', description: 'Pay at the shop after service' },
  { key: 'cod', label: 'Cash On Delivery', description: 'Pay when your laundry is picked up/delivered' }
 ];

 export default function PaymentMethodScreen({ route }: { route: PaymentMethodRouteProp }) {
  const navigation = useNavigation<PaymentMethodNavProp>();
  const params = route.params;
  const { showAlert } = useAlert();
  const [mode, setMode] = useState<string>('...');
  const [loading, setLoading] = useState<boolean>(false);
    const [showGCashWebView, setShowGCashWebView] = useState<boolean>(false);
    const [gcashRedirectUrl, setGcashRedirectUrl] = useState<string | null>(null);
    const [gcashPaymentIntentId, setGcashPaymentIntentId] = useState<string | null>(null);
    const [gcashPaymongoPaymentId, setGcashPaymongoPaymentId] = useState<string | null>(null);
    const [webViewError, setWebViewError] = useState<string | null>(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const info = await paymongoService.getMode();
        setMode(info.mode === 'test' ? 'sandbox' : info.mode);
      } catch {
        setMode('unknown');
      }
    })();
  }, []);

  const selectMethod = async (method: 'gcash' | 'cash' | 'cod') => {
    if (method === 'gcash') {
      try {
        setLoading(true);
        const name = (await AsyncStorage.getItem('customerName')) || 'Customer';
        const lastName = (await AsyncStorage.getItem('customerLastName')) || '';
        const email = (await AsyncStorage.getItem('customerEmail')) || 'customer@elaba.com';
        const phone = (await AsyncStorage.getItem('customerPhone')) || '09123456789';
        const customerInfo = { name: `${name} ${lastName}`.trim(), email, phone };

  const description = `eLaba - ${params.shop_name ? `${params.shop_name} - ` : ''}${params.serviceName} (${params.booking_type})`;
        const result = await paymongoService.createGCashPayment(
          params.total,
          description,
          customerInfo
        );

        setGcashPaymentIntentId(result.paymentIntentId);
        setGcashPaymongoPaymentId(result.paymongoPaymentId || null);
        setGcashRedirectUrl(result.redirectUrl);

        if (result.redirectUrl) {
          setShowGCashWebView(true);
        } else {
          // Mock or missing redirect: poll and proceed on success
          setIsCheckingStatus(true);
          const status = await paymongoService.pollPaymentStatus(result.paymentIntentId, { intervalMs: 1500, timeoutMs: 20000 });
          setIsCheckingStatus(false);
          if (status === 'succeeded') {
            const details = await paymongoService.getPaymentStatusDetails(result.paymentIntentId);
            const providerPaymentId = result.paymongoPaymentId || details.paymongoPaymentId;
            navigation.navigate('Confirmation', {
              ...params,
              payment: 'gcash',
              paymentStatus: 'paid',
              paymongoPaymentId: providerPaymentId || undefined,
              paymentIntentId: result.paymentIntentId
            });
          } else if (status === 'canceled') {
            showAlert('Payment Canceled', 'Your payment was canceled.', undefined, 'warning');
          } else {
            showAlert('Payment Pending', 'Payment is still processing, please try again.', undefined, 'info');
          }
        }

      } catch (e: any) {
        showAlert('Payment Error', e.message || 'Failed to initialize GCash payment', undefined, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }
    navigation.navigate('Confirmation', {
      ...params,
      payment: method,
      paymentStatus: 'pending'
    });
  };

  const handleWebViewNav = async (navState: any) => {
    const url: string = navState?.url || '';
    if (url.startsWith('https://example.com/success') || url.includes('Payment Successful') || (url.includes('success') && url.includes('payment'))) {
      setShowGCashWebView(false);
      if (gcashPaymentIntentId) {
        try {
          setIsCheckingStatus(true);
          const status = await paymongoService.pollPaymentStatus(gcashPaymentIntentId, { intervalMs: 2000, timeoutMs: 20000 });
          setIsCheckingStatus(false);
          if (status === 'succeeded') {
            const details = await paymongoService.getPaymentStatusDetails(gcashPaymentIntentId);
            const providerPaymentId = gcashPaymongoPaymentId || details.paymongoPaymentId;
            navigation.navigate('Confirmation', {
              ...params,
              payment: 'gcash',
              paymentStatus: 'paid',
              paymongoPaymentId: providerPaymentId || undefined,
              paymentIntentId: gcashPaymentIntentId
            });
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
        navigation.navigate('Confirmation', {
          ...params,
          payment: 'gcash',
          paymentStatus: 'paid'
        });
      }
    } else if (url.startsWith('https://example.com/cancel') || url.includes('cancel')) {
      setShowGCashWebView(false);
      showAlert('Payment Canceled', 'You cancelled the payment.', undefined, 'warning');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#6bd0d7', '#2d79d1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={require('../../assets/img/icon/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Payment Method</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.modeBadgeWrapper}>
        <Text style={styles.modeBadge}>Payment Mode: {mode}</Text>
      </View>
      <View style={styles.content}>
        {methods.map(m => {
          const isCashDisabled = params?.booking_type === 'Pick up' && m.key === 'cash';
          const isCoDDisabled = params?.booking_type === 'Walk in' && m.key === 'cod';
          const isDisabled = isCashDisabled || isCoDDisabled;
          
          return (
            <TouchableOpacity 
              key={m.key} 
              style={[styles.methodCard, isDisabled && styles.methodCardDisabled]} 
              onPress={() => !isDisabled && selectMethod(m.key)}
              disabled={isDisabled}
              activeOpacity={isDisabled ? 1 : 0.8}
            >
              <View style={styles.methodHeader}>
                <Text style={[styles.methodLabel, isDisabled && styles.methodLabelDisabled]}>{m.label}</Text>
                <Text style={[styles.methodType, isDisabled && styles.methodTypeDisabled]}>{m.key.toUpperCase()}</Text>
              </View>
              <Text style={[styles.methodDescription, isDisabled && styles.methodDescriptionDisabled]}>
                {isDisabled ? 'Not available for this booking type' : m.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
    </SafeAreaView>
  );
 }

 const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 35, paddingBottom: 15, paddingHorizontal: 15 },
  backBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  backIcon: { width: 24, height: 24, resizeMode: 'contain', tintColor: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  content: { padding: 20 },
  methodCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 18, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3 },
  methodCardDisabled: { backgroundColor: '#f0f0f0', opacity: 0.6 },
  methodHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  methodLabel: { fontSize: 18, fontWeight: '700', color: '#1d3557' },
  methodLabelDisabled: { color: '#999' },
  methodType: { fontSize: 12, fontWeight: '700', color: '#2d79d1', backgroundColor: '#e1f3ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  methodTypeDisabled: { color: '#999', backgroundColor: '#e8e8e8' },
  methodDescription: { fontSize: 14, color: '#555', lineHeight: 18 },
  methodDescriptionDisabled: { color: '#999' },
  modeBadgeWrapper: { paddingHorizontal: 20, paddingTop: 16 },
  modeBadge: { alignSelf: 'flex-start', backgroundColor: '#e1f3ff', color: '#1d3557', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }
 });
