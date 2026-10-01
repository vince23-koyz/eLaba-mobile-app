import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import { updateDeviceToken } from '../services/notificationService';
import { handleNotificationNavigation } from '../services/notificationNavigation';

async function requestNotificationPermission() {
    if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        console.log('[FCM] Android POST_NOTIFICATIONS:', result);
        return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    // iOS handled in Firebase Messaging perms if needed
    return true;
}

async function getCustomerId(): Promise<string | null> {
    try {
        const id = await AsyncStorage.getItem('customerId');
        return id;
    } catch (e) {
        console.log('Failed to load customerId from storage', e);
        return null;
    }
}

export const useNotifications = () => {
    useEffect(() => {
        let unsubscribeOnMessage: (() => void) | undefined;
        let unsubscribeTokenRefresh: (() => void) | undefined;

        const init = async () => {
            const granted = await requestNotificationPermission();

            // Ensure we have a logged-in customer id
            const customerId = await getCustomerId();
            if (!customerId) {
                console.log('[FCM] No customerId in storage yet, will retry after login');
            }

            // Get FCM token and register to backend
            try {
                const token = await messaging().getToken();
                console.log('[FCM] Token:', token);
                if (customerId) {
                    await updateDeviceToken({
                        accountId: customerId,
                        accountType: 'customer',
                        token,
                    });
                    console.log('[FCM] Token registered to backend');
                }
            } catch (e) {
                console.log('[FCM] Failed to get/register token', e);
            }

            // Listen for token refresh
            unsubscribeTokenRefresh = messaging().onTokenRefresh(async (token) => {
                console.log('[FCM] Token refreshed:', token);
                const cid = await getCustomerId();
                if (cid) {
                    try {
                        await updateDeviceToken({ accountId: cid, accountType: 'customer', token });
                        console.log('[FCM] Refreshed token registered');
                    } catch (e) {
                        console.log('[FCM] Failed to update refreshed token', e);
                    }
                }
            });

            // Connect to socket for realtime notifications
            if (customerId) {
                socketService.connect(customerId, 'customer');
            }

            // Foreground message handler
            unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
                console.log('[FCM] Foreground message:', remoteMessage);
                // Optionally: show in-app banner or update state
            });

            // When app opened from a background state
            messaging().onNotificationOpenedApp((remoteMessage) => {
                if (remoteMessage?.data) {
                    handleNotificationNavigation(remoteMessage.data as any);
                }
            });

            // When app opened from quit state
            messaging()
                .getInitialNotification()
                .then((remoteMessage) => {
                    if (remoteMessage?.data) {
                        handleNotificationNavigation(remoteMessage.data as any);
                    }
                });
        };

        init();

        return () => {
            if (unsubscribeOnMessage) unsubscribeOnMessage();
            if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
            socketService.offNewNotification?.();
        };
    }, []);
};