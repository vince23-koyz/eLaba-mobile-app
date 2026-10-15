import React, { useState, useEffect } from 'react';
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
import { RootStackParamList } from '../../navigation/Navigator';
import { api } from '../../config/api';
import { updateDeviceToken } from '../../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import LoadingOverlay from '../../components/LoadingOverlay';
import CustomAlertModal from '../../components/CustomAlertModal';
import { getApiErrorMessage, isInvalidCredentialsError } from '../../utils/getApiErrorMessage';


export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLandscape = width > height;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState<'center' | 'top'>('top');
  const [showLoginFailedModal, setShowLoginFailedModal] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Login attempt lockout state
  const [attemptCount, setAttemptCount] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lastPhoneChecked, setLastPhoneChecked] = useState<string>('');
  // Load attempt count and lockUntil from AsyncStorage on mount
  // Load attempt count and lockUntil for the current phone number
  useEffect(() => {
    (async () => {
      if (!phoneNumber) return;
      const key = phoneNumber.trim();
      setLastPhoneChecked(key);
      const storedAttempts = await AsyncStorage.getItem(`loginAttemptCount_${key}`);
      const storedLock = await AsyncStorage.getItem(`loginLockUntil_${key}`);
      setAttemptCount(storedAttempts ? Number(storedAttempts) : 0);
      setLockUntil(storedLock ? Number(storedLock) : null);
    })();
  }, [phoneNumber]);

  // Helper to update attempt count and lock for a specific phone number
  const updateAttempts = async (count: number, lock: number | null, phone?: string) => {
    const key = (phone ?? phoneNumber).trim();
    setAttemptCount(count);
    if (lock) {
      setLockUntil(lock);
      await AsyncStorage.setItem(`loginLockUntil_${key}`, lock.toString());
    } else {
      setLockUntil(null);
      await AsyncStorage.removeItem(`loginLockUntil_${key}`);
    }
    await AsyncStorage.setItem(`loginAttemptCount_${key}`, count.toString());
  };

  const handleSignup = () => navigation.navigate('Signup');
  const handleForgot = () => navigation.navigate('PasswordRecovery');

  // Philippine phone number validation
  const isValidPhilippinePhone = (num: string) => {
    // Accepts +639XXXXXXXXX or 09XXXXXXXXX (11 digits)
    const cleaned = num.replace(/\D/g, '');
    if (num.startsWith('+63')) {
      return /^\+639\d{9}$/.test(num);
    }
    if (num.startsWith('09')) {
      return /^09\d{9}$/.test(num);
    }
    return false;
  };

  const handleLogin = async () => {
    // Check for lockout for this phone number
    const now = Date.now();
    if (lockUntil && now < lockUntil) {
      const waitSec = Math.ceil((lockUntil - now) / 1000);
      setErrorMessage(`Too many failed attempts. Please wait ${Math.ceil(waitSec/60)} minute(s) before trying again.`);
      setShowLoginFailedModal(true);
      return;
    }

    const isPhoneEmpty = !phoneNumber || !phoneNumber.trim();
    const isPasswordEmpty = !password || !password.trim();

    if (isPhoneEmpty || isPasswordEmpty) {
      setPhoneError(isPhoneEmpty ? 'Please enter your phone number.' : '');
      setPasswordError(isPasswordEmpty ? 'Please enter your password.' : '');
      return;
    }

    if (!isValidPhilippinePhone(phoneNumber.trim())) {
      setPhoneError('Please enter a valid Philippine phone number (e.g. 09XXXXXXXXX or +639XXXXXXXXX).');
      setPasswordError('');
      return;
    }

    setPhoneError('');
    setPasswordError('');
    setLoading(true);
    try {
      const response = await api.post(
        '/customers/login',
        { phone_number: phoneNumber, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response.data?.success) {
        // Reset attempts on successful login for this phone number
        await updateAttempts(0, null);
        const { customer } = response.data;
        await AsyncStorage.setItem('customerId', customer.customer_id.toString());
        await AsyncStorage.setItem('customerName', customer.first_name);
        await AsyncStorage.setItem('customerLastName', customer.last_name);
        await AsyncStorage.setItem('customerUsername', customer.username);
        await AsyncStorage.setItem('customerPhone', customer.phone_number);
        await AsyncStorage.setItem('customerAddress', customer.address || '');
        await AsyncStorage.setItem('isLoggedIn', 'true');
        try {
          let fcmToken = await messaging().getToken();
          if (fcmToken) {
            await AsyncStorage.setItem('fcmToken', fcmToken);
            await updateDeviceToken({
              accountId: customer.customer_id,
              accountType: 'customer',
              shopId: null,
              token: fcmToken,
            });
          }
        } catch (err) {
          console.log("FCM Token error:", err);
        }
        setShowSuccess(true);

        setTimeout(() => {
          setShowSuccess(false);

          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        }, 1000);
      } else {
        const responseCode = response.data?.code;
        const key = phoneNumber.trim();
        const newCount = attemptCount + 1;
        let lock = null;
        if (newCount >= 6) {
          lock = Date.now() + 5 * 60 * 1000;
        }
        await updateAttempts(newCount, lock, key);
        if (responseCode === 'TOO_MANY_ATTEMPTS' || lock) {
          setErrorMessage('Too many unsuccessful login attempts. Please wait a few minutes before trying again.');
          setShowLoginFailedModal(true);
        } else if (responseCode === 'INVALID_CREDENTIALS') {
          setErrorMessage('The phone number or password you entered is incorrect. Please check your credentials and try again.');
          setShowLoginFailedModal(true);
        } else {
          setErrorMessage(response.data?.message || 'Unable to log in. Please try again.');
          setShowLoginFailedModal(true);
        }
      }
    } catch (error: any) {
      console.log('Login Error:', error.response?.data || error.message || error);
      setPassword('');
      const responseCode = error.response?.data?.code;
      const isCredentialFailure = isInvalidCredentialsError(error);
      if (responseCode === 'TOO_MANY_ATTEMPTS') {
        setErrorMessage('Too many unsuccessful login attempts. Please wait a few minutes before trying again.');
        setShowLoginFailedModal(true);
      } else if (isCredentialFailure) {
        const key = phoneNumber.trim();
        const newCount = attemptCount + 1;
        const lock = newCount >= 6 ? Date.now() + 5 * 60 * 1000 : null;
        await updateAttempts(newCount, lock, key);
        setErrorMessage('The phone number or password you entered is incorrect. Please check your credentials and try again.');
        setShowLoginFailedModal(true);
      } else {
        setErrorMessage(getApiErrorMessage(error, 'Unable to log in. Please try again.'));
        setShowLoginFailedModal(true);
      }
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
      {showSuccess && (
        <View style={styles.successAlert}>
          <Image source={require('../../assets/img/icon/check.png')} style={styles.successIcon} />
          <Text style={styles.successText}>Login successful!</Text>
        </View>
      )}
      {showError && errorType === 'center' && (
        <View style={styles.centeredErrorAlert}>
          <View style={styles.centeredErrorBox}>
            <Image source={require('../../assets/img/icon/wrong.png')} style={styles.errorIcon} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        </View>
      )}
      <CustomAlertModal
        visible={showLoginFailedModal}
        title="Login Failed"
        message={errorMessage}
        type="error"
        onRequestClose={() => setShowLoginFailedModal(false)}
        actions={[{ text: 'OK', primary: true, onPress: () => setShowLoginFailedModal(false) }]}
      />
      <KeyboardAvoidingView
        style={[styles.keyboardAvoidingView, { paddingHorizontal: isTablet ? 24 : 20 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.elabaContainer, { marginTop: isLandscape ? 28 : 80 }]}> 
              <Text style={[styles.appTitle, { fontSize: isTablet ? 20 : 16 }]}>eLABA: Laundry Booking Services</Text>
              <Image source={require('../../assets/img/elaba.png')} style={[styles.appIcon, { width: isTablet ? 90 : 70, height: isTablet ? 90 : 70 }]} />
              <Text style={[styles.login, { fontSize: isTablet ? 32 : 24 }]}>Login</Text>
              <Text style={[styles.portal, { fontSize: isTablet ? 20 : 16 }]}>Customer Portal</Text>
            </View>
            <View style={[styles.form, { maxWidth: isTablet ? 520 : 420, padding: isTablet ? 28 : 25 }]}> 
              <Text style={[styles.label, { fontSize: isTablet ? 18 : 16 }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, phoneError ? styles.inputError : null]}
                placeholder="+63"
                placeholderTextColor="#3D3D3D"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  setPhoneError('');
                }}
              />
              {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
              <Text style={[styles.label, { fontSize: isTablet ? 18 : 16 }]}>Password</Text>
              <View style={[styles.passwordContainer, passwordError ? styles.inputError : null]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#3D3D3D"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError('');
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Image
                    source={showPassword ? require('../../assets/img/icon/visibility.png') : require('../../assets/img/icon/visibility-off.png')}
                    style={styles.eyeIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              <TouchableOpacity onPress={handleForgot}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogin} style={styles.loginButton} disabled={loading}>
                <Text style={[styles.loginButtonText, { fontSize: isTablet ? 18 : 16 }]}>Login</Text>
              </TouchableOpacity>
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <TouchableOpacity onPress={handleSignup}>
                  <Text style={styles.signupLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={loading} title="Logging you in" subtitle="please wait..." />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Centered error alert overlay
  centeredErrorAlert: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  centeredErrorBox: {
    backgroundColor: '#ffeaea',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffb2b2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  // Top error alert bar (for incorrect credentials)
  errorAlert: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffeaea',
    borderBottomWidth: 1,
    borderColor: '#ffb2b2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 38,
    zIndex: 11,
    gap: 8,
  },
  // ...existing code...
  errorIcon: {
    width: 22,
    height: 22,
    tintColor: '#e74c3c',
  },
  successAlert: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#e8f9f3',
    borderBottomWidth: 1,
    borderColor: '#b2e2d6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 38,
    zIndex: 10,
    gap: 8,
  },
  successIcon: {
    width: 22,
    height: 22,
    tintColor: '#2b7ecb',
  },
  successText: {
    color: '#2b7ecb',
    fontWeight: '600',
    fontSize: 18,
  },
  container: { flex: 1, paddingHorizontal: 20 },
  keyboardAvoidingView: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  elabaContainer: { alignItems: 'center', marginTop: 80, gap: 10 },
  appTitle: { fontSize: 16, fontWeight: '600', fontStyle: 'italic', textAlign: 'center' },
  appIcon: { width: 70, height: 70, resizeMode: 'center' },
  login: { fontSize: 24, fontWeight: '600' },
  portal: { fontSize: 16 },
  form: {
    width: '100%',
    backgroundColor: '#ffffff75',
    borderRadius: 35,
    padding: 25,
    marginTop: 40,
    alignItems: 'center',
  },
  label: { fontSize: 16, alignSelf: 'flex-start', marginTop: 12, marginBottom: 10 },
  input: {
    width: '100%',
    height: 47,
    backgroundColor: '#fffcf2',
    borderRadius: 12,
    borderWidth: 0.3,
    borderColor: '#89bfb8',
    paddingHorizontal: 15,
    marginBottom: 8,
  },
  passwordContainer: {
    width: '100%',
    height: 47,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffcf2',
    borderRadius: 12,
    borderWidth: 0.3,
    borderColor: '#89bfb8',
    paddingLeft: 15,
    paddingRight: 10,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    color: '#111827',
  },
  eyeButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    width: 18,
    height: 18,
    tintColor: '#2b7ecb',
  },
  inputError: {
    borderColor: '#dc2626',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginLeft: 4,
  },
  forgotText: { alignSelf: 'flex-end', color: '#2b7ecb', marginBottom: 20 },
  loginButton: { width: '100%', backgroundColor: '#2b7ecb', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: '#fff', fontWeight: 'bold' },
  signupContainer: { flexDirection: 'row', marginTop: 20 },
  signupText: { color: '#333' },
  signupLink: { color: '#2b7ecb', fontWeight: 'bold' },
});
