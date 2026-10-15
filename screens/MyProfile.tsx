import React, { useState, useEffect } from 'react';
import { 
  Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, TextInput, ScrollView, Modal
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {launchImageLibrary, launchCamera, ImageLibraryOptions, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS, API_CONFIG } from '../config/api';
import Icons from '../components/Icons';

export default function MyProfile() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState({
    customer_id: '',
    first_name: '',
    last_name: '',
    username: '',
    phone_number: '',
    street: '',
    zone: '',
    barangay: '',
    city: '',
    profile_picture: ''
  });
  const [imageKey, setImageKey] = useState(Date.now());
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [appAlert, setAppAlert] = useState<{visible: boolean, title: string, message: string, onOk?: () => void}>({visible: false, title: '', message: '', onOk: undefined});

  const showAppAlert = (title: string, message: string, onOk?: () => void) => {
    setAppAlert({ visible: true, title, message, onOk });
  };
  const [editedData, setEditedData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    street: '',
    zone: '',
    barangay: '',
    city: '',
  });

  const maskPhoneNumber = (phone: string) => {
    if (!phone) return 'Not set';
    const digits = phone.replace(/\D/g, '');
    // Keep first 4 and last 4 digits visible
    if (digits.length <= 8) return digits;
    const start = digits.slice(0, 4);
    const end = digits.slice(-4);
    return `${start} **** ${end}`;
  };

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

  // Fetch user data from database
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const customerId = await AsyncStorage.getItem('customerId');
      
      if (!customerId) {
        showAppAlert('Error', 'Please login again', () => navigation.navigate('Login'));
        return;
      }

  const response = await api.get(API_ENDPOINTS.CUSTOMERS.BY_ID(customerId));
      
      if (response.data) {
        console.log('Fetched user data:', response.data);
        console.log('Profile picture from server:', response.data.profile_picture);
        setUserData(response.data);
        // Update imageKey to force image reload if profile picture exists
        if (response.data.profile_picture) {
          console.log('Updating imageKey for profile picture');
          setImageKey(Date.now());
        }
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      console.error('Fetch error response:', error.response?.data);
  showAppAlert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Disabled: profile photo changes are not allowed from Edit Profile
  const handleProfilePictureUpdate = () => {};

  const openCamera = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: true, // enable base64 fallback for Android content:// URIs
      maxHeight: 1024,
      maxWidth: 1024,
      quality: 0.7,
      selectionLimit: 1,
    };

    launchCamera(options, handleImageResponse);
  };

  const openGallery = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: true, // enable base64 fallback for Android content:// URIs
      maxHeight: 1024,
      maxWidth: 1024,
      quality: 0.7,
      selectionLimit: 1,
    };

    launchImageLibrary(options, handleImageResponse);
  };

  const handleImageResponse = async (response: ImagePickerResponse) => {
    if (response.didCancel) {
      return;
    }

    if (response.errorMessage) {
      showAppAlert('Error', response.errorMessage);
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      
      // Validate file size (max 5MB)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        showAppAlert('Error', 'Image size too large. Please select an image smaller than 5MB.');
        return;
      }

      // Validate file type
      if (asset.type && !asset.type.startsWith('image/')) {
        showAppAlert('Error', 'Please select a valid image file.');
        return;
      }

      try {
        setSaving(true);
        
        // Optionally show uploading modal/spinner (already handled by saving state)
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = asset.fileName?.split('.').pop() || 'jpg';
        const fileName = `profile_${userData.customer_id}_${timestamp}.${fileExtension}`;
        
        // Build FormData with the raw URI. fetch in RN supports file:// and content://
        const mimeType = asset.type || (fileExtension.toLowerCase() === 'png' ? 'image/png' : 'image/jpeg');
        const formData = new FormData();
        formData.append('profilePicture', {
          uri: asset.uri as string,
          type: mimeType,
          name: fileName,
        } as any);

        // Upload to server with retry mechanism
        let uploadResponse: any = null;
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            const res = await fetch(
              `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CUSTOMERS.PROFILE_PICTURE(userData.customer_id)}`,
              {
                method: 'POST',
                body: formData,
                headers: {
                  Accept: 'application/json',
                  // NOTE: Do NOT set Content-Type; RN will set correct multipart boundary
                },
              }
            );
            let data: any = {};
            try { data = await res.json(); } catch {}
            if (!res.ok) {
              const err: any = new Error('Upload failed');
              err.response = { status: res.status, data };
              throw err;
            }
            uploadResponse = { data };
            break; // Success
          } catch (retryError: any) {
            retryCount++;
            if (retryCount > maxRetries) throw retryError;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        if (uploadResponse && uploadResponse.data.success) {
          console.log('Upload successful:', uploadResponse.data);
          console.log('New profile picture:', uploadResponse.data.profile_picture);
          
          // Update imageKey to force image reload
          setImageKey(Date.now());
          
          // Update local state immediately for better UX
          setUserData(prev => ({
            ...prev,
            profile_picture: uploadResponse.data.profile_picture || fileName
          }));
          
          // Then refresh from server for consistency
          await fetchUserData();
          
          showAppAlert('Success', 'Profile picture updated successfully!');
        } else {
          throw new Error(uploadResponse?.data?.message || 'Upload failed');
        }
      } catch (error: any) {
        console.error('Error uploading profile picture:', error);
        
        let errorMessage = 'Failed to update profile picture. ';
        if (error.code === 'ECONNABORTED') {
          errorMessage += 'Upload timeout. Please try again.';
        } else if (error.response?.status === 413) {
          errorMessage += 'File size too large.';
        } else if (error.response?.status === 400) {
          errorMessage += error.response.data?.message || 'Invalid file format.';
        } else if (error.response?.status >= 500) {
          errorMessage += error.response?.data?.message ? `Server error: ${error.response.data.message}` : 'Server error. Please try again later.';
        } else {
          errorMessage += error.message ? `Network error: ${error.message}` : 'Please check your internet connection and try again.';
        }
        
  showAppAlert('Upload Failed', errorMessage);
      } finally {
        setSaving(false);
      }
    }
  };

  // Fetch user data on component mount
  useEffect(() => {
    fetchUserData();
  }, []);

  // Load user data into editable fields when userData changes
  useEffect(() => {
    if (userData.customer_id) {
      setEditedData({
        username: userData.username || '',
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        street: userData.street || '',
        zone: userData.zone || '',
        barangay: userData.barangay || '',
        city: userData.city || '',
      });
    }
  }, [userData]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset to original data
    setEditedData({
      username: userData.username || '',
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      street: userData.street || '',
      zone: userData.zone || '',
      barangay: userData.barangay || '',
      city: userData.city || '',
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedData.firstName.trim() || !editedData.lastName.trim() || !editedData.username.trim()) {
      showAppAlert('Error', 'Please fill in all required fields (Username, First Name, Last Name)');
      return;
    }

    if (/\d/.test(editedData.firstName) || /\d/.test(editedData.lastName)) {
      showAppAlert('Invalid name', 'First name and last name cannot contain numbers.');
      return;
    }

    const addressFields = [
      { label: 'Street', value: editedData.street },
      { label: 'Zone', value: editedData.zone },
      { label: 'Barangay', value: editedData.barangay },
      { label: 'City', value: editedData.city },
    ];
    const missingAddressField = addressFields.find(({ value }) => !value.trim());
    if (missingAddressField) {
      showAppAlert('Incomplete address', `Please enter your ${missingAddressField.label.toLowerCase()}.`);
      return;
    }

    setSaving(true);
    try {
      // Use customer ID from userData
      if (!userData.customer_id) {
        showAppAlert('Error', 'Customer ID not found. Please login again.');
        return;
      }

      // Save to database via API   
  const response = await api.put(API_ENDPOINTS.CUSTOMERS.BY_ID(userData.customer_id), {
        first_name: editedData.firstName.trim(),
        last_name: editedData.lastName.trim(),
        username: editedData.username.trim(),
        street: editedData.street.trim(),
        zone: editedData.zone.trim(),
        barangay: editedData.barangay.trim(),
        city: editedData.city.trim(),
          });

      if (response.data.success) {
        // Refresh data from database to get the latest info
        await fetchUserData();
        showAppAlert('Success', 'Profile updated successfully!');
        setIsEditing(false);
      } else {
        showAppAlert('Error', response.data.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      
      let errorMessage = 'Failed to update profile. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'Customer not found. Please login again.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
  showAppAlert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={['#91fff2', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Image source={require('../assets/img/icon/back.png')} style={styles.backIcon} />
            </TouchableOpacity>
            <Text style={styles.title}>My Profile</Text>
            {/* Move Edit button to header */}
            {!isEditing && (
              <TouchableOpacity 
                style={styles.headerEditButton}
                onPress={handleEdit}
              >
                <Text style={styles.headerEditText}>Edit</Text>
              </TouchableOpacity>
            )}
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View 
          style={[
            styles.profilePicWrapper
          ]}
        > 
          <View style={styles.profileAvatar}>
            {userData.profile_picture ? (
            <Image 
              key={`profile-${userData.profile_picture}-${imageKey}`}
              source={{
                uri: userData.profile_picture 
                    ? `${userData.profile_picture}${userData.profile_picture.includes('http') ? '' : `?v=${imageKey}`}`
                    : undefined,
                cache: 'reload'
              }}
              style={styles.profileImage}
              resizeMode="cover"
              onError={() => setUserData(prev => ({ ...prev, profile_picture: '' }))}
            />
            
            ) : (
              <Text style={styles.avatarText}>
                {getInitials(userData.first_name, userData.last_name)}
              </Text>
            )}
            {saving && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#667eea" size="large" />
              </View>
            )}
            {/* Upload icon overlay for updating profile picture*/}
            <TouchableOpacity
              style={styles.editIconOverlay}
              onPress={() => setShowProfileModal(true)}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Icons.Upload size={18} color="#fff" />
            </TouchableOpacity>
      {/* Custom Modal for Profile Picture Update */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Profile Picture</Text>
            <Text style={styles.modalSubtitle}>Choose a source</Text>
            <View style={styles.listModalOptions}>
              <TouchableOpacity
                style={styles.listModalItem}
                onPress={() => {
                  setShowProfileModal(false);
                  openCamera();
                }}
              >
                <Icons.Camera size={20} color="#667eea" />
                <Text style={styles.listModalText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.listModalItem}
                onPress={() => {
                  setShowProfileModal(false);
                  openGallery();
                }}
              >
                <Icons.Image size={20} color="#667eea"/>
                <Text style={styles.listModalText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.listModalItem, styles.listModalCancel]}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={[styles.listModalText, styles.listModalCancelText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
          </View>
        </View>
        <View style={styles.form}>
        {loading ? (
          <ActivityIndicator size="large" color="#96bcff" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* Account Settings-like section */}
            <View style={styles.settingsContainer}>
              <Text style={styles.settingsHeader}>Account</Text>
            </View>

            {/* Username Field */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Username</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedData.username}
                  onChangeText={(text) => setEditedData({...editedData, username: text})}
                  placeholder="Enter username"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.infoValue}>{userData.username || 'Not set'}</Text>
              )}
            </View>

            {/* First Name Field */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>First Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedData.firstName}
                  onChangeText={(text) => setEditedData({...editedData, firstName: text.replace(/\d/g, '')})}
                  placeholder="Enter first name"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.infoValue}>{userData.first_name || 'Not set'}</Text>
              )}
            </View>

            {/* Last Name Field */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoLabel}>Last Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editedData.lastName}
                  onChangeText={(text) => setEditedData({...editedData, lastName: text.replace(/\d/g, '')})}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.infoValue}>{userData.last_name || 'Not set'}</Text>
              )}
            </View>
            
            {/* Address Fields */}
            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>Address</Text>
              
              {/* Street and Zone Row */}
              <View style={styles.addressRow}>
                <View style={styles.halfAddressContainer}>
                  <Text style={styles.infoLabel}>Street</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.editInput}
                      value={editedData.street}
                      onChangeText={(text) => setEditedData({...editedData, street: text})}
                      placeholder="Enter street"
                      placeholderTextColor="#999"
                    />
                  ) : (
                    <Text style={styles.infoValue}>{userData.street || 'Not set'}</Text>
                  )}
                </View>
                
                <View style={styles.halfAddressContainer}>
                  <Text style={styles.infoLabel}>Zone</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.editInput}
                      value={editedData.zone}
                      onChangeText={(text) => setEditedData({...editedData, zone: text})}
                      placeholder="Enter zone"
                      placeholderTextColor="#999"
                    />
                  ) : (
                    <Text style={styles.infoValue}>{userData.zone || 'Not set'}</Text>
                  )}
                </View>
              </View>
              
              {/* Barangay Field */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoLabel}>Barangay</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedData.barangay}
                    onChangeText={(text) => setEditedData({...editedData, barangay: text})}
                    placeholder="Enter barangay"
                    placeholderTextColor="#999"
                  />
                ) : (
                  <Text style={styles.infoValue}>{userData.barangay || 'Not set'}</Text>
                )}
              </View>
              
              {/* City Field */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoLabel}>City</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editedData.city}
                    onChangeText={(text) => setEditedData({...editedData, city: text})}
                    placeholder="Enter city"
                    placeholderTextColor="#999"
                  />
                ) : (
                  <Text style={styles.infoValue}>{userData.city || 'Not set'}</Text>
                )}
              </View>
            </View>
            
            {/* Action Buttons (only show when editing) */}
            {isEditing && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancel}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        </View>
      </ScrollView>
    {/* Custom App Alert Modal */}
    <Modal
      visible={appAlert.visible}
      transparent
      animationType="fade"
      onRequestClose={() => setAppAlert({ ...appAlert, visible: false })}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{appAlert.title}</Text>
          <Text style={styles.modalSubtitle}>{appAlert.message}</Text>
          <TouchableOpacity
            style={[styles.listModalItem, { justifyContent: 'center', marginTop: 18, borderBottomWidth: 0, backgroundColor: '#667eea', borderRadius: 10 }]}
            onPress={() => {
              setAppAlert({ ...appAlert, visible: false });
              if (appAlert.onOk) appAlert.onOk();
            }}
          >
            <Text style={[styles.listModalText, { color: '#fff', fontWeight: '700' }]}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    paddingTop: 55,
    paddingBottom: 25,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backIcon: {
    width: 28,
    height: 28,
    tintColor: '#ffffff',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
    marginRight: 0,
  },
  headerEditButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  headerEditText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  profilePicWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  imageProfile: { width: 110, height: 110, borderRadius: 55 },
  profileAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  avatarText: {
    fontSize: 38,
    fontWeight: '700',
    color: '#667eea',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  changePictureText: {
    fontSize: 15,
    color: '#667eea',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  profilePicDisabled: {
    opacity: 0.6,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  disabledText: {
    color: '#999',
  },
  editIconOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#667eea',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  editIcon: {
    fontSize: 18,
    color: '#fff',
  },
  hintText: {
    fontSize: 13,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
  form: { 
    backgroundColor: '#FFFFFF', 
    width: '100%', 
    flex: 1,
    marginTop: 8, 
    alignItems: 'center', 
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 35,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  settingsContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    paddingVertical: 6,
    marginBottom: 12,
  },
  settingsHeader: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4',
  },
  settingsLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
    marginBottom: 4,
  },
  settingsValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '600',
  },
  chevron: {
    fontSize: 22,
    color: '#bdc3c7',
    fontWeight: '300',
  },
  label: { fontSize: 15, fontWeight: '700', color: '#ffffff', letterSpacing: 0.2 },
  infoContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 10,
    minHeight: 50,
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  infoValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '500',
    letterSpacing: 0.05,
  },
  editButton: {
    width: '55%',
    height: 46,
    backgroundColor: '#667eea',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    alignSelf: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  editInput: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '500',
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
    paddingVertical: 6,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    letterSpacing: 0.05,
  },
  readOnlyContainer: {
    backgroundColor: '#f5f5f5',
  },
  readOnlyText: {
    color: '#666666',
  },
  sensitiveNote: {
    fontSize: 10,
    color: '#999999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 25,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7f8c8d',
    letterSpacing: 0.1,
  },
  saveButton: {
    backgroundColor: '#667eea',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  addressContainer: {
    width: '100%',
    marginTop: 12,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 0,
  },
  halfAddressContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
    justifyContent: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  // ...existing styles...
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 28,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 18,
    textAlign: 'center',
  },
  listModalOptions: {
    width: '100%',
    marginTop: 10,
  },
  listModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  listModalText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  listModalCancel: {
    borderBottomWidth: 0,
    marginTop: 2,
  },
  listModalCancelText: {
    color: '#7f8c8d',
    fontWeight: '600',
  },
});
