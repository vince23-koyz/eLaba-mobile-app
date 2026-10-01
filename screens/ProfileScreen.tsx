import { Image, StyleSheet, Text, TouchableOpacity, View, StatusBar, Dimensions, Modal } from 'react-native'
import React, { useState, useCallback } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { api, API_ENDPOINTS, API_CONFIG } from '../config/api';
import { deleteDeviceToken } from '../services/notificationService';
import socketService from '../services/socketService';

import { RootStackParamList } from '../navigation/Navigator';

const { height, width } = Dimensions.get('window');

export default function ProfileScreen() {
  const isCompactDevice = width < 390;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerLastName, setCustomerLastName] = useState<string | null>(null);
  const [customerUsername, setCustomerUsername] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(Date.now()); // For cache busting

  // Function to get initials from customer first and last name
  const getInitials = (firstName: string | null, lastName: string | null): string => {
    if (!firstName && !lastName) return 'NN'; // Default to 'NN' for No Name
    
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    
    if (firstInitial && lastInitial) {
      return firstInitial + lastInitial;
    } else if (firstInitial) {
      return firstInitial;
    } else if (lastInitial) {
      return lastInitial;
    }
    
    return 'NN';
  };

  // Function to get full name
  const getFullName = (firstName: string | null, lastName: string | null): string => {
    if (!firstName && !lastName) return 'No Name';
    
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();
    return fullName || 'No Name';
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      console.log('🚪 [CUSTOMER] User logging out - cleaning up...');
      
      // Disconnect from socket and clean up all messaging connections
      console.log('🔌 Disconnecting from socket service');
      socketService.disconnect();
      
      // Best-effort: revoke/clear device push token server-side and locally
      try {
        const [customerId, fcmToken] = await Promise.all([
          AsyncStorage.getItem('customerId'),
          AsyncStorage.getItem('fcmToken'),
        ]);

        if (customerId && fcmToken) {
          console.log('🔔 Deleting device token on server');
          try {
            await deleteDeviceToken(fcmToken);
          } catch (e) {
            const msg = (e as any)?.response?.data || (e as any)?.message || String(e);
            console.warn('⚠️ Failed to delete device token on server (continuing logout):', msg);
          }

          try {
            console.log('🗑️ Deleting FCM token locally');
            await messaging().deleteToken();
          } catch (e) {
            const msg = (e as any)?.message || String(e);
            console.warn('⚠️ Failed to delete local FCM token (continuing):', msg);
          }
        }
      } catch (e) {
        const msg = (e as any)?.message || String(e);
        console.warn('⚠️ Error while preparing token cleanup:', msg);
      }

      // Clear AsyncStorage data (auth/profile/session + fcm)
      console.log('🧹 Clearing AsyncStorage data');
      await AsyncStorage.multiRemove([
        'customerId',
        'customerName',
        'customerLastName',
        'customerUsername',
        'customerEmail',
        'customerPhone',
        'customerAddress',
        'customerStreet',
        'customerZone',
        'customerBarangay',
        'customerCity',
        'fcmToken',
        'isLoggedIn',
      ]);
      
      console.log('✅ [CUSTOMER] Logout cleanup complete');
      
      setShowLogoutModal(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('❌ Error during logout cleanup:', error);
      // Still proceed with logout even if cleanup fails
      setShowLogoutModal(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleProfile = () => {
    navigation.navigate('MyProfile')
  };

  const handleHistory = () => {
    navigation.navigate('Transaction')
  };

  // Handler for MyBookingScreen navigation
  const handleMyOrder = () => {
    navigation.navigate('MyBookingScreen');
  };

  // Resolve profile image URL whether absolute (Cloudinary) or relative (/uploads/.. or filename only)
  const getProfileImageUrl = (): string | null => {
    if (!profilePicture) return null;
    try {
      const base = API_CONFIG.BASE_ORIGIN;
      const pic = String(profilePicture);
      if (pic.startsWith('http')) {
        return `${pic}${pic.includes('?') ? `&v=${imageKey}` : `?v=${imageKey}`}`;
      }
      if (pic.startsWith('/uploads')) {
        return `${base}${pic}?v=${imageKey}`;
      }
      // Fallback: old data stored filename only
      return `${base}/uploads/profile/${pic}?v=${imageKey}`;
    } catch {
      return null;
    }
  };

  // Function to load fresh customer data from database
  const loadCustomerData = useCallback(async () => {
    try {
      const customerId = await AsyncStorage.getItem('customerId');
      if (!customerId) {
        console.log('No customer ID found');
        return;
      }
      // Fetch fresh data from database
      const response = await api.get(API_ENDPOINTS.CUSTOMERS.BY_ID(customerId));
      if (response.data) {
        setCustomerName(response.data.first_name);
        setCustomerLastName(response.data.last_name);
        setCustomerUsername(response.data.username);
        setProfilePicture(response.data.profile_picture);
        if (response.data.profile_picture) {
          setImageKey(Date.now());
        }
        await AsyncStorage.multiSet([
          ['customerName', response.data.first_name || ''],
          ['customerLastName', response.data.last_name || ''],
          ['customerUsername', response.data.username || ''],
        ]);
      }
    } catch (error) {
      console.error("Error loading customer data:", error);
      try {
        const firstName = await AsyncStorage.getItem('customerName');
        const lastName = await AsyncStorage.getItem('customerLastName');
        const username = await AsyncStorage.getItem('customerUsername');
        if (firstName) setCustomerName(firstName);
        if (lastName) setCustomerLastName(lastName);
        if (username) setCustomerUsername(username);
      } catch (storageError) {
        console.error("Error loading from AsyncStorage:", storageError);
      }
    }
  }, []);

  // Load data when screen comes into focus (including when navigating back)
  useFocusEffect(
    useCallback(() => {
      loadCustomerData();
    }, [loadCustomerData])
  );

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#96bcff" />
      <LinearGradient
        colors={['#a2fff4', '#96bcff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Text style={styles.sectionTitle}>My Profile</Text>

        {/* Profile Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleProfile}
          style={[styles.profileCard, { width: width * 0.76, alignSelf: 'center', marginTop: 12 }]}
        >
          <View style={styles.profileIdentity}>
            <View style={[styles.profileAvatarLarge, { width: isCompactDevice ? 64 : 72, height: isCompactDevice ? 64 : 72, borderRadius: (isCompactDevice ? 64 : 72) / 2 }]}>
              {profilePicture ? (
                <Image
                  key={`profile-large-${profilePicture}-${imageKey}`}
                  source={{ uri: getProfileImageUrl() || undefined, cache: 'reload' as any }}
                  style={[styles.largeProfileImage, { width: isCompactDevice ? 64 : 72, height: isCompactDevice ? 64 : 72, borderRadius: (isCompactDevice ? 64 : 72) / 2 }]}
                  resizeMode="cover"
                  onError={() => {
                    console.log('Failed to load profile image in profile card:', profilePicture);
                    setProfilePicture(null);
                  }}
                />
              ) : (
                <Text style={[styles.largeAvatarText, { fontSize: isCompactDevice ? 22 : 25 }]}>{getInitials(customerName, customerLastName)}</Text>
              )}
            </View>

            <View style={styles.profileIdentityText}>
              <Text style={[styles.profileName, { fontSize: isCompactDevice ? 18 : 20 }]} numberOfLines={1}>
                {getFullName(customerName, customerLastName) || 'No Name'}
              </Text>
              <Text style={[styles.profileUsername, { fontSize: isCompactDevice ? 12 : 13 }]} numberOfLines={1}>
                {`@${customerUsername || 'user'}`}
              </Text>
            </View>

            <Text style={styles.profileChevron}>{'›'}</Text>
          </View>
          <View style={styles.profileEditBadge} pointerEvents="none">
            <Image
              source={require('../assets/img/icon/edit-icon.png')}
              style={styles.profileEditIcon}
            />
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* My Orders Button */}
          <TouchableOpacity onPress={handleMyOrder} style={[styles.actionButton, styles.ordersButton]}>
            <View style={styles.buttonContent}>
              <View style={[styles.iconContainer, { width: isCompactDevice ? 38 : 42, height: isCompactDevice ? 38 : 42, borderRadius: (isCompactDevice ? 38 : 42) / 2 }]}>
                <Image source={require('../assets/img/icon/clothes-hanger.png')} style={[styles.buttonIcon, { width: isCompactDevice ? 18 : 20, height: isCompactDevice ? 18 : 20 }]} />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={[styles.buttonTitle, { fontSize: isCompactDevice ? 15 : 16 }]}>My Bookings</Text>
                <Text style={[styles.buttonSubtitle, { fontSize: isCompactDevice ? 10.5 : 12 }]}>View your current and past orders</Text>
              </View>
              <Text style={[styles.chevron, { fontSize: 24 }]}>{'›'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleHistory} style={[styles.actionButton, styles.historyButton]}>
            <View style={styles.buttonContent}>
              <View style={[styles.iconContainer, { width: isCompactDevice ? 38 : 42, height: isCompactDevice ? 38 : 42, borderRadius: (isCompactDevice ? 38 : 42) / 2 }]}>
                <Image source={require('../assets/img/icon/history-icon.png')} style={[styles.buttonIcon, { width: isCompactDevice ? 18 : 20, height: isCompactDevice ? 18 : 20 }]} />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={[styles.buttonTitle, { fontSize: isCompactDevice ? 15 : 16 }]}>Transaction History</Text>
                <Text style={[styles.buttonSubtitle, { fontSize: isCompactDevice ? 10.5 : 12 }]}>View your past transactions</Text>
              </View>
              <Text style={[styles.chevron, { fontSize: 24 }]}>{'›'}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} style={[styles.actionButton, styles.logoutButton]}>
            <View style={styles.buttonContent}>
              <View style={[styles.iconContainer, { width: isCompactDevice ? 38 : 42, height: isCompactDevice ? 38 : 42, borderRadius: (isCompactDevice ? 38 : 42) / 2 }]}>
                <Image source={require('../assets/img/icon/logout-icon.png')} style={[styles.buttonIcon, { width: isCompactDevice ? 18 : 20, height: isCompactDevice ? 18 : 20 }]} />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={[styles.buttonTitle, styles.logoutText, { fontSize: isCompactDevice ? 15 : 16 }]}>Logout</Text>
                <Text style={[styles.buttonSubtitle, styles.logoutSubtext, { fontSize: isCompactDevice ? 10.5 : 12 }]}>Sign out of your account</Text>
              </View>
              <Text style={[styles.chevron, styles.logoutText, { fontSize: 24 }]}>{'›'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />

        {/* Logout Modal */}
        <Modal
          visible={showLogoutModal}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelLogout}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <Image 
                    source={require('../assets/img/icon/logout-icon.png')} 
                    style={styles.modalIcon} 
                  />
                </View>
                <Text style={styles.modalTitle}>Logout</Text>
                <Text style={styles.modalMessage}>
                  Are you sure you want to logout from your account?
                </Text>
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={cancelLogout}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.confirmButton} 
                  onPress={confirmLogout}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#2546a3', '#2bc0af']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.confirmButtonGradient}
                  >
                    <Text style={styles.confirmButtonText}>Logout</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: Math.max(30, height * 0.08),
    marginBottom: 14,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 45,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 1,
    borderWidth: 1,
    borderColor: 'rgba(150, 188, 255, 0.22)',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#e0e7ff',
  },
  largeProfileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  largeAvatarText: {
    fontSize: 25,
    fontWeight: '700',
    color: '#667eea',
  },
  profileIdentityText: {
    flex: 1,
  },
  profileName: {
    color: '#2c3e50',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileUsername: {
    color: '#7f8c8d',
    fontSize: 13,
    fontWeight: '500',
  },
  profileChevron: {
    color: '#bdc3c7',
    fontSize: 27,
    fontWeight: '300',
    paddingLeft: 8,
  },
  profileEditBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileEditIcon: {
    width: 14,
    height: 14,
    tintColor: '#fff',
  },
  userInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    letterSpacing: 0.1,
    maxWidth: '60%',
    textAlign: 'right',
  },
  actionsContainer: {
    width: '100%',
    paddingHorizontal: 18,
    gap: 9,
    flex: 1,
    marginTop: '25%',
    justifyContent: 'flex-start',
    paddingVertical: 14,
  },
  actionButton: {
    backgroundColor: '#f9fbff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(150, 188, 255, 0.18)',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  ordersButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#00b894',
  },
  historyButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  logoutButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonIcon: {
    width: 20,
    height: 20,
    tintColor: '#667eea',
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
    letterSpacing: 0.1,
  },
  buttonSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '400',
    letterSpacing: 0.05,
  },
  chevron: {
    fontSize: 22,
    color: '#bdc3c7',
    fontWeight: '300',
  },
  logoutText: {
    color: '#e74c3c',
  },
  logoutSubtext: {
    color: '#e74c3c',
    opacity: 0.7,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 0,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    padding: 28,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fee8e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#e74c3c',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  modalIcon: {
    width: 30,
    height: 30,
    tintColor: '#e74c3c',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  modalMessage: {
    fontSize: 15,
    color: '#696969',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
    letterSpacing: 0.2,
  },
  modalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#ecf0f1',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  confirmButton: {
    flex: 1,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  bottomSpacer: {
    height: 30,
  },
})
