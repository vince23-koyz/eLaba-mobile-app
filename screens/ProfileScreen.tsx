import { Alert, Image, StyleSheet, Text, TouchableOpacity, View, StatusBar, Dimensions, Modal } from 'react-native'
import React, { useEffect, useState } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '../navigation/Navigator';

const { height } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [customerUsername, setCustomerUsername] = useState<string | null>(null);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleProfile = () => {
    navigation.navigate('EditProfile')
  };

  const handleHistory = () => {
    navigation.navigate('Transaction')
  };

  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const name = await AsyncStorage.getItem('customerName');
        const username = await AsyncStorage.getItem('customerUsername');
        if (name) setCustomerName(name);
        if (username) setCustomerUsername(username);
      } catch (error) {
        console.error("Error loading customer data:", error);
      }
    };

    loadCustomerData();
  }, []);

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
            <Image 
              source={require('../assets/img/default-profile.png')} 
              style={styles.profileImage} 
            />
            <View style={styles.onlineIndicator} />
          </View>
          <Text style={styles.welcomeText}>Hello!</Text>
          <Text style={styles.usernameHeader}>{customerUsername}</Text>
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
              <Text style={styles.infoValue}>{customerName}</Text>
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
    paddingTop: height * 0.06,
    paddingBottom: 25,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#5ce361',
    borderWidth: 2,
    borderColor: '#fff',
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '400',
    marginBottom: 4,
  },
  usernameHeader: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  editButton: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  editIcon: {
    width: 18,
    height: 18,
    tintColor: '#667eea',
  },
  userInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 6,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  historyButton: {
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  logoutButton: {
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  },
  buttonSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '400',
  },
  chevron: {
    fontSize: 20,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#fee8e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 30,
    height: 30,
    tintColor: '#e74c3c',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#696969',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
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
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
})
