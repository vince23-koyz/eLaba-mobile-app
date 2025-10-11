import { Alert, Image, StyleSheet, Text, TouchableOpacity, View, StatusBar, Dimensions, Modal } from 'react-native'
import React, { useEffect, useState, useCallback } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import socketService from '../services/socketService';

import { RootStackParamList } from '../navigation/Navigator';

const { height } = Dimensions.get('window');

export default function ProfileScreen() {
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
      
      // Clear all AsyncStorage data
      console.log('🧹 Clearing AsyncStorage data');
      await AsyncStorage.multiRemove([
        'customerId',
        'customerName', 
        'customerUsername',
        'customerEmail',
        'isLoggedIn'
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

  // Function to load fresh customer data from database
  const loadCustomerData = useCallback(async () => {
    try {
      const customerId = await AsyncStorage.getItem('customerId');
      
      if (!customerId) {
        console.log('No customer ID found');
        return;
      }

      // Fetch fresh data from database
      const response = await axios.get(`http://10.0.2.2:5000/api/customers/${customerId}`);
      
      if (response.data) {
        setCustomerName(response.data.first_name);
        setCustomerLastName(response.data.last_name);
        setCustomerUsername(response.data.username);
        setProfilePicture(response.data.profile_picture);
        // Update imageKey to force image reload if profile picture exists
        if (response.data.profile_picture) {
          setImageKey(Date.now());
        }

        // Also update AsyncStorage with the latest data for consistency
        await AsyncStorage.multiSet([
          ['customerName', response.data.first_name || ''],
          ['customerLastName', response.data.last_name || ''],
          ['customerUsername', response.data.username || ''],
        ]);
      }
    } catch (error) {
      console.error("Error loading customer data:", error);
      
      // Fallback to AsyncStorage if API fails
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
        colors={['#6896e6', '#80dad0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Header with Avatar */}
        <View style={styles.headerContainer}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileAvatar}>
              {profilePicture ? (
                <Image 
                  key={`profile-${profilePicture}-${imageKey}`}
                  source={{
                    uri: `http://10.0.2.2:5000/uploads/customer-profile/${profilePicture}?v=${imageKey}`,
                    cache: 'reload'
                  }}
                  style={styles.profileImage}
                  resizeMode="cover"
                  onError={() => {
                    console.log('Failed to load profile image in ProfileScreen:', profilePicture);
                    setProfilePicture(null);
                  }}
                />
              ) : (
                <Text style={styles.avatarText}>{getInitials(customerName, customerLastName)}</Text>
              )}
            </View>
            <View style={styles.onlineIndicator} />
          </View>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.usernameHeader}>{customerUsername || 'User'}</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.profileTitle}>Profile Information</Text>
            <TouchableOpacity onPress={handleProfile} style={styles.editButton}>
              <Image source={require('../assets/img/icon/edit-icon.png')} style={styles.editIcon} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.userInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{customerUsername}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{getFullName(customerName, customerLastName)}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={handleHistory} style={[styles.actionButton, styles.historyButton]}>
            <View style={styles.buttonContent}>
              <View style={styles.iconContainer}>
                <Image source={require('../assets/img/icon/history-icon.png')} style={styles.buttonIcon} />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>Transaction History</Text>
                <Text style={styles.buttonSubtitle}>View your past transactions</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} style={[styles.actionButton, styles.logoutButton]}>
            <View style={styles.buttonContent}>
              <View style={styles.iconContainer}>
                <Image source={require('../assets/img/icon/logout-icon.png')} style={styles.buttonIcon} />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={[styles.buttonTitle, styles.logoutText]}>Logout</Text>
                <Text style={[styles.buttonSubtitle, styles.logoutSubtext]}>Sign out of your account</Text>
              </View>
              <Text style={[styles.chevron, styles.logoutText]}>›</Text>
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
                <Text style={styles.modalTitle}>Logout Confirmation</Text>
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
  headerContainer: {
    alignItems: 'center',
    paddingTop: height * 0.07,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 95,
    height: 95,
    borderRadius: 47.5,
  },
  profileAvatar: {
    width: 95,
    height: 95,
    borderRadius: 47.5,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#667eea',
    textAlign: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#5ce361',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  usernameHeader: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
    marginTop: 3,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    letterSpacing: 0.2,
  },
  editButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  editIcon: {
    width: 16,
    height: 16,
    tintColor: '#fff',
  },
  userInfo: {
    gap: 14,
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
  divider: {
    height: 1,
    backgroundColor: '#f1f3f4',
    marginVertical: 7,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 16,
    flex: 1,
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
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
