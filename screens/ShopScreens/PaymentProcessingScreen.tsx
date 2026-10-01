import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, SafeAreaView, ActivityIndicator, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import paymongoService from '../../services/paymongoService';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAlert } from '../../context/AlertContext';

type CustomerInfo = { name: string; email: string; phone: string };

type Params = {
	amount?: number; // PHP amount 
	description?: string; // ex. "eLaba - Shop - Service (Pick up)"
	customerInfo?: CustomerInfo;
	bookingId?: number;
	paymentIntentId?: string;
	redirectUrl?: string | null;
	// Optional callback to notify caller when done
	onResult?: (status: 'succeeded' | 'canceled' | 'processing') => void;
};

export default function PaymentProcessingScreen({ route }: { route: { params?: Params } }) {
	const navigation = useNavigation<any>();
	const params = route?.params || {};
  const { showAlert } = useAlert();

	const [loading, setLoading] = useState<boolean>(true);
	const [redirectUrl, setRedirectUrl] = useState<string | null>(params.redirectUrl ?? null);
	const [paymentIntentId, setPaymentIntentId] = useState<string | null>(params.paymentIntentId ?? null);
	const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);

	const description = useMemo(() => params.description || 'eLaba GCash Payment', [params.description]);

	useEffect(() => {
		let isMounted = true;
		const init = async () => {
			try {
				// If caller provided redirect + intent, just display it
				if (params.redirectUrl && params.paymentIntentId) {
					if (!isMounted) return;
					setRedirectUrl(params.redirectUrl);
					setPaymentIntentId(params.paymentIntentId);
					setLoading(false);
					return;
				}

				// Otherwise, create a GCash payment via backend using provided or stored customer info
				const name = (await AsyncStorage.getItem('customerName')) || 'Customer';
				const lastName = (await AsyncStorage.getItem('customerLastName')) || '';
				const email = (await AsyncStorage.getItem('customerEmail')) || 'customer@elaba.com';
				const phone = (await AsyncStorage.getItem('customerPhone')) || '09123456789';
				const customerInfo: CustomerInfo = params.customerInfo || { name: `${name} ${lastName}`.trim(), email, phone };

				const amount = params.amount ?? 0;
				if (!amount || amount <= 0) {
					throw new Error('Invalid or missing amount.');
				}

				const result = await paymongoService.createGCashPayment(amount, description, customerInfo, params.bookingId);
				if (!isMounted) return;
				setPaymentIntentId(result.paymentIntentId);
				setRedirectUrl(result.redirectUrl || null);

				// If no redirect (mock), poll and finish
						if (!result.redirectUrl) {
							setIsCheckingStatus(true);
							const raw = await paymongoService.pollPaymentStatus(result.paymentIntentId, { intervalMs: 1500, timeoutMs: 20000 });
							setIsCheckingStatus(false);
							const normalized: 'succeeded' | 'canceled' | 'processing' =
								raw === 'succeeded' ? 'succeeded' : raw === 'canceled' ? 'canceled' : 'processing';
							handleFinish(normalized);
							return;
						}
			} catch (e: any) {
				showAlert('Payment Error', e?.message || 'Failed to initialize GCash payment', undefined, 'error');
				handleFinish('canceled');
			} finally {
				if (isMounted) setLoading(false);
			}
		};
		init();
		return () => {
			isMounted = false;
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const handleFinish = (status: 'succeeded' | 'canceled' | 'processing') => {
		try {
			params.onResult && params.onResult(status);
		} catch {}
		// Default behavior: go back to previous screen
		navigation.goBack();
	};

	const handleWebViewNav = async (navState: any) => {
		const url: string = navState?.url || '';
		// Recognize our success/cancel markers
		if (url.startsWith('https://example.com/success') || url.includes('Payment Successful') || (url.includes('success') && url.includes('payment'))) {
			// Close webview and verify status from backend
			if (paymentIntentId) {
				try {
					setIsCheckingStatus(true);
					const status = await paymongoService.pollPaymentStatus(paymentIntentId, { intervalMs: 2000, timeoutMs: 20000 });
					setIsCheckingStatus(false);
					handleFinish(status === 'succeeded' ? 'succeeded' : status === 'canceled' ? 'canceled' : 'processing');
				} catch {
					setIsCheckingStatus(false);
					showAlert('Verification Error', 'Could not verify payment.', undefined, 'error');
					handleFinish('processing');
				}
			} else {
				handleFinish('succeeded');
			}
		} else if (url.startsWith('https://example.com/cancel') || url.includes('cancel')) {
			showAlert('Payment Canceled', 'You cancelled the payment.', undefined, 'warning');
			handleFinish('canceled');
		}
	};

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
			<LinearGradient colors={['#6bd0d7', '#2d79d1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
				<TouchableOpacity onPress={() => handleFinish('canceled')} style={styles.backBtn}>
					<Image source={require('../../assets/img/icon/back.png')} style={styles.backIcon} />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>GCash Payment</Text>
				<View style={{ width: 40 }} />
			</LinearGradient>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color="#137cbd" />
					<Text style={{ marginTop: 8 }}>Preparing payment…</Text>
				</View>
			) : redirectUrl ? (
				<WebView
					source={{ uri: redirectUrl }}
					onNavigationStateChange={handleWebViewNav}
					startInLoadingState
					renderLoading={() => (
						<View style={styles.center}>
							<ActivityIndicator size="large" color="#137cbd" />
							<Text style={{ marginTop: 8 }}>Loading GCash…</Text>
						</View>
					)}
				/>
			) : (
				<View style={styles.center}>
					{isCheckingStatus ? (
						<>
							<ActivityIndicator size="large" color="#137cbd" />
							<Text style={{ marginTop: 8 }}>Verifying payment…</Text>
						</>
					) : (
						<>
							<Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 6 }}>Waiting for payment…</Text>
							<Text style={{ color: '#555' }}>No redirect URL provided. This may be mock mode.</Text>
						</>
					)}
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 35, paddingBottom: 15, paddingHorizontal: 15 },
	backBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
	backIcon: { width: 24, height: 24, resizeMode: 'contain', tintColor: '#fff' },
	headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }
});

