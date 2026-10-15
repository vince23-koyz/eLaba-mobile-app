import React, { useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS } from '../../config/api';
import { RootStackParamList } from '../../navigation/Navigator';
import CustomAlertModal from '../../components/CustomAlertModal';

export default function ChangePasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showIncorrectPasswordModal, setShowIncorrectPasswordModal] = useState(false);
  const [showPasswordUpdatedModal, setShowPasswordUpdatedModal] = useState(false);

  const showPasswordErrorIfIncorrect = (error: any) => {
    if (
      error?.response?.data?.code === 'INCORRECT_CURRENT_PASSWORD' ||
      error?.response?.status === 401
    ) {
      setShowIncorrectPasswordModal(true);
      return true;
    }

    return false;
  };

  const handleSubmit = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing details', 'Please enter your current password, new password, and confirm your new password.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Password too short', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Password mismatch', 'The new password and confirmation do not match.');
      return;
    }

    try {
      setLoading(true);
      const customerPhone = await AsyncStorage.getItem('customerPhone');

      if (!customerPhone) {
        Alert.alert('Session expired', 'Please login again to continue.');
        navigation.navigate('Login');
        return;
      }

      const response = await api.post(API_ENDPOINTS.CUSTOMERS.CHANGE_PASSWORD, {
        phone_number: customerPhone,
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (response.data?.success) {
        setShowPasswordUpdatedModal(true);
      } else if (!showPasswordErrorIfIncorrect({ response: { data: response.data } })) {
        Alert.alert('Update failed', response.data?.message || 'Unable to update your password right now.');
      }
    } catch (error: any) {
      if (showPasswordErrorIfIncorrect(error)) {
        return;
      }
      const message = error?.response?.data?.message || 'Unable to update your password right now.';
      Alert.alert('Update failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#a2fff4', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[styles.scrollContainer, { paddingHorizontal: width < 360 ? 14 : 20 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Image source={require('../../assets/img/icon/back.png')} style={styles.backIcon} />
              </TouchableOpacity>
              <Text style={styles.title}>Change Password</Text>
            </View>

            <View style={[styles.card, { maxWidth: width >= 768 ? 520 : undefined }]}>
              <Text style={styles.description}>
                Create a new password for your customer account.
              </Text>

              <Text style={styles.label}>Current Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter your current password"
                  placeholderTextColor="#8a8f98"
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  accessibilityLabel={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                >
                  <Image
                    source={showCurrentPassword ? require('../../assets/img/icon/visibility.png') : require('../../assets/img/icon/visibility-off.png')}
                    style={styles.eyeIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#8a8f98"
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  <Image
                    source={showNewPassword ? require('../../assets/img/icon/visibility.png') : require('../../assets/img/icon/visibility-off.png')}
                    style={styles.eyeIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor="#8a8f98"
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  accessibilityLabel={showNewPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  <Image
                    source={showNewPassword ? require('../../assets/img/icon/visibility.png') : require('../../assets/img/icon/visibility-off.png')}
                    style={styles.eyeIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitText}>{loading ? 'Updating...' : 'Update Password'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <CustomAlertModal
        visible={showIncorrectPasswordModal}
        title="Incorrect password"
        message="The current password you entered is incorrect. Please try again."
        type="error"
        actions={[{ text: 'OK', primary: true, onPress: () => setShowIncorrectPasswordModal(false) }]}
        onRequestClose={() => setShowIncorrectPasswordModal(false)}
      />
      <CustomAlertModal
        visible={showPasswordUpdatedModal}
        title="Password updated"
        message="Your password has been updated successfully."
        type="success"
        actions={[{
          text: 'OK',
          primary: true,
          onPress: () => {
            setShowPasswordUpdatedModal(false);
            navigation.goBack();
          },
        }]}
        onRequestClose={() => setShowPasswordUpdatedModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 6,
    zIndex: 1,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#ffffff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  description: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  label: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe4ea',
    borderRadius: 12,
    backgroundColor: '#f9fbff',
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    color: '#2c3e50',
    fontSize: 15,
    paddingVertical: 12,
  },
  eyeButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    width: 20,
    height: 20,
    tintColor: '#667eea',
  },
  submitButton: {
    backgroundColor: '#2b7ecb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
