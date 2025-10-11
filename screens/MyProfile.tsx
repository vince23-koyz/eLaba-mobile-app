import React, { useState, useEffect } from 'react';
import { 
  Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, TextInput, Alert, ScrollView
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import {launchImageLibrary, launchCamera, ImageLibraryOptions, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

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
  const [imageKey, setImageKey] = useState(Date.now()); // For cache busting
  const [editedData, setEditedData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    street: '',
    zone: '',
    barangay: '',
    city: '',
  });

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
        Alert.alert('Error', 'Please login again');
        navigation.navigate('Login');
        return;
      }

      const response = await axios.get(`http://10.0.2.2:5000/api/customers/${customerId}`);
      
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
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Handle profile picture selection and upload
  const handleProfilePictureUpdate = () => {
    if (saving || !isEditing) return; // Prevent multiple simultaneous uploads and only allow in edit mode
    
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Gallery', onPress: () => openGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: false,
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
      includeBase64: false,
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
      Alert.alert('Error', response.errorMessage);
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      
      // Validate file size (max 5MB)
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('Error', 'Image size too large. Please select an image smaller than 5MB.');
        return;
      }

      // Validate file type
      if (asset.type && !asset.type.startsWith('image/')) {
        Alert.alert('Error', 'Please select a valid image file.');
        return;
      }

      try {
        setSaving(true);
        
        // Show uploading alert
        const uploadingAlert = Alert.alert(
          'Uploading...', 
          'Please wait while we upload your profile picture.',
          [],
          { cancelable: false }
        );
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = asset.fileName?.split('.').pop() || 'jpg';
        const fileName = `profile_${userData.customer_id}_${timestamp}.${fileExtension}`;
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('profilePicture', {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: fileName,
        } as any);

        // Upload to server with retry mechanism
        let uploadResponse: any = null;
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            uploadResponse = await axios.post(
              `http://10.0.2.2:5000/api/customers/${userData.customer_id}/profile-picture`,
              formData,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
                timeout: 30000, // 30 seconds timeout
              }
            );
            break; // Success, exit retry loop
          } catch (retryError: any) {
            retryCount++;
            if (retryCount > maxRetries) {
              throw retryError; // Final attempt failed
            }
            // Wait before retry (exponential backoff)
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
          
          Alert.alert(
            'Success', 
            'Profile picture updated successfully!',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Optional: Exit edit mode after successful upload
                  // setIsEditing(false);
                }
              }
            ]
          );
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
          errorMessage += 'Server error. Please try again later.';
        } else {
          errorMessage += 'Please check your internet connection and try again.';
        }
        
        Alert.alert('Upload Failed', errorMessage);
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
      Alert.alert('Error', 'Please fill in all required fields (Username, First Name, Last Name)');
      return;
    }

    setSaving(true);
    try {
      // Use customer ID from userData
      if (!userData.customer_id) {
        Alert.alert('Error', 'Customer ID not found. Please login again.');
        return;
      }

      // Save to database via API   
      const response = await axios.put(`http://10.0.2.2:5000/api/customers/${userData.customer_id}`, {
        first_name: editedData.firstName,
        last_name: editedData.lastName,
        username: editedData.username,
        street: editedData.street,
        zone: editedData.zone,
        barangay: editedData.barangay,
        city: editedData.city,
      });

      if (response.data.success) {
        // Refresh data from database to get the latest info
        await fetchUserData();
        
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditing(false);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update profile');
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
      
      Alert.alert('Error', errorMessage);
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
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity 
          style={[
            styles.profilePicWrapper, 
            (saving || !isEditing) && styles.profilePicDisabled
          ]}
          onPress={isEditing ? handleProfilePictureUpdate : undefined}
          disabled={saving || !isEditing}
        >
          <View style={styles.profileAvatar}>
            {userData.profile_picture ? (
              <Image 
                key={`profile-${userData.profile_picture}-${imageKey}`}
                source={{
                  uri: `http://10.0.2.2:5000/uploads/customer-profile/${userData.profile_picture}?v=${imageKey}`,
                  cache: 'reload'
                }}
                style={styles.profileImage}
                resizeMode="cover"
                onError={() => {
                  console.log('Failed to load profile image:', userData.profile_picture);
                  // Fallback to initials if image fails to load
                  setUserData(prev => ({ ...prev, profile_picture: '' }));
                }}
                onLoadStart={() => console.log('Started loading profile image:', userData.profile_picture)}
                onLoadEnd={() => console.log('Finished loading profile image:', userData.profile_picture)}
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
            {isEditing && !saving && (
              <View style={styles.editIconOverlay}>
                <Text style={styles.editIcon}>📷</Text>
              </View>
            )}
          </View>
          {isEditing ? (
            <Text style={[styles.changePictureText, saving && styles.disabledText]}>
              {saving ? 'Uploading...' : 'Tap to change picture'}
            </Text>
          ) : (
            <Text style={styles.hintText}>
              Click "Edit Profile" to change picture
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.form}>
        {loading ? (
          <ActivityIndicator size="large" color="#96bcff" style={{ marginTop: 50 }} />
        ) : (
          <>
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
                  onChangeText={(text) => setEditedData({...editedData, firstName: text})}
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
                  onChangeText={(text) => setEditedData({...editedData, lastName: text})}
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
            
            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {isEditing ? (
                <>
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
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={handleEdit}
                >
                  <Text style={styles.label}>Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
        </View>
      </ScrollView>
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
    marginRight: 28, 
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
});
